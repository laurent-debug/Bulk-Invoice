import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/utils/stripe/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, is_pro')
      .eq('id', user.id)
      .single();

    if (profile?.is_pro) {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 400 });
    }

    const { currency } = await req.json();

    // Mapping of currency to Price ID from Environment Variables
    const priceMap: Record<string, string | undefined> = {
      'CHF': process.env.STRIPE_PRICE_ID_CHF || process.env.STRIPE_PRICE_ID,
      'EUR': process.env.STRIPE_PRICE_ID_EUR || process.env.STRIPE_PRICE_ID,
      'USD': process.env.STRIPE_PRICE_ID_USD || process.env.STRIPE_PRICE_ID,
      'GBP': process.env.STRIPE_PRICE_ID_GBP || process.env.STRIPE_PRICE_ID,
    };

    const priceId = priceMap[currency] || process.env.STRIPE_PRICE_ID || 'price_placeholder'; 

    let customerId = profile?.stripe_customer_id;

    // Create a generic checkout session
    const sessionConfig: any = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get('origin')}/?success=true`,
      cancel_url: `${req.headers.get('origin')}/?canceled=true`,
      client_reference_id: user.id, // Very important for the webhook
    };

    if (customerId) {
      sessionConfig.customer = customerId;
    } else {
      sessionConfig.customer_email = user.email;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}
