/* HomeLedger planner logic: editing, charts, goals, presets and persistence.
   Plain DOM and inline SVG, no libraries, no network. */
'use strict';

const STORAGE_KEY = 'homeledger-plan-v2';
const $ = (selector) => document.querySelector(selector);

function deepCopy(value) { return JSON.parse(JSON.stringify(value)); }

function readStoredPlan() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.income) && Array.isArray(parsed.expenses)
        && Array.isArray(parsed.goals)) {
        return parsed;
      }
    }
  } catch (error) { /* damaged storage: fall through to the starter plan */ }
  return deepCopy(STARTER_PLAN);
}

let plan = readStoredPlan();
let showYearly = false;

const fmtMoney = (n) => '$' + Math.round(n).toLocaleString('en-US');
const fmtSigned = (n) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
const toAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};
const sumAmounts = (rows) => rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
const periodFactor = () => (showYearly ? 12 : 1);

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plan)); } catch (error) { /* private mode */ }
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch]);
}

/* Finish month for a goal, e.g. "Mar 2027", from months remaining. */
function finishMonthLabel(monthsLeft) {
  if (monthsLeft === null || monthsLeft <= 0) return null;
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthsLeft, 1);
  return target.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/* ---------- editable planner rows ---------- */
function buildRow(row, kind, index, canRemove) {
  const div = document.createElement('div');
  div.className = 'row';
  const color = kind === 'expenses'
    ? CATEGORY_COLORS[index % CATEGORY_COLORS.length] : '#20714e';
  div.innerHTML =
    '<span class="swatch" style="background:' + color + '" aria-hidden="true"></span>' +
    '<input type="text" class="row-name" value="' + escapeText(row.name) + '" maxlength="40" aria-label="Name">' +
    '<input type="number" class="row-amount" min="0" step="1" value="' + (Number(row.amount) || 0) + '" aria-label="Monthly amount for ' + escapeText(row.name) + '">' +
    '<span class="row-pct"></span>' +
    (canRemove ? '<button type="button" class="row-remove" aria-label="Remove ' + escapeText(row.name) + '">×</button>' : '');
  const nameInput = div.querySelector('.row-name');
  nameInput.addEventListener('input', () => {
    row.name = nameInput.value.trim().slice(0, 40) || row.name;
    persist();
  });
  nameInput.addEventListener('change', () => {
    if (!nameInput.value.trim()) nameInput.value = row.name;
    renderAll();
  });
  const amountInput = div.querySelector('.row-amount');
  amountInput.addEventListener('input', () => {
    row.amount = toAmount(amountInput.value);
    persist();
    renderAll();
  });
  if (canRemove) {
    div.querySelector('.row-remove').addEventListener('click', () => {
      plan[kind].splice(index, 1);
      persist();
      renderAll();
    });
  }
  return div;
}

function renderPlannerRows() {
  const incomeBox = $('#income-rows');
  const expenseBox = $('#expense-rows');
  incomeBox.innerHTML = '';
  expenseBox.innerHTML = '';
  plan.income.forEach((row, i) => {
    incomeBox.appendChild(buildRow(row, 'income', i, plan.income.length > 1));
  });
  const spending = sumAmounts(plan.expenses);
  plan.expenses.forEach((row, i) => {
    const el = buildRow(row, 'expenses', i, true);
    const share = spending > 0 ? Math.round((Number(row.amount) || 0) / spending * 100) : 0;
    el.querySelector('.row-pct').textContent = share + '%';
    expenseBox.appendChild(el);
  });
}

