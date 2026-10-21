const BASKET_KEY = 'plate_shop_basket_v1';

const MAX_LINE_QTY = 10;
const REG_PATTERN = /^[A-Z0-9 ]{1,10}$/;

// Prices live in data/catalog.json, shared with the server, which recalculates every order.
let PRICES = null;

function loadPrices() {
    if (!loadPrices.promise) {
        loadPrices.promise = fetch('data/catalog.json', { cache: 'no-cache' })
            .then(res => {
                if (!res.ok) throw new Error('Price list unavailable');
                return res.json();
            })
            .then(data => {
                PRICES = data;
                return data;
            });
    }
    return loadPrices.promise;
}

const PRODUCT_CATALOG = {
    '4d-acrylic': { name: '4D 3mm Acrylic Plates', image: 'images/4d-3mm-plates.webp', description: '3mm laser-cut acrylic characters raised off the plate for a sharp, solid edge.', features: ['3mm raised acrylic characters', 'Weather-resistant acrylic', 'Road legal options available'] },
    '4d-6mm': { name: '4D 6mm Acrylic Plates', image: 'images/4d-6mm-plates.jpg', description: 'Thicker 6mm acrylic characters for extra depth and a bold, chunky look.', features: ['6mm raised acrylic characters', 'Maximum depth', 'Sold as a pair'] },
    'acrylic-coloured': { name: 'Acrylic Coloured Plates', image: 'images/acrylic-coloured-plates.webp', description: '4D acrylic characters with a coloured layer to match or contrast your car.', features: ['Coloured acrylic layer', 'Laser-cut 4D characters', 'Sold as a pair'] },
    tinted: { name: 'Tinted Plates', image: 'images/Tinted Plates.jpeg', description: 'Smoked finish for a sharp show-car appearance.', features: ['Smoked aesthetic', 'Premium finish', 'Show plates only'] },
    '4d-gel': { name: '4D Gel Plates', image: 'images/4d gell plates.jpg', description: 'Raised characters with a high-gloss gel finish for extra depth and shine.', features: ['High gloss finish', 'Raised character depth', 'Durable materials'] },
    '4d-gel-6mm': { name: '4D Gel 6mm Plates', image: 'images/4d-gel-6mm-plates.webp', description: '6mm raised characters finished with high-gloss gel for maximum depth and shine.', features: ['6mm raised characters', 'High-gloss gel finish', 'Sold as a pair'] },
    '3d-gel': { name: '3D Gel Plates', image: 'images/3d-gel-plates.jpg', description: 'Domed gel resin characters with a glossy, raised finish.', features: ['3D resin effect', 'UV resistant', 'Clean premium finish'] },
    '2d-standard': { name: 'Standard 2D Plates', image: 'images/Standard Plates.jpg', description: 'Classic and clean number plate style for daily use.', features: ['Clean 2D format', 'Budget-friendly', 'Reliable quality'] },
    retro: { name: 'Retro (Bevelled Effect) Plates', image: 'images/retro plates.jpeg', description: 'Retro bevel style with a premium old-school edge.', features: ['Bevelled look', 'Premium styling', 'Sold as a pair'] }
};

function escapeHTML(value) {
    const div = document.createElement('div');
    div.textContent = String(value ?? '');
    return div.innerHTML;
}

function formatGBP(value) {
    return `£${Number(value || 0).toFixed(2)}`;
}

const BASKET_LABELS = {
    plateSize: {
        standard: 'Standard 20.5"',
        'short-7': '18" (7 Digit Short)',
        'short-6': '16" (6 Digit Short)',
        'short-5': '13" (5 Digit Short)',
        oversize: 'Oversize 21" x 6"',
        custom: 'Custom Size'
    },
    plateShape: {
        standard: 'Standard',
        hex: 'Hex (+£7.50 per plate)'
    },
    border: {
        none: 'No border',
        border: 'Border (+£2.00 per plate)'
    },
    plateType: {
        legal: 'Legal plate',
        show: 'Show plate'
    },
    tint: {
        none: 'No tint',
        tinted: 'Tinted (+£10.00)'
    },
    fixingKit: {
        sticky: 'Sticky Pads (Free)',
        screws: 'Screws Pack (+£2.00)',
        none: 'Not Required'
    },
    quantityType: {
        'rear-only': 'Rear Plate (1 plate)',
        'front-only': 'Front Plate (1 plate)',
        'front-back': 'Front + Rear (2 plates)'
    },
    colour: {
        'matte-black': 'Matte Black',
        'gloss-black': 'Gloss Black',
        'matte-grey': 'Matte Grey',
        black: 'Black',
        white: 'White',
        red: 'Red',
        blue: 'Blue',
        gold: 'Gold'
    }
};

