const store = {
  get(key, fallback) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

const defaultCategories = [
  { id: 'shopping', name: 'Shopping', icon: 'fa-bag-shopping', limit: null },
  { id: 'transport', name: 'Transportation', icon: 'fa-car', limit: null },
  { id: 'food', name: 'Food & Drinks', icon: 'fa-utensils', limit: null },
  { id: 'bills', name: 'Bills', icon: 'fa-file-invoice-dollar', limit: null },
  { id: 'entertainment', name: 'Entertainment', icon: 'fa-film', limit: null },
  { id: 'education', name: 'Education', icon: 'fa-graduation-cap', limit: null },
  { id: 'health', name: 'Health', icon: 'fa-heart-pulse', limit: null },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'fa-repeat', limit: null },
  { id: 'gifts', name: 'Gifts', icon: 'fa-gift', limit: null },
  { id: 'other', name: 'Other', icon: 'fa-layer-group', limit: null },
];

const state = {
  settings: store.get('settings', null),
  purchases: store.get('purchases', []),
  categories: store.get('categories', defaultCategories),
  goals: store.get('goals', []),
  auth: store.get('auth', null),
  theme: store.get('theme', 'dark'),
};

const pages = document.querySelectorAll('.page');
const navItems = document.querySelectorAll('.nav-item');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const onboarding = document.getElementById('onboarding');
const setupForm = document.getElementById('setupForm');
const settingsForm = document.getElementById('settingsForm');
const purchaseForm = document.getElementById('purchaseForm');
const purchaseList = document.getElementById('purchaseList');
const recentPurchases = document.getElementById('recentPurchases');
const categoryForm = document.getElementById('categoryForm');
const categoryList = document.getElementById('categoryList');
const goalForm = document.getElementById('goalForm');
const goalList = document.getElementById('goalList');
const smartSuggestions = document.getElementById('smartSuggestions');
const insights = document.getElementById('insights');
const alerts = document.getElementById('alerts');
const exportCsv = document.getElementById('exportCsv');
const seedData = document.getElementById('seedData');
const quickAdd = document.getElementById('quickAdd');
const addPurchaseBtn = document.getElementById('addPurchaseBtn');
const themeToggle = document.getElementById('themeToggle');
const authForm = document.getElementById('authForm');
const app = document.querySelector('.app');

const budgetRemaining = document.getElementById('budgetRemaining');
const totalSpent = document.getElementById('totalSpent');
const avgSpend = document.getElementById('avgSpend');
const topCategory = document.getElementById('topCategory');
const budgetStatus = document.getElementById('budgetStatus');

const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalCancel = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');

let categoryChart;
let dailyChart;
let monthCompareChart;
let pendingModalAction = null;

const currencyFormatter = (currency) =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currency || 'AED',
    maximumFractionDigits: 0,
  });

const todayISO = () => new Date().toISOString().split('T')[0];

const getMonthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getCurrentMonthKey = () => getMonthKey(new Date());

const withinCurrentMonth = (purchase) => getMonthKey(purchase.date) === getCurrentMonthKey();

const getSettings = () =>
  state.settings || {
    income: 0,
    currency: 'AED',
    startDay: 1,
    alertThreshold: 80,
  };

const persist = () => {
  store.set('settings', state.settings);
  store.set('purchases', state.purchases);
  store.set('categories', state.categories);
  store.set('goals', state.goals);
  store.set('auth', state.auth);
  store.set('theme', state.theme);
};

const setTheme = (theme) => {
  state.theme = theme;
  app.dataset.theme = theme;
  const icon = themeToggle.querySelector('i');
  const label = themeToggle.querySelector('span');
  if (theme === 'light') {
    icon.className = 'fa-solid fa-sun';
    label.textContent = 'Light mode';
  } else {
    icon.className = 'fa-solid fa-moon';
    label.textContent = 'Dark mode';
  }
  persist();
};

const formatMoney = (value) => currencyFormatter(getSettings().currency).format(value || 0);

