// POST /api/checkout -> creates a Stripe Checkout Session and returns its URL.
import Stripe from 'stripe';
import { catalog, validateOrder, describeItem, OrderError } from '../lib/order.mjs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// SITE_URL overrides; otherwise Netlify's own URL, then the request origin (local dev).
function siteUrl(req) {
    const url = process.env.SITE_URL || process.env.URL || new URL(req.url).origin;
    return url.replace(/\/$/, '');
}

export default async (req) => {
    if (req.method !== 'POST') {
        return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } });
    }

    let order;
    try {
        order = validateOrder(await req.json().catch(() => null));
    } catch (err) {
        if (err instanceof OrderError) return Response.json({ error: err.message }, { status: 400 });
        throw err;
    }

    const lineItems = order.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
            currency: catalog.currency,
            unit_amount: item.unitAmount,
            product_data: {
                name: `${item.plate.name} - ${catalog.quantityTypes[item.opts.quantityType].label}`,
                description: describeItem(item).split(' | ').slice(2).join(' · '),
            },
        },
    }));

    if (order.fitting) {
        lineItems.push({
            quantity: order.plateCount,
            price_data: {
                currency: catalog.currency,
                unit_amount: catalog.fittingPerPlate,
                product_data: { name: 'Plate fitting at collection (per plate)' },
            },
        });
    }

    if (order.fulfilment === 'delivery' && order.deliveryAmount > 0) {
        lineItems.push({
            quantity: 1,
            price_data: {
                currency: catalog.currency,
                unit_amount: order.deliveryAmount,
                product_data: {
                    name: 'Tracked delivery',
                    description: `${catalog.delivery.minDays}-${catalog.delivery.maxDays} days`,
                },
            },
        });
    }

    // Order details are stored as metadata so they show on the payment in the Stripe Dashboard.
    const { customer } = order;
    const metadata = {
        fulfilment: order.fulfilment,
        fitting: order.fitting ? `yes (${order.plateCount} plates)` : 'no',
        name: customer.fullName,
        phone: customer.phone,
    };
    if (order.fulfilment === 'delivery') {
        metadata.address = `${customer.address}, ${customer.postcode}`;
        metadata.delivery = order.deliveryAmount
            ? `£${(order.deliveryAmount / 100).toFixed(2)}`
            : `free (${catalog.delivery.freeAreaName})`;
    }
    if (order.notes) metadata.notes = order.notes;
    order.items.forEach((item, i) => {
        metadata[`item_${i + 1}`] = describeItem(item).slice(0, 500);
    });

    const base = siteUrl(req);
    const params = {
        mode: 'payment',
        line_items: lineItems,
        customer_email: customer.email,
        metadata,
        payment_intent_data: { metadata },
        success_url: `${base}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/basket.html`,
    };

    if (order.fulfilment === 'collection') {
        params.custom_text = {
            submit: { message: 'Free click & collect. Same-day collection available. We will text you when your plates are ready.' },
        };
    }

    try {
        const session = await stripe.checkout.sessions.create(params);
        return Response.json({ url: session.url });
    } catch (err) {
        console.error('Stripe checkout error:', err.message);
        return Response.json({ error: 'Could not start checkout. Please try again.' }, { status: 502 });
    }
};

export const config = { path: '/api/checkout' };