/* ---------- spending donut ---------- */
function drawDonut() {
  const svg = $('#donut');
  const spending = sumAmounts(plan.expenses);
  const cx = 100, cy = 100, outer = 80, inner = 52;
  let markup = '';
  if (spending <= 0) {
    markup = '<circle cx="100" cy="100" r="80" fill="none" stroke="#e6dfd1" stroke-width="28"/>';
  } else {
    let angle = -Math.PI / 2;
    plan.expenses.forEach((row, i) => {
      const amount = Number(row.amount) || 0;
      if (amount <= 0) return;
      const fraction = amount / spending;
      const end = angle + fraction * Math.PI * 2;
      const big = fraction > 0.5 ? 1 : 0;
      const x1 = cx + outer * Math.cos(angle), y1 = cy + outer * Math.sin(angle);
      const x2 = cx + outer * Math.cos(end), y2 = cy + outer * Math.sin(end);
      const ix2 = cx + inner * Math.cos(end), iy2 = cy + inner * Math.sin(end);
      const ix1 = cx + inner * Math.cos(angle), iy1 = cy + inner * Math.sin(angle);
      markup += '<path d="M ' + x1.toFixed(2) + ' ' + y1.toFixed(2) +
        ' A ' + outer + ' ' + outer + ' 0 ' + big + ' 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2) +
        ' L ' + ix2.toFixed(2) + ' ' + iy2.toFixed(2) +
        ' A ' + inner + ' ' + inner + ' 0 ' + big + ' 0 ' + ix1.toFixed(2) + ' ' + iy1.toFixed(2) +
        ' Z" fill="' + CATEGORY_COLORS[i % CATEGORY_COLORS.length] + '"/>';
      angle = end;
    });
  }
  svg.innerHTML = markup;
  $('#donut-total').textContent = fmtMoney(spending * periodFactor());
  const legend = $('#donut-legend');
  legend.innerHTML = '';
  plan.expenses.forEach((row, i) => {
    const li = document.createElement('li');
    li.innerHTML = '<span><span class="swatch" style="background:' +
      CATEGORY_COLORS[i % CATEGORY_COLORS.length] + '"></span>' + escapeText(row.name) +
      '</span><strong>' + fmtMoney((Number(row.amount) || 0) * periodFactor()) + '</strong>';
    legend.appendChild(li);
  });
}

/* ---------- 50 / 30 / 20 split ---------- */
function classifyExpense(row) {
  if (NEEDS_NAMES.has(row.name)) return 'needs';
  if (WANTS_NAMES.has(row.name)) return 'wants';
  return 'needs'; /* unlisted household spending defaults to needs */
}

function renderSplitBars() {
  const income = sumAmounts(plan.income);
  const buckets = { needs: 0, wants: 0, savings: 0 };
  plan.expenses.forEach((row) => { buckets[classifyExpense(row)] += Number(row.amount) || 0; });
  buckets.savings = Math.max(0, income - sumAmounts(plan.expenses));
  const defs = [
    { key: 'needs', label: 'Needs', hint: 'housing, food, bills, transport', target: 50, cls: '' },
    { key: 'wants', label: 'Wants', hint: 'eating out, fun, shopping', target: 30, cls: 'is-wants' },
    { key: 'savings', label: 'Savings', hint: 'left over, for goals', target: 20, cls: 'is-savings' },
  ];
  const wrap = $('#split-bars');
  wrap.innerHTML = '';
  defs.forEach((def) => {
    const pct = income > 0 ? Math.round(buckets[def.key] / income * 100) : 0;
    const row = document.createElement('div');
    row.className = 'split-row';
    const verdict = pct <= def.target ? 'on track' : 'over target';
    row.innerHTML =
      '<div class="split-label">' + def.label + '<small>' + def.hint + '</small></div>' +
      '<div class="split-track"><div class="split-fill ' + def.cls + '" style="width:' + Math.min(100, pct) + '%"></div>' +
      '<div class="split-marker" style="left:' + def.target + '%" title="Target ' + def.target + '%"></div></div>' +
      '<div class="split-value"><strong>' + pct + '%</strong> <small>· target ' + def.target + '% · ' + verdict + '</small><br><small>' + fmtMoney(buckets[def.key] * periodFactor()) + '</small></div>';
    wrap.appendChild(row);
  });
}

