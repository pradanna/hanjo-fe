/**
 * Hanjo API Client & Driver Dispatcher
 * Referensi: MILESTONE.md §3.1, §3.3, §3.4
 *
 * Mengatur pemanggilan API melalui antarmuka seragam `request()`.
 * Memilih driver (`mockDriver` atau `httpDriver`) secara dinamis berdasarkan konfigurasi
 * `PUBLIC_DATA_SOURCE` atau override per awalan path (mode hibrida).
 */

import type { ApiRequest, ApiResponse, DataDriver, Envelope } from './contract/types.js';
import { AppError } from './contract/errors.js';
import { mockDriver } from './drivers/mock/driver.js';
import { httpDriver } from './drivers/http/driver.js';

export type DataSourceType = 'mock' | 'api';

export interface ClientOptions {
	defaultDataSource?: DataSourceType;
	pathOverrides?: Record<string, DataSourceType>;
}

export class ApiClient {
	private defaultDataSource: DataSourceType;
	private pathOverrides: Map<string, DataSourceType>;
	private mockDriver: DataDriver;
	private httpDriver: DataDriver;

	constructor(options: ClientOptions = {}) {
		// Default sumber data: baca dari Vite env jika ada, fallback ke 'mock'
		const envSource = typeof import.meta !== 'undefined' && (import.meta as any).env?.PUBLIC_DATA_SOURCE;
		this.defaultDataSource = options.defaultDataSource || (envSource === 'api' ? 'api' : 'mock');
		this.pathOverrides = new Map(Object.entries(options.pathOverrides || {}));
		this.mockDriver = mockDriver;
		this.httpDriver = httpDriver;
	}

	/**
	 * Menentukan sumber data default secara runtime (dipakai oleh Panel Sumber Data MS-13)
	 */
	setDataSource(source: DataSourceType): void {
		this.defaultDataSource = source;
	}

	getDataSource(): DataSourceType {
		return this.defaultDataSource;
	}

	/**
	 * Menyetel override driver per awalan path (mode hibrida, mis. /inventory -> api)
	 */
	setPathOverride(pathPrefix: string, source: DataSourceType): void {
		this.pathOverrides.set(pathPrefix, source);
	}

	removePathOverride(pathPrefix: string): void {
		this.pathOverrides.delete(pathPrefix);
	}

	getPathOverrides(): Record<string, DataSourceType> {
		return Object.fromEntries(this.pathOverrides.entries());
	}

	/**
	 * Memilih driver yang tepat berdasarkan path request
	 */
	private resolveDriver(path: string): DataDriver {
		// Cari override terpanjang yang cocok dengan awalan path
		let matchedPrefix = '';
		let chosenSource: DataSourceType | undefined;

		for (const [prefix, source] of this.pathOverrides.entries()) {
			if (path.startsWith(prefix) && prefix.length > matchedPrefix.length) {
				matchedPrefix = prefix;
				chosenSource = source;
			}
		}

		const source = chosenSource || this.defaultDataSource;
		return source === 'api' ? this.httpDriver : this.mockDriver;
	}

	/**
	 * Menjalankan request API melalui driver terpilih dengan dukungan retry aman untuk GET
	 */
	async request<T>(req: ApiRequest): Promise<ApiResponse<T>> {
		const driver = this.resolveDriver(req.path);
		const maxRetries = req.method.toUpperCase() === 'GET' ? 2 : 0;
		let attempts = 0;

		while (true) {
			try {
				const response = await driver.request<T>(req);

				// Jika server error 500/502/503/504 pada request GET, lakukan retry
				if (response.status >= 500 && attempts < maxRetries) {
					attempts++;
					await new Promise((res) => setTimeout(res, 200 * attempts));
					continue;
				}

				return response;
			} catch (error: any) {
				// Retry hanya untuk network drop pada method GET
				if (attempts < maxRetries && error.name !== 'AbortError') {
					attempts++;
					await new Promise((res) => setTimeout(res, 200 * attempts));
					continue;
				}
				throw error;
			}
		}
	}

