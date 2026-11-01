/**
 * Daftar Endpoint Kontrak API
 * Referensi: MILESTONE.md §4.1 - §4.10, dan Bagian B (MS-00 s/d MS-14)
 *
 * Seluruh endpoint sistem didaftarkan di sini untuk menjamin satu sumber
 * kebenaran antara Mock Handler, Client Service, dan Backend API.
 */

export const Endpoints = {
	// Auth & Identity (MS-00)
	AUTH: {
		ME: '/api/v1/me',
		LOGIN: '/api/v1/auth/login',
		LOGOUT: '/api/v1/auth/logout',
		STEP_UP: '/api/v1/auth/step-up',
		DEV_SWITCH_ROLE: '/api/v1/dev/switch-role'
	},

	// Panel Sumber Data & Dev Control (T-00.13)
	DEV: {
		STATE: '/api/v1/dev/state',
		CLOCK: '/api/v1/dev/clock',
		LATENCY: '/api/v1/dev/latency',
		RESET: '/api/v1/dev/reset',
		SWITCH_ROLE: '/api/v1/dev/switch-role'
	},

	// Shell, Navigasi & Dashboard (MS-01)
	NAV: {
		BADGES: '/api/v1/nav/badges',
		NOTIFICATIONS: '/api/v1/notifications',
		SEARCH: '/api/v1/search',
		DASHBOARD_CARDS: (key: string) => `/api/v1/dashboard/cards/${key}`
	},

	// Status Tutup Hari / End of Day (T-01.14)
	EOD: {
		STATUS: '/api/v1/eod/status',
		COMPLETE: '/api/v1/eod/complete',
		SUMMARY: '/api/v1/eod/summary'
	},

	// Organisasi & Outlet (MS-02)
	ORG: {
		ORGANIZATIONS: '/api/v1/organizations',
		ORGANIZATION_DETAIL: (id: string) => `/api/v1/organizations/${id}`,
		ORGANIZATION_ACTIVATE: (id: string) => `/api/v1/organizations/${id}/actions/activate`,
		ORGANIZATION_DEACTIVATE: (id: string) => `/api/v1/organizations/${id}/actions/deactivate`,
		OUTLETS: '/api/v1/outlets',
		OUTLET_DETAIL: (id: string) => `/api/v1/outlets/${id}`,
		OUTLET_ACTIVATE: (id: string) => `/api/v1/outlets/${id}/actions/activate`,
		OUTLET_DEACTIVATE: (id: string) => `/api/v1/outlets/${id}/actions/deactivate`,
		OUTLET_OWNERS: '/api/v1/outlet-owners',
		OUTLET_OWNERSHIPS: (id: string) => `/api/v1/outlets/${id}/ownerships`,
		OUTLET_GROUPS: '/api/v1/outlet-groups'
	},

	// Katalog Bahan & Pemasok (MS-03)
	CATALOG: {
		ITEMS: '/api/v1/stock-items',
		ITEM_DETAIL: (id: string) => `/api/v1/stock-items/${id}`,
		ITEM_ARCHIVE: (id: string) => `/api/v1/stock-items/${id}/actions/archive`,
		ITEM_RESTORE: (id: string) => `/api/v1/stock-items/${id}/actions/restore`,
		ITEM_COSTS: (id: string) => `/api/v1/stock-items/${id}/costs`,
		ITEM_MIN_STOCK: (id: string) => `/api/v1/stock-items/${id}/min-stock`,
		CATEGORIES: '/api/v1/item-categories',
		UNITS: '/api/v1/units',
		CONVERSIONS: '/api/v1/unit-conversions',
		SUPPLIERS: '/api/v1/suppliers',
		SUPPLIER_DETAIL: (id: string) => `/api/v1/suppliers/${id}`,
		CSV_PREVIEW: '/api/v1/imports/stock-items/preview',
		CSV_COMMIT: '/api/v1/imports/stock-items/commit',
		CATEGORY_CSV_PREVIEW: '/api/v1/imports/categories/preview',
		CATEGORY_CSV_COMMIT: '/api/v1/imports/categories/commit'
	},

	// Menu, Resep & Harga (MS-04)
	MENU: {
		ITEMS: '/api/v1/menu-items',
		ITEM_DETAIL: (id: string) => `/api/v1/menu-items/${id}`,
		CATEGORIES: '/api/v1/menu-categories',
		CATEGORY_DETAIL: (id: string) => `/api/v1/menu-categories/${id}`,
		VARIANTS: (id: string) => `/api/v1/menu-items/${id}/variants`,
		MODIFIER_GROUPS: '/api/v1/modifier-groups',
		MODIFIER_GROUP_DETAIL: (id: string) => `/api/v1/modifier-groups/${id}`,
		MODIFIER_OPTIONS: (groupId: string) => `/api/v1/modifier-groups/${groupId}/options`,
		MODIFIER_OPTION_DETAIL: (id: string) => `/api/v1/modifier-options/${id}`,
		NOTE_PRESETS: '/api/v1/note-presets',
		NOTE_PRESET_DETAIL: (id: string) => `/api/v1/note-presets/${id}`,
		RECIPES: '/api/v1/recipes',
		RECIPE_DETAIL: (id: string) => `/api/v1/recipes/${id}`,
		RECIPE_RESOLVE: '/api/v1/recipes/resolve',
		RECIPE_ACTION: (id: string, action: string) => `/api/v1/recipes/${id}/actions/${action}`,
		HPP_PREVIEW: (variantId: string) => `/api/v1/menu-variants/${variantId}/hpp`,
		BASE_PRICES: '/api/v1/base-prices',
		PRICE_OVERRIDES: '/api/v1/price-overrides',
		CHANNELS: '/api/v1/sales-channels',
		CHANNEL_MARKUPS: (id: string) => `/api/v1/sales-channels/${id}/markups`,
		PRICING_PREVIEW: '/api/v1/pricing/preview',
		AVAILABILITY: '/api/v1/menu-availability',
		AVAILABILITY_ACTION: (id: string, action: string) => `/api/v1/menu-availability/${id}/actions/${action}`,
		PRODUCTION_RECIPES: '/api/v1/production-recipes',
		PRODUCTION_RECIPE_DETAIL: (id: string) => `/api/v1/production-recipes/${id}`
	},

	// Persetujuan (MS-05)
	APPROVALS: {
		REQUESTS: '/api/v1/approval-requests',
		REQUEST_DETAIL: (id: string) => `/api/v1/approval-requests/${id}`,
		APPROVE: (id: string) => `/api/v1/approval-requests/${id}/actions/approve`,
		REJECT: (id: string) => `/api/v1/approval-requests/${id}/actions/reject`,
		CANCEL: (id: string) => `/api/v1/approval-requests/${id}/actions/cancel`,
		RULES: '/api/v1/approval-rules',
		RULE_DETAIL: (id: string) => `/api/v1/approval-rules/${id}`,
		EVALUATE: '/api/v1/approval-rules/evaluate'
	},

	// Inventaris & Stok (MS-06)
	INVENTORY: {
		STOCK: '/api/v1/inventory/stock',
		STOCK_DETAIL: (outletId: string, itemId: string) => `/api/v1/inventory/stock/${outletId}/${itemId}`,
		MOVEMENTS: '/api/v1/inventory/movements',
		COUNTS: '/api/v1/stock-counts',
		COUNT_ACTIONS: (id: string, action: string) => `/api/v1/stock-counts/${id}/actions/${action}`,
		WASTE: '/api/v1/waste-records',
		PRODUCTION: '/api/v1/production-batches',
		TRANSFERS: '/api/v1/stock-transfers',
		ALERTS: '/api/v1/inventory/alerts'
	},

	// Pengadaan & Pembelian (MS-07)
	PROCUREMENT: {
		PURCHASE_ORDERS: '/api/v1/purchase-orders',
		PO_DETAIL: (id: string) => `/api/v1/purchase-orders/${id}`,
		PO_ACTIONS: (id: string, action: string) => `/api/v1/purchase-orders/${id}/actions/${action}`,
		RECEIPTS: '/api/v1/goods-receipts',
		INVOICES: '/api/v1/supplier-invoices',
		INVOICE_DETAIL: (id: string) => `/api/v1/supplier-invoices/${id}`,
		INVOICE_ACTIONS: (id: string, action: string) => `/api/v1/supplier-invoices/${id}/actions/${action}`,
		INVOICE_IMPACT: (id: string) => `/api/v1/supplier-invoices/${id}/impact`,
		AWAITING_INVOICE: '/api/v1/procurement/awaiting-invoice'
	},

	// Hutang & Pembayaran (MS-08)
	PAYABLES: {
		BILLS: '/api/v1/bills',
		BILL_DETAIL: (id: string) => `/api/v1/bills/${id}`,
		BALANCES: '/api/v1/payables/balances',
		AGING: '/api/v1/payables/aging',
		PAYMENT_TERMS: '/api/v1/payment-terms',
		PAYMENTS: '/api/v1/payments',
		PAYMENT_ACTIONS: (id: string, action: string) => `/api/v1/payments/${id}/actions/${action}`,
		STATEMENTS: '/api/v1/statements',
		CREDIT_DEBIT_NOTES: '/api/v1/credit-debit-notes'
	},

	// Kas Kecil & Biaya (MS-09)
	PETTY_CASH: {
		ACCOUNTS: '/api/v1/petty-cash/accounts',
		TOPUPS: '/api/v1/petty-cash/topups',
		TOPUP_ACTIONS: (id: string, action: string) => `/api/v1/petty-cash/topups/${id}/actions/${action}`,
		EXPENSES: '/api/v1/petty-cash/expenses',
		EXPENSE_ACTIONS: (id: string, action: string) => `/api/v1/petty-cash/expenses/${id}/actions/${action}`,
		LIMITS_PREVIEW: '/api/v1/petty-cash/limits/preview',
		COST_ENTRIES: '/api/v1/cost-entries',
		COST_CATEGORIES: '/api/v1/cost-categories'
	},

	// Usulan Menu (MS-10)
	PROPOSALS: {
		LIST: '/api/v1/menu-proposals',
		DETAIL: (id: string) => `/api/v1/menu-proposals/${id}`,
		ACTIONS: (id: string, action: string) => `/api/v1/menu-proposals/${id}/actions/${action}`,
		HPP_PREVIEW: (id: string) => `/api/v1/menu-proposals/${id}/hpp-preview`
	},

	// Keuangan & Fiskal (MS-11)
	FINANCE: {
		TRUE_UP_PENDING: '/api/v1/finance/true-up/pending',
		TRUE_UP_ADJUSTMENTS: '/api/v1/finance/true-up/adjustments',
		TAX_RECORDS: '/api/v1/tax-records',
		TAX_RECAP: '/api/v1/tax/recap',
		FISCAL_PERIODS: '/api/v1/fiscal-periods',
		PERIOD_ACTIONS: (id: string, action: string) => `/api/v1/fiscal-periods/${id}/actions/${action}`,
		RECONCILIATION: '/api/v1/reconciliation/summary'
	},

	// Laporan (MS-12)
	REPORTS: {
		INDEX: '/api/v1/reports',
		GET: (key: string) => `/api/v1/reports/${key}`,
		PRESETS: (key: string) => `/api/v1/reports/${key}/presets`
	},

	// Pengaturan & Dev (MS-13)
	SETTINGS: {
		GENERAL: '/api/v1/settings',
		FEATURES: '/api/v1/feature-flags',
		TAX_CODES: '/api/v1/tax-codes',
		USERS: '/api/v1/users',
		ROLES: '/api/v1/roles',
		AUDIT_LOGS: '/api/v1/audit-logs',
		DEV_SOURCE: '/api/v1/dev/data-source',
		DEV_RESET: '/api/v1/dev/reset',
		DEV_CLOCK: '/api/v1/dev/clock',
		DEV_SCENARIO: '/api/v1/dev/scenario'
	}
} as const;