/* ---------- totals and hero card ---------- */
function renderTotals() {
  const income = sumAmounts(plan.income) * periodFactor();
  const spending = sumAmounts(plan.expenses) * periodFactor();
  const leftover = income - spending;
  const rate = income > 0 ? Math.max(0, Math.round(leftover / income * 100)) : 0;
  const biggest = plan.expenses.reduce((best, row) =>
    (Number(row.amount) || 0) > (Number(best.amount) || 0) ? row : best, { name: '—', amount: 0 });
  const put = (id, value) => { $(id).textContent = value; };
  put('#total-income', fmtMoney(income));
  put('#total-spending', fmtMoney(spending));
  put('#total-leftover', fmtSigned(leftover));
  put('#total-rate', rate + '%');
  put('#total-biggest', biggest.name === '—' ? '—' : biggest.name + ' · ' + fmtMoney((Number(biggest.amount) || 0) * periodFactor()));
  put('#glance-income', fmtMoney(income));
  put('#glance-spending', fmtMoney(spending));
  const glanceLeft = $('#glance-leftover');
  glanceLeft.textContent = fmtSigned(leftover);
  glanceLeft.classList.toggle('ok', leftover >= 0);
  glanceLeft.classList.toggle('over', leftover < 0);
  put('#glance-rate', rate + '%');
  const totalLeft = $('#total-leftover');
  totalLeft.classList.toggle('ok', leftover >= 0);
  totalLeft.classList.toggle('over', leftover < 0);
  $('#glance-note').textContent = leftover < 0
    ? 'Spending is above income — trim a category or two below.'
    : leftover === 0
      ? 'Every dollar is assigned. Try freeing a little for savings.'
      : 'Nice — ' + fmtMoney(leftover) + ' a month is free to put toward your goals.';
  $('#goals-available').textContent = fmtMoney(Math.max(0, leftover / periodFactor()));
}

/* ---------- savings goals ---------- */
function renderGoalCards() {
  const list = $('#goal-cards');
  list.innerHTML = '';
  plan.goals.forEach((goal, i) => {
    const pct = goal.target > 0 ? Math.min(100, Math.round(goal.saved / goal.target * 100)) : 0;
    const remaining = Math.max(0, goal.target - goal.saved);
    const months = goal.monthly > 0 ? Math.ceil(remaining / goal.monthly) : null;
    const finish = remaining === 0
      ? '<span class="done">Done — fully funded!</span>'
      : months === null
        ? 'set a monthly amount to see a finish date'
        : 'about ' + months + ' month' + (months === 1 ? '' : 's') + ' to go · finish around ' + finishMonthLabel(months);
    const card = document.createElement('article');
    card.className = 'goal-card';
    card.innerHTML =
      '<h3><span>' + escapeText(goal.name) + '</span>' +
      '<button type="button" class="row-remove" aria-label="Remove goal ' + escapeText(goal.name) + '">×</button></h3>' +
      '<div class="goal-figures"><span><strong>' + fmtMoney(goal.saved) + '</strong> saved</span><span>of <strong>' + fmtMoney(goal.target) + '</strong></span></div>' +
      '<div class="goal-track"><div class="goal-fill" style="width:' + pct + '%"></div></div>' +
      '<p class="goal-meta">' + pct + '% funded · ' + fmtMoney(remaining) + ' to go · ' + finish + '</p>' +
      '<p class="goal-meta">Saving ' + fmtMoney(goal.monthly) + ' / month toward this goal.</p>';
    card.querySelector('.row-remove').addEventListener('click', () => {
      plan.goals.splice(i, 1);
      persist();
      renderAll();
    });
    list.appendChild(card);
  });
  if (plan.goals.length === 0) {
    list.innerHTML = '<p class="hint">No goals yet — add your first one below.</p>';
  }
}

