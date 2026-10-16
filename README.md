# The Plate Shop - Custom Number Plates Website

A modern, responsive website for The Plate Shop, specializing in premium UK-legal 3D & 4D custom number plates.

## Features

- **Fully Responsive Design**: Optimized for both mobile and desktop devices
- **Modern UI/UX**: Clean, professional design with smooth animations
- **Multiple Plate Types**: Showcase of 8 different plate styles
- **Smooth Navigation**: Sticky navbar with smooth scrolling
- **Mobile Menu**: Hamburger menu for mobile devices
- **Sections Included**:
  - Hero section with call-to-action buttons
  - Plate type selection grid
  - About/Who We Are section
  - Why Drivers Trust Us section
  - Customer testimonials section
  - Footer with contact information

## Online Ordering (Stripe + Netlify)

Customers configure plates on `product.html` (size, front/rear/pair, fixing kit, colours, registration), review them in `basket.html`, choose free click & collect (same-day available, optional fitting at £9.99 per plate) or tracked delivery (free same/next-day in Oldham postcodes, £9.99 and 2-3 days elsewhere; the free districts are listed in `data/catalog.json`), then pay on Stripe Checkout. Paid orders appear in Stripe Dashboard > Payments; each payment's metadata lists every plate plus the customer's name, phone, address, notes, collection/delivery and fitting.

How it fits together:

- **Prices** live in `data/catalog.json` (in pence). The website reads them from there, and `netlify/functions/checkout.mjs` recalculates every order from the same file, so prices can't be changed from the browser.
- `netlify/functions/webhook.mjs` verifies Stripe events and logs each paid order (Netlify > Logs > Functions). Add email/SMS notifications here.
- `netlify/functions/session.mjs` powers the confirmation on `success.html`.

### Setup

1. In [Netlify](https://app.netlify.com/start), import the GitHub repo. Settings come from `netlify.toml`, so leave the build command empty.
2. In Netlify > Site configuration > Environment variables, add:
   - `STRIPE_SECRET_KEY`: from Stripe Dashboard > Developers > API keys (start with `sk_test_...`)
   - `STRIPE_WEBHOOK_SECRET`: see step 3
3. In Stripe Dashboard > Developers > Webhooks, add the endpoint `https://<your-site>/api/webhook` with events `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`, then redeploy.
4. In Stripe > Settings > Customer emails, turn on **Successful payments** so customers get receipts.
5. Test with card `4242 4242 4242 4242`, then swap to live keys and a live webhook when ready.

### Local development

```bash
npm install
npx netlify dev
stripe listen --forward-to localhost:8888/api/webhook
```

Copy `.env.example` to `.env` and fill in your test keys.

## Technologies Used

- HTML5
- CSS3 (with CSS Grid and Flexbox)
- Vanilla JavaScript
- Stripe Checkout + Netlify Functions (Node.js)
- Google Fonts (Playfair Display & Inter)

## Getting Started

1. Open `index.html` in your web browser
2. No build process or dependencies required - it's a static website

## File Structure

```
ThePlateShop/
├── index.html              # Main HTML file
├── README.md               # This file
├── css/
│   └── styles.css          # All styling and responsive design
├── js/
│   └── script.js          # JavaScript for interactivity
├── images/                # All website images
│   ├── *.jpeg            # Product and hero images
│   ├── *.png             # Icons and logos
│   └── *.jpg             # Background images
├── python/                # Python extraction scripts
│   ├── extract_images.py
│   ├── extract_images_v2.py
│   └── extract_simple.py
└── old_version/           # Archived files
    └── THE PLATE SHOP.mhtml
```

## Customization

### Colors
The color scheme can be customized in `styles.css` using CSS variables:
- `--primary-gold`: #D4AF37
- `--primary-black`: #000000
- `--primary-white`: #FFFFFF

### Images
Replace placeholder images by updating the `background-image` URLs in `styles.css`:
- Hero section background
- About section image
- Trust section image
- Testimonials background

### Content
All content can be edited directly in `index.html`.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Notes

- The website uses placeholder images from Unsplash. Replace these with your actual product images.
- Plate placeholders are styled with CSS. Consider adding actual plate images for better visual representation.
- Contact information in the footer should be updated with real contact details.

## Future Enhancements

- Add a contact form
- Implement a plate customization tool
- Include a gallery of customer plates
- Add more detailed product pages

"# the-plate-shop" 
