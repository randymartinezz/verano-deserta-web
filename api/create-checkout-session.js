const Stripe = require('stripe');
const { secretKey, priceIds } = require('./_stripe-config');

const MAX_QUANTITY = 10;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { ticketType, quantity } = req.body;

  // Validate ticket type — only keys explicitly configured server-side are accepted.
  const priceId = priceIds[ticketType];
  if (!priceId) {
    return res.status(400).json({ error: 'Invalid ticket type.' });
  }

  // Validate quantity.
  const qty = parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY) {
    return res.status(400).json({ error: 'Invalid quantity. Must be between 1 and 10.' });
  }

  if (!secretKey) {
    console.error('Stripe secret key not configured.');
    return res.status(500).json({ error: 'Payment system not configured.' });
  }

  const stripe = Stripe(secretKey);

  // Derive base URL from the incoming request — works on preview deployments automatically.
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: qty }],
      billing_address_collection: 'auto',
      custom_fields: [
        {
          key: 'attendee_name',
          label: { type: 'custom', custom: 'Nombre completo del asistente' },
          type: 'text',
          optional: false,
        },
      ],
      metadata: {
        event: 'halloween-2026',
        event_name: '¿QUIÉN MATÓ A LA NENA?',
        ticket_type: ticketType,
        quantity: String(qty),
      },
      success_url: `${baseUrl}/ticket-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/tickets`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    return res.status(500).json({ error: 'Could not initiate checkout. Please try again.' });
  }
};