/* ---------- insights: projection + suggestions ---------- */
function renderInsights() {
  const income = sumAmounts(plan.income);
  const spending = sumAmounts(plan.expenses);
  const saved = Math.max(0, income - spending);
  $('#year-income').textContent = fmtMoney(income * 12);
  $('#year-spending').textContent = fmtMoney(spending * 12);
  $('#year-saved').textContent = fmtMoney(saved * 12);
  $('#projection-caption').textContent = saved > 0
    ? 'Stick to this plan and you will have about ' + fmtMoney(saved * 12) + ' set aside after a year.'
    : 'Right now the plan spends everything it earns — trim one category and the line below starts climbing.';

  const svg = $('#projection-chart');
  const W = 640, H = 260, padL = 56, padB = 30, padT = 18, padR = 16;
  const top = Math.max(saved * 12, 1);
  const xAt = (m) => padL + (m / 11) * (W - padL - padR);
  const yAt = (v) => padT + (1 - v / top) * (H - padT - padB);
  let grid = '';
  for (let g = 0; g <= 4; g++) {
    const gv = top * g / 4;
    const gy = yAt(gv);
    grid += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" stroke="#eee7d8" stroke-width="1"/>' +
      '<text x="' + (padL - 8) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="11" fill="#5d6f68">$' + Math.round(gv / 1000) + 'k</text>';
  }
  let monthLabels = '';
  for (let m = 0; m < 12; m++) {
    monthLabels += '<text x="' + xAt(m) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="#5d6f68">' + (m + 1) + '</text>';
  }
  let linePath = '';
  let areaPath = 'M ' + xAt(0) + ' ' + yAt(0);
  for (let m = 0; m < 12; m++) {
    const px = xAt(m), py = yAt(saved * (m + 1));
    linePath += (m === 0 ? 'M ' : ' L ') + px.toFixed(1) + ' ' + py.toFixed(1);
    areaPath += ' L ' + px.toFixed(1) + ' ' + py.toFixed(1);
  }
  areaPath += ' L ' + xAt(11) + ' ' + yAt(0) + ' Z';
  svg.innerHTML = grid + monthLabels +
    '<path d="' + areaPath + '" fill="#20714e" opacity="0.12"/>' +
    '<path d="' + linePath + '" fill="none" stroke="#20714e" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="' + xAt(11) + '" cy="' + yAt(saved * 12) + '" r="5" fill="#20714e"/>' +
    '<text x="' + (xAt(11) - 8) + '" y="' + (yAt(saved * 12) - 10) + '" text-anchor="end" font-size="12" font-weight="700" fill="#145c3b">' + fmtMoney(saved * 12) + '</text>';

  const suggestions = [];
  const biggest = plan.expenses.reduce((best, row) =>
    (Number(row.amount) || 0) > (Number(best.amount) || 0) ? row : best, { name: '', amount: 0 });
  const housing = plan.expenses.find((row) => row.name === 'Housing');
  if (housing && income > 0 && housing.amount / income > 0.3) {
    suggestions.push('Housing takes ' + Math.round(housing.amount / income * 100) +
      '% of your income — above the usual 30% guide. A cheaper place, a roommate, or refinancing could free the most money.');
  }
  if (biggest.name && biggest.amount > 0) {
    suggestions.push('Your biggest bill is ' + biggest.name + ' at ' + fmtMoney(biggest.amount) +
      ' a month. Cutting it by 10% saves ' + fmtMoney(biggest.amount * 0.1 * 12) +
      ' a year — more than trimming any small category.');
  }
  const dining = plan.expenses.find((row) => row.name === 'Dining out');
  if (dining && dining.amount >= 200) {
    suggestions.push('Dining out costs ' + fmtMoney(dining.amount) +
      ' a month. Cooking two extra dinners a week could save roughly ' + fmtMoney(dining.amount * 0.3) + ' a month.');
  }
  if (saved <= 0) {
    suggestions.push('This plan spends everything it earns. Pick one want — subscriptions, shopping, or dining out — and cut it by a quarter to open up breathing room.');
  } else if (saved / income < 0.2) {
    suggestions.push('You save ' + Math.round(saved / income * 100) +
      '% of income. Nudging that toward 20% builds a real cushion — even ' + fmtMoney(50) +
      ' more a month is ' + fmtMoney(600) + ' a year.');
  } else {
    suggestions.push('You save ' + Math.round(saved / income * 100) +
      '% of income — above the 20% rule of thumb. Consider splitting the extra between your goals and an investment account.');
  }
  const list = $('#suggestions');
  list.innerHTML = '';
  suggestions.slice(0, 3).forEach((tip) => {
    const li = document.createElement('li');
    li.textContent = tip;
    list.appendChild(li);
  });
}

