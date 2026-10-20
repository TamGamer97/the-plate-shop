// GET /api/session?id=cs_... -> minimal order summary for the success page.
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async (req) => {
    const id = new URL(req.url).searchParams.get('id') || '';
    if (!id.startsWith('cs_')) return Response.json({ error: 'Invalid session id' }, { status: 400 });

    try {
        const session = await stripe.checkout.sessions.retrieve(id);
        return Response.json({
            paid: session.payment_status === 'paid',
            name: session.metadata?.name || session.customer_details?.name || null,
            total: session.amount_total,
            fulfilment: session.metadata?.fulfilment || null,
            freeLocalDelivery: Boolean(session.metadata?.delivery?.startsWith('free')),
        });
    } catch (err) {
        return Response.json({ error: 'Order not found' }, { status: 404 });
    }
};

export const config = { path: '/api/session' };
