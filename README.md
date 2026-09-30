# Death & Taxes Accounting - site redesign

A static rebuild of https://www.dataccounting.co with a refreshed look. All copy is word-for-word from the Wix site.

## Preview

Open `index.html` in a browser. No build step is needed.

## Pages

| File | Replaces (Wix URL) |
| --- | --- |
| `index.html` | `/` |
| `content-creators.html` | `/about-4` (add a redirect if you switch hosts) |
| `request-service.html` | `/request-service` |
| `accessibility-statement.html` | `/accessibility-statement` |
| `privacy-policy.html` | `/privacy-policy` |

## Before going live

- **Booking:** the "Let’s Work Together" button on `request-service.html` still points at the Wix Bookings calendar
  (`https://www.dataccounting.co/booking-calendar/free-consultation`). If the site moves off Wix, swap in a new scheduler link
  (Calendly, Cal.com, etc.).
- **Share image / schema:** `og:image` and the JSON-LD in `index.html` use absolute `https://www.dataccounting.co/...` URLs,
  so they only resolve once the site is served from that domain.

## Photo credits

The logo and the coastal-desk and creator-studio images come from the original site. The new photos are from Unsplash (free under the Unsplash License, and no attribution is required):

- `sea-oats-path.webp`: Adrian Botica, https://unsplash.com/photos/bMCZpADgVJE
- `consultation-documents.webp`: Olena Kholina, https://unsplash.com/photos/MhqUBTxQ3Hw
- `tax-forms-calculator.webp`: Kelly Sikkema, https://unsplash.com/photos/X2soeHdvkLY