/* ---------- presets ---------- */
function renderPresetCards() {
  const wrap = $('#preset-cards');
  wrap.innerHTML = '';
  PRESETS.forEach((preset) => {
    const card = document.createElement('article');
    card.className = 'preset-card';
    card.innerHTML =
      '<h3>' + escapeText(preset.name) + '</h3>' +
      '<p>' + escapeText(preset.blurb) + '</p>' +
      '<ul>' + preset.facts.map((fact) => '<li>' + escapeText(fact) + '</li>').join('') + '</ul>' +
      '<button type="button" class="btn btn-primary">Load this household</button>';
    card.querySelector('button').addEventListener('click', () => {
      plan = deepCopy({ income: preset.income, expenses: preset.expenses, goals: preset.goals });
      persist();
      renderAll();
      location.hash = '#/planner';
      $('#tools-status').textContent = 'Loaded the “' + preset.name + '” preset — edit any number to make it yours.';
    });
    wrap.appendChild(card);
  });
}

/* ---------- hash routing ---------- */
const VIEW_NAMES = ['planner', 'goals', 'insights', 'presets'];
function switchView(name) {
  if (!VIEW_NAMES.includes(name)) name = 'planner';
  VIEW_NAMES.forEach((view) => { $('#view-' + view).hidden = view !== name; });
  document.querySelectorAll('[data-nav]').forEach((link) => {
    link.classList.toggle('is-active', link.dataset.nav === name);
  });
  if (name === 'insights') renderInsights();
}
function followHash() {
  switchView(location.hash.replace(/^#\/?/, '') || 'planner');
}

/* ---------- monthly / yearly toggle ---------- */
function setYearlyMode(isYearly) {
  showYearly = isYearly;
  $('#btn-monthly').classList.toggle('is-on', !isYearly);
  $('#btn-yearly').classList.toggle('is-on', isYearly);
  $('#btn-monthly').setAttribute('aria-pressed', String(!isYearly));
  $('#btn-yearly').setAttribute('aria-pressed', String(isYearly));
  renderAll();
}

/* ---------- render everything ---------- */
function renderAll() {
  renderPlannerRows();
  drawDonut();
  renderSplitBars();
  renderTotals();
  renderGoalCards();
}

/* ---------- wire up controls ---------- */
$('#btn-monthly').addEventListener('click', () => setYearlyMode(false));
$('#btn-yearly').addEventListener('click', () => setYearlyMode(true));

$('#add-income').addEventListener('click', () => {
  plan.income.push({ name: 'New income', amount: 0 });
  persist();
  renderAll();
  const inputs = document.querySelectorAll('#income-rows .row-amount');
  if (inputs.length) inputs[inputs.length - 1].focus();
});
$('#add-expense').addEventListener('click', () => {
  plan.expenses.push({ name: 'New expense', amount: 0 });
  persist();
  renderAll();
  const inputs = document.querySelectorAll('#expense-rows .row-amount');
  if (inputs.length) inputs[inputs.length - 1].focus();
});

$('#new-goal-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = $('#new-goal-name').value.trim();
  const target = toAmount($('#new-goal-target').value);
  if (!name || target <= 0) return;
  plan.goals.push({
    name: name.slice(0, 40),
    target,
    saved: toAmount($('#new-goal-saved').value),
    monthly: toAmount($('#new-goal-monthly').value),
  });
  persist();
  renderAll();
  event.target.reset();
  $('#new-goal-saved').value = '0';
  switchView('goals');
});

$('#export-plan').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'homeledger-plan.json';
  link.click();
  URL.revokeObjectURL(link.href);
  $('#tools-status').textContent = 'Downloaded your plan as homeledger-plan.json.';
});

$('#reset-plan').addEventListener('click', () => {
  if (!confirm('Reset to the starter plan? Your current numbers will be replaced.')) return;
  plan = deepCopy(STARTER_PLAN);
  persist();
  renderAll();
  $('#tools-status').textContent = 'Reset to the starter plan.';
});

window.addEventListener('hashchange', followHash);
renderPresetCards();
renderAll();
followHash();