const ensureOnboarding = () => {
  if (!state.settings) {
    onboarding.classList.remove('hidden');
  } else {
    onboarding.classList.add('hidden');
  }
};

const setPage = (page) => {
  pages.forEach((section) => section.classList.remove('active'));
  document.getElementById(page).classList.add('active');
  navItems.forEach((item) => item.classList.toggle('active', item.dataset.page === page));

  const titles = {
    dashboard: ['Dashboard', 'Monitor your budget runway.'],
    purchases: ['Purchases', 'Track and edit every transaction.'],
    analytics: ['Analytics', 'Visualize trends and insights.'],
    categories: ['Categories', 'Customize spending buckets.'],
    'save-more': ['Save More', 'Accelerate your savings.'],
    settings: ['Settings', 'Manage your profile & security.'],
    wallet: ['Wallet Connect', 'Upcoming automated imports.'],
  };
  const [title, subtitle] = titles[page];
  pageTitle.textContent = title;
  pageSubtitle.textContent = subtitle;
};

const openModal = (title, content, onConfirm) => {
  modalTitle.textContent = title;
  modalBody.innerHTML = '';
  modalBody.appendChild(content);
  modal.classList.remove('hidden');
  pendingModalAction = onConfirm;
};

const closeModal = () => {
  modal.classList.add('hidden');
  pendingModalAction = null;
};

modalCancel.addEventListener('click', closeModal);
modalConfirm.addEventListener('click', () => {
  if (pendingModalAction) {
    pendingModalAction();
  }
  closeModal();
});

const renderCategories = () => {
  const select = purchaseForm.querySelector('select[name="category"]');
  select.innerHTML = '';
  state.categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    select.appendChild(option);
  });

  categoryList.innerHTML = '';
  state.categories.forEach((category) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div class="details">
        <strong><i class="fa-solid ${category.icon}"></i> ${category.name}</strong>
        <span class="meta">Limit: ${category.limit ? formatMoney(category.limit) : 'No limit'}</span>
      </div>
      <div class="actions">
        <button title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;

    const [editBtn, deleteBtn] = item.querySelectorAll('button');
    editBtn.addEventListener('click', () => {
      const form = document.createElement('form');
      form.className = 'grid';
      form.innerHTML = `
        <label>Category name<input type="text" name="name" value="${category.name}" required /></label>
        <label>Icon<select name="icon">
          ${categoryForm.querySelector('select[name="icon"]').innerHTML}
        </select></label>
        <label>Monthly limit<input type="number" name="limit" min="0" step="0.01" value="${category.limit ?? ''}" /></label>
      `;
      form.querySelector('select[name="icon"]').value = category.icon;
      openModal('Edit category', form, () => {
        const data = Object.fromEntries(new FormData(form));
        category.name = data.name.trim();
        category.icon = data.icon;
        category.limit = data.limit ? Number(data.limit) : null;
        persist();
        renderAll();
      });
    });

    deleteBtn.addEventListener('click', () => {
      const content = document.createElement('p');
      content.textContent = `Delete ${category.name}? This cannot be undone.`;
      openModal('Confirm delete', content, () => {
        state.categories = state.categories.filter((item) => item.id !== category.id);
        persist();
        renderAll();
      });
    });

    categoryList.appendChild(item);
  });
};

