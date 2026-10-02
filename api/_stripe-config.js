// Centralized Stripe configuration.
// All Stripe API files require this module — mode logic lives here only.
// STRIPE_MODE must be explicitly set to "live" to use live credentials.
// Any other value (or missing) defaults to test mode for safety.

const isLive = process.env.STRIPE_MODE === 'live';

const secretKey = isLive
  ? process.env.STRIPE_SECRET_KEY
  : process.env.STRIPE_TEST_SECRET_KEY;

const priceIds = {
  general: isLive
    ? process.env.GENERAL_EARLY_BIRD_PRICE_ID
    : process.env.GENERAL_EARLY_BIRD_TEST_PRICE_ID,
  vip: isLive
    ? process.env.VIP_PRICE_ID
    : process.env.VIP_TEST_PRICE_ID,
};

module.exports = { secretKey, priceIds, isLive, mode: isLive ? 'live' : 'test' };
