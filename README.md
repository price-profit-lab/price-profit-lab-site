# Price Profit Lab

Static-site reconstruction of the public Price Profit Lab website for safe staging and Git-based deployment. The current Cloudflare production site has **not** been modified.

## Local preview

Run `python3 -m http.server 8000` in this folder and open http://localhost:8000/.

## Tests

Run `node test-calculator.js` (Node.js required). The sample scenario should produce 130,000 yen before, 136,000 yen after, and 88 units needed to maintain profit.

## Deployment

Cloudflare Pages framework preset: None; build command: none; output directory: `/`.

**Safety:** Do not connect a README-only GitHub repository to production. Verify the complete reconstructed site in a separate staging deployment before switching the live site. This is a reconstruction, not the original source. Review all copy, design, and calculation behavior before production use.

<!-- Deployment sync check: 2026-10-18; no site content changes. -->