const renderPurchases = () => {
  const currentPurchases = state.purchases
    .filter(withinCurrentMonth)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const renderList = (container) => {
    container.innerHTML = '';
    currentPurchases.forEach((purchase) => {
      const category = state.categories.find((item) => item.id === purchase.category);
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `
        <div class="details">
          <strong>${category ? category.name : 'Other'} • ${formatMoney(purchase.amount)}</strong>
          <span class="meta">${purchase.date} • ${purchase.method} • ${purchase.merchant || 'Personal'} ${purchase.note ? `• ${purchase.note}` : ''}</span>
        </div>
        <div class="actions">
          <button title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      `;
      const [editBtn, deleteBtn] = item.querySelectorAll('button');

      editBtn.addEventListener('click', () => {
        const form = document.createElement('form');
        form.className = 'grid';
        form.innerHTML = `
          <label>Amount<input type="number" name="amount" min="0" step="0.01" value="${purchase.amount}" required /></label>
          <label>Category<select name="category">${purchaseForm.querySelector('select[name="category"]').innerHTML}</select></label>
          <label>Date<input type="date" name="date" value="${purchase.date}" /></label>
          <label>Payment method<select name="method">${purchaseForm.querySelector('select[name="method"]').innerHTML}</select></label>
          <label>Merchant<input type="text" name="merchant" value="${purchase.merchant || ''}" /></label>
          <label>Note<input type="text" name="note" value="${purchase.note || ''}" /></label>
        `;
        form.querySelector('select[name="category"]').value = purchase.category;
        form.querySelector('select[name="method"]').value = purchase.method;
        openModal('Edit purchase', form, () => {
          const data = Object.fromEntries(new FormData(form));
          purchase.amount = Number(data.amount);
          purchase.category = data.category;
          purchase.date = data.date || todayISO();
          purchase.method = data.method;
          purchase.merchant = data.merchant.trim();
          purchase.note = data.note.trim();
          persist();
          renderAll();
        });
      });

      deleteBtn.addEventListener('click', () => {
        const content = document.createElement('p');
        content.textContent = 'Delete this purchase? This cannot be undone.';
        openModal('Confirm delete', content, () => {
          state.purchases = state.purchases.filter((item) => item.id !== purchase.id);
          persist();
          renderAll();
        });
      });

      container.appendChild(item);
    });

    if (!currentPurchases.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'No purchases yet. Add your first transaction.';
      container.appendChild(empty);
    }
  };

  renderList(purchaseList);
  renderList(recentPurchases);
};

const renderDashboard = () => {
  const settings = getSettings();
  const currentPurchases = state.purchases.filter(withinCurrentMonth);
  const spent = currentPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  const remaining = settings.income - spent;
  const daysInMonth = new Date().getDate();
  const avg = daysInMonth ? spent / daysInMonth : 0;
  const byCategory = currentPurchases.reduce((acc, purchase) => {
    acc[purchase.category] = (acc[purchase.category] || 0) + purchase.amount;
    return acc;
  }, {});
  const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const topName = top ? state.categories.find((c) => c.id === top[0])?.name : '-';

  budgetRemaining.textContent = formatMoney(remaining);
  totalSpent.textContent = formatMoney(spent);
  avgSpend.textContent = formatMoney(avg);
  topCategory.textContent = topName || '-';

  const threshold = (settings.alertThreshold / 100) * settings.income;
  if (spent > threshold) {
    budgetStatus.textContent = 'Budget alert';
    budgetStatus.className = 'pill warning';
  } else {
    budgetStatus.textContent = 'On track';
    budgetStatus.className = 'pill neutral';
  }
};

