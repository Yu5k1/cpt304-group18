[![codecov](https://codecov.io/gh/Yu5k1/cpt304-group18/branch/main/graph/badge.svg)](https://codecov.io/gh/Yu5k1/cpt304-group18)

# Advanced Finance Tracker — Group 18

CPT304 Coursework 1 fork of [sptin2002/advanced-finance-tracker](https://github.com/sptin2002/advanced-finance-tracker), enhanced to production-ready standards through a research-led audit and refactor.

**Live Demo:** https://cpt304-group18.vercel.app

---

## What We Changed

This fork extends the original project with four researched deficiency fixes and five baseline standards. Every change is backed by a cited reference and linked to a pull request.

### Deficiency Fixes

| # | Deficiency | Fix | PR |
|---|-----------|-----|----|
| 1 | XSS via unsanitized `innerHTML` | `sanitize()` helper using `textContent` output encoding | [#6](https://github.com/Yu5k1/cpt304-group18/pull/6) |
| 2 | Unvalidated localStorage data | `isValidTransaction()` per-field whitelist guard | [#1](https://github.com/Yu5k1/cpt304-group18/pull/1) |
| 3 | Inaccessible canvas chart (WCAG 1.1.1) | `role="img"`, `aria-label`, visually hidden fallback table | [#8](https://github.com/Yu5k1/cpt304-group18/pull/8) |
| 4 | Modal keyboard focus trap (WCAG 2.4.3) | `handleTabKey()` focus loop, Escape key handler, focus restore | [#9](https://github.com/Yu5k1/cpt304-group18/pull/9) |

### Baseline Standards

| Standard | Status | Evidence |
|----------|--------|----------|
| Live Uptime (7+ days) | ✅ | Vercel — 16 consecutive Ready deployments from 4 May |
| Test Coverage ≥ 80% | ✅ | Codecov badge — 85% line coverage, 51 Jest tests |
| Lighthouse Accessibility ≥ 90 | ✅ | 95 / 100 in desktop mode |
| Internationalization (i18n) | ✅ | English / Simplified Chinese toggle — [#4](https://github.com/Yu5k1/cpt304-group18/pull/4) |
| Legal Compliance | ✅ | Cookie consent banner + Privacy Policy page — [#9](https://github.com/Yu5k1/cpt304-group18/pull/9) |

---

## Original Features

The base application provides:

- Add, edit, and delete transactions with inline validation
- Real-time dashboard: total balance, income, and expenses
- Income vs Expense bar chart via Canvas API
- Filter by category, type, and live title search
- localStorage persistence and dark/light mode toggle
- CSV export

Built with HTML5, CSS, and Vanilla JavaScript — no frameworks or external libraries.

---

## Repository Structure

```
├── index.html          # Main application + cookie banner
├── main.js             # Application logic (sanitize, validation, i18n, focus trap)
├── style.css           # Styles including .sr-only for accessibility
├── privacy.html        # Privacy Policy page
├── locales/
│   ├── en.json         # English translations
│   └── zh.json         # Simplified Chinese translations
├── main.test.js        # Jest test suite (51 tests)
└── jest.config.js      # Jest configuration
```

---

## References

1. R. Chaudhary, B. Meena, and S. Sharma, "XSS vulnerability assessment and prevention in web application," NGCT 2016, doi: 10.1109/NGCT.2016.7877529
2. S. Nanda, L.-C. Lam, and T.-C. Chiueh, "Web application attack prevention for tiered internet services," IAS 2008, doi: 10.1109/IAS.2008.62
3. W3C WAI, "Canvas Accessibility," https://www.w3.org/WAI/tutorials/canvas/
4. W3C, "WCAG 2.1," https://www.w3.org/TR/WCAG21/

---

## Group 18

XJTLU CPT304 Software Engineering 2, 2026
