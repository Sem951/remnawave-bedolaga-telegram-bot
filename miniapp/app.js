const tg = window.Telegram?.WebApp;
const appState = {
  initData: '',
  subscription: null,
  config: null,
  paymentMethods: [],
  platform: 'generic',
};

const selectors = {
  brandLogo: document.getElementById('brandLogo'),
  brandTitle: document.getElementById('brandTitle'),
  statusBadge: document.getElementById('statusBadge'),
  subscriptionTitle: document.getElementById('subscriptionTitle'),
  subscriptionMeta: document.getElementById('subscriptionMeta'),
  highlightGrid: document.getElementById('highlightGrid'),
  actionList: document.getElementById('actionList'),
  actionsCard: document.getElementById('actionsCard'),
  paymentsCard: document.getElementById('paymentsCard'),
  paymentMethods: document.getElementById('paymentMethods'),
  devicesCard: document.getElementById('devicesCard'),
  deviceList: document.getElementById('deviceList'),
  transactionsCard: document.getElementById('transactionsCard'),
  transactionList: document.getElementById('transactionList'),
  platformCard: document.getElementById('platformCard'),
  platformBlock: document.getElementById('platformBlock'),
  supportLink: document.getElementById('supportLink'),
  supportCopy: document.getElementById('supportCopy'),
  themeToggle: document.getElementById('themeToggle'),
};

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse JSON', error);
    return null;
  }
}

function readInitData() {
  const fromTg = tg?.initData || tg?.initDataUnsafe?.query_id ? tg.initData : '';
  const fromQuery = new URLSearchParams(window.location.search).get('initData') || '';
  return fromTg || fromQuery;
}

function detectPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/windows/.test(ua)) return 'windows';
  if (/macintosh|mac os x/.test(ua)) return 'mac';
  if (/linux/.test(ua)) return 'linux';
  if (/tv/.test(ua)) return 'androidTV';
  return 'generic';
}

async function fetchJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }
  return response.json();
}

function setTheme(theme) {
  const nextTheme = theme || (tg?.colorScheme === 'light' ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', nextTheme);
  if (tg?.themeParams) {
    const bg = tg.themeParams.bg_color;
    if (bg) document.body.style.backgroundColor = `#${bg}`;
  }
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

function formatAmount(kopeks, currency = '₽') {
  if (typeof kopeks !== 'number') return '—';
  return `${(kopeks / 100).toFixed(2)} ${currency}`;
}

function renderStatusCard(subscription) {
  const { user } = subscription;
  selectors.subscriptionTitle.textContent = user?.display_name || 'Subscription';
  selectors.statusBadge.textContent = user?.subscription_status || 'Unknown';

  selectors.statusBadge.classList.toggle('badge--success', Boolean(user?.has_active_subscription));
  selectors.statusBadge.classList.toggle('badge--danger', user?.subscription_missing);

  const metaParts = [];
  if (subscription.subscription_missing_reason) metaParts.push(subscription.subscription_missing_reason);
  if (user?.expires_at) metaParts.push(`Expires ${formatDate(user.expires_at)}`);
  selectors.subscriptionMeta.textContent = metaParts.join(' · ') || 'Active subscription overview.';

  const grid = selectors.highlightGrid;
  grid.innerHTML = '';
  const highlights = [
    { label: 'Balance', value: formatAmount(subscription.balance_kopeks, subscription.balance_currency || '₽') },
    { label: 'Traffic', value: user?.traffic_limit_label || 'Unlimited' },
    { label: 'Devices', value: `${subscription.connected_devices_count || 0}` },
    { label: 'Status', value: user?.status_label || user?.status || '—' },
  ];

  highlights.forEach((item) => {
    const box = document.createElement('div');
    box.className = 'highlight';
    box.innerHTML = `<p class="highlight__label">${item.label}</p><p class="highlight__value">${item.value}</p>`;
    grid.appendChild(box);
  });
}

function renderActions(subscription) {
  const links = new Set();
  if (subscription.subscription_url) links.add(subscription.subscription_url);
  if (subscription.happ_link) links.add(subscription.happ_link);
  if (subscription.happ_crypto_link) links.add(subscription.happ_crypto_link);
  (subscription.links || []).forEach((link) => links.add(link));

  selectors.actionList.innerHTML = '';
  if (!links.size) {
    selectors.actionsCard.hidden = true;
    return;
  }

  selectors.actionsCard.hidden = false;
  links.forEach((link) => {
    const item = document.createElement('div');
    item.className = 'action-item';
    item.innerHTML = `
      <div>
        <strong>Subscription link</strong>
        <p>${link}</p>
      </div>
    `;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'primary-btn';
    btn.textContent = 'Copy & open';
    btn.addEventListener('click', async () => {
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(link);
          btn.textContent = 'Copied!';
          setTimeout(() => (btn.textContent = 'Copy & open'), 1200);
        } catch (error) {
          console.warn('Clipboard failed', error);
        }
      }
      window.open(link, '_blank');
    });
    item.appendChild(btn);
    selectors.actionList.appendChild(item);
  });
}