function formatBasketLabel(group, value) {
    return BASKET_LABELS[group]?.[value] || value || '—';
}

function formatBasketOptions(item) {
    const opts = item.options || {};
    const sizeLabel = opts.plateSize === 'custom' && opts.customSize
        ? `Custom (${opts.customSize})`
        : formatBasketLabel('plateSize', opts.plateSize);
    return {
        size: sizeLabel,
        shape: formatBasketLabel('plateShape', opts.plateShape || 'standard'),
        border: formatBasketLabel('border', opts.border || 'none'),
        plateType: formatBasketLabel('plateType', opts.plateType || 'legal'),
        tint: formatBasketLabel('tint', opts.tint || 'none'),
        set: formatBasketLabel('quantityType', opts.quantityType),
        fixing: formatBasketLabel('fixingKit', opts.fixingKit),
        logo: formatBasketLabel('colour', opts.logoColour)
    };
}

function showBasketFeedback(node, message, type = 'success') {
    node.classList.remove('visible', 'is-error', 'is-success');
    node.textContent = message;
    void node.offsetWidth;
    node.classList.add('visible', type === 'error' ? 'is-error' : 'is-success');
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function getBasket() {
    try {
        const raw = localStorage.getItem(BASKET_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        return [];
    }
}

function setBasket(items) {
    localStorage.setItem(BASKET_KEY, JSON.stringify(items));
}

function addToBasket(item) {
    const basket = getBasket();
    basket.push(item);
    setBasket(basket);
}

function removeFromBasket(lineId) {
    const basket = getBasket().filter(item => item.id !== lineId);
    setBasket(basket);
}

function updateBasketQty(lineId, nextQty) {
    const basket = getBasket().map(item => {
        if (item.id === lineId) {
            return { ...item, quantity: Math.min(MAX_LINE_QTY, Math.max(1, Math.floor(Number(nextQty)) || 1)) };
        }
        return item;
    });
    setBasket(basket);
}

function renderBasketCount() {
    const count = getBasket().reduce((total, item) => total + (Number(item.quantity) || 1), 0);
    document.querySelectorAll('[data-cart-count]').forEach(node => {
        const previous = Number(node.dataset.countValue || 0);
        node.textContent = String(count);
        node.dataset.countValue = String(count);
        if (count !== previous) {
            node.classList.remove('cart-count--bump');
            void node.offsetWidth;
            node.classList.add('cart-count--bump');
            node.addEventListener('animationend', () => {
                node.classList.remove('cart-count--bump');
            }, { once: true });
        }
    });
}

function renderCartDropdownPreview() {
    const previewNodes = document.querySelectorAll('[data-cart-preview]');
    if (!previewNodes.length) return;

    const items = getBasket();
    const previewItems = items.slice(0, 4);

    previewNodes.forEach(node => {
        if (!items.length) {
            node.innerHTML = '<p class="cart-preview-empty">Your basket is empty.</p>';
            return;
        }

        node.innerHTML = previewItems.map(item => {
            const qty = Number(item.quantity) || 1;
            const lineTotal = qty * Number(item.unitPrice || 0);
            return `
                <div class="cart-preview-item">
                    <div>
                        <div class="cart-preview-name">${item.productName}</div>
                        <div class="cart-preview-meta">Qty ${qty} · ${item.plateText}</div>
                    </div>
                    <div class="cart-preview-price">${formatGBP(lineTotal)}</div>
                </div>
            `;
        }).join('');

        if (items.length > 4) {
            node.innerHTML += `<p class="cart-preview-meta">+${items.length - 4} more item(s)</p>`;
        }
    });
}

function refreshCartUI() {
    renderBasketCount();
    renderCartDropdownPreview();
}

function closeCartDropdown() {
    document.querySelectorAll('.cart-dropdown').forEach(dropdown => {
        if (!dropdown.classList.contains('is-open')) {
            dropdown.hidden = true;
            return;
        }
        dropdown.classList.remove('is-open');
        const onEnd = event => {
            if (event.target !== dropdown || event.propertyName !== 'opacity') return;
            dropdown.hidden = true;
            dropdown.removeEventListener('transitionend', onEnd);
        };
        dropdown.addEventListener('transitionend', onEnd);
    });
    document.querySelectorAll('.cart-toggle').forEach(toggle => {
        toggle.setAttribute('aria-expanded', 'false');
    });
}

function openCartDropdown(dropdown, toggle) {
    dropdown.hidden = false;
    renderCartDropdownPreview();
    requestAnimationFrame(() => {
        dropdown.classList.add('is-open');
    });
    toggle.setAttribute('aria-expanded', 'true');
}

function getProductFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('product');
    const slug = PRODUCT_CATALOG[requested] ? requested : '4d-acrylic';
    return { slug, product: PRODUCT_CATALOG[slug] };
}

// Mirrors linePrice() in netlify/lib/order.mjs. Returns amounts in pounds.
function calculateConfiguredPrice(slug, options) {
    const plate = PRICES.plates[slug];
    const qt = PRICES.quantityTypes[options.quantityType] || PRICES.quantityTypes['rear-only'];
    const platesCost = plate[qt.price];
    const perPlate = (group, key) => (PRICES[group][key]?.perPlate || 0) * qt.plates;
    const sizeCost = perPlate('plateSizes', options.plateSize);
    const shapeCost = perPlate('plateShapes', options.plateShape || 'standard');
    const borderCost = perPlate('borders', options.border || 'none');
    const fixingCost = perPlate('fixingKits', options.fixingKit);
    // Tint is charged once per set (mirrors linePrice() on the server)
    const tintCost = plate.tintIncluded ? 0 : (PRICES.tints[options.tint || 'none']?.perSet || 0);
    return {
        available: platesCost != null,
        platesCost: platesCost / 100,
        sizeCost: sizeCost / 100,
        shapeCost: shapeCost / 100,
        borderCost: borderCost / 100,
        fixingCost: fixingCost / 100,
        tintCost: tintCost / 100,
        plates: qt.plates,
        total: (platesCost + sizeCost + shapeCost + borderCost + fixingCost + tintCost) / 100
    };
}

function plateCountForItem(item) {
    const qt = PRICES.quantityTypes[item.options?.quantityType];
    return (qt ? qt.plates : 1) * (Number(item.quantity) || 1);
}

// Baskets saved before a price change keep their old unitPrice; refresh them from the price list.
function repriceBasket() {
    const basket = getBasket().map(item => {
        if (!PRICES.plates[item.productSlug]) return item;
        const calc = calculateConfiguredPrice(item.productSlug, item.options || {});
        // e.g. a single plate of a style that is now pair-only: leave it for checkout to flag
        if (!calc.available) return item;
        return { ...item, unitPrice: calc.total, image: PRODUCT_CATALOG[item.productSlug]?.image || item.image };
    });
    setBasket(basket);
}

// Mirrors normalisePostcode() / deliveryPrice() in netlify/lib/order.mjs
function normalisePostcode(value) {
    const compact = String(value || '').toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(compact)) return '';
    return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

function deliveryPriceFor(postcode) {
    const district = postcode.split(' ')[0];
    return PRICES.delivery.freePostcodeDistricts.includes(district) ? 0 : PRICES.delivery.price;
}

function normaliseRegistration(value) {
    return String(value || '').toUpperCase().replace(/\s+/g, ' ').trim();
}

function syncQuantityCards(root) {
    const cards = root.querySelectorAll('.quantity-card');
    cards.forEach(card => {
        const input = card.querySelector('input[name="quantityType"]');
        card.classList.toggle('is-selected', Boolean(input && input.checked));
    });
}

function getNavBarHeight() {
    const navbar = document.querySelector('.navbar');
    return navbar ? navbar.offsetHeight : 70;
}

function setMobileMenuOffset() {
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu || window.innerWidth > 768) return;
    navMenu.style.top = `${getNavBarHeight()}px`;
}

function closeMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const backdrop = document.querySelector('.nav-backdrop');
    if (!menuToggle || !navMenu) return;

    navMenu.classList.remove('active');
    document.body.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');

    if (backdrop) {
        backdrop.hidden = true;
        backdrop.setAttribute('aria-hidden', 'true');
    }

    const spans = menuToggle.querySelectorAll('span');
    spans[0].style.transform = '';
    spans[1].style.opacity = '';
    spans[2].style.transform = '';
}

function openMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const backdrop = document.querySelector('.nav-backdrop');
    if (!menuToggle || !navMenu) return;

    closeCartDropdown();
    setMobileMenuOffset();
    navMenu.classList.add('active');
    document.body.classList.add('menu-open');
    menuToggle.setAttribute('aria-expanded', 'true');

    if (backdrop) {
        backdrop.hidden = false;
        backdrop.setAttribute('aria-hidden', 'false');
    }

    const spans = menuToggle.querySelectorAll('span');
    spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
    spans[1].style.opacity = '0';
    spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
}

function initNavigation() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const backdrop = document.querySelector('.nav-backdrop');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            if (navMenu.classList.contains('active')) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });

        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => closeMobileMenu());
        });
    }

    if (backdrop) {
        backdrop.addEventListener('click', () => closeMobileMenu());
    }

    window.addEventListener('resize', setMobileMenuOffset);
    setMobileMenuOffset();

    initHomeNavbarScroll();
    initScrollSpy();

    document.querySelectorAll('.cart-toggle').forEach(toggle => {
        const widget = toggle.closest('.cart-widget');
        const dropdown = widget?.querySelector('.cart-dropdown');
        if (!dropdown) return;

        toggle.addEventListener('click', event => {
            event.stopPropagation();
            const isOpen = dropdown.classList.contains('is-open');
            closeMobileMenu();
            closeCartDropdown();
            if (!isOpen) {
                openCartDropdown(dropdown, toggle);
            }
        });
    });

    document.addEventListener('click', event => {
        if (!event.target.closest('.cart-widget')) {
            closeCartDropdown();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeCartDropdown();
            closeMobileMenu();
        }
    });
}

