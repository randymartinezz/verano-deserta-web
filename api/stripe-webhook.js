const crypto = require('crypto');
const Stripe = require('stripe');
const { secretKey } = require('./_stripe-config');
const { getPool } = require('./_db');
const { sendTicketEmail } = require('./_email');

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Charset excludes ambiguous chars (0, O, I, 1) for readable codes.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateTicketCode() {
  const bytes = crypto.randomBytes(6);
  let code = 'VD26-';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return code;
}

// Vercel may pre-parse JSON bodies. This handles both cases:
// - req.rawBody (Buffer) set by some Vercel runtime versions
// - readable stream not yet consumed
function getRawBody(req) {
  if (req.rawBody) {
    return Promise.resolve(
      Buffer.isBuffer(req.rawBody)
        ? req.rawBody
        : Buffer.from(req.rawBody, 'utf8')
    );
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ── EMAIL HELPERS ─────────────────────────────────────────────────────────────

async function attemptEmail(pool, sessionId, { to, attendeeName, ticketType, codes }) {
  try {
    await sendTicketEmail({ to, attendeeName, ticketType, codes });
    await pool.query(
      `UPDATE fulfilled_sessions
          SET email_sent = true, email_sent_at = NOW(), email_last_error = NULL
        WHERE stripe_checkout_session_id = $1`,
      [sessionId]
    );
  } catch (err) {
    const safeError = String(err.message || err).slice(0, 500);
    console.error('Email send failed (tickets already saved):', safeError);
    await pool.query(
      `UPDATE fulfilled_sessions
          SET email_last_error = $1
        WHERE stripe_checkout_session_id = $2`,
      [safeError, sessionId]
    ).catch((dbErr) => console.error('Failed to save email_last_error:', dbErr.message));
  }
}

// ── HANDLER ───────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET not configured.');
    return res.status(500).end();
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header.' });
  }

  const rawBody = await getRawBody(req);
  const stripe = Stripe(secretKey);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  // Acknowledge non-target events immediately.
  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true });
  }

  const session = event.data.object;

  if (session.payment_status !== 'paid') {
    return res.status(200).json({ received: true });
  }

  const sessionId = session.id;
  const pool = getPool();

  // ── IDEMPOTENCY: check if session has already been fulfilled ──────────────
  let existingRow = null;
  try {
    const result = await pool.query(
      `SELECT email_sent, email_last_error
         FROM fulfilled_sessions
        WHERE stripe_checkout_session_id = $1
        LIMIT 1`,
      [sessionId]
    );
    if (result.rowCount > 0) {
      existingRow = result.rows[0];
    }
  } catch (err) {
    console.error('DB idempotency check error:', err.message);
    return res.status(500).end();
  }

  // ── ALREADY FULFILLED ─────────────────────────────────────────────────────
  if (existingRow) {
    // Email already sent — nothing to do.
    if (existingRow.email_sent) {
      return res.status(200).json({ received: true });
    }

    // Email not yet sent — load the existing codes and retry.
    // Never generate new codes; the tickets are already in the DB.
    let ticketRows;
    try {
      ticketRows = await pool.query(
        `SELECT ticket_code, attendee_name, email, ticket_type
           FROM tickets
          WHERE stripe_checkout_session_id = $1
          ORDER BY created_at ASC`,
        [sessionId]
      );
    } catch (err) {
      console.error('DB load tickets for email retry error:', err.message);
      return res.status(500).end();
    }

    if (ticketRows.rowCount === 0) {
      // Fulfilled session with no tickets should never happen — log and skip.
      console.error('Fulfilled session has no ticket rows:', sessionId);
      return res.status(200).json({ received: true });
    }

    const { attendee_name, email, ticket_type } = ticketRows.rows[0];
    const codes = ticketRows.rows.map((r) => r.ticket_code);

    await attemptEmail(pool, sessionId, {
      to: email,
      attendeeName: attendee_name,
      ticketType: ticket_type,
      codes,
    });

    return res.status(200).json({ received: true });
  }

  // ── FIRST FULFILLMENT ─────────────────────────────────────────────────────

  // Extract all data from Stripe (source of truth — never trust browser).
  const attendeeNameField = (session.custom_fields || []).find(
    (f) => f.key === 'attendee_name'
  );
  const attendeeName =
    attendeeNameField?.text?.value ||
    session.customer_details?.name ||
    'Asistente';

  const email = session.customer_details?.email || null;
  const ticketType = session.metadata?.ticket_type || 'general';
  const quantity = Math.max(1, parseInt(session.metadata?.quantity || '1', 10));
  const eventKey = session.metadata?.event || 'halloween-2026';
  const eventName = session.metadata?.event_name || '¿QUIÉN MATÓ A LA NENA?';
  const amountPaid = session.amount_total;
  const currency = session.currency;
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null;

  // Generate unique codes — one per ticket.
  const codes = Array.from({ length: quantity }, generateTicketCode);

  // Persist tickets + mark session fulfilled in a single transaction.
  // fulfilled_sessions is inserted first so its UNIQUE constraint acts as a
  // DB-level race guard against concurrent duplicate webhook deliveries.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO fulfilled_sessions (stripe_checkout_session_id, email_sent)
       VALUES ($1, false)`,
      [sessionId]
    );

    for (const code of codes) {
      await client.query(
        `INSERT INTO tickets
           (ticket_code, event, event_name, attendee_name, email,
            ticket_type, stripe_checkout_session_id, stripe_payment_intent_id,
            amount_paid, currency, purchase_quantity, status, used)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'valid', false)`,
        [
          code,
          eventKey,
          eventName,
          attendeeName,
          email,
          ticketType,
          sessionId,
          paymentIntentId,
          amountPaid,
          currency,
          quantity,
        ]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('DB transaction error:', err.message);
    // Return 500 so Stripe retries. On retry, the idempotency check above
    // handles both "committed" and "not yet committed" states correctly.
    return res.status(500).end();
  } finally {
    client.release();
  }

  // Attempt confirmation email. Updates email_sent / email_last_error on
  // fulfilled_sessions. Never rolls back tickets. On the next Stripe retry
  // (if email failed), the "already fulfilled" branch above retries the email
  // using the codes already in the DB.
  await attemptEmail(pool, sessionId, { to: email, attendeeName, ticketType, codes });

  return res.status(200).json({ received: true });
};
