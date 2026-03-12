import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: null as any, // Bypass TS strictly enforcing latest API version
  appInfo: {
    name: 'Bulk Invoice Manager Pro',
    version: '1.0.0',
  },
});
