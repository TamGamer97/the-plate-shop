// POST /api/webhook -> receives Stripe events. The signature is verified against the raw body.
// Paid orders are logged (Netlify > Logs > Functions); add email/SMS notifications here.
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async (req) => {
    if (req.method !== 'POST') {
        return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            await req.text(),
            req.headers.get('stripe-signature'),
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        const session = event.data.object;
        if (session.payment_status === 'paid') {
            const meta = session.metadata || {};
            const items = Object.keys(meta)
                .filter((key) => key.startsWith('item_'))
                .map((key) => meta[key]);
            console.log('New paid order', JSON.stringify({
                session: session.id,
                customer: meta.name,
                email: session.customer_details?.email,
                phone: meta.phone,
                fulfilment: meta.fulfilment,
                fitting: meta.fitting,
                address: meta.address || null,
                delivery: meta.delivery || null,
                notes: meta.notes || null,
                total: (session.amount_total / 100).toFixed(2),
                items,
            }));
        }
    }

    return Response.json({ received: true });
};

export const config = { path: '/api/webhook' };
