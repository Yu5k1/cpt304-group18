/**
 * Unit tests for Advanced Finance Tracker — main.js
 * Run with: npx jest --coverage
 */

// Mock fetch BEFORE everything
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
  })
);

// Set up DOM BEFORE requiring main.js (this is critical)
document.body.innerHTML = `
  <form id="transactionForm">
    <input id="titleInput" type="text" />
    <input id="amountInput" type="number" />
    <select id="categoryInput"><option value="">Select</option><option value="Salary">Salary</option></select>
    <input id="dateInput" type="date" />
    <small id="titleError"></small>
    <small id="amountError"></small>
    <small id="categoryError"></small>
    <small id="dateError"></small>
    <button id="submitBtn" type="submit">Add Transaction</button>
    <button id="cancelEditBtn" type="button" hidden>Cancel</button>
  </form>
  <select id="filterCategory"><option value="all">All</option></select>
  <select id="filterType"><option value="all">All</option></select>
  <input id="searchInput" type="text" />
  <button id="resetFiltersBtn"></button>
  <button id="exportCsvBtn"></button>
  <button id="themeToggleBtn">Light Mode</button>
  <button id="langToggleBtn">中文</button>
  <div id="transactionsList"></div>
  <p id="resultsCount"></p>
  <h2 id="totalBalance">$0.00</h2>
  <h2 id="totalIncome">$0.00</h2>
  <h2 id="totalExpenses">$0.00</h2>
  <canvas id="financeChart" width="800" height="260"></canvas>
  <div id="confirmModal" aria-hidden="true">
    <div data-close="true"></div>
    <div role="dialog">
      <button id="confirmDeleteBtn"></button>
      <button id="cancelDeleteBtn"></button>
    </div>
  </div>
  <div id="toastContainer"></div>
  <div id="skeleton" class="skeleton"></div>
  <div id="htmlRoot"></div>
`;

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock canvas getContext
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  fillText: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  setTransform: jest.fn(),
  fillStyle: "",
  strokeStyle: "",
  font: "",
}));

// Mock URL methods
global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = jest.fn();

// NOW require main.js (DOM is ready)
const {
  generateID,
  saveToLocalStorage,
  loadFromLocalStorage,
  formatCurrency,
  formatDate,
  filterTransactions,
  groupByMonth,
  validateForm,
  addTransaction,
  deleteTransaction,
  renderTransactionItem,
  exportToCSV,
  sanitize,
  state,
  dom,
} = require("./main");


// ─────────────────────────────────────────────
// generateID
// ─────────────────────────────────────────────
describe("generateID", () => {
  test("should return a string starting with 'tx_'", () => {
    const id = generateID();
    expect(typeof id).toBe("string");
    expect(id.startsWith("tx_")).toBe(true);
  });

  test("should generate unique IDs", () => {
    const id1 = generateID();
    const id2 = generateID();
    expect(id1).not.toBe(id2);
  });
});


// ─────────────────────────────────────────────
// formatCurrency
// ─────────────────────────────────────────────
describe("formatCurrency", () => {
  test("should format positive numbers as USD", () => {
    expect(formatCurrency(100)).toBe("$100.00");
  });

  test("should format negative numbers", () => {
    expect(formatCurrency(-50)).toBe("-$50.00");
  });

  test("should format zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  test("should format decimals correctly", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  test("should format large numbers with commas", () => {
    expect(formatCurrency(1000000)).toBe("$1,000,000.00");
  });
});


// ─────────────────────────────────────────────
// formatDate
// ─────────────────────────────────────────────
describe("formatDate", () => {
  test("should format a date string correctly", () => {
    const result = formatDate("2026-05-01");
    expect(result).toContain("May");
    expect(result).toContain("2026");
  });

  test("should format another date correctly", () => {
    const result = formatDate("2026-01-15");
    expect(result).toContain("Jan");
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });
});