const renderAlerts = () => {
  alerts.innerHTML = '';
  const settings = getSettings();
  const currentPurchases = state.purchases.filter(withinCurrentMonth);
  const spent = currentPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  const threshold = (settings.alertThreshold / 100) * settings.income;
  if (spent > threshold) {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<div class="details"><strong>Budget warning</strong><span class="meta">You crossed ${settings.alertThreshold}% of your monthly budget.</span></div>`;
    alerts.appendChild(item);
  }

  state.categories.forEach((category) => {
    if (!category.limit) return;
    const categorySpend = currentPurchases
      .filter((purchase) => purchase.category === category.id)
      .reduce((sum, purchase) => sum + purchase.amount, 0);
    if (categorySpend > category.limit) {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `<div class="details"><strong>${category.name} limit exceeded</strong><span class="meta">${formatMoney(categorySpend)} spent (limit ${formatMoney(category.limit)}).</span></div>`;
      alerts.appendChild(item);
    }
  });

  if (!alerts.children.length) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = 'No alerts right now. Great job!';
    alerts.appendChild(empty);
  }
};

const renderInsights = () => {
  insights.innerHTML = '';
  const currentPurchases = state.purchases.filter(withinCurrentMonth);
  if (!currentPurchases.length) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = 'Add purchases to generate insights.';
    insights.appendChild(empty);
    return;
  }

  const dailyTotals = currentPurchases.reduce((acc, purchase) => {
    acc[purchase.date] = (acc[purchase.date] || 0) + purchase.amount;
    return acc;
  }, {});
  const highestDay = Object.entries(dailyTotals).sort((a, b) => b[1] - a[1])[0];
  const byCategory = currentPurchases.reduce((acc, purchase) => {
    acc[purchase.category] = (acc[purchase.category] || 0) + purchase.amount;
    return acc;
  }, {});
  const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const lastMonthPurchases = state.purchases.filter((purchase) => {
    const date = new Date(purchase.date);
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return date.getFullYear() === lastMonth.getFullYear() && date.getMonth() === lastMonth.getMonth();
  });
  const currentTotal = currentPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  const lastTotal = lastMonthPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  const delta = lastTotal ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;
  const settings = getSettings();

  const items = [
    `Your highest spending day was ${highestDay[0]} (${formatMoney(highestDay[1])}).`,
    top
      ? `${state.categories.find((c) => c.id === top[0])?.name || 'Top category'} is ${delta >= 0 ? 'up' : 'down'} ${Math.abs(
          delta
        ).toFixed(1)}% vs last month.`
      : 'Track categories to compare trends.',
    currentTotal > settings.income * 0.8
      ? 'You are off track — consider trimming discretionary categories.'
      : 'You are on track for your budget. Keep it up!',
  ];

  items.forEach((text) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<div class="details"><strong>${text}</strong></div>`;
    insights.appendChild(item);
  });
};