	/**
	 * Helper eksekusi request dan langsung mengembalikan payload data (unwrap)
	 * Melempar AppError jika status bukan 2xx.
	 */
	async execute<T>(req: ApiRequest): Promise<T> {
		const res = await this.request<T>(req);
		if (res.status >= 400 || ('error' in res.body && res.body.error)) {
			const err = (res.body as any).error;
			const appErr = new AppError(err?.code || 'server_error', err?.message || 'Permintaan gagal', err?.details);
			if (err?.blocking_documents) {
				(appErr as any).blocking_documents = err.blocking_documents;
				(appErr.envelope.error as any).blocking_documents = err.blocking_documents;
			}
			throw appErr;
		}

		return (res.body as any).data as T;
	}

	// Shorthand helpers
	async get<T>(path: string, options?: Partial<ApiRequest>): Promise<T> {
		return this.execute<T>({ method: 'GET', path, ...options });
	}

	async post<T>(path: string, body?: unknown, options?: Partial<ApiRequest>): Promise<T> {
		return this.execute<T>({ method: 'POST', path, body, ...options });
	}

	async put<T>(path: string, body?: unknown, options?: Partial<ApiRequest>): Promise<T> {
		return this.execute<T>({ method: 'PUT', path, body, ...options });
	}

	async delete<T>(path: string, options?: Partial<ApiRequest>): Promise<T> {
		return this.execute<T>({ method: 'DELETE', path, ...options });
	}
}

export const apiClient = new ApiClient();

// Re-export request singleton
export const request = apiClient.request.bind(apiClient);

// Re-export utility format Rupiah
export { formatRupiah } from '../utils/format.js';

// ============================================================================
// TRANSITIONAL PROTOTYPE TYPES & MOCKS (Untuk menjaga kompatibilitas halaman prototipe)
// ============================================================================

export interface Category {
	id: string;
	name: string;
	slug: string;
	description: string;
	sort_order: number;
	is_active: boolean;
}

export interface RecipeItem {
	ingredient_id: string;
	ingredient_name?: string;
	quantity: number;
	unit: string;
}

export interface Variant {
	id: string;
	name: string;
	sku: string;
	price: number;
	cost: number;
	is_default: boolean;
	sort_order: number;
	recipes?: RecipeItem[];
}

export interface ModifierOption {
	id: string;
	name: string;
	price_adjustment: number;
	sort_order: number;
}

export interface ModifierGroup {
	id: string;
	name: string;
	is_required: boolean;
	max_select: number;
	sort_order: number;
	options: ModifierOption[];
}

export interface Product {
	id: string;
	category_id: string;
	category_name?: string;
	sku: string;
	name: string;
	description: string;
	product_type: string;
	status: string;
	image_url: string;
	variants: Variant[];
	modifier_groups: ModifierGroup[];
	preset_notes?: string[];
}

export interface Ingredient {
	id: string;
	name: string;
	sku: string;
	unit: string;
	minimum_stock: number;
	reorder_point: number;
	cost_per_unit: number;
	status: string;
}

export interface StockLevel {
	id: string;
	outlet_id: string;
	ingredient_id: string;
	ingredient_name?: string;
	current_qty: number;
	unit: string;
	last_updated: string;
}

export interface LowStockAlert {
	ingredient_id: string;
	ingredient_name: string;
	sku: string;
	outlet_id: string;
	current_qty: number;
	minimum_stock: number;
	reorder_point: number;
	unit: string;
}

export interface Outlet {
	id: string;
	name: string;
	code: string;
	street: string;
	city: string;
	status: string;
	tax_rate: number;
	service_charge: number;
}

export interface POSSession {
	id: string;
	outlet_id: string;
	cashier_id: string;
	opened_at: string;
	closed_at?: string;
	opening_cash: number;
	status: 'open' | 'closed';
}

export interface CartModifier {
	modifier_name: string;
	option_name: string;
	price_adjustment: number;
}

export interface CartItem {
	id: string;
	product_id: string;
	variant_id: string;
	product_name: string;
	variant_name: string;
	quantity: number;
	unit_price: number;
	modifiers: CartModifier[];
	notes?: string[];
	subtotal: number;
	note: string;
}

