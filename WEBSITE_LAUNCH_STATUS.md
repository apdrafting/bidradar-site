# Website launch checkpoint — October 15, 2026

Scope: website only. No SignalEngine changes, ingestion changes, customer emails, purchases, or live billing activation.

## Verified in this session

- Public domain and Worker root returned HTTP 200. Their homepage differs from this website repository's main branch.
- Public API `/opportunities?summary=3` returned HTTP 200 with 60 notices, 45 unique projects, and 21 of 23 sources responding in the inspected response. These are a transient snapshot, not a guarantee of qualified construction bids.
- Public API provides aggregate counts; it does not provide individual public bid records. Frontend now describes that state explicitly and preserves existing optional local-feed record support.
- Read-only review of SignalEngine's `hosted/worker.mjs` and `hosted/trial.mjs` confirmed existing `/trial`, `/member`, `/confirm`, and `/unsubscribe` interfaces. Website links use the canonical domain without changing those routes.
- The inspected backend explicitly requires live Stripe records (`livemode === true`, `rk_live_` read key). Its launch report's test-state claims do not establish an end-to-end test checkout integration.
- `node --test tests/frontend.test.mjs`: eight passing checks covering stale local fallback, partial coverage, retry recovery, malformed/future data, multi-trade filtering, unsafe URLs, test-only checkout guards, and cancellation copy.

## Website changes

- Onboarding page offers unsaved trade selection and links to the existing verified-email trial flow. No preference persistence or email enrollment is claimed.
- Home checkout links now lead to onboarding. `billing-config.json` defaults to test mode with no checkout URL. Only `https://buy.stripe.com/test_...` links are accepted. Live and malformed URLs stay disabled.
- Billing help preserves the existing external Stripe portal link, labels its unverified status, explains cancellation confirmation, and distinguishes stopping emails from canceling renewal. No authenticated cancellation or unsubscribe was performed.
- Source requests time out after 12 seconds each, reject stale/malformed totals, display incomplete coverage, and offer retry. Search is shown only when actual records are available. Filtered empty results never fall back to unrelated source cards.
- Canonical and sitemap URLs use the public domain. Website tests run in GitHub Actions independently of ingestion workflows.

## Remaining launch gates

1. Review and approve this website PR. Existing website PR #1 also touches `preview.js`; reconcile its changes before merging both. No collector or ingestion files were modified here.
2. Identify the authorized website asset deployment path. The public domain currently serves a newer asset set than this repo, so merging this PR alone must not be described as a verified custom-domain deployment. Do not overwrite backend-owned Worker assets or routes.
3. Browser visual verification of the new local pages remains incomplete: local preview requests timed out in this environment, including after restarting the preview outside the network sandbox. Automated frontend tests pass; they do not replace mobile/browser acceptance.
4. Configure an owner-approved public Stripe TEST Payment Link for the $19/month test product, then verify checkout and its backend test fulfillment. No secrets belong in this public config. Backend test support requires a separate coordinated change outside this scope.
5. Verify actual consent-email delivery, confirmation, unsubscribe, portal cancellation, and entitlement state with an authorized test identity. No real customer signup or email was initiated here.

Until these gates pass, this is a reviewable website milestone, not a completed paid launch.
