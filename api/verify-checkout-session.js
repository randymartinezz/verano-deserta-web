const Stripe = require('stripe');
const { secretKey } = require('./_stripe-config');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { session_id } = req.query;

  if (!session_id || typeof session_id !== 'string' || !session_id.startsWith('cs_')) {
    return res.status(400).json({ error: 'Invalid session ID.' });
  }

  if (!secretKey) {
    console.error('Stripe secret key not configured.');
    return res.status(500).json({ error: 'Payment system not configured.' });
  }

  const stripe = Stripe(secretKey);

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return res.status(200).json({ verified: false, status: session.payment_status });
    }

    return res.status(200).json({
      verified: true,
      customerName: session.customer_details?.name || null,
      customerEmail: session.customer_details?.email || null,
      ticketType: session.metadata?.ticket_type || null,
      quantity: session.metadata?.quantity || null,
      amountTotal: session.amount_total,
      currency: session.currency,
    });
  } catch (err) {
    console.error('Stripe verify error:', err.message);
    return res.status(500).json({ error: 'Could not verify session.' });
  }
};
