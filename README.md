# Death & Taxes Accounting - website

A rebuild of https://www.dataccounting.co with a refreshed look and its own consultation request form. All original copy is word-for-word from the Wix site.

Everything runs in one Cloudflare account on the free plan:

- **Static site** in `public/`, served by Cloudflare Workers static assets.
- **Contact form API** (`src/`): `POST /api/contact` blocks spam, validates the fields, saves the request, then emails it to the firm.
- **Database:** Cloudflare D1 keeps a backup copy of every request (`migrations/`).
- **Spam protection:** Cloudflare Turnstile, plus a hidden honeypot field.
- **Email:** Cloudflare Email Service. The binding can only email one verified address in the account (`Maura@dataccounting.co`), which is what keeps it free. Replies go straight to the person who wrote in.

Her Google Workspace mailbox is untouched. Email Sending only adds records on the `cf-bounce` subdomain plus a DMARC record, and it doesn't change the domain's MX records.

## Local development

```sh
npm install
cp .dev.vars.example .dev.vars   # Turnstile test keys
npm run db:migrate:local
npm run dev                      # http://localhost:8787 (emails are simulated and saved under .wrangler/tmp/email)
npm test
```

Pages use clean URLs (`/request-service`, `/content-creators`), so preview through `npm run dev` rather than opening the HTML files directly.

## Going live (one-time setup)

```sh
npx wrangler login

# Database
npx wrangler d1 create deathandtaxes             # paste the printed database_id into wrangler.toml
npm run db:migrate:remote

# Email: verify the recipient (she clicks the link in the email Cloudflare sends) and enable sending for the domain
npx wrangler email routing addresses create Maura@dataccounting.co
npx wrangler email sending enable dataccounting.co

# Spam check: create a widget, put its site key in TURNSTILE_SITE_KEY (wrangler.toml), then store the secret
npx wrangler turnstile widget create ...
npx wrangler secret put TURNSTILE_SECRET_KEY

npm run deploy                                   # live at https://deathandtaxes.<account>.workers.dev
```

For automatic deploys on every push to GitHub, connect the repo under Workers & Pages in the Cloudflare dashboard.

**Domain:** when she's ready to leave Wix, add `dataccounting.co` as a custom domain on the Worker. The old Wix URLs (`/request-service`, `/privacy-policy`, `/accessibility-statement`) keep working, and `/about-4` redirects to `/content-creators`.

## Viewing saved requests

Every request is emailed, and a copy is also kept in D1. To see recent ones:

```sh
npx wrangler d1 execute deathandtaxes --remote --command "SELECT * FROM submissions ORDER BY id DESC LIMIT 20"
```

You can also open the Cloudflare dashboard and go to Storage & Databases, then D1, then deathandtaxes, then Console. The `email_status` column shows whether each notification was `sent`, `failed`, or `skipped` (no email binding configured).

## Photo credits

The logo and the coastal-desk and creator-studio images come from the original site. The new photos are from Unsplash (free under the Unsplash License, and no attribution is required):

- `sea-oats-path.webp`: Adrian Botica, https://unsplash.com/photos/bMCZpADgVJE
- `consultation-documents.webp`: Olena Kholina, https://unsplash.com/photos/MhqUBTxQ3Hw
- `tax-forms-calculator.webp`: Kelly Sikkema, https://unsplash.com/photos/X2soeHdvkLY
