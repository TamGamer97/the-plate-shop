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
    '4d-acrylic': { name: '4D Acrylic Plates', image: 'images/4d Acrylic Plates.jpeg', description: 'Deep-cut acrylic layers for a bold, standout look.', features: ['Road legal options available', 'Weather-resistant acrylic', 'Premium layered finish'] },
    'acrylic-coloured': { name: 'Acrylic Coloured Plates', image: 'images/Acrylic Coloured Plates.jpeg', description: 'A bold colour-accented style for a custom look.', features: ['Custom style accents', 'High-quality acrylic', 'Durable outdoor finish'] },
    tinted: { name: 'Tinted Plates', image: 'images/Tinted Plates.jpeg', description: 'Smoked finish for a sharp show-car appearance.', features: ['Smoked aesthetic', 'Premium finish', 'Show style build'] },
    short: { name: 'Short Plates', image: 'images/Short Plates.jpeg', description: 'Compact and stylish plates ideal for private registrations.', features: ['Compact format', 'Clean styling', 'Multiple size choices'] },
    '4d-gel': { name: '4D Gel Plates', image: 'images/4d gell plates.jpg', description: 'Unmatched depth, shine, and premium style.', features: ['High gloss finish', 'Raised character depth', 'Durable materials'] },
    '3d-gel': { name: '3D Gel Plates', image: 'images/3d gell plates.jpg', description: 'Sleek gel-character upgrade with premium look.', features: ['3D resin effect', 'UV resistant', 'Clean premium finish'] },
    '2d-standard': { name: 'Standard 2D Plates', image: 'images/Standard Plates.jpg', description: 'Classic and clean number plate style for daily use.', features: ['Clean 2D format', 'Budget-friendly', 'Reliable quality'] },
    retro: { name: 'Retro (Bevelled Effect) Plates', image: 'images/retro plates.jpeg', description: 'Retro bevel style with a premium old-school edge.', features: ['Bevelled look', 'Premium styling', 'Distinctive finish'] },
    hex: { name: 'Hex Plates', image: 'images/Hex Plates.jpg', description: 'Unique hexagonal style for a standout custom look.', features: ['Unique hex shape', 'Luxury custom style', 'Multiple finish compatibility'] }
};

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
        set: formatBasketLabel('quantityType', opts.quantityType),
        fixing: formatBasketLabel('fixingKit', opts.fixingKit),
        lip: formatBasketLabel('colour', opts.lipColour),
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
    const sizeCost = (PRICES.plateSizes[options.plateSize]?.perPlate || 0) * qt.plates;
    const fixingCost = (PRICES.fixingKits[options.fixingKit]?.perPlate || 0) * qt.plates;
    return {
        platesCost: platesCost / 100,
        sizeCost: sizeCost / 100,
        fixingCost: fixingCost / 100,
        plates: qt.plates,
        total: (platesCost + sizeCost + fixingCost) / 100
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
        return { ...item, unitPrice: calculateConfiguredPrice(item.productSlug, item.options || {}).total };
    });
    setBasket(basket);
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