function initHomeNavbarScroll() {
    const navbar = document.querySelector('.navbar:not(.navbar--solid)');
    if (!navbar) return;

    const updateNavbar = () => {
        navbar.classList.toggle('navbar-scrolled', window.scrollY > 60);
    };

    updateNavbar();
    window.addEventListener('scroll', updateNavbar, { passive: true });
}

function initScrollSpy() {
    const navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');
    if (!navLinks.length) return;

    const sections = Array.from(navLinks)
        .map(link => {
            const id = link.getAttribute('href').slice(1);
            const section = document.getElementById(id);
            return section ? { link, section } : null;
        })
        .filter(Boolean);

    if (!sections.length) return;

    const updateActiveLink = () => {
        const scrollPos = window.scrollY + 140;
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80;
        let current = sections[0];

        if (atBottom) {
            current = sections[sections.length - 1];
        } else {
            sections.forEach(entry => {
                if (entry.section.offsetTop <= scrollPos) {
                    current = entry;
                }
            });
        }

        navLinks.forEach(link => link.classList.remove('active'));
        if (current) {
            current.link.classList.add('active');
        }
    };

    updateActiveLink();
    window.addEventListener('scroll', updateActiveLink, { passive: true });
}

function initFooterYear() {
    document.querySelectorAll('[data-year]').forEach(node => {
        node.textContent = String(new Date().getFullYear());
    });
}

