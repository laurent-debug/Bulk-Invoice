import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/utils/stripe/server';
import { createClient } from '@supabase/supabase-js';

// We need a Service Role key to bypass RLS in the webhook
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (!sig || !webhookSecret) {
      console.warn('⚠️ Webhook secret or signature missing.');
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Error message: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any;
      
      const userId = session.client_reference_id;
      const customerId = session.customer;

      if (userId) {
        await supabaseAdmin
          .from('profiles')
          .update({
            is_pro: true,
            stripe_customer_id: customerId,
          })
          .eq('id', userId);
        
        console.log(`✅ Granted Pro access to user ${userId}`);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as any;
      const customerId = subscription.customer;

      await supabaseAdmin
        .from('profiles')
        .update({
          is_pro: false,
        })
        .eq('stripe_customer_id', customerId);
        
      console.log(`❌ Revoked Pro access for customer ${customerId}`);
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
