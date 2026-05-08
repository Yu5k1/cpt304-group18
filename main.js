"use strict";

const STORAGE_KEY = "financeTrackerData";
const THEME_KEY = "financeTrackerTheme";

let lastFocusedElement = null;

const state = {
  transactions: [],
  filters: {
    category: "all",
    type: "all",
    search: "",
  },
  editingId: null,
  pendingDeleteId: null,
  theme: "dark",
};

const dom = {
  form: document.getElementById("transactionForm"),
  titleInput: document.getElementById("titleInput"),
  amountInput: document.getElementById("amountInput"),
  categoryInput: document.getElementById("categoryInput"),
  dateInput: document.getElementById("dateInput"),
  titleError: document.getElementById("titleError"),
  amountError: document.getElementById("amountError"),
  categoryError: document.getElementById("categoryError"),
  dateError: document.getElementById("dateError"),
  submitBtn: document.getElementById("submitBtn"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
  filterCategory: document.getElementById("filterCategory"),
  filterType: document.getElementById("filterType"),
  searchInput: document.getElementById("searchInput"),
  resetFiltersBtn: document.getElementById("resetFiltersBtn"),
  exportCsvBtn: document.getElementById("exportCsvBtn"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  transactionsList: document.getElementById("transactionsList"),
  resultsCount: document.getElementById("resultsCount"),
  totalBalance: document.getElementById("totalBalance"),
  totalIncome: document.getElementById("totalIncome"),
  totalExpenses: document.getElementById("totalExpenses"),
  financeChart: document.getElementById("financeChart"),
  confirmModal: document.getElementById("confirmModal"),
  confirmDeleteBtn: document.getElementById("confirmDeleteBtn"),
  cancelDeleteBtn: document.getElementById("cancelDeleteBtn"),
  toastContainer: document.getElementById("toastContainer"),
  skeleton: document.getElementById("skeleton"),
};

const generateID = () => {
  return `tx_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const saveToLocalStorage = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
};

const VALID_CATEGORIES = [
  "Salary", "Business", "Investments", "Housing",
  "Food", "Transport", "Health", "Entertainment",
  "Education", "Other"
];

const isValidTransaction = (item) => {
  if (typeof item !== "object" || item === null) return false;
  if (typeof item.id !== "string" || !item.id.startsWith("tx_")) return false;
  if (typeof item.title !== "string" || item.title.trim() === "") return false;
  if (typeof item.amount !== "number" || !isFinite(item.amount)) return false;
  if (!VALID_CATEGORIES.includes(item.category)) return false;
  if (typeof item.date !== "string" || isNaN(Date.parse(item.date))) return false;
  return true;
};

const loadFromLocalStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) { state.transactions = []; return; }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      console.warn("Storage corrupted: expected array");
      state.transactions = [];
      return;
    }
    const valid = parsed.filter(isValidTransaction);
    if (valid.length !== parsed.length) {
      console.warn(`Filtered ${parsed.length - valid.length} invalid records`);
    }
    state.transactions = valid;
  } catch (e) {
    console.error("Failed to load from localStorage:", e);
    state.transactions = [];
  }
};

const saveTheme = () => {
  localStorage.setItem(THEME_KEY, state.theme);
};

const setTheme = (theme) => {
  state.theme = theme;
  document.body.classList.toggle("theme-light", theme === "light");
  dom.themeToggleBtn.textContent =
    theme === "light" ? "Dark Mode" : "Light Mode";
  saveTheme();
};

const loadTheme = () => {
  const storedTheme = localStorage.getItem(THEME_KEY);
  setTheme(storedTheme || "dark");
};

const showToast = (message, variant = "success") => {
  const toast = document.createElement("div");
  toast.className = `toast${variant === "error" ? " toast--error" : ""}`;
  toast.textContent = message;
  dom.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 2400);
};

const clearErrors = () => {
  const fields = [
    { input: dom.titleInput, error: dom.titleError },
    { input: dom.amountInput, error: dom.amountError },
    { input: dom.categoryInput, error: dom.categoryError },
    { input: dom.dateInput, error: dom.dateError },
  ];

  fields.forEach(({ input, error }) => {
    input.classList.remove("is-invalid");
    error.textContent = "";
  });
};

const setError = (input, errorEl, message) => {
  input.classList.add("is-invalid");
  errorEl.textContent = message;
};

const validateForm = () => {
  clearErrors();

  const title = dom.titleInput.value.trim();
  const amountValue = dom.amountInput.value.trim();
  const amount = Number(amountValue);
  const category = dom.categoryInput.value;
  const date = dom.dateInput.value;

  let isValid = true;

  if (!title) {
    setError(dom.titleInput, dom.titleError, "Title is required.");
    isValid = false;
  }

  if (!amountValue || Number.isNaN(amount) || amount === 0) {
    setError(dom.amountInput, dom.amountError, "Enter a valid amount.");
    isValid = false;
  }

  if (!category) {
    setError(dom.categoryInput, dom.categoryError, "Select a category.");
    isValid = false;
  }

  if (!date) {
    setError(dom.dateInput, dom.dateError, "Pick a date.");
    isValid = false;
  }

  return isValid;
};

const resetFormState = () => {
  dom.form.reset();
  state.editingId = null;
  dom.submitBtn.textContent = "Add Transaction";
  dom.cancelEditBtn.hidden = true;
  clearErrors();
};

const addTransaction = () => {
  if (!validateForm()) {
    showToast("Please fix the highlighted fields.", "error");
    return;
  }

  const title = dom.titleInput.value.trim();
  const amount = Number(dom.amountInput.value);
  const category = dom.categoryInput.value;
  const date = dom.dateInput.value;

  if (state.editingId) {
    state.transactions = state.transactions.map((tx) =>
      tx.id === state.editingId ? { ...tx, title, amount, category, date } : tx,
    );
    showToast("Transaction updated.");
  } else {
    const newTransaction = {
      id: generateID(),
      title,
      amount,
      category,
      date,
    };

    state.transactions = [newTransaction, ...state.transactions];
    showToast("Transaction added.");
  }

  resetFormState();
  saveToLocalStorage();
  renderApp();
};

const startEditing = (id) => {
  const transaction = state.transactions.find((tx) => tx.id === id);
  if (!transaction) return;

  dom.titleInput.value = transaction.title;
  dom.amountInput.value = transaction.amount;
  dom.categoryInput.value = transaction.category;
  dom.dateInput.value = transaction.date;

  state.editingId = id;
  dom.submitBtn.textContent = "Save Changes";
  dom.cancelEditBtn.hidden = false;
  dom.titleInput.focus();
  showToast("Editing mode enabled.");
};

const deleteTransaction = (id) => {
  state.transactions = state.transactions.filter((tx) => tx.id !== id);
  saveToLocalStorage();
  renderApp();
  showToast("Transaction deleted.");
};

const openConfirmModal = (id) => {
  state.pendingDeleteId = id;
  dom.confirmModal.classList.add("is-open");
  dom.confirmModal.setAttribute("aria-hidden", "false");
  dom.cancelDeleteBtn.focus();
};

const closeConfirmModal = () => {
  state.pendingDeleteId = null;
  dom.confirmModal.classList.remove("is-open");
  dom.confirmModal.setAttribute("aria-hidden", "true");

  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
    lastFocusedElement = null; 
  }
};

const handleTabKey = (e) => {
  if (e.key !== "Tab" || !dom.confirmModal.classList.contains("is-open")) return;
  const focusable = dom.confirmModal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
};

const renderSummary = () => {
  const amounts = state.transactions.map((tx) => tx.amount);

  const totalIncome = amounts
    .filter((amount) => amount > 0)
    .reduce((sum, amount) => sum + amount, 0);

  const totalExpenses = amounts
    .filter((amount) => amount < 0)
    .reduce((sum, amount) => sum + amount, 0);

  const totalBalance = totalIncome + totalExpenses;

  dom.totalIncome.textContent = formatCurrency(totalIncome);
  dom.totalExpenses.textContent = formatCurrency(Math.abs(totalExpenses));
  dom.totalBalance.textContent = formatCurrency(totalBalance);
};

const renderTransactions = () => {
  const filtered = filterTransactions();

  dom.resultsCount.textContent = `${filtered.length} results`;

  if (filtered.length === 0) {
    dom.transactionsList.innerHTML = `
      <div class="transactions__empty">
        <div class="empty__icon">+</div>
        <p>No transactions yet. Add your first one to get started.</p>
        <button class="btn btn--accent empty-add-btn" type="button">Add First Transaction</button>
      </div>
    `;
    return;
  }

  const groups = groupByMonth(filtered);

  dom.transactionsList.innerHTML = groups
    .map(
      (group) => `
        <div class="month-group">
          <p class="month-title">${group.label}</p>
          ${group.items.map(renderTransactionItem).join("")}
        </div>
      `,
    )
    .join("");
};

const renderTransactionItem = (tx) => {
  const typeClass = tx.amount >= 0 ? "amount--income" : "amount--expense";
  const formattedAmount = formatCurrency(tx.amount);
  const formattedDate = formatDate(tx.date);

  return `
    <div class="transaction">
      <div>
        <p class="transaction__title">${tx.title}</p>
        <div class="transaction__meta">
          <span class="badge">${tx.category}</span>
          <span>${formattedDate}</span>
        </div>
      </div>
      <div>
        <p class="amount ${typeClass}">${formattedAmount}</p>
        <button class="edit-btn" data-id="${tx.id}">Edit</button>
        <button class="delete-btn" data-id="${tx.id}">Delete</button>
      </div>
    </div>
  `;
};

const filterTransactions = () => {
  const { category, type, search } = state.filters;

  return state.transactions.filter((tx) => {
    const matchesCategory = category === "all" || tx.category === category;

    const matchesType =
      type === "all" ||
      (type === "income" && tx.amount > 0) ||
      (type === "expense" && tx.amount < 0);

    const matchesSearch = tx.title.toLowerCase().includes(search.toLowerCase());

    return matchesCategory && matchesType && matchesSearch;
  });
};

const groupByMonth = (transactions) => {
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  const groups = [];
  const lookup = new Map();

  sorted.forEach((tx) => {
    const label = new Date(tx.date).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    if (!lookup.has(label)) {
      lookup.set(label, { label, items: [] });
      groups.push(lookup.get(label));
    }

    lookup.get(label).items.push(tx);
  });

  return groups;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const renderChart = () => {
  const canvas = dom.financeChart;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  const displayWidth = canvas.clientWidth;
  const displayHeight = 260;

  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = displayWidth;
  const height = displayHeight;

  ctx.clearRect(0, 0, width, height);

  const amounts = state.transactions.map((tx) => tx.amount);
  const income = amounts.filter((a) => a > 0).reduce((s, a) => s + a, 0);
  const expenses = Math.abs(
    amounts.filter((a) => a < 0).reduce((s, a) => s + a, 0),
  );

  const maxValue = Math.max(income, expenses, 1);
  const barWidth = 120;
  const gap = 80;
  const baseY = height - 40;

  const incomeHeight = (income / maxValue) * (height - 80);
  const expenseHeight = (expenses / maxValue) * (height - 80);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(40, baseY);
  ctx.lineTo(width - 40, baseY);
  ctx.stroke();

  ctx.fillStyle = "#22c55e";
  ctx.fillRect(160, baseY - incomeHeight, barWidth, incomeHeight);

  ctx.fillStyle = "#f97316";
  ctx.fillRect(
    160 + barWidth + gap,
    baseY - expenseHeight,
    barWidth,
    expenseHeight,
  );

  ctx.fillStyle = "#f8f4e9";
  ctx.font = "14px sans-serif";
  ctx.fillText("Income", 170, baseY + 20);
  ctx.fillText("Expense", 160 + barWidth + gap, baseY + 20);

  ctx.fillText(formatCurrency(income), 150, baseY - incomeHeight - 10);
  ctx.fillText(
    formatCurrency(expenses),
    150 + barWidth + gap,
    baseY - expenseHeight - 10,
  );
};

const renderApp = () => {
  renderSummary();
  renderTransactions();
  renderChart();
};

const exportToCSV = () => {
  if (state.transactions.length === 0) {
    showToast("No data to export.", "error");
    return;
  }

  const headers = ["Title", "Amount", "Category", "Date"];
  const rows = state.transactions.map((tx) => [
    tx.title,
    tx.amount,
    tx.category,
    tx.date,
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "transactions.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  showToast("CSV exported.");
};

const initializeApp = () => {
  loadFromLocalStorage();
  loadTheme();
  renderApp();

  setTimeout(() => {
    dom.skeleton.classList.add("is-hidden");
  }, 300);

  dom.form.addEventListener("submit", (e) => {
    e.preventDefault();
    addTransaction();
  });

  dom.cancelEditBtn.addEventListener("click", () => {
    resetFormState();
  });

  dom.transactionsList.addEventListener("click", (e) => {
  const deleteButton = e.target.closest(".delete-btn");
  const editButton = e.target.closest(".edit-btn");
  const emptyAdd = e.target.closest(".empty-add-btn");

  const deleteId = deleteButton?.dataset?.id;
  const editId = editButton?.dataset?.id;

  if (deleteId) {
    lastFocusedElement = document.activeElement; 
    openConfirmModal(deleteId);
    return; 
  }

  if (editId) {
    startEditing(editId);
    return;
  }

  if (emptyAdd) {
    dom.titleInput.focus();
    return;
  }
});

  dom.filterCategory.addEventListener("change", (e) => {
    state.filters.category = e.target.value;
    renderTransactions();
  });

  dom.filterType.addEventListener("change", (e) => {
    state.filters.type = e.target.value;
    renderTransactions();
  });

  dom.searchInput.addEventListener("input", (e) => {
    state.filters.search = e.target.value;
    renderTransactions();
  });

  dom.resetFiltersBtn.addEventListener("click", () => {
    state.filters = { category: "all", type: "all", search: "" };
    dom.filterCategory.value = "all";
    dom.filterType.value = "all";
    dom.searchInput.value = "";
    renderTransactions();
  });

  dom.exportCsvBtn.addEventListener("click", exportToCSV);

  dom.themeToggleBtn.addEventListener("click", () => {
    setTheme(state.theme === "dark" ? "light" : "dark");
  });

  dom.confirmDeleteBtn.addEventListener("click", () => {
    if (state.pendingDeleteId) {
      deleteTransaction(state.pendingDeleteId);
    }
    closeConfirmModal();
  });

  dom.cancelDeleteBtn.addEventListener("click", closeConfirmModal);

  dom.confirmModal.addEventListener("click", (e) => {
    if (e.target.dataset.close) {
      closeConfirmModal();
    }
  });
  document.addEventListener("keydown", handleTabKey);
  document.addEventListener("keydown", (e) => {

    if (e.key === "Escape" && dom.confirmModal.classList.contains("is-open")) {

      dom.confirmModal.classList.remove("is-open");
      

      if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus();
      }
    }
  });
};

(function() {
    const consentBanner = document.querySelector('cookie-consent');
    if (!consentBanner) return;

    consentBanner.addEventListener('accept', (e) => {
        console.log('Cookie 同意已记录：用户接受了所有 Cookie。');
    });

    consentBanner.addEventListener('deny', (e) => {
        console.log('Cookie 同意已记录：用户拒绝了非必要的 Cookie。');
    });

    consentBanner.addEventListener('load', (e) => {
        console.log('Cookie 横幅已加载并准备就绪。');
    });
})();

initializeApp();
