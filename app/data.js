/* HomeLedger data: the starter plan, category colours and preset households.
   Every figure is an invented example, editable in the planner. Amounts are
   monthly US dollars. Nothing here is fetched from anywhere. */
'use strict';

const CATEGORY_COLORS = [
  '#20714e', '#337eae', '#b07d22', '#7a5fd0', '#bd4f70',
  '#2f9e8f', '#dd7a33', '#68707a', '#93763a', '#4d6fa8',
];

/* Which expense names count as needs vs. wants for the 50/30/20 check. */
const NEEDS_NAMES = new Set([
  'Housing', 'Groceries', 'Utilities', 'Transport', 'Insurance',
  'Healthcare', 'Childcare', 'Debt payments',
]);
const WANTS_NAMES = new Set([
  'Dining out', 'Entertainment', 'Shopping', 'Subscriptions',
  'Travel', 'Hobbies', 'Personal care',
]);

const STARTER_PLAN = {
  income: [
    { name: 'Salary (take-home)', amount: 5400 },
    { name: 'Freelance work', amount: 350 },
  ],
  expenses: [
    { name: 'Housing', amount: 1720 },
    { name: 'Groceries', amount: 640 },
    { name: 'Utilities', amount: 235 },
    { name: 'Transport', amount: 295 },
    { name: 'Insurance', amount: 225 },
    { name: 'Dining out', amount: 275 },
    { name: 'Entertainment', amount: 130 },
    { name: 'Subscriptions', amount: 58 },
    { name: 'Shopping', amount: 195 },
    { name: 'Healthcare', amount: 145 },
  ],
  goals: [
    { name: 'Emergency fund', target: 12000, saved: 5100, monthly: 450 },
    { name: 'Family vacation', target: 2600, saved: 700, monthly: 160 },
    { name: 'New car fund', target: 9000, saved: 1400, monthly: 280 },
  ],
};

const PRESETS = [
  {
    id: 'single',
    name: 'Single renter',
    blurb: 'One person in a one-bedroom flat, cooking most meals at home and cycling to work.',
    facts: ['Income $3,950 / mo', 'Rent $1,300', 'Saves about 19%'],
    income: [
      { name: 'Salary (take-home)', amount: 3950 },
    ],
    expenses: [
      { name: 'Housing', amount: 1300 },
      { name: 'Groceries', amount: 395 },
      { name: 'Utilities', amount: 155 },
      { name: 'Transport', amount: 165 },
      { name: 'Insurance', amount: 150 },
      { name: 'Dining out', amount: 185 },
      { name: 'Entertainment', amount: 105 },
      { name: 'Subscriptions', amount: 44 },
      { name: 'Shopping', amount: 130 },
      { name: 'Healthcare', amount: 85 },
    ],
    goals: [
      { name: 'Emergency fund', target: 6500, saved: 2100, monthly: 320 },
      { name: 'Travel fund', target: 1800, saved: 260, monthly: 110 },
    ],
  },
  {
    id: 'couple',
    name: 'Couple, no kids',
    blurb: 'Two incomes, a two-bedroom place, one shared car and a rescue dog.',
    facts: ['Income $7,650 / mo', 'Mortgage $1,950', 'Saves about 24%'],
    income: [
      { name: 'Salary — partner 1', amount: 4350 },
      { name: 'Salary — partner 2', amount: 3300 },
    ],
    expenses: [
      { name: 'Housing', amount: 1950 },
      { name: 'Groceries', amount: 740 },
      { name: 'Utilities', amount: 285 },
      { name: 'Transport', amount: 410 },
      { name: 'Insurance', amount: 325 },
      { name: 'Dining out', amount: 350 },
      { name: 'Entertainment', amount: 175 },
      { name: 'Subscriptions', amount: 68 },
      { name: 'Shopping', amount: 250 },
      { name: 'Healthcare', amount: 170 },
      { name: 'Pet care', amount: 95 },
    ],
    goals: [
      { name: 'Emergency fund', target: 16000, saved: 7200, monthly: 620 },
      { name: 'House down payment', target: 45000, saved: 13600, monthly: 950 },
      { name: 'Holiday trip', target: 3200, saved: 980, monthly: 210 },
    ],
  },
  {
    id: 'family',
    name: 'Family of four',
    blurb: 'Two kids, a house in the suburbs, after-school clubs and a family car.',
    facts: ['Income $9,850 / mo', 'Mortgage $2,450', 'Saves about 15%'],
    income: [
      { name: 'Salary — parent 1', amount: 5750 },
      { name: 'Salary — parent 2', amount: 3900 },
      { name: 'Child benefit', amount: 200 },
    ],
    expenses: [
      { name: 'Housing', amount: 2450 },
      { name: 'Groceries', amount: 1080 },
      { name: 'Utilities', amount: 355 },
      { name: 'Transport', amount: 540 },
      { name: 'Insurance', amount: 440 },
      { name: 'Childcare', amount: 920 },
      { name: 'Dining out', amount: 290 },
      { name: 'Entertainment', amount: 165 },
      { name: 'Subscriptions', amount: 54 },
      { name: 'Shopping', amount: 270 },
      { name: 'Healthcare', amount: 250 },
      { name: 'School & activities', amount: 195 },
    ],
    goals: [
      { name: 'Emergency fund', target: 22000, saved: 10200, monthly: 750 },
      { name: 'College fund', target: 32000, saved: 4600, monthly: 520 },
      { name: 'Summer vacation', target: 4200, saved: 1300, monthly: 260 },
    ],
  },
];
