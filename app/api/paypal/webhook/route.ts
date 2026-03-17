import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // From client flow (when user clicks approve)
    if (body.event_type === 'CLIENT_APPROVAL' && body.subscription_id) {
       // Get user from auth header
       const authHeader = req.headers.get('Authorization');
       if (!authHeader || !authHeader.startsWith('Bearer ')) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
       }
       const token = authHeader.substring(7);
       const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
       
       if (userError || !user) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
       }

       // Update user to premium
       const { error: profileError } = await supabaseAdmin
         .from('profiles')
         .update({ is_premium: true, raw_subscription_id: body.subscription_id })
         .eq('id', user.id);

       if (profileError) {
         console.error('Failed to update premium status', profileError);
         return NextResponse.json({ error: 'DB Update Failed' }, { status: 500 });
       }

       return NextResponse.json({ success: true });
    }

    // PayPal Webhook Flow
    // (We simply log this for now. For a robust setup, verify webhook signature)
    console.log('PayPal Webhook Event:', body.event_type, body.resource?.id);

    if (body.event_type === 'BILLING.SUBSCRIPTION.CANCELLED' || body.event_type === 'BILLING.SUBSCRIPTION.SUSPENDED') {
       const subId = body.resource?.id;
       if (subId) {
         await supabaseAdmin
           .from('profiles')
           .update({ is_premium: false })
           .eq('raw_subscription_id', subId);
       }
    } else if (body.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
       const subId = body.resource?.id;
       const customUserId = body.resource?.custom_id; // Setup via custom_id during sub creation if possible
       
       if (subId && customUserId) {
           await supabaseAdmin
           .from('profiles')
           .update({ is_premium: true, raw_subscription_id: subId })
           .eq('id', customUserId);
       }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('PayPal Webhook Error:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