const renderSmartSuggestions = () => {
  smartSuggestions.innerHTML = '';
  const currentPurchases = state.purchases.filter(withinCurrentMonth);
  if (!currentPurchases.length) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = 'Add purchases to unlock savings suggestions.';
    smartSuggestions.appendChild(empty);
    return;
  }

  const byCategory = currentPurchases.reduce((acc, purchase) => {
    acc[purchase.category] = (acc[purchase.category] || 0) + purchase.amount;
    return acc;
  }, {});

  const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const suggestions = [];
  if (top) {
    const category = state.categories.find((c) => c.id === top[0]);
    const tenPercent = top[1] * 0.1;
    suggestions.push(
      `If you reduce ${category?.name || 'your top category'} by 10%, you save ${formatMoney(tenPercent)} / month.`
    );
  }

  const subscriptions = state.categories.find((c) => c.id === 'subscriptions');
  if (subscriptions) {
    const totalSubs = byCategory[subscriptions.id] || 0;
    suggestions.push(
      `Subscriptions are ${formatMoney(totalSubs)} / month — consider cancelling unused ones.`
    );
  }

  suggestions.push('Move 5% of income to Savings first (pay yourself first).');

  suggestions.forEach((text) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<div class="details"><strong>${text}</strong></div>`;
    smartSuggestions.appendChild(item);
  });
};

const renderGoals = () => {
  goalList.innerHTML = '';
  if (!state.goals.length) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = 'No savings goals yet.';
    goalList.appendChild(empty);
    return;
  }

  state.goals.forEach((goal) => {
    const weeks = Math.max(1, Math.ceil((new Date(goal.deadline) - new Date()) / (7 * 24 * 60 * 60 * 1000)));
    const months = Math.max(1, Math.ceil((new Date(goal.deadline) - new Date()) / (30 * 24 * 60 * 60 * 1000)));
    const weekly = goal.target / weeks;
    const monthly = goal.target / months;
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div class="details">
        <strong>${goal.name}</strong>
        <span class="meta">Target ${formatMoney(goal.target)} by ${goal.deadline} • Weekly ${formatMoney(
      weekly
    )} • Monthly ${formatMoney(monthly)}</span>
      </div>
      <div class="actions">
        <button title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;

    item.querySelector('button').addEventListener('click', () => {
      const content = document.createElement('p');
      content.textContent = `Delete ${goal.name}?`;
      openModal('Confirm delete', content, () => {
        state.goals = state.goals.filter((item) => item.id !== goal.id);
        persist();
        renderAll();
      });
    });

    goalList.appendChild(item);
  });
};

const renderCharts = () => {
  const currentPurchases = state.purchases.filter(withinCurrentMonth);
  const byCategory = state.categories.map((category) => {
    const total = currentPurchases
      .filter((purchase) => purchase.category === category.id)
      .reduce((sum, purchase) => sum + purchase.amount, 0);
    return { label: category.name, total };
  });

  const categoryLabels = byCategory.map((item) => item.label);
  const categoryTotals = byCategory.map((item) => item.total);

  categoryChart?.destroy();
  categoryChart = new Chart(document.getElementById('categoryChart'), {
    type: 'doughnut',
    data: {
      labels: categoryLabels,
      datasets: [
        {
          data: categoryTotals,
          backgroundColor: [
            '#6366f1',
            '#22c55e',
            '#f97316',
            '#38bdf8',
            '#facc15',
            '#a855f7',
            '#fb7185',
            '#14b8a6',
            '#c084fc',
            '#94a3b8',
          ],
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          labels: {
            color: app.dataset.theme === 'light' ? '#0f172a' : '#f8fafc',
          },
        },
      },
    },
  });

  const dailyTotals = currentPurchases.reduce((acc, purchase) => {
    acc[purchase.date] = (acc[purchase.date] || 0) + purchase.amount;
    return acc;
  }, {});
  const days = Object.keys(dailyTotals).sort();

  dailyChart?.destroy();
  dailyChart = new Chart(document.getElementById('dailyChart'), {
    type: 'line',
    data: {
      labels: days,
      datasets: [
        {
          label: 'Daily spend',
          data: days.map((day) => dailyTotals[day]),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.2)',
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          labels: {
            color: app.dataset.theme === 'light' ? '#0f172a' : '#f8fafc',
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: app.dataset.theme === 'light' ? '#0f172a' : '#f8fafc',
          },
        },
        y: {
          ticks: {
            color: app.dataset.theme === 'light' ? '#0f172a' : '#f8fafc',
          },
        },
      },
    },
  });

  const now = new Date();
  const thisMonthTotal = currentPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  const lastMonthPurchases = state.purchases.filter((purchase) => {
    const date = new Date(purchase.date);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() - 1;
  });
  const lastMonthTotal = lastMonthPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);

  monthCompareChart?.destroy();
  monthCompareChart = new Chart(document.getElementById('monthCompareChart'), {
    type: 'bar',
    data: {
      labels: ['Last Month', 'This Month'],
      datasets: [
        {
          label: 'Spend',
          data: [lastMonthTotal, thisMonthTotal],
          backgroundColor: ['#94a3b8', '#6366f1'],
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          labels: {
            color: app.dataset.theme === 'light' ? '#0f172a' : '#f8fafc',
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: app.dataset.theme === 'light' ? '#0f172a' : '#f8fafc',
          },
        },
        y: {
          ticks: {
            color: app.dataset.theme === 'light' ? '#0f172a' : '#f8fafc',
          },
        },
      },
    },
  });
};

const renderAll = () => {
  ensureOnboarding();
  renderCategories();
  renderPurchases();
  renderDashboard();
  renderAlerts();
  renderInsights();
  renderSmartSuggestions();
  renderGoals();
  renderCharts();
  settingsForm.income.value = getSettings().income;
  settingsForm.currency.value = getSettings().currency;
  settingsForm.startDay.value = getSettings().startDay;
  settingsForm.alertThreshold.value = getSettings().alertThreshold;
  purchaseForm.date.value = todayISO();
};

setupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(setupForm));
  state.settings = {
    income: Number(data.income),
    currency: data.currency,
    startDay: Number(data.startDay),
    alertThreshold: 80,
  };
  persist();
  renderAll();
});

settingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(settingsForm));
  state.settings = {
    income: Number(data.income),
    currency: data.currency,
    startDay: Number(data.startDay),
    alertThreshold: Number(data.alertThreshold),
  };
  persist();
  renderAll();
});

purchaseForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(purchaseForm));
  if (Number(data.amount) < 0) return;
  state.purchases.unshift({
    id: crypto.randomUUID(),
    amount: Number(data.amount),
    category: data.category,
    date: data.date || todayISO(),
    method: data.method,
    merchant: data.merchant.trim(),
    note: data.note.trim(),
  });
  persist();
  purchaseForm.reset();
  purchaseForm.date.value = todayISO();
  renderAll();
});

categoryForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(categoryForm));
  if (!data.name.trim()) return;
  state.categories.push({
    id: data.name.toLowerCase().replace(/\s+/g, '-'),
    name: data.name.trim(),
    icon: data.icon,
    limit: data.limit ? Number(data.limit) : null,
  });
  persist();
  categoryForm.reset();
  renderAll();
});

goalForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(goalForm));
  state.goals.push({
    id: crypto.randomUUID(),
    name: data.name.trim(),
    target: Number(data.target),
    deadline: data.deadline,
  });
  persist();
  goalForm.reset();
  renderAll();
});

seedData.addEventListener('click', () => {
  state.settings = {
    income: 15000,
    currency: 'AED',
    startDay: 1,
    alertThreshold: 80,
  };
  state.purchases = [
    {
      id: crypto.randomUUID(),
      amount: 120,
      category: 'food',
      date: todayISO(),
      method: 'card',
      merchant: 'Cafe Milano',
      note: 'Lunch meetup',
    },
    {
      id: crypto.randomUUID(),
      amount: 520,
      category: 'transport',
      date: todayISO(),
      method: 'apple pay',
      merchant: 'Careem',
      note: 'Airport rides',
    },
    {
      id: crypto.randomUUID(),
      amount: 850,
      category: 'shopping',
      date: todayISO(),
      method: 'card',
      merchant: 'Mall of Emirates',
      note: 'Wardrobe refresh',
    },
  ];
  state.categories = defaultCategories.map((category) => ({ ...category }));
  state.categories.find((category) => category.id === 'food').limit = 800;
  state.categories.find((category) => category.id === 'transport').limit = 900;
  state.goals = [
    {
      id: crypto.randomUUID(),
      name: 'Japan Trip',
      target: 9000,
      deadline: new Date(new Date().getFullYear(), new Date().getMonth() + 4, 15)
        .toISOString()
        .split('T')[0],
    },
  ];
  persist();
  renderAll();
});

quickAdd.addEventListener('click', () => setPage('purchases'));
addPurchaseBtn.addEventListener('click', () => setPage('purchases'));

exportCsv.addEventListener('click', () => {
  const currentPurchases = state.purchases.filter(withinCurrentMonth);
  const headers = ['Amount', 'Category', 'Date', 'Payment Method', 'Merchant', 'Note'];
  const rows = currentPurchases.map((purchase) => {
    const category = state.categories.find((item) => item.id === purchase.category)?.name || 'Other';
    return [
      purchase.amount,
      category,
      purchase.date,
      purchase.method,
      purchase.merchant || '',
      purchase.note || '',
    ];
  });
  const csvContent = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `spendpilot-${getCurrentMonthKey()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

authForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(authForm));
  state.auth = { email: data.email, password: data.password };
  persist();
});

themeToggle.addEventListener('click', () => {
  setTheme(state.theme === 'dark' ? 'light' : 'dark');
  renderCharts();
});

navItems.forEach((item) => {
  item.addEventListener('click', () => setPage(item.dataset.page));
});

setTheme(state.theme);
renderAll();
