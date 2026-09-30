# Death & Taxes Accounting - website

A rebuild of https://www.dataccounting.co with a refreshed look and its own consultation request form. All original copy is word-for-word from the Wix site.

It runs on Cloudflare's free tier:

- **Static site** in `public/`, served by Cloudflare Workers static assets.
- **Contact form API** (`src/`): `POST /api/contact` blocks spam, validates the fields, saves the request, then emails it to the firm.
- **Database:** Cloudflare D1 keeps a backup copy of every request (`migrations/`).
- **Spam protection:** Cloudflare Turnstile, plus a hidden honeypot field.
- **Email:** [Resend](https://resend.com), free for 3,000 emails a month. Replies go straight to the person who wrote in.

## Local development

```sh
npm install
cp .dev.vars.example .dev.vars   # Turnstile test keys; emails print to the terminal instead of sending
npm run db:migrate:local
npm run dev                      # http://localhost:8787
npm test
```

Pages use clean URLs (`/request-service`, `/content-creators`), so preview through `npm run dev` rather than opening the HTML files directly.

## Going live (one-time setup)

1. **Cloudflare:** create a free account, then run `npx wrangler login`.
2. **Database:**
   ```sh
   npx wrangler d1 create deathandtaxes     # paste the printed database_id into wrangler.toml
   npm run db:migrate:remote
   ```
3. **Email (Resend):**
   - Create a free account.
   - Add the domain `dataccounting.co` and add the DNS records Resend shows. They're on a `send.` subdomain, so they don't affect her existing mailbox.
   - Create an API key, then run `npx wrangler secret put RESEND_API_KEY`.
   - `MAIL_FROM` in `wrangler.toml` must use the verified domain. `NOTIFY_EMAIL` is where requests are delivered.
4. **Spam check (Turnstile):**
   - In the Cloudflare dashboard, go to Turnstile and add a widget for the site's hostnames (the `*.workers.dev` address, and later `dataccounting.co`).
   - Put the site key in `TURNSTILE_SITE_KEY` in `wrangler.toml`, then run `npx wrangler secret put TURNSTILE_SECRET_KEY`.
5. **Deploy:** run `npm run deploy`. For automatic deploys on every push to GitHub, connect the repo under Workers & Pages in the Cloudflare dashboard.
6. **Domain:** when she's ready to leave Wix, add `dataccounting.co` as a custom domain on the Worker. The old Wix URLs (`/request-service`, `/privacy-policy`, `/accessibility-statement`) keep working, and `/about-4` redirects to `/content-creators`.

## Viewing saved requests

Every request is emailed, and a copy is also kept in D1. To see recent ones:

```sh
npx wrangler d1 execute deathandtaxes --remote --command "SELECT * FROM submissions ORDER BY id DESC LIMIT 20"
```

You can also open the Cloudflare dashboard and go to Storage & Databases, then D1, then deathandtaxes, then Console. The `email_status` column shows whether each notification was `sent`, `failed`, or `skipped` (no API key set).

## Photo credits

The logo and the coastal-desk and creator-studio images come from the original site. The new photos are from Unsplash (free under the Unsplash License, and no attribution is required):

- `sea-oats-path.webp`: Adrian Botica, https://unsplash.com/photos/bMCZpADgVJE
- `consultation-documents.webp`: Olena Kholina, https://unsplash.com/photos/MhqUBTxQ3Hw
- `tax-forms-calculator.webp`: Kelly Sikkema, https://unsplash.com/photos/X2soeHdvkLY
