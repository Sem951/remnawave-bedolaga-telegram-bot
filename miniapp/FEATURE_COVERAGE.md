# Mini app feature coverage

This document summarizes what the current `miniapp` front-end exercises from the backend `/miniapp` API and which features are still unimplemented in the UI.

## Covered by the current UI
- Subscription summary, links, connected devices, and recent transactions loaded via `/miniapp/subscription`.
- Payment method listing and payment initiation via `/miniapp/payments/methods` and `/miniapp/payments/create`.

## Not yet covered
The backend exposes additional capabilities that are not represented in the current mini app screens:
- Auto-pay status and day selection management via `/miniapp/subscription/autopay`.
- Trial activation flow through `/miniapp/subscription/trial`.
- Purchase option selection, preview, and finalization through `/miniapp/subscription/purchase/options`, `/preview`, and `/purchase`.
- Subscription settings for servers, traffic limits, and device slots via `/miniapp/subscription/settings`, `/servers`, `/traffic`, and `/devices`.
- Promo code activation and promo offer claiming through `/miniapp/promo-codes/activate` and `/promo-offers/{id}/claim`.
- Referral details, FAQ entries, and legal documents included in the subscription payload but not surfaced in the UI.
- Renewal option previews (`/miniapp/subscription/renewal/options`), payment status polling, and auto-assign promo group hints for new users.

These gaps mean the redesigned interface currently focuses on balance display, basic subscription metadata, payment starts, and platform setup guidance; other account management tasks still require bot commands or future UI work.