export interface TransactionResponse {
	id: string;
	transaction_number: string;
	session_id: string;
	outlet_id: string;
	transaction_type: string;
	table_number: string;
	subtotal: number;
	discount_total: number;
	tax_amount: number;
	service_charge: number;
	grand_total: number;
	status: string;
	completed_at?: string;
	created_at: string;
	items: any[];
	payments: any[];
}

export const MOCK_OUTLET: Outlet = {
	id: '01927364-0001-7000-8000-000000000001',
	name: 'Hanjo Senopati',
	code: 'JKT-01',
	street: 'Jl. Senopati No. 42',
	city: 'Jakarta Selatan',
	status: 'open',
	tax_rate: 0.1,
	service_charge: 0.05
};

export const MOCK_CATEGORIES: Category[] = [
	{ id: 'cat-1', name: 'Signature Coffee', slug: 'signature-coffee', description: 'Kopi kreasi barista khas Hanjo', sort_order: 1, is_active: true },
	{ id: 'cat-2', name: 'Espresso Based', slug: 'espresso-based', description: 'Klasik espresso murni dan kopi susu', sort_order: 2, is_active: true },
	{ id: 'cat-3', name: 'Non-Coffee', slug: 'non-coffee', description: 'Matcha, cokelat artisan, dan teh', sort_order: 3, is_active: true },
	{ id: 'cat-4', name: 'Pastry & Bakery', slug: 'pastry-bakery', description: 'Freshly baked croissant & toast', sort_order: 4, is_active: true }
];

export const MOCK_INGREDIENTS: Ingredient[] = [
	{ id: 'ing-1', name: 'Biji Kopi Arabica Aceh Gayo', sku: 'ING-BEANS-01', unit: 'kg', minimum_stock: 5, reorder_point: 10, cost_per_unit: 220000, status: 'active' },
	{ id: 'ing-2', name: 'Susu Fresh Milk Greenfield', sku: 'ING-MILK-01', unit: 'liter', minimum_stock: 20, reorder_point: 40, cost_per_unit: 24000, status: 'active' },
	{ id: 'ing-3', name: 'Gula Aren Organik Cair', sku: 'ING-AREN-01', unit: 'liter', minimum_stock: 10, reorder_point: 20, cost_per_unit: 35000, status: 'active' },
	{ id: 'ing-4', name: 'Pure Uji Matcha Powder', sku: 'ING-MATCHA-01', unit: 'gram', minimum_stock: 150, reorder_point: 300, cost_per_unit: 850, status: 'active' },
	{ id: 'ing-5', name: 'Cup Plastik 16oz + Straw', sku: 'ING-CUP-16', unit: 'pcs', minimum_stock: 100, reorder_point: 250, cost_per_unit: 850, status: 'active' },
	{ id: 'ing-6', name: 'Butter Croissant Dough', sku: 'ING-CROIS-01', unit: 'pcs', minimum_stock: 15, reorder_point: 30, cost_per_unit: 11000, status: 'active' }
];

export const MOCK_STOCK: StockLevel[] = [
	{ id: 'stk-1', outlet_id: MOCK_OUTLET.id, ingredient_id: 'ing-1', ingredient_name: 'Biji Kopi Arabica Aceh Gayo', current_qty: 24.5, unit: 'kg', last_updated: '2026-10-12T10:00:00Z' },
	{ id: 'stk-2', outlet_id: MOCK_OUTLET.id, ingredient_id: 'ing-2', ingredient_name: 'Susu Fresh Milk Greenfield', current_qty: 18.2, unit: 'liter', last_updated: '2026-10-12T10:00:00Z' },
	{ id: 'stk-3', outlet_id: MOCK_OUTLET.id, ingredient_id: 'ing-3', ingredient_name: 'Gula Aren Organik Cair', current_qty: 28.0, unit: 'liter', last_updated: '2026-10-12T10:00:00Z' },
	{ id: 'stk-4', outlet_id: MOCK_OUTLET.id, ingredient_id: 'ing-4', ingredient_name: 'Pure Uji Matcha Powder', current_qty: 120.0, unit: 'gram', last_updated: '2026-10-12T10:00:00Z' },
	{ id: 'stk-5', outlet_id: MOCK_OUTLET.id, ingredient_id: 'ing-5', ingredient_name: 'Cup Plastik 16oz + Straw', current_qty: 480.0, unit: 'pcs', last_updated: '2026-10-12T10:00:00Z' }
];

