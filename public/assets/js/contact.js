(() => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const FALLBACK_ERROR = 'Something went wrong sending your message. Please call 772-807-0064 or email Maura@dataccounting.co.';
  const button = form.querySelector('button[type="submit"]');
  const buttonLabel = button.querySelector('[data-label]');
  const idleLabel = buttonLabel.textContent;
  const status = form.querySelector('[data-status]');
  const widget = form.querySelector('[data-turnstile]');
  const success = document.getElementById('contact-success');
  let widgetId = null;
  let turnstileEnabled = false;

  // Load Cloudflare Turnstile (spam check) only when the server has a site key configured.
  fetch('/api/config')
    .then((res) => (res.ok ? res.json() : {}))
    .then(({ turnstileSiteKey }) => {
      if (!turnstileSiteKey) return;
      turnstileEnabled = true;
      widget.hidden = false;
      window.onTurnstileLoad = () => {
        widgetId = window.turnstile.render(widget, { sitekey: turnstileSiteKey, theme: 'light', size: 'flexible' });
      };
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
      script.async = true;
      document.head.appendChild(script);
    })
    .catch(() => {});

  // If someone clicks send before the spam check has finished, give it a few seconds instead of failing right away.
  const waitForTurnstile = async () => {
    const ready = () => window.turnstile && widgetId !== null && window.turnstile.getResponse(widgetId);
    const deadline = Date.now() + 10000;
    while (turnstileEnabled && !ready() && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  };

  const setBusy = (busy) => {
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
    buttonLabel.textContent = busy ? 'Sending…' : idleLabel;
  };

  const showStatus = (message) => {
    status.textContent = message;
    status.hidden = !message;
  };

  const clearFieldErrors = () => {
    form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
    form.querySelectorAll('.field-error').forEach((el) => {
      el.textContent = '';
      el.hidden = true;
    });
  };

  const showFieldErrors = (errors) => {
    let first = null;
    for (const [name, message] of Object.entries(errors)) {
      const input = form.elements.namedItem(name);
      const error = input && document.getElementById(`${input.id}-error`);
      if (!input || !error) continue;
      input.setAttribute('aria-invalid', 'true');
      error.textContent = message;
      error.hidden = false;
      first = first || input;
    }
    if (first) first.focus();
  };

  form.addEventListener('input', (e) => {
    if (e.target.getAttribute('aria-invalid') !== 'true') return;
    e.target.removeAttribute('aria-invalid');
    const error = document.getElementById(`${e.target.id}-error`);
    if (error) error.hidden = true;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors();
    showStatus('');
    setBusy(true);

    try {
      await waitForTurnstile();
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      const result = await res.json().catch(() => ({}));

      if (res.ok && result.ok) {
        form.hidden = true;
        success.hidden = false;
        success.focus();
        return;
      }

      if (result.fields) showFieldErrors(result.fields);
      showStatus(result.error || FALLBACK_ERROR);
    } catch {
      showStatus(FALLBACK_ERROR);
    } finally {
      setBusy(false);
    }

    // Turnstile tokens only work once, so get a fresh one before the next attempt.
    if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
  });
})();