function initProductPage() {
    const form = document.getElementById('productOrderForm');
    if (!form) return;

    const { slug, product } = getProductFromQuery();
    document.getElementById('productTitle').textContent = product.name;
    document.getElementById('productDescription').textContent = product.description;
    document.getElementById('productImage').src = product.image;
    document.getElementById('productImage').alt = product.name;
    const plate = PRICES.plates[slug];
    const pairOnly = plate.single == null;
    document.getElementById('productBaseLabel').textContent = pairOnly ? 'Pair' : 'From';
    document.getElementById('productBasePrice').textContent = formatGBP((pairOnly ? plate.pair : plate.single) / 100);
    document.querySelectorAll('[data-quantity-price]').forEach(node => {
        const qt = PRICES.quantityTypes[node.dataset.quantityPrice];
        const card = node.closest('.quantity-card');
        if (plate[qt.price] == null) {
            card.hidden = true;
            card.querySelector('input').disabled = true;
            return;
        }
        node.textContent = formatGBP(plate[qt.price] / 100);
    });
    if (pairOnly) {
        form.querySelector('input[name="quantityType"][value="front-back"]').checked = true;
        form.querySelector('.quantity-cards').classList.add('quantity-cards--single');
        document.getElementById('productPairOnlyNote').hidden = false;
    }
    const featureList = document.getElementById('productFeatures');
    featureList.innerHTML = '';
    product.features.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        featureList.appendChild(li);
    });

    const sizeInput = document.getElementById('productPlateSize');
    const shapeInput = document.getElementById('productPlateShape');
    const legalInput = form.querySelector('input[name="plateType"][value="legal"]');
    const showInput = form.querySelector('input[name="plateType"][value="show"]');
    const tintGroup = document.getElementById('productTintGroup');
    const radioValue = (name, fallback) => form.querySelector(`input[name="${name}"]:checked`)?.value || fallback;
    const customSizeGroup = document.getElementById('productCustomSizeGroup');
    const customSizeInput = document.getElementById('productCustomSize');
    const successBox = document.getElementById('productAddSuccess');

    const summaryBase = document.getElementById('productSummaryBase');
    const summarySize = document.getElementById('productSummarySize');
    const summaryShape = document.getElementById('productSummaryShape');
    const summaryBorder = document.getElementById('productSummaryBorder');
    const summaryTint = document.getElementById('productSummaryTint');
    const summaryFixing = document.getElementById('productSummaryFixing');
    const summaryQuantity = document.getElementById('productSummaryQuantity');
    const summaryTotal = document.getElementById('productSummaryTotal');
    const mobileTotal = document.getElementById('productMobileTotal');

    function scrollProductFeedbackIntoView() {
        if (window.innerWidth <= 768 && successBox) {
            successBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function selectedOptions() {
        return {
            plateSize: sizeInput.value || 'standard',
            plateShape: shapeInput.value || 'standard',
            border: radioValue('border', 'none'),
            plateType: radioValue('plateType', 'legal'),
            tint: plate.tintIncluded ? 'none' : radioValue('tint', 'none'),
            fixingKit: radioValue('fixingKit', 'sticky'),
            quantityType: form.querySelector('input[name="quantityType"]:checked')?.value || 'rear-only'
        };
    }

    function updatePrice() {
        const options = selectedOptions();
        const calc = calculateConfiguredPrice(slug, options);
        summaryBase.textContent = formatGBP(calc.platesCost);
        summarySize.textContent = formatGBP(calc.sizeCost);
        summaryShape.textContent = formatGBP(calc.shapeCost);
        summaryBorder.textContent = formatGBP(calc.borderCost);
        summaryTint.textContent = formatGBP(calc.tintCost);
        summaryFixing.textContent = formatGBP(calc.fixingCost);
        summaryQuantity.textContent = calc.plates === 1 ? '1 plate' : `${calc.plates} plates`;
        summaryTotal.textContent = formatGBP(calc.total);
        if (mobileTotal) mobileTotal.textContent = formatGBP(calc.total);
        return calc;
    }

    function toggleCustomSize() {
        if (sizeInput.value === 'custom') {
            customSizeGroup.style.display = 'block';
            customSizeInput.required = true;
        } else {
            customSizeGroup.style.display = 'none';
            customSizeInput.required = false;
            customSizeInput.value = '';
        }
    }

    // Tinted plates (and the Tinted Plates style) are show plates only
    function syncPlateType() {
        const showOnly = plate.showOnly || radioValue('tint', 'none') === 'tinted';
        if (showOnly) showInput.checked = true;
        legalInput.disabled = showOnly;
        legalInput.closest('.pill').classList.toggle('is-disabled', showOnly);
        const isShow = radioValue('plateType', 'legal') === 'show';
        document.getElementById('productLegalNote').hidden = isShow;
        document.getElementById('productShowNote').hidden = !isShow;
    }

    form.addEventListener('change', event => {
        if (event.target.name === 'quantityType') syncQuantityCards(form);
        toggleCustomSize();
        syncPlateType();
        updatePrice();
    });

    form.addEventListener('submit', event => {
        event.preventDefault();
        successBox.classList.remove('visible');

        const plateText = normaliseRegistration(document.getElementById('productPlateText').value);
        if (!REG_PATTERN.test(plateText)) {
            successBox.classList.add('visible');
            successBox.textContent = plateText
                ? 'Registration can only contain letters, numbers and spaces (max 10 characters).'
                : 'Please enter registration text before adding to basket.';
            scrollProductFeedbackIntoView();
            return;
        }
        if (sizeInput.value === 'custom' && !customSizeInput.value.trim()) {
            successBox.classList.add('visible');
            successBox.textContent = 'Please enter your custom plate size.';
            scrollProductFeedbackIntoView();
            return;
        }

        const options = selectedOptions();
        const calc = calculateConfiguredPrice(slug, options);
        const lineItem = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            productSlug: slug,
            productName: product.name,
            image: product.image,
            quantity: 1,
            plateText,
            options: {
                ...options,
                customSize: customSizeInput.value.trim(),
                request: document.getElementById('productRequest').value.trim(),
                logoColour: document.getElementById('productLogoColour').value
            },
            unitPrice: calc.total
        };
        addToBasket(lineItem);
        refreshCartUI();
        successBox.classList.add('visible');
        successBox.textContent = `${product.name} added to basket (${formatGBP(calc.total)}).`;
        scrollProductFeedbackIntoView();
    });

    if (plate.tintIncluded) tintGroup.hidden = true;
    syncQuantityCards(form);
    toggleCustomSize();
    syncPlateType();
    updatePrice();
}