// ─────────────────────────────────────────────
// sanitize (XSS prevention)
// ─────────────────────────────────────────────
describe("sanitize", () => {
  test("should escape HTML tags", () => {
    const result = sanitize("<script>alert(1)</script>");
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  test("should escape img onerror payload", () => {
    const result = sanitize('<img src=x onerror=alert(1)>');
    expect(result).toContain("&lt;img");
    expect(result).not.toContain("<img");
  });

  test("should return normal text unchanged", () => {
    expect(sanitize("Grocery Shopping")).toBe("Grocery Shopping");
  });

  test("should handle empty string", () => {
    expect(sanitize("")).toBe("");
  });

  test("should escape ampersands", () => {
    const result = sanitize("Tom & Jerry");
    expect(result).toContain("&amp;");
  });
});


// ─────────────────────────────────────────────
// filterTransactions
// ─────────────────────────────────────────────
describe("filterTransactions", () => {
  beforeEach(() => {
    state.transactions = [
      { id: "tx_1", title: "Salary Payment", amount: 5000, category: "Salary", date: "2026-05-01" },
      { id: "tx_2", title: "Grocery Shopping", amount: -80, category: "Food", date: "2026-05-02" },
      { id: "tx_3", title: "Bus Ticket", amount: -5, category: "Transport", date: "2026-05-03" },
      { id: "tx_4", title: "Freelance Work", amount: 1200, category: "Business", date: "2026-05-04" },
    ];
    state.filters = { category: "all", type: "all", search: "" };
  });

  test("should return all transactions with default filters", () => {
    const result = filterTransactions();
    expect(result).toHaveLength(4);
  });

  test("should filter by category", () => {
    state.filters.category = "Food";
    const result = filterTransactions();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Grocery Shopping");
  });

  test("should filter by income type", () => {
    state.filters.type = "income";
    const result = filterTransactions();
    expect(result).toHaveLength(2);
  });

  test("should filter by expense type", () => {
    state.filters.type = "expense";
    const result = filterTransactions();
    expect(result).toHaveLength(2);
  });

  test("should filter by search term", () => {
    state.filters.search = "salary";
    const result = filterTransactions();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Salary Payment");
  });

  test("should combine category and type filters", () => {
    state.filters.category = "Salary";
    state.filters.type = "income";
    const result = filterTransactions();
    expect(result).toHaveLength(1);
  });

  test("should return empty array when no match", () => {
    state.filters.search = "nonexistent";
    const result = filterTransactions();
    expect(result).toHaveLength(0);
  });

  test("should be case-insensitive for search", () => {
    state.filters.search = "SALARY";
    const result = filterTransactions();
    expect(result).toHaveLength(1);
  });
});


// ─────────────────────────────────────────────
// groupByMonth
// ─────────────────────────────────────────────
describe("groupByMonth", () => {
  test("should group transactions by month", () => {
    const transactions = [
      { id: "tx_1", title: "A", amount: 100, category: "Salary", date: "2026-05-01" },
      { id: "tx_2", title: "B", amount: -50, category: "Food", date: "2026-05-15" },
      { id: "tx_3", title: "C", amount: 200, category: "Business", date: "2026-04-10" },
    ];
    const groups = groupByMonth(transactions);
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toContain("May");
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].label).toContain("April");
    expect(groups[1].items).toHaveLength(1);
  });

  test("should sort by most recent month first", () => {
    const transactions = [
      { id: "tx_1", title: "Old", amount: 100, category: "Salary", date: "2026-01-01" },
      { id: "tx_2", title: "New", amount: 200, category: "Salary", date: "2026-06-01" },
    ];
    const groups = groupByMonth(transactions);
    expect(groups[0].label).toContain("June");
    expect(groups[1].label).toContain("January");
  });

  test("should handle empty array", () => {
    const groups = groupByMonth([]);
    expect(groups).toHaveLength(0);
  });

  test("should handle single transaction", () => {
    const transactions = [
      { id: "tx_1", title: "Solo", amount: 100, category: "Salary", date: "2026-03-15" },
    ];
    const groups = groupByMonth(transactions);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(1);
  });
});


// ─────────────────────────────────────────────
// renderTransactionItem
// ─────────────────────────────────────────────
describe("renderTransactionItem", () => {
  test("should render income transaction with correct class", () => {
    const tx = { id: "tx_1", title: "Pay", amount: 500, category: "Salary", date: "2026-05-01" };
    const html = renderTransactionItem(tx);
    expect(html).toContain("amount--income");
    expect(html).toContain("$500.00");
  });

  test("should render expense transaction with correct class", () => {
    const tx = { id: "tx_2", title: "Food", amount: -30, category: "Food", date: "2026-05-02" };
    const html = renderTransactionItem(tx);
    expect(html).toContain("amount--expense");
  });

  test("should include edit and delete buttons with data-id", () => {
    const tx = { id: "tx_abc123", title: "Test", amount: 100, category: "Salary", date: "2026-05-01" };
    const html = renderTransactionItem(tx);
    expect(html).toContain('data-id="tx_abc123"');
    expect(html).toContain("edit-btn");
    expect(html).toContain("delete-btn");
  });

  test("should sanitize the title to prevent XSS", () => {
    const tx = { id: "tx_1", title: "<script>alert(1)</script>", amount: 100, category: "Salary", date: "2026-05-01" };
    const html = renderTransactionItem(tx);
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  test("should sanitize the category to prevent XSS", () => {
    const tx = { id: "tx_1", title: "Test", amount: 100, category: "Salary", date: "2026-05-01" };
    const html = renderTransactionItem(tx);
    expect(html).toContain("Salary");
  });
});


// ─────────────────────────────────────────────
// localStorage (save and load)
// ─────────────────────────────────────────────
describe("localStorage operations", () => {
  beforeEach(() => {
    localStorageMock.clear();
    state.transactions = [];
  });

  test("saveToLocalStorage should store transactions as JSON", () => {
    state.transactions = [{ id: "tx_1", title: "Test", amount: 100, category: "Salary", date: "2026-05-01" }];
    saveToLocalStorage();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "financeTrackerData",
      JSON.stringify(state.transactions)
    );
  });

  test("loadFromLocalStorage should parse stored data", () => {
    const data = [{ id: "tx_1", title: "Stored", amount: 200, category: "Food", date: "2026-05-01" }];
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(data));
    loadFromLocalStorage();
    expect(state.transactions).toEqual(data);
  });

  test("loadFromLocalStorage should default to empty array when no data", () => {
    localStorageMock.getItem.mockReturnValueOnce(null);
    loadFromLocalStorage();
    expect(state.transactions).toEqual([]);
  });
});


