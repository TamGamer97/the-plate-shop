// Server-side order validation and pricing. Prices always come from
// data/catalog.json, never from the browser.
import catalog from '../../data/catalog.json' with { type: 'json' };

const MAX_LINES = 20;
const MAX_QTY = 10;
const REG_PATTERN = /^[A-Z0-9 ]{1,10}$/;
const PHONE_PATTERN = /^[0-9 +()-]{7,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class OrderError extends Error {}

function clean(value, max) {
    return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

// Price of one configured line (one set of plates), in pence
export function linePrice(plate, opts) {
    const qt = catalog.quantityTypes[opts.quantityType];
    const extrasPerPlate = catalog.plateSizes[opts.plateSize].perPlate + catalog.fixingKits[opts.fixingKit].perPlate;
    return plate[qt.price] + extrasPerPlate * qt.plates;
}

function validateItem(item) {
    const plate = catalog.plates[item?.productSlug];
    if (!plate) throw new OrderError('Your basket contains a product we no longer sell. Please remove it.');

    const o = item.options || {};
    const opts = {
        quantityType: o.quantityType,
        plateSize: o.plateSize,
        fixingKit: o.fixingKit,
        lipColour: o.lipColour,
        logoColour: o.logoColour,
        customSize: clean(o.customSize, 40),
    };
    if (!catalog.quantityTypes[opts.quantityType]) throw new OrderError(`Please choose how many plates for ${plate.name}.`);
    if (!catalog.plateSizes[opts.plateSize]) throw new OrderError(`Invalid plate size for ${plate.name}.`);
    if (!catalog.fixingKits[opts.fixingKit]) throw new OrderError(`Invalid fixing kit for ${plate.name}.`);
    if (!catalog.lipColours[opts.lipColour]) throw new OrderError(`Invalid lip colour for ${plate.name}.`);
    if (!catalog.logoColours[opts.logoColour]) throw new OrderError(`Invalid logo colour for ${plate.name}.`);
    if (opts.plateSize === 'custom' && !opts.customSize) throw new OrderError(`Please enter the custom size for ${plate.name}.`);

    const registration = clean(item.plateText, 20).toUpperCase();
    if (!REG_PATTERN.test(registration)) {
        throw new OrderError(`"${registration}" is not a valid registration. Use letters, numbers and spaces only.`);
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
        throw new OrderError(`Quantity must be between 1 and ${MAX_QTY}.`);
    }

    const qt = catalog.quantityTypes[opts.quantityType];
    return {
        plate,
        opts,
        registration,
        quantity,
        plateCount: qt.plates * quantity,
        unitAmount: linePrice(plate, opts),
    };
}

// Returns a validated order: { items, fulfilment, fitting, plateCount, customer, notes }
export function validateOrder(body) {
    if (!body || typeof body !== 'object') throw new OrderError('Invalid request.');

    const { items, fulfilment, fitting } = body;
    if (!Array.isArray(items) || items.length === 0) throw new OrderError('Your basket is empty.');
    if (items.length > MAX_LINES) throw new OrderError(`Maximum ${MAX_LINES} items per order.`);
    if (fulfilment !== 'collection' && fulfilment !== 'delivery') {
        throw new OrderError('Please choose collection or delivery.');
    }
    if (fitting && fulfilment !== 'collection') {
        throw new OrderError('Fitting is only available with collection.');
    }

    const c = body.customer || {};
    const customer = {
        fullName: clean(c.fullName, 100),
        email: clean(c.email, 200),
        phone: clean(c.phone, 20),
        address: fulfilment === 'delivery' ? clean(c.address, 200) : '',
        postcode: fulfilment === 'delivery' ? clean(c.postcode, 10).toUpperCase() : '',
    };
    if (!customer.fullName) throw new OrderError('Please enter your full name.');
    if (!EMAIL_PATTERN.test(customer.email)) throw new OrderError('Please enter a valid email address.');
    if (!PHONE_PATTERN.test(customer.phone)) throw new OrderError('Please enter a valid phone number.');
    if (fulfilment === 'delivery' && (!customer.address || !customer.postcode)) {
        throw new OrderError('Please enter your delivery address and postcode.');
    }

    const validated = items.map(validateItem);
    const plateCount = validated.reduce((n, i) => n + i.plateCount, 0);
    return {
        items: validated,
        fulfilment,
        fitting: Boolean(fitting),
        plateCount,
        customer,
        notes: clean(body.notes, 450),
    };
}

export function describeItem(item) {
    const { opts } = item;
    const size = opts.plateSize === 'custom'
        ? `Custom (${opts.customSize})`
        : catalog.plateSizes[opts.plateSize].label;
    return [
        `${item.quantity} x ${item.plate.name}`,
        catalog.quantityTypes[opts.quantityType].label,
        item.registration,
        size,
        catalog.fixingKits[opts.fixingKit].label,
        `Lip: ${catalog.lipColours[opts.lipColour]}`,
        `Logo: ${catalog.logoColours[opts.logoColour]}`,
    ].join(' | ');
}

export { catalog };