function initBasketPage() {
    const basketNode = document.getElementById('basketItems');
    if (!basketNode) return;

    const basketEmptyState = document.getElementById('basketEmptyState');
    const itemCountNode = document.getElementById('basketItemCount');
    const subtotalNode = document.getElementById('basketSubtotal');
    const totalNode = document.getElementById('basketGrandTotal');
    const successBox = document.getElementById('basketOrderSuccess');
    const checkoutForm = document.getElementById('basketCheckoutForm');
    const placeOrderBtn = document.getElementById('basketPlaceOrderBtn');
    const fittingInput = document.getElementById('checkoutFitting');
    const fittingGroup = document.getElementById('checkoutFittingGroup');
    const addressGroup = document.getElementById('checkoutAddressGroup');
    const fittingLine = document.getElementById('basketFittingLine');
    const fittingTotalNode = document.getElementById('basketFittingTotal');
    const deliveryLabelNode = document.getElementById('basketDeliveryLabel');
    const deliveryTotalNode = document.getElementById('basketDeliveryTotal');
    const postcodeInput = document.getElementById('checkoutPostcode');
    const postcodeHint = document.getElementById('checkoutPostcodeHint');
    let previousItemIds = new Set();

    function selectedFulfilment() {
        return checkoutForm.querySelector('input[name="fulfilment"]:checked')?.value || 'collection';
    }

    function basketTotals(items) {
        const itemCount = items.reduce((t, i) => t + (Number(i.quantity) || 1), 0);
        const plateCount = items.reduce((t, i) => t + plateCountForItem(i), 0);
        const subtotal = items.reduce((t, i) => t + ((Number(i.quantity) || 1) * Number(i.unitPrice || 0)), 0);
        const isDelivery = selectedFulfilment() === 'delivery';
        const fitting = !isDelivery && fittingInput.checked ? plateCount * PRICES.fittingPerPlate / 100 : 0;
        const postcode = normalisePostcode(postcodeInput.value);
        // Until a valid postcode is entered, assume the standard delivery charge
        const delivery = isDelivery && items.length
            ? (postcode ? deliveryPriceFor(postcode) : PRICES.delivery.price) / 100
            : 0;
        return { itemCount, plateCount, subtotal, fitting, delivery, postcode, total: subtotal + fitting + delivery };
    }

    // Show only the fields that apply to collection or delivery, then refresh the totals
    function syncFulfilment() {
        const isDelivery = selectedFulfilment() === 'delivery';
        addressGroup.hidden = !isDelivery;
        addressGroup.querySelectorAll('input').forEach(input => { input.required = isDelivery; });
        fittingGroup.hidden = isDelivery;
        if (isDelivery) fittingInput.checked = false;
        renderTotals();
    }

    function renderTotals() {
        const totals = basketTotals(getBasket());
        itemCountNode.textContent = String(totals.itemCount);
        subtotalNode.textContent = formatGBP(totals.subtotal);
        fittingLine.hidden = !totals.fitting;
        fittingTotalNode.textContent = `${formatGBP(totals.fitting)}`;
        const isDelivery = selectedFulfilment() === 'delivery';
        const freeDelivery = isDelivery && totals.postcode && totals.delivery === 0;
        deliveryLabelNode.textContent = isDelivery
            ? (freeDelivery ? `Delivery (${PRICES.delivery.freeAreaName}, same/next day)` : 'Delivery (2–3 days)')
            : 'Click & Collect';
        deliveryTotalNode.textContent = isDelivery && totals.delivery ? formatGBP(totals.delivery) : 'Free';
        if (!isDelivery || !postcodeInput.value.trim()) {
            postcodeHint.textContent = '';
        } else if (!totals.postcode) {
            postcodeHint.textContent = 'Enter a full UK postcode to check delivery.';
        } else {
            postcodeHint.textContent = freeDelivery
                ? `Free same-day or next-day delivery to ${totals.postcode}.`
                : `Delivery to ${totals.postcode} is ${formatGBP(PRICES.delivery.price / 100)} and takes 2–3 days.`;
        }
        totalNode.textContent = formatGBP(totals.total);
        return totals;
    }

    function setCheckoutEnabled(enabled) {
        checkoutForm.classList.toggle('is-disabled', !enabled);
        placeOrderBtn.disabled = !enabled;
        checkoutForm.querySelectorAll('input, textarea, select, button').forEach(field => {
            if (field === placeOrderBtn) return;
            field.disabled = !enabled;
        });
    }

    function setBasketVisibility(hasItems) {
        basketEmptyState.classList.toggle('is-visible', !hasItems);
        basketEmptyState.classList.toggle('is-hidden', hasItems);
        basketNode.classList.toggle('is-visible', hasItems);
        basketNode.classList.toggle('is-hidden', !hasItems);
    }

    function renderBasket({ animateEnter = true } = {}) {
        const items = getBasket();
        const hasItems = items.length > 0;
        const currentIds = new Set(items.map(item => item.id));

        basketNode.innerHTML = '';
        setBasketVisibility(hasItems);

        items.forEach(item => {
            const lineTotal = (Number(item.quantity) || 1) * Number(item.unitPrice || 0);
            const labels = formatBasketOptions(item);
            const editHref = item.productSlug
                ? `product.html?product=${encodeURIComponent(item.productSlug)}`
                : 'index.html#plates';
            const row = document.createElement('article');
            row.className = 'basket-item';
            if (animateEnter && !previousItemIds.has(item.id)) {
                row.classList.add('basket-item--enter');
            }
            row.innerHTML = `
                <div class="basket-item-main">
                    <div class="basket-item-thumb">
                        <img src="${item.image}" alt="${item.productName}">
                    </div>
                    <div class="basket-item-intro">
                        <h3>${item.productName}</h3>
                        <p class="basket-item-registration">${item.plateText}</p>
                    </div>
                    <strong class="basket-item-total">${formatGBP(lineTotal)}</strong>
                </div>
                <a href="${editHref}" class="basket-edit-link">
                    <svg class="basket-edit-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/>
                    </svg>
                    <span>Edit configuration</span>
                </a>
                <dl class="basket-item-meta">
                    <div><dt>Type</dt><dd>${labels.plateType}</dd></div>
                    <div><dt>Size</dt><dd>${labels.size}</dd></div>
                    <div><dt>Shape</dt><dd>${labels.shape}</dd></div>
                    <div><dt>Border</dt><dd>${labels.border}</dd></div>
                    <div><dt>Tint</dt><dd>${labels.tint}</dd></div>
                    <div><dt>Set</dt><dd>${labels.set}</dd></div>
                    <div><dt>Fixing</dt><dd>${labels.fixing}</dd></div>
                    <div><dt>Logo colour</dt><dd>${labels.logo}</dd></div>
                </dl>
                ${item.options?.request ? `<p class="basket-item-request"><strong>Special request:</strong> ${escapeHTML(item.options.request)}</p>` : ''}
                <div class="basket-item-footer">
                    <label class="basket-qty-label">
                        <span>Qty</span>
                        <input class="basket-qty-input" type="number" min="1" max="${MAX_LINE_QTY}" value="${item.quantity}" data-qty-id="${item.id}" aria-label="Quantity for ${item.productName}">
                    </label>
                    <span class="basket-unit-price">${formatGBP(item.unitPrice)} each</span>
                    <button type="button" class="basket-remove-btn" data-remove-id="${item.id}">Remove</button>
                </div>
            `;
            basketNode.appendChild(row);
        });

        renderTotals();
        setCheckoutEnabled(hasItems);
        if (hasItems) syncFulfilment();
        previousItemIds = currentIds;
    }

    // Hand over to Stripe Checkout. The server re-prices everything.
    async function startStripeCheckout(order) {
        const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout. Please try again.');
        window.location.href = data.url;
    }


    basketNode.addEventListener('click', event => {
        const removeBtn = event.target.closest('[data-remove-id]');
        if (!removeBtn) return;
        const row = removeBtn.closest('.basket-item');
        const lineId = removeBtn.getAttribute('data-remove-id');
        if (!row) {
            removeFromBasket(lineId);
            renderBasket({ animateEnter: false });
            refreshCartUI();
            return;
        }
        row.classList.add('basket-item--exit');
        row.addEventListener('animationend', () => {
            removeFromBasket(lineId);
            renderBasket({ animateEnter: false });
            refreshCartUI();
        }, { once: true });
    });

    basketNode.addEventListener('change', event => {
        const qtyInput = event.target.closest('[data-qty-id]');
        if (!qtyInput) return;
        updateBasketQty(qtyInput.getAttribute('data-qty-id'), qtyInput.value);
        renderBasket({ animateEnter: false });
        refreshCartUI();
    });

    postcodeInput.addEventListener('input', renderTotals);

    checkoutForm.addEventListener('change', event => {
        if (['fulfilment', 'fitting'].includes(event.target.name)) syncFulfilment();
    });

    checkoutForm.addEventListener('submit', async event => {
        event.preventDefault();
        successBox.classList.remove('visible', 'is-error', 'is-success');
        void successBox.offsetWidth;
        const basket = getBasket();
        if (!basket.length) {
            showBasketFeedback(successBox, 'Your basket is empty. Add at least one product first.', 'error');
            return;
        }
        const fulfilment = selectedFulfilment();
        const customer = {
            fullName: document.getElementById('checkoutFullName').value.trim(),
            email: document.getElementById('checkoutEmail').value.trim(),
            phone: document.getElementById('checkoutPhone').value.trim(),
            postcode: document.getElementById('checkoutPostcode').value.trim(),
            address: document.getElementById('checkoutAddress').value.trim()
        };
        if (!customer.fullName) {
            showBasketFeedback(successBox, 'Please enter your full name.', 'error');
            return;
        }
        if (!validateEmail(customer.email)) {
            showBasketFeedback(successBox, 'Please enter a valid email address.', 'error');
            return;
        }
        if (!customer.phone) {
            showBasketFeedback(successBox, 'Please enter your phone number so we can text you about your order.', 'error');
            return;
        }
        if (fulfilment === 'delivery' && !customer.address) {
            showBasketFeedback(successBox, 'Please enter your delivery address.', 'error');
            return;
        }
        if (fulfilment === 'delivery' && !normalisePostcode(customer.postcode)) {
            showBasketFeedback(successBox, 'Please enter a valid UK postcode.', 'error');
            return;
        }

        const order = {
            customer,
            fulfilment,
            fitting: fulfilment === 'collection' && fittingInput.checked,
            notes: document.getElementById('checkoutNotes').value.trim(),
            items: basket
        };
        const buttonLabel = placeOrderBtn.textContent;
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = 'Redirecting…';

        try {
            await startStripeCheckout(order);
        } catch (error) {
            showBasketFeedback(successBox, error.message, 'error');
            placeOrderBtn.textContent = buttonLabel;
            placeOrderBtn.disabled = !getBasket().length;
        }
    });

    renderBasket({ animateEnter: false });
}

function initIndexPrices() {
    document.querySelectorAll('[data-price-for]').forEach(node => {
        const plate = PRICES.plates[node.dataset.priceFor];
        if (!plate) return;
        node.innerHTML = plate.single == null
            ? `
            <span class="plate-price-label">Pair</span>
            <span class="plate-price-main">${formatGBP(plate.pair / 100)}</span>
            <span class="plate-price-pair">Front &amp; rear</span>
        `
            : `
            <span class="plate-price-label">From</span>
            <span class="plate-price-main">${formatGBP(plate.single / 100)}</span>
            <span class="plate-price-pair">${formatGBP(plate.pair / 100)} a pair</span>
        `;
    });
}

function showPriceLoadError() {
    const node = document.getElementById('productAddSuccess') || document.getElementById('basketOrderSuccess');
    if (!node) return;
    node.classList.add('visible', 'is-error');
    node.textContent = 'Could not load prices. Please refresh the page.';
}

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    refreshCartUI();
    initFooterYear();
    loadPrices()
        .then(() => {
            repriceBasket();
            refreshCartUI();
            initIndexPrices();
            initProductPage();
            initBasketPage();
        })
        .catch(showPriceLoadError);
});