function renderDevices(subscription) {
  const devices = subscription.connected_devices || [];
  selectors.deviceList.innerHTML = '';
  if (!devices.length) {
    selectors.devicesCard.hidden = true;
    return;
  }
  selectors.devicesCard.hidden = false;
  devices.forEach((device) => {
    const item = document.createElement('li');
    const label = [device.platform, device.device_model, device.app_version].filter(Boolean).join(' · ');
    item.textContent = label || 'Device';
    selectors.deviceList.appendChild(item);
  });
}

function renderTransactions(subscription) {
  const transactions = (subscription.transactions || []).slice(0, 5);
  selectors.transactionList.innerHTML = '';
  if (!transactions.length) {
    selectors.transactionsCard.hidden = true;
    return;
  }
  selectors.transactionsCard.hidden = false;
  transactions.forEach((tx) => {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.innerHTML = `
      <div>
        <strong>${tx.description || tx.type}</strong>
        <p class="muted">${formatDate(tx.created_at)}</p>
      </div>
      <span class="badge ${tx.is_completed ? 'badge--success' : ''}">${formatAmount(tx.amount_kopeks)}</span>
    `;
    selectors.transactionList.appendChild(li);
  });
}

function renderPlatformGuide(config, subscription) {
  const platformBlock = selectors.platformBlock;
  platformBlock.innerHTML = '';
  const platformSteps = config?.platforms?.[appState.platform];

  if (!platformSteps || !platformSteps.length) {
    selectors.platformCard.hidden = true;
    return;
  }

  selectors.platformCard.hidden = false;
  const client = platformSteps[0];
  const steps = [
    { title: 'Install the app', description: client.installationStep?.description, buttons: client.installationStep?.buttons },
    { title: 'Add subscription', description: client.addSubscriptionStep?.description },
    { title: 'Connect & browse', description: client.connectAndUseStep?.description },
  ];

  steps.forEach((step) => {
    const block = document.createElement('div');
    block.innerHTML = `<h3>${step.title}</h3><p>${resolveI18n(step.description) || ''}</p>`;
    if (step.buttons?.length) {
      const buttons = document.createElement('div');
      buttons.className = 'buttons';
      step.buttons.forEach((btn) => {
        const anchor = document.createElement('a');
        anchor.className = 'primary-btn';
        anchor.href = btn.buttonLink;
        anchor.target = '_blank';
        anchor.rel = 'noopener';
        anchor.textContent = resolveI18n(btn.buttonText) || 'Open';
        buttons.appendChild(anchor);
      });
      block.appendChild(buttons);
    }
    platformBlock.appendChild(block);
  });

  if (subscription.subscription_url) {
    const hint = document.createElement('p');
    hint.className = 'muted';
    hint.innerHTML = `Need the URL? <small class="code">${subscription.subscription_url}</small>`;
    platformBlock.appendChild(hint);
  }
}