export const MOCK_PRODUCTS: Product[] = [
	{
		id: 'prod-1',
		category_id: 'cat-1',
		category_name: 'Signature Coffee',
		sku: 'COF-AREN-01',
		name: 'Hanjo Aren Latte',
		description: 'Kopi susu gula aren autentik dengan crema espresso gayo yang tebal dan wangi karamel alami.',
		product_type: 'single',
		status: 'active',
		image_url: '☕',
		variants: [
			{
				id: 'var-aren-reg',
				name: 'Regular 16oz',
				sku: 'COF-AREN-01-REG',
				price: 28000,
				cost: 9140,
				is_default: true,
				sort_order: 1,
				recipes: [
					{ ingredient_id: 'ing-1', ingredient_name: 'Biji Kopi Arabica Aceh Gayo', quantity: 0.018, unit: 'kg' },
					{ ingredient_id: 'ing-2', ingredient_name: 'Susu Fresh Milk Greenfield', quantity: 0.15, unit: 'liter' },
					{ ingredient_id: 'ing-3', ingredient_name: 'Gula Aren Organik Cair', quantity: 0.02, unit: 'liter' },
					{ ingredient_id: 'ing-5', ingredient_name: 'Cup Plastik 16oz + Straw', quantity: 1, unit: 'pcs' }
				]
			},
			{
				id: 'var-aren-lrg',
				name: 'Large 22oz',
				sku: 'COF-AREN-01-LRG',
				price: 34000,
				cost: 11500,
				is_default: false,
				sort_order: 2,
				recipes: [
					{ ingredient_id: 'ing-1', ingredient_name: 'Biji Kopi Arabica Aceh Gayo', quantity: 0.024, unit: 'kg' },
					{ ingredient_id: 'ing-2', ingredient_name: 'Susu Fresh Milk Greenfield', quantity: 0.22, unit: 'liter' },
					{ ingredient_id: 'ing-3', ingredient_name: 'Gula Aren Organik Cair', quantity: 0.03, unit: 'liter' }
				]
			}
		],
		modifier_groups: [
			{
				id: 'mg-addons',
				name: 'Pilihan Add-ons & Ekstra',
				is_required: false,
				max_select: 4,
				sort_order: 1,
				options: [
					{ id: 'opt-shot', name: 'Extra Espresso Shot', price_adjustment: 6000, sort_order: 1 },
					{ id: 'opt-boba', name: 'Topping Boba Brown Sugar', price_adjustment: 4000, sort_order: 2 },
					{ id: 'opt-oat', name: 'Upgrade Oat Milk', price_adjustment: 5000, sort_order: 3 },
					{ id: 'opt-jelly', name: 'Grass Jelly', price_adjustment: 4000, sort_order: 4 }
				]
			}
		],
		preset_notes: [
			'Less Sugar (50%)',
			'Normal Sugar',
			'No Sugar (0%)',
			'Less Ice',
			'No Ice',
			'Tanpa Sedotan'
		]
	},
	{
		id: 'prod-2',
		category_id: 'cat-2',
		category_name: 'Espresso Based',
		sku: 'COF-AMER-01',
		name: 'Americano Nusantara',
		description: 'Double shot espresso Aceh Gayo dipadu dengan air mineral dingin segar beraroma floral.',
		product_type: 'single',
		status: 'active',
		image_url: '🧊',
		variants: [
			{
				id: 'var-amer-iced',
				name: 'Iced Americano',
				sku: 'COF-AMER-01-ICE',
				price: 22000,
				cost: 5800,
				is_default: true,
				sort_order: 1
			},
			{
				id: 'var-amer-hot',
				name: 'Hot Americano',
				sku: 'COF-AMER-01-HOT',
				price: 20000,
				cost: 5200,
				is_default: false,
				sort_order: 2
			}
		],
		modifier_groups: [
			{
				id: 'mg-amer-addons',
				name: 'Pilihan Add-ons & Ekstra',
				is_required: false,
				max_select: 3,
				sort_order: 1,
				options: [
					{ id: 'opt-amer-shot', name: 'Extra Espresso Shot', price_adjustment: 6000, sort_order: 1 },
					{ id: 'opt-amer-syrp', name: 'Vanilla Syrup Shot', price_adjustment: 5000, sort_order: 2 }
				]
			}
		],
		preset_notes: [
			'Extra Bitter',
			'Less Water',
			'No Ice',
			'Tanpa Sedotan'
		]
	},
	{
		id: 'prod-3',
		category_id: 'cat-3',
		category_name: 'Non-Coffee',
		sku: 'NON-MATCHA-01',
		name: 'Kyoto Uji Matcha Latte',
		description: 'Bubuk matcha murni dari Uji, Kyoto diseduh dengan susu segar lembut dan manis seimbang.',
		product_type: 'single',
		status: 'active',
		image_url: '🍵',
		variants: [
			{
				id: 'var-matcha-iced',
				name: 'Iced Matcha',
				sku: 'NON-MATCHA-ICE',
				price: 32000,
				cost: 11200,
				is_default: true,
				sort_order: 1
			},
			{
				id: 'var-matcha-hot',
				name: 'Hot Matcha',
				sku: 'NON-MATCHA-HOT',
				price: 30000,
				cost: 10500,
				is_default: false,
				sort_order: 2
			}
		],
		modifier_groups: [
			{
				id: 'mg-matcha-addons',
				name: 'Pilihan Add-ons & Ekstra',
				is_required: false,
				max_select: 3,
				sort_order: 1,
				options: [
					{ id: 'opt-matcha-oat', name: 'Upgrade Oat Milk', price_adjustment: 5000, sort_order: 1 },
					{ id: 'opt-matcha-boba', name: 'Topping Boba', price_adjustment: 4000, sort_order: 2 }
				]
			}
		],
		preset_notes: [
			'Less Sugar (50%)',
			'No Sugar',
			'Less Ice',
			'Extra Matcha (+Pahit)',
			'Tanpa Sedotan'
		]
	},
	{
		id: 'prod-4',
		category_id: 'cat-4',
		category_name: 'Pastry & Bakery',
		sku: 'BAK-CROIS-01',
		name: 'Butter Croissant Artisan',
		description: 'Pastry khas Prancis berlapis renyah dengan aroma mentega murni dari Elle & Vire.',
		product_type: 'single',
		status: 'active',
		image_url: '🥐',
		variants: [
			{
				id: 'var-crois-std',
				name: 'Standard Piece',
				sku: 'BAK-CROIS-01-STD',
				price: 24000,
				cost: 11000,
				is_default: true,
				sort_order: 1
			}
		],
		modifier_groups: [
			{
				id: 'mg-crois-addons',
				name: 'Pilihan Selai & Saus',
				is_required: false,
				max_select: 3,
				sort_order: 1,
				options: [
					{ id: 'opt-crois-jam', name: 'Extra Strawberry Jam', price_adjustment: 4000, sort_order: 1 },
					{ id: 'opt-crois-butter', name: 'Extra Salted Butter', price_adjustment: 3000, sort_order: 2 },
					{ id: 'opt-crois-cheese', name: 'Keju Melted Slice', price_adjustment: 5000, sort_order: 3 }
				]
			}
		],
		preset_notes: [
			'Hangatkan (Warm)',
			'Jangan Dihangatkan',
			'Pisah Selai',
			'Potong 2 Bagian'
		]
	}
];

export async function fetchCategories(): Promise<Category[]> {
	return MOCK_CATEGORIES;
}

export async function fetchProducts(): Promise<Product[]> {
	return MOCK_PRODUCTS;
}
