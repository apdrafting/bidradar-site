const form = document.querySelector('#preferences');
const summary = document.querySelector('#preference-summary');
form.addEventListener('change', () => {
  const trades = [...form.querySelectorAll('input[name="trade"]:checked')].map(input => input.value);
  summary.textContent = trades.length
    ? `Your selection: ${trades.join(', ')} · LA County. These preferences are a preview; enter them in your member dashboard when available.`
    : 'Select one or more trades to preview your preferences. Nothing is saved or sent.';
});
const checkout = document.querySelector('#test-checkout');
const billingStatus = document.querySelector('#billing-status');
async function loadBilling() {
  try {
    const response = await fetch('./billing-config.json', {cache: 'no-store', signal: AbortSignal.timeout(8000)});
    if (!response.ok) throw Error('Unavailable');
    const config = await response.json();
    const url = new URL(config.checkoutUrl);
    // Only a hosted Stripe test Payment Link is permitted. Fail closed on live links.
    if (config.mode !== 'test' || url.origin !== 'https://buy.stripe.com' || url.username || url.password ||
        !/^\/test_[A-Za-z0-9]+$/.test(url.pathname) || url.search || url.hash) throw Error('Not test mode');
    checkout.href = url.href;
    checkout.hidden = false;
    billingStatus.textContent = 'Stripe test checkout only. No paid access or email delivery is promised by completing a test payment.';
  } catch {
    checkout.hidden = true;
    checkout.removeAttribute('href');
    billingStatus.textContent = 'Test checkout is not configured. No payment can be started here. The planned subscription is $19/month; paid activation remains pending verification.';
  }
}
loadBilling();