// ─────────────────────────────────────────────
// validateForm
// ─────────────────────────────────────────────
describe("validateForm", () => {
  beforeEach(() => {
    dom.titleInput.value = "Test Transaction";
    dom.amountInput.value = "100";
    dom.categoryInput.value = "Salary";
    dom.dateInput.value = "2026-05-01";
  });

  test("should return true when all fields are valid", () => {
    expect(validateForm()).toBe(true);
  });

  test("should return false when title is empty", () => {
    dom.titleInput.value = "";
    expect(validateForm()).toBe(false);
  });

  test("should return false when amount is empty", () => {
    dom.amountInput.value = "";
    expect(validateForm()).toBe(false);
  });

  test("should return false when amount is zero", () => {
    dom.amountInput.value = "0";
    expect(validateForm()).toBe(false);
  });

  test("should return false when amount is not a number", () => {
    dom.amountInput.value = "abc";
    expect(validateForm()).toBe(false);
  });

  test("should return false when category is not selected", () => {
    dom.categoryInput.value = "";
    expect(validateForm()).toBe(false);
  });

  test("should return false when date is empty", () => {
    dom.dateInput.value = "";
    expect(validateForm()).toBe(false);
  });

  test("should accept negative amounts (expenses)", () => {
    dom.amountInput.value = "-50";
    expect(validateForm()).toBe(true);
  });
});


// ─────────────────────────────────────────────
// addTransaction
// ─────────────────────────────────────────────
describe("addTransaction", () => {
  beforeEach(() => {
    state.transactions = [];
    state.editingId = null;
    dom.titleInput.value = "New Item";
    dom.amountInput.value = "250";
    dom.categoryInput.value = "Salary";
    dom.dateInput.value = "2026-05-01";
  });

  test("should add a new transaction to state", () => {
    addTransaction();
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0].title).toBe("New Item");
    expect(state.transactions[0].amount).toBe(250);
  });

  test("should not add transaction with invalid form", () => {
    dom.titleInput.value = "";
    addTransaction();
    expect(state.transactions).toHaveLength(0);
  });

  test("should update existing transaction when editing", () => {
    state.transactions = [{ id: "edit1", title: "Old", amount: 100, category: "Food", date: "2026-04-01" }];
    state.editingId = "edit1";
    dom.titleInput.value = "Updated";
    dom.amountInput.value = "999";
    dom.categoryInput.value = "Salary";
    dom.dateInput.value = "2026-05-01";
    addTransaction();
    expect(state.transactions[0].title).toBe("Updated");
    expect(state.transactions[0].amount).toBe(999);
  });
});


// ─────────────────────────────────────────────
// deleteTransaction
// ─────────────────────────────────────────────
describe("deleteTransaction", () => {
  beforeEach(() => {
    state.transactions = [
      { id: "del1", title: "Keep", amount: 100, category: "Salary", date: "2026-05-01" },
      { id: "del2", title: "Remove", amount: -50, category: "Food", date: "2026-05-02" },
    ];
  });

  test("should remove the correct transaction", () => {
    deleteTransaction("del2");
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0].id).toBe("del1");
  });

  test("should not remove anything if id does not exist", () => {
    deleteTransaction("nonexistent");
    expect(state.transactions).toHaveLength(2);
  });
});


// ─────────────────────────────────────────────
// exportToCSV
// ─────────────────────────────────────────────
describe("exportToCSV", () => {
  test("should not export when no transactions", () => {
    state.transactions = [];
    exportToCSV();
  });

  test("should create CSV blob when transactions exist", () => {
    state.transactions = [
      { id: "tx_1", title: "Test", amount: 100, category: "Salary", date: "2026-05-01" },
    ];
    exportToCSV();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});


// ─────────────────────────────────────────────
// state object
// ─────────────────────────────────────────────
describe("state", () => {
  test("should have correct initial filter values", () => {
    state.filters = { category: "all", type: "all", search: "" };
    expect(state.filters.category).toBe("all");
    expect(state.filters.type).toBe("all");
    expect(state.filters.search).toBe("");
  });

  test("should have null editingId initially", () => {
    state.editingId = null;
    expect(state.editingId).toBeNull();
  });
});