function renderPayments(methods) {
  selectors.paymentMethods.innerHTML = '';
  if (!methods.length) {
    selectors.paymentsCard.hidden = true;
    return;
  }
  selectors.paymentsCard.hidden = false;

  methods.forEach((method) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'payment-method';
    const amountId = `amount-${method.id}`;
    const optionId = `option-${method.id}`;

    wrapper.innerHTML = `
      <div class="payment-row">
        <div class="payment-header">
          <span class="payment-icon">${method.icon || '💳'}</span>
          <div>
            <strong>${method.name || method.id}</strong>
            <p class="payment-meta">${method.requires_amount ? 'Enter an amount' : 'Fixed amount or redirect'}</p>
          </div>
        </div>
        <button class="primary-btn" type="button" data-method="${method.id}">Pay</button>
      </div>
    `;

    if (method.requires_amount) {
      const field = document.createElement('label');
      field.className = 'field';
      field.innerHTML = `<span class="muted">Amount, ${method.currency}</span>`;
      const input = document.createElement('input');
      input.type = 'number';
      input.min = method.min_amount_kopeks ? method.min_amount_kopeks / 100 : 1;
      input.step = method.amount_step_kopeks ? method.amount_step_kopeks / 100 : 1;
      input.value = input.min || 100;
      input.className = 'input';
      input.id = amountId;
      field.appendChild(input);
      wrapper.appendChild(field);
    }

    if (method.options?.length) {
      const select = document.createElement('select');
      select.className = 'input';
      select.id = optionId;
      method.options.forEach((option) => {
        const opt = document.createElement('option');
        opt.value = option.id;
        opt.textContent = option.title || option.id;
        select.appendChild(opt);
      });
      const field = document.createElement('label');
      field.className = 'field';
      field.innerHTML = '<span class="muted">Choose option</span>';
      field.appendChild(select);
      wrapper.appendChild(field);
    }

    const payButton = wrapper.querySelector('[data-method]');
    payButton.addEventListener('click', async () => {
      payButton.disabled = true;
      payButton.textContent = 'Opening…';
      try {
        const amountField = method.requires_amount ? document.getElementById(amountId) : null;
        const optionField = method.options?.length ? document.getElementById(optionId) : null;
        const payload = {
          initData: appState.initData,
          method: method.id,
          amountRubles: amountField ? Number(amountField.value || 0) : undefined,
          option: optionField?.value,
        };
        const response = await fetchJson('/miniapp/payments/create', payload);
        if (response.payment_url) {
          window.open(response.payment_url, '_blank');
        }
        payButton.textContent = 'Open again';
      } catch (error) {
        console.error(error);
        payButton.textContent = 'Try again';
        alert(`Cannot start payment: ${error.message}`);
      } finally {
        payButton.disabled = false;
      }
    });

    selectors.paymentMethods.appendChild(wrapper);
  });
}

function resolveI18n(entity) {
  if (!entity) return null;
  if (typeof entity === 'string') return entity;
  const lang = tg?.initDataUnsafe?.user?.language_code || navigator.language?.slice(0, 2) || 'en';
  return entity[lang] || entity.en || Object.values(entity)[0];
}

async function loadConfig() {
  const response = await fetch('app-config.json');
  const data = safeJsonParse(await response.text()) || {};
  appState.config = data.config || {};
  selectors.supportLink.href = appState.config.branding?.supportUrl || 'https://t.me';
  selectors.brandTitle.textContent = appState.config.branding?.name || 'Bedolaga VPN';
  selectors.supportCopy.textContent = appState.config.branding?.description || selectors.supportCopy.textContent;
  if (appState.config.branding?.logoUrl) {
    selectors.brandLogo.style.backgroundImage = `url(${appState.config.branding.logoUrl})`;
    selectors.brandLogo.textContent = '';
  }
}

async function loadSubscription() {
  const payload = { initData: appState.initData };
  const data = await fetchJson('/miniapp/subscription', payload);
  appState.subscription = data;
  renderStatusCard(data);
  renderActions(data);
  renderDevices(data);
  renderTransactions(data);
  renderPlatformGuide(appState.config, data);
}

async function loadPayments() {
  try {
    const data = await fetchJson('/miniapp/payments/methods', { initData: appState.initData });
    appState.paymentMethods = data.methods || [];
    renderPayments(appState.paymentMethods);
  } catch (error) {
    console.warn('Payments unavailable', error);
    selectors.paymentsCard.hidden = true;
  }
}

function showInitError() {
  selectors.subscriptionTitle.textContent = 'Open in Telegram';
  selectors.subscriptionMeta.textContent = 'We could not detect Telegram init data. Open the Mini App from the bot so we can load your subscription.';
  selectors.statusBadge.textContent = 'Not authorized';
  selectors.statusBadge.classList.add('badge--danger');
  selectors.actionsCard.hidden = true;
  selectors.paymentsCard.hidden = true;
  selectors.devicesCard.hidden = true;
  selectors.transactionsCard.hidden = true;
  selectors.platformCard.hidden = true;
}

async function bootstrap() {
  appState.initData = readInitData();
  appState.platform = detectPlatform();
  setTheme();
  selectors.themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'light' ? 'dark' : 'light');
  });

  await loadConfig();
  if (!appState.initData) {
    showInitError();
    return;
  }

  try {
    await loadSubscription();
    await loadPayments();
  } catch (error) {
    console.error(error);
    selectors.subscriptionMeta.textContent = 'Failed to load data. Pull to refresh or try again later.';
    selectors.statusBadge.textContent = 'Error';
    selectors.statusBadge.classList.add('badge--danger');
  }
}

bootstrap();