function initIndexPage() {
    const page = document.querySelector('#plates');
    if (!page) return;
    document.querySelectorAll('.plate-card').forEach(card => {
        const link = card.querySelector('.plate-order-link');
        if (!link) return;
        card.addEventListener('click', event => {
            if (event.target.closest('.plate-order-link')) return;
            window.location.href = link.href;
        });
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
    document.getElementById('productBasePrice').textContent = formatGBP(PRICES.plates[slug].single / 100);
    document.querySelectorAll('[data-quantity-price]').forEach(node => {
        const qt = PRICES.quantityTypes[node.dataset.quantityPrice];
        node.textContent = formatGBP(PRICES.plates[slug][qt.price] / 100);
    });
    const featureList = document.getElementById('productFeatures');
    featureList.innerHTML = '';
    product.features.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        featureList.appendChild(li);
    });

    const sizeInput = document.getElementById('productPlateSize');
    const fixingInput = document.getElementById('productFixingKit');
    const customSizeGroup = document.getElementById('productCustomSizeGroup');
    const customSizeInput = document.getElementById('productCustomSize');
    const successBox = document.getElementById('productAddSuccess');

    const summaryBase = document.getElementById('productSummaryBase');
    const summarySize = document.getElementById('productSummarySize');
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
            fixingKit: fixingInput.value || 'sticky',
            quantityType: form.querySelector('input[name="quantityType"]:checked')?.value || 'rear-only'
        };
    }

    function updatePrice() {
        const options = selectedOptions();
        const calc = calculateConfiguredPrice(slug, options);
        summaryBase.textContent = formatGBP(calc.platesCost);
        summarySize.textContent = formatGBP(calc.sizeCost);
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

    form.addEventListener('change', event => {
        if (event.target.name === 'quantityType') syncQuantityCards(form);
        toggleCustomSize();
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
                lipColour: document.getElementById('productLipColour').value,
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

    syncQuantityCards(form);
    toggleCustomSize();
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
    let previousItemIds = new Set();

    function selectedFulfilment() {
        return checkoutForm.querySelector('input[name="fulfilment"]:checked')?.value || 'collection';
    }

    function selectedPaymentMethod() {
        return checkoutForm.querySelector('input[name="paymentMethod"]:checked')?.value || 'pay-now';
    }

    function basketTotals(items) {
        const itemCount = items.reduce((t, i) => t + (Number(i.quantity) || 1), 0);
        const plateCount = items.reduce((t, i) => t + plateCountForItem(i), 0);
        const subtotal = items.reduce((t, i) => t + ((Number(i.quantity) || 1) * Number(i.unitPrice || 0)), 0);
        const isDelivery = selectedFulfilment() === 'delivery';
        const fitting = !isDelivery && fittingInput.checked ? plateCount * PRICES.fittingPerPlate / 100 : 0;
        const delivery = isDelivery && items.length ? PRICES.delivery.price / 100 : 0;
        return { itemCount, plateCount, subtotal, fitting, delivery, total: subtotal + fitting + delivery };
    }

    // Show only the fields that apply to collection or delivery, then refresh the totals
    function syncFulfilment() {
        const isDelivery = selectedFulfilment() === 'delivery';
        addressGroup.hidden = !isDelivery;
        addressGroup.querySelectorAll('input').forEach(input => { input.required = isDelivery; });
        fittingGroup.hidden = isDelivery;
        if (isDelivery) fittingInput.checked = false;
        placeOrderBtn.textContent = selectedPaymentMethod() === 'pay-now' ? 'Pay Securely' : 'Place Order';
        renderTotals();
    }

    function renderTotals() {
        const totals = basketTotals(getBasket());
        itemCountNode.textContent = String(totals.itemCount);
        subtotalNode.textContent = formatGBP(totals.subtotal);
        fittingLine.hidden = !totals.fitting;
        fittingTotalNode.textContent = `${formatGBP(totals.fitting)}`;
        const isDelivery = selectedFulfilment() === 'delivery';
        deliveryLabelNode.textContent = isDelivery ? 'Delivery (2–3 days)' : 'Collection';
        deliveryTotalNode.textContent = isDelivery ? formatGBP(totals.delivery) : 'Free';
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
                    <div><dt>Size</dt><dd>${labels.size}</dd></div>
                    <div><dt>Set</dt><dd>${labels.set}</dd></div>
                    <div><dt>Fixing</dt><dd>${labels.fixing}</dd></div>
                    <div><dt>Lip colour</dt><dd>${labels.lip}</dd></div>
                    <div><dt>Logo colour</dt><dd>${labels.logo}</dd></div>
                </dl>
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

    function describeBasketItem(item) {
        const labels = formatBasketOptions(item);
        return `${item.quantity} x ${item.productName} | ${labels.set} | ${item.plateText} | ${labels.size} | ${labels.fixing} | Lip: ${labels.lip} | Logo: ${labels.logo}`;
    }

    // Pay now: hand over to Stripe Checkout. The server re-prices everything.
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

    // Pay on confirmation: saved as a Netlify Forms submission (see the hidden form in basket.html)
    async function submitPayLaterOrder(order, totals) {
        const { customer } = order;
        const body = new URLSearchParams({
            'form-name': 'pay-later-order',
            name: customer.fullName,
            email: customer.email,
            phone: customer.phone,
            fulfilment: order.fulfilment,
            address: order.fulfilment === 'delivery' ? `${customer.address}, ${customer.postcode}` : '',
            fitting: order.fitting ? `Yes (${totals.plateCount} plates)` : 'No',
            items: order.items.map(describeBasketItem).join('\n'),
            total: formatGBP(totals.total),
            notes: order.notes
        });
        const res = await fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });
        if (!res.ok) throw new Error('Could not send your order. Please try again or message us on WhatsApp.');
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

    checkoutForm.addEventListener('change', event => {
        if (['fulfilment', 'paymentMethod', 'fitting'].includes(event.target.name)) syncFulfilment();
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
        if (fulfilment === 'delivery' && (!customer.address || !customer.postcode)) {
            showBasketFeedback(successBox, 'Please enter your delivery address and postcode.', 'error');
            return;
        }

        const order = {
            customer,
            fulfilment,
            fitting: fulfilment === 'collection' && fittingInput.checked,
            notes: document.getElementById('checkoutNotes').value.trim(),
            items: basket
        };
        const paymentMethod = selectedPaymentMethod();
        const buttonLabel = placeOrderBtn.textContent;
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = paymentMethod === 'pay-now' ? 'Redirecting…' : 'Sending…';

        try {
            if (paymentMethod === 'pay-now') {
                await startStripeCheckout(order);
                return;
            }
            await submitPayLaterOrder(order, basketTotals(basket));
            showBasketFeedback(successBox, `Thanks ${customer.fullName.split(' ')[0]}, your order has been sent. We'll be in touch shortly to confirm and take payment.`, 'success');
            setBasket([]);
            checkoutForm.reset();
            renderBasket({ animateEnter: false });
            refreshCartUI();
        } catch (error) {
            showBasketFeedback(successBox, error.message, 'error');
        }
        placeOrderBtn.textContent = buttonLabel;
        placeOrderBtn.disabled = !getBasket().length;
    });

    renderBasket({ animateEnter: false });
}

function initIndexPrices() {
    document.querySelectorAll('.plate-card .plate-order-link').forEach(link => {
        const slug = new URL(link.href, window.location.href).searchParams.get('product');
        const plate = PRICES.plates[slug];
        if (!plate) return;
        const price = document.createElement('p');
        price.className = 'plate-price';
        price.textContent = `From ${formatGBP(plate.single / 100)} · Pair ${formatGBP(plate.pair / 100)}`;
        link.before(price);
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
    initIndexPage();
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

