/**
 * Mock Handler: Katalog Bahan, Satuan, Konversi & Pemasok (MS-03)
 * Referensi: MILESTONE.md §MS-03, AC-03.1 s/d AC-03.7, Golden Rule 6 (Clock)
 */

import { router } from '../engine/router.js';
import { clock } from '../engine/clock.js';
import { ApiErrors } from '../../../contract/errors.js';
import {
	validateItemCode,
	validateConversionFactor,
	detectConversionCycle,
	evaluateBaseUnitChange,
	evaluateStockItemArchiving,
	evaluateHqRefPriceImpact
} from '../../../../domain/catalog.js';
import { getCurrentMockUser } from './auth.js';
import type {
	StockItem,
	ItemCategory,
	Unit,
	UnitConversion,
	Supplier,
	StockItemCostHistory,
	CsvImportPreview,
	CsvImportCommitResult,
	CategoryCsvImportPreview
} from '../../../contract/types.js';

// ============================================================================
// 1. In-Memory State: Kategori Item Bahan Baku (7 Kategori)
// ============================================================================
export let mockCategories: ItemCategory[] = [
	{
		id: 'cat-coffee',
		code: 'CAT-KOP',
		name: 'Kopi & Espresso',
		description: 'Biji kopi pilihan single origin, espresso blend, dan roast bean',
		item_count: 6,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'cat-milk',
		code: 'CAT-SUS',
		name: 'Susu & Dairy',
		description: 'Susu segar (fresh milk), plant-based milk, krim dan kental manis',
		item_count: 6,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'cat-syrup',
		code: 'CAT-SRP',
		name: 'Sirup & Pemanis',
		description: 'Sirup perasa rasa gourmet, gula aren cair, dan simple syrup',
		item_count: 7,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'cat-powder',
		code: 'CAT-BBK',
		name: 'Bubuk Minuman',
		description: 'Bubuk matcha murni, cokelat artisanal, taro, red velvet',
		item_count: 5,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'cat-ice',
		code: 'CAT-AIR',
		name: 'Es & Air Mineral',
		description: 'Es batu kristal tube higienis dan air mineral galon',
		item_count: 2,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'cat-packaging',
		code: 'CAT-KMS',
		name: 'Kemasan & Wadah',
		description: 'Paper cup, cold cup, lid, sedotan, kantong takeaway berlogo',
		item_count: 10,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'cat-bakery',
		code: 'CAT-BKR',
		name: 'Bakery & Dapur',
		description: 'Mentega, tepung protein, ragi instant, keju block untuk pastry',
		item_count: 4,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	}
];

// ============================================================================
// 2. In-Memory State: Satuan Ukuran / UOM (Units)
// ============================================================================
export let mockUnits: Unit[] = [
	{ id: 'u-kg', name: 'Kilogram', symbol: 'kg', type: 'weight', is_system: true, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
	{ id: 'u-g', name: 'Gram', symbol: 'g', type: 'weight', is_system: true, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
	{ id: 'u-liter', name: 'Liter', symbol: 'liter', type: 'volume', is_system: true, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
	{ id: 'u-ml', name: 'Mililiter', symbol: 'ml', type: 'volume', is_system: true, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
	{ id: 'u-pcs', name: 'Pieces', symbol: 'pcs', type: 'count', is_system: true, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
	{ id: 'u-can', name: 'Kaleng', symbol: 'can', type: 'count', is_system: false, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
	{ id: 'u-bag', name: 'Bag / Kantong', symbol: 'bag', type: 'count', is_system: false, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
	{ id: 'u-box', name: 'Box / Karton', symbol: 'box', type: 'count', is_system: false, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' }
];

// ============================================================================
// 3. In-Memory State: Konversi Satuan Ukuran (Unit Conversions)
// ============================================================================
export let mockConversions: UnitConversion[] = [
	{
		id: 'conv-1',
		from_unit_id: 'u-kg',
		from_unit_symbol: 'kg',
		to_unit_id: 'u-g',
		to_unit_symbol: 'g',
		factor: '1000.0000',
		description: '1 Kilogram = 1.000 Gram',
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z'
	},
	{
		id: 'conv-2',
		from_unit_id: 'u-liter',
		from_unit_symbol: 'liter',
		to_unit_id: 'u-ml',
		to_unit_symbol: 'ml',
		factor: '1000.0000',
		description: '1 Liter = 1.000 Mililiter',
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z'
	},
	{
		id: 'conv-3',
		from_unit_id: 'u-box',
		from_unit_symbol: 'box',
		to_unit_id: 'u-pcs',
		to_unit_symbol: 'pcs',
		factor: '24.0000',
		description: '1 Box = 24 Pieces',
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z'
	},
	{
		id: 'conv-4',
		from_unit_id: 'u-bag',
		from_unit_symbol: 'bag',
		to_unit_id: 'u-kg',
		to_unit_symbol: 'kg',
		factor: '1.0000',
		description: '1 Bag Kemasan Kopi = 1 Kilogram',
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z'
	}
];

// ============================================================================
// 4. In-Memory State: Master Pemasok (Suppliers) (AC-03.7)
// ============================================================================
export let mockSuppliers: Supplier[] = [
	{
		id: 'sup-hq-01',
		name: 'HQ Central Distribution Hub',
		code: 'SUP-HQ-01',
		type: 'hq_warehouse',
		contact_person: 'Gunawan Prasetyo (Logistik Pusat)',
		phone: '021-8991234',
		email: 'hub-logistics@hanjo.co.id',
		address: 'Kawasan Industri MM2100 Blok C-4, Cikarang Barat',
		city: 'Bekasi',
		payment_terms_days: 0,
		status: 'active',
		notes: 'Gudang distribusi terpusat internal brand Seduhan Kopi Jodi.',
		has_transactions: true,
		created_at: '2026-01-05T08:00:00.000Z',
		updated_at: '2026-01-05T08:00:00.000Z'
	},
	{
		id: 'sup-ext-01',
		name: 'PT Sumber Kopi Nusantara',
		code: 'SUP-EXT-01',
		type: 'external',
		contact_person: 'Hendro Setiawan',
		phone: '022-7201882',
		email: 'sales@sumberkopinusantara.com',
		address: 'Jl. Soekarno Hatta No. 428',
		city: 'Bandung',
		payment_terms_days: 30,
		status: 'active',
		notes: 'Pemasok utama green bean & roast bean Java Preanger dan Aceh Gayo.',
		has_transactions: true,
		created_at: '2026-01-10T09:00:00.000Z',
		updated_at: '2026-01-10T09:00:00.000Z'
	},
	{
		id: 'sup-ext-02',
		name: 'PT Sukanda Djaya (Dairy Division)',
		code: 'SUP-EXT-02',
		type: 'external',
		contact_person: 'Melinda Tan',
		phone: '021-4602888',
		email: 'orders.jkt@sukandadjaya.com',
		address: 'Jl. Pasir Putih Raya Kav. 1, Ancol Timur',
		city: 'Jakarta Utara',
		payment_terms_days: 14,
		status: 'active',
		notes: 'Distributor resmi susu pasteurisasi Greenfields dan Anchor whipping cream.',
		has_transactions: true,
		created_at: '2026-01-12T10:00:00.000Z',
		updated_at: '2026-01-12T10:00:00.000Z'
	},
	{
		id: 'sup-ext-03',
		name: 'PT Monin Flavor Indonesia',
		code: 'SUP-EXT-03',
		type: 'external',
		contact_person: 'Kevin Suryadi',
		phone: '021-5367890',
		email: 'kevin.s@monin-indonesia.com',
		address: 'Grand Slipi Tower Lt. 18, Jl. S. Parman',
		city: 'Jakarta Barat',
		payment_terms_days: 30,
		status: 'active',
		notes: 'Sirup premium aneka rasa (vanilla, caramel, hazelnut, pandan).',
		has_transactions: false,
		created_at: '2026-01-15T11:00:00.000Z',
		updated_at: '2026-01-15T11:00:00.000Z'
	},
	{
		id: 'sup-ext-04',
		name: 'CV Berkah Kemasan Mandiri',
		code: 'SUP-EXT-04',
		type: 'external',
		contact_person: 'H. Suwandi',
		phone: '031-8439120',
		email: 'berkahkemasan@gmail.com',
		address: 'Rungkut Industri III No. 12',
		city: 'Surabaya',
		payment_terms_days: 7,
		status: 'active',
		notes: 'Pabrik cetak paper cup, sedotan kertas, dan shopping bag takeaway.',
		has_transactions: false,
		created_at: '2026-01-18T14:00:00.000Z',
		updated_at: '2026-01-18T14:00:00.000Z'
	},
	{
		id: 'sup-ext-05',
		name: 'Bali Roastery Direct',
		code: 'SUP-EXT-05',
		type: 'external',
		contact_person: 'Wayan Sudarta',
		phone: '0361-975310',
		email: 'info@baliroastery.com',
		address: 'Jl. Raya Pengosekan No. 22',
		city: 'Gianyar, Bali',
		payment_terms_days: 0,
		status: 'active',
		notes: 'Pemasok lokal Kaveloka Ubud untuk biji Kintamani natural process.',
		has_transactions: true,
		created_at: '2026-02-01T08:00:00.000Z',
		updated_at: '2026-02-01T08:00:00.000Z'
	}
];

// ============================================================================
// 5. In-Memory State: 40 Master Bahan Baku (Stock Items)
// ============================================================================
// ============================================================================
// Callback dinamis sinkronisasi jumlah formula resep dari modul menu
// ============================================================================
let recipeCountGetter: ((stockItemId: string) => number) | null = null;
export function setRecipeCountGetter(fn: (stockItemId: string) => number): void {
	recipeCountGetter = fn;
}

export let mockStockItems: StockItem[] = [
	// --- Kopi & Espresso (6 items) ---
	{
		id: 'item-kop-01',
		name: 'Espresso Blend House Arabica-Robusta',
		code: 'KOP-ESP-01',
		category_id: 'cat-coffee',
		category_name: 'Kopi & Espresso',
		base_unit_id: 'u-g',
		base_unit_symbol: 'g',
		is_producible: false,
		can_buy_external: false,
		hq_ref_code: 'HQ-ROAST-ESP',
		hq_ref_price: '240.00',
		status: 'active',
		description: 'Racikan house blend 70% Arabica Mandheling & 30% Robusta Dampit untuk base espresso',
		storage_temperature: 'ambient',
		current_stock: '48500.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '18500.0000', min: '5000.0000', unit_cost: '240.00', last_purchased_price: '240.00' },
			'out-bdg-01': { current: '12000.0000', min: '4000.0000', unit_cost: '240.00', last_purchased_price: '240.00' },
			'out-sby-01': { current: '10000.0000', min: '4000.0000', unit_cost: '245.00', last_purchased_price: '245.00' },
			'out-ubud-01': { current: '8000.0000', min: '3000.0000', unit_cost: '250.00', last_purchased_price: '250.00' }
		},
		recipes_using_count: 14,
		has_stock_movements: true, // Tidak bisa ubah base_unit (AC-03.1)
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'item-kop-02',
		name: 'Single Origin Aceh Gayo Washed',
		code: 'KOP-SO-GAYO',
		category_id: 'cat-coffee',
		category_name: 'Kopi & Espresso',
		base_unit_id: 'u-g',
		base_unit_symbol: 'g',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-SO-GAYO',
		hq_ref_price: '320.00',
		status: 'active',
		description: 'Biji kopi Arabica Gayo single origin untuk filter manual brew V60',
		storage_temperature: 'ambient',
		current_stock: '16200.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '6200.0000', min: '2000.0000', unit_cost: '320.00', last_purchased_price: '320.00' },
			'out-bdg-01': { current: '5000.0000', min: '2000.0000', unit_cost: '320.00', last_purchased_price: '320.00' },
			'out-sby-01': { current: '5000.0000', min: '2000.0000', unit_cost: '325.00', last_purchased_price: '325.00' }
		},
		recipes_using_count: 4,
		has_stock_movements: true,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'item-kop-03',
		name: 'Single Origin Flores Bajawa Anaerobic',
		code: 'KOP-SO-FLORES',
		category_id: 'cat-coffee',
		category_name: 'Kopi & Espresso',
		base_unit_id: 'u-g',
		base_unit_symbol: 'g',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-SO-FLORES',
		hq_ref_price: '350.00',
		status: 'active',
		description: 'Aroma apel merah, cokelat karamel, rasa manis lembut',
		storage_temperature: 'ambient',
		current_stock: '8400.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '4400.0000', min: '1500.0000', unit_cost: '350.00', last_purchased_price: '350.00' },
			'out-bdg-01': { current: '4000.0000', min: '1500.0000', unit_cost: '350.00', last_purchased_price: '350.00' }
		},
		recipes_using_count: 2,
		has_stock_movements: true,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'item-kop-04',
		name: 'Single Origin Bali Kintamani Natural',
		code: 'KOP-SO-KINTA',
		category_id: 'cat-coffee',
		category_name: 'Kopi & Espresso',
		base_unit_id: 'u-g',
		base_unit_symbol: 'g',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-SO-BALI',
		hq_ref_price: '340.00',
		status: 'active',
		description: 'Notes jeruk citrus cerah dan madu liar, dipanggang medium-light',
		storage_temperature: 'ambient',
		current_stock: '6500.0000',
		stock_by_outlet: {
			'out-ubud-01': { current: '1500.0000', min: '3000.0000', unit_cost: '330.00', last_purchased_price: '330.00' },
			'out-plaga-01': { current: '5000.0000', min: '2000.0000', unit_cost: '330.00', last_purchased_price: '330.00' }
		},
		recipes_using_count: 5,
		has_stock_movements: true,
		created_at: '2026-01-12T08:00:00.000Z',
		updated_at: '2026-01-12T08:00:00.000Z'
	},
	{
		id: 'item-kop-05',
		name: 'Decaf Arabica Colombia Swiss Water',
		code: 'KOP-DECAF-01',
		category_id: 'cat-coffee',
		category_name: 'Kopi & Espresso',
		base_unit_id: 'u-g',
		base_unit_symbol: 'g',
		is_producible: false,
		can_buy_external: false,
		hq_ref_code: 'HQ-DECAF-COL',
		hq_ref_price: '380.00',
		status: 'active',
		description: 'Kopi tanpa kafein dengan proses Swiss Water alami tanpa pelarut kimia',
		storage_temperature: 'ambient',
		current_stock: '0.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '0.0000', min: '1000.0000', unit_cost: '380.00', last_purchased_price: '380.00' },
			'out-bdg-01': { current: '0.0000', min: '1000.0000', unit_cost: '380.00', last_purchased_price: '380.00' }
		},
		recipes_using_count: 2,
		has_stock_movements: true,
		created_at: '2026-01-15T08:00:00.000Z',
		updated_at: '2026-01-15T08:00:00.000Z'
	},
	{
		id: 'item-kop-06',
		name: 'Robusta Dampit Fine Natural Grade 1',
		code: 'KOP-ROB-DAMPIT',
		category_id: 'cat-coffee',
		category_name: 'Kopi & Espresso',
		base_unit_id: 'u-g',
		base_unit_symbol: 'g',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-ROB-DMP',
		hq_ref_price: '110.00',
		status: 'active',
		description: 'Body tebal, crema melimpah untuk racikan es kopi susu tradisional',
		storage_temperature: 'ambient',
		current_stock: '28000.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '10000.0000', min: '3000.0000', unit_cost: '110.00', last_purchased_price: '110.00' },
			'out-bdg-01': { current: '8000.0000', min: '2500.0000', unit_cost: '110.00', last_purchased_price: '110.00' },
			'out-sby-01': { current: '10000.0000', min: '3000.0000', unit_cost: '110.00', last_purchased_price: '110.00' }
		},
		recipes_using_count: 3,
		has_stock_movements: true,
		created_at: '2026-01-15T08:00:00.000Z',
		updated_at: '2026-01-15T08:00:00.000Z'
	},

	// --- Susu & Dairy (6 items) ---
	{
		id: 'item-sus-01',
		name: 'Susu Fresh Milk Greenfields Barista',
		code: 'SUS-GRN-01',
		category_id: 'cat-milk',
		category_name: 'Susu & Dairy',
		base_unit_id: 'u-ml',
		base_unit_symbol: 'ml',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-MILK-GF',
		hq_ref_price: '21.50',
		status: 'active',
		description: 'Susu segar pasteurisasi kemasan 1 Liter untuk latte art microfoam',
		storage_temperature: 'chilled',
		current_stock: '102000.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '8000.0000', min: '20000.0000', unit_cost: '21.50', last_purchased_price: '21.50' },
			'out-bdg-01': { current: '36000.0000', min: '15000.0000', unit_cost: '21.50', last_purchased_price: '21.50' },
			'out-sby-01': { current: '34000.0000', min: '15000.0000', unit_cost: '22.00', last_purchased_price: '22.00' },
			'out-ubud-01': { current: '24000.0000', min: '10000.0000', unit_cost: '23.00', last_purchased_price: '23.00' }
		},
		recipes_using_count: 18,
		has_stock_movements: true,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'item-sus-02',
		name: 'Susu Oat Milk Oatly Barista Edition',
		code: 'SUS-OAT-OATLY',
		category_id: 'cat-milk',
		category_name: 'Susu & Dairy',
		base_unit_id: 'u-ml',
		base_unit_symbol: 'ml',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-MILK-OAT',
		hq_ref_price: '46.00',
		status: 'active',
		description: 'Susu oat plant-based vegan friendly kemasan 1 Liter',
		storage_temperature: 'ambient',
		current_stock: '38000.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '16000.0000', min: '6000.0000', unit_cost: '46.00', last_purchased_price: '46.00' },
			'out-bdg-01': { current: '12000.0000', min: '5000.0000', unit_cost: '46.00', last_purchased_price: '46.00' },
			'out-ubud-01': { current: '10000.0000', min: '4000.0000', unit_cost: '47.00', last_purchased_price: '47.00' }
		},
		recipes_using_count: 6,
		has_stock_movements: true,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'item-sus-03',
		name: 'Susu Almond Breeze Barista Blend',
		code: 'SUS-ALM-BREEZE',
		category_id: 'cat-milk',
		category_name: 'Susu & Dairy',
		base_unit_id: 'u-ml',
		base_unit_symbol: 'ml',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-MILK-ALM',
		hq_ref_price: '44.00',
		status: 'active',
		description: 'Susu almond khusus minuman kopi dengan rasa nutty yang gurih',
		storage_temperature: 'ambient',
		current_stock: '22000.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '12000.0000', min: '4000.0000', unit_cost: '44.00', last_purchased_price: '44.00' },
			'out-bdg-01': { current: '10000.0000', min: '3000.0000', unit_cost: '44.00', last_purchased_price: '44.00' }
		},
		recipes_using_count: 4,
		has_stock_movements: true,
		created_at: '2026-01-12T08:00:00.000Z',
		updated_at: '2026-01-12T08:00:00.000Z'
	},
	{
		id: 'item-sus-04',
		name: 'Susu Kental Manis Carnation Kaleng 370g',
		code: 'SUS-SKM-CARN',
		category_id: 'cat-milk',
		category_name: 'Susu & Dairy',
		base_unit_id: 'u-g',
		base_unit_symbol: 'g',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-SKM-CRN',
		hq_ref_price: '36.49',
		status: 'active',
		description: 'Pemanis kental manis untuk kopi tarik dan es kopi susu kampung',
		storage_temperature: 'ambient',
		current_stock: '44400.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '14800.0000', min: '5000.0000', unit_cost: '36.48', last_purchased_price: '36.48' },
			'out-bdg-01': { current: '14800.0000', min: '5000.0000', unit_cost: '36.48', last_purchased_price: '36.48' },
			'out-sby-01': { current: '14800.0000', min: '5000.0000', unit_cost: '37.00', last_purchased_price: '37.00' }
		},
		recipes_using_count: 5,
		has_stock_movements: true,
		created_at: '2026-01-15T08:00:00.000Z',
		updated_at: '2026-01-15T08:00:00.000Z'
	},
	{
		id: 'item-sus-05',
		name: 'Whipping Cream UHT Anchor 1L',
		code: 'SUS-WHP-ANCHOR',
		category_id: 'cat-milk',
		category_name: 'Susu & Dairy',
		base_unit_id: 'u-ml',
		base_unit_symbol: 'ml',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-CRM-ANC',
		hq_ref_price: '72.00',
		status: 'active',
		description: 'Krim cair kental untuk topping macchiato, viennois, dan pastry filling',
		storage_temperature: 'chilled',
		current_stock: '16000.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '8000.0000', min: '3000.0000', unit_cost: '72.00', last_purchased_price: '72.00' },
			'out-bdg-01': { current: '8000.0000', min: '3000.0000', unit_cost: '72.00', last_purchased_price: '72.00' }
		},
		recipes_using_count: 6,
		has_stock_movements: true,
		created_at: '2026-01-15T08:00:00.000Z',
		updated_at: '2026-01-15T08:00:00.000Z'
	},
	{
		id: 'item-sus-06',
		name: 'Susu Evaporasi F&N Kaleng 380g',
		code: 'SUS-EVA-FN',
		category_id: 'cat-milk',
		category_name: 'Susu & Dairy',
		base_unit_id: 'u-g',
		base_unit_symbol: 'g',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-EVA-FN',
		hq_ref_price: '44.74',
		status: 'active',
		description: 'Susu evaporasi gurih tanpa gula untuk campuran milk tea dan avocado coffee',
		storage_temperature: 'ambient',
		current_stock: '26600.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '11400.0000', min: '4000.0000', unit_cost: '44.73', last_purchased_price: '44.73' },
			'out-bdg-01': { current: '7600.0000', min: '3000.0000', unit_cost: '44.73', last_purchased_price: '44.73' },
			'out-sby-01': { current: '7600.0000', min: '3000.0000', unit_cost: '45.00', last_purchased_price: '45.00' }
		},
		recipes_using_count: 3,
		has_stock_movements: true,
		created_at: '2026-01-18T08:00:00.000Z',
		updated_at: '2026-01-18T08:00:00.000Z'
	},

	// --- Sirup & Pemanis (7 items) ---
	{
		id: 'item-srp-01',
		name: 'Sirup Vanilla Monin 700ml',
		code: 'SRP-MON-VAN',
		category_id: 'cat-syrup',
		category_name: 'Sirup & Pemanis',
		base_unit_id: 'u-ml',
		base_unit_symbol: 'ml',
		is_producible: false,
		can_buy_external: false,
		hq_ref_code: 'HQ-SYR-VAN',
		hq_ref_price: '207.14',
		status: 'active',
		description: 'Sirup vanilla Madagaskar dengan aroma lembut manis alami',
		storage_temperature: 'ambient',
		current_stock: '14000.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '5600.0000', min: '2000.0000', unit_cost: '207.14', last_purchased_price: '207.14' },
			'out-bdg-01': { current: '4200.0000', min: '1500.0000', unit_cost: '207.14', last_purchased_price: '207.14' },
			'out-sby-01': { current: '4200.0000', min: '1500.0000', unit_cost: '210.00', last_purchased_price: '210.00' }
		},
		recipes_using_count: 5,
		has_stock_movements: true,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'item-srp-02',
		name: 'Sirup Caramel Monin 700ml',
		code: 'SRP-MON-CAR',
		category_id: 'cat-syrup',
		category_name: 'Sirup & Pemanis',
		base_unit_id: 'u-ml',
		base_unit_symbol: 'ml',
		is_producible: false,
		can_buy_external: false,
		hq_ref_code: 'HQ-SYR-CAR',
		hq_ref_price: '207.14',
		status: 'active',
		description: 'Sirup rasa gula karamel panggang gurih wangi',
		storage_temperature: 'ambient',
		current_stock: '12600.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '4900.0000', min: '1500.0000', unit_cost: '207.14', last_purchased_price: '207.14' },
			'out-bdg-01': { current: '4200.0000', min: '1500.0000', unit_cost: '207.14', last_purchased_price: '207.14' },
			'out-sby-01': { current: '3500.0000', min: '1500.0000', unit_cost: '210.00', last_purchased_price: '210.00' }
		},
		recipes_using_count: 4,
		has_stock_movements: true,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'item-srp-03',
		name: 'Sirup Hazelnut Monin 700ml',
		code: 'SRP-MON-HAZ',
		category_id: 'cat-syrup',
		category_name: 'Sirup & Pemanis',
		base_unit_id: 'u-ml',
		base_unit_symbol: 'ml',
		is_producible: false,
		can_buy_external: false,
		hq_ref_code: 'HQ-SYR-HAZ',
		hq_ref_price: '207.14',
		status: 'active',
		description: 'Aroma kacang hazelnut panggang kaya rasa',
		storage_temperature: 'ambient',
		current_stock: '9800.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '4200.0000', min: '1400.0000', unit_cost: '207.14', last_purchased_price: '207.14' },
			'out-bdg-01': { current: '2800.0000', min: '1400.0000', unit_cost: '207.14', last_purchased_price: '207.14' },
			'out-sby-01': { current: '2800.0000', min: '1400.0000', unit_cost: '210.00', last_purchased_price: '210.00' }
		},
		recipes_using_count: 3,
		has_stock_movements: true,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'item-srp-04',
		name: 'Gula Aren Cair Organik 1 Liter',
		code: 'SRP-GLA-AREN',
		category_id: 'cat-syrup',
		category_name: 'Sirup & Pemanis',
		base_unit_id: 'u-ml',
		base_unit_symbol: 'ml',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-AREN-ORG',
		hq_ref_price: '38.00',
		status: 'active',
		description: 'Nira aren murni dari petani Lebak Banten, kental dan smoky',
		storage_temperature: 'ambient',
		current_stock: '65000.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '25000.0000', min: '10000.0000', unit_cost: '38.00', last_purchased_price: '38.00' },
			'out-bdg-01': { current: '20000.0000', min: '8000.0000', unit_cost: '38.00', last_purchased_price: '38.00' },
			'out-sby-01': { current: '20000.0000', min: '8000.0000', unit_cost: '38.50', last_purchased_price: '38.50' }
		},
		recipes_using_count: 8,
		has_stock_movements: true,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'item-srp-05',
		name: 'Simple Syrup Tebu Alami 1 Liter',
		code: 'SRP-SIM-TEBU',
		category_id: 'cat-syrup',
		category_name: 'Sirup & Pemanis',
		base_unit_id: 'u-ml',
		base_unit_symbol: 'ml',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-SYR-TEBU',
		hq_ref_price: '18.00',
		status: 'active',
		description: 'Sirup gula pasir tebu 65 brix untuk pemanis teh dan mocktail',
		storage_temperature: 'ambient',
		current_stock: '42000.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '16000.0000', min: '5000.0000', unit_cost: '18.00', last_purchased_price: '18.00' },
			'out-bdg-01': { current: '14000.0000', min: '5000.0000', unit_cost: '18.00', last_purchased_price: '18.00' },
			'out-sby-01': { current: '12000.0000', min: '4000.0000', unit_cost: '18.50', last_purchased_price: '18.50' }
		},
		recipes_using_count: 9,
		has_stock_movements: true,
		created_at: '2026-01-12T08:00:00.000Z',
		updated_at: '2026-01-12T08:00:00.000Z'
	},
	{
		id: 'item-srp-06',
		name: 'Sirup Pandan Suji Asli 700ml',
		code: 'SRP-PAN-SUJI',
		category_id: 'cat-syrup',
		category_name: 'Sirup & Pemanis',
		base_unit_id: 'u-ml',
		base_unit_symbol: 'ml',
		is_producible: false,
		can_buy_external: false,
		hq_ref_code: 'HQ-SYR-PAN',
		hq_ref_price: '92.86',
		status: 'active',
		description: 'Ekstrak daun suji dan pandan wangi untuk Kopi Pandan Latte',
		storage_temperature: 'chilled',
		current_stock: '11200.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '4900.0000', min: '1400.0000', unit_cost: '92.85', last_purchased_price: '92.85' },
			'out-bdg-01': { current: '3500.0000', min: '1400.0000', unit_cost: '92.85', last_purchased_price: '92.85' },
			'out-sby-01': { current: '2800.0000', min: '1400.0000', unit_cost: '95.00', last_purchased_price: '95.00' }
		},
		recipes_using_count: 2,
		has_stock_movements: true,
		created_at: '2026-01-15T08:00:00.000Z',
		updated_at: '2026-01-15T08:00:00.000Z'
	},
	{
		id: 'item-srp-07',
		name: 'Sirup Lychee Monin 700ml',
		code: 'SRP-MON-LYCHEE',
		category_id: 'cat-syrup',
		category_name: 'Sirup & Pemanis',
		base_unit_id: 'u-ml',
		base_unit_symbol: 'ml',
		is_producible: false,
		can_buy_external: false,
		hq_ref_code: 'HQ-SYR-LYC',
		hq_ref_price: '207.14',
		status: 'active',
		description: 'Sirup buah leci segar untuk Lychee Tea dan signature cold brew refresher',
		storage_temperature: 'ambient',
		current_stock: '14000.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '5600.0000', min: '1400.0000', unit_cost: '207.14', last_purchased_price: '207.14' },
			'out-bdg-01': { current: '4200.0000', min: '1400.0000', unit_cost: '207.14', last_purchased_price: '207.14' },
			'out-sby-01': { current: '4200.0000', min: '1400.0000', unit_cost: '210.00', last_purchased_price: '210.00' }
		},
		recipes_using_count: 3,
		has_stock_movements: true,
		created_at: '2026-01-18T08:00:00.000Z',
		updated_at: '2026-01-18T08:00:00.000Z'
	},

	// --- Bubuk Minuman (5 items) ---
	{
		id: 'item-bbk-01',
		name: 'Bubuk Pure Uji Matcha Ceremonial Grade 1kg',
		code: 'BBK-MAT-UJI',
		category_id: 'cat-powder',
		category_name: 'Bubuk Minuman',
		base_unit_id: 'u-g',
		base_unit_symbol: 'g',
		is_producible: false,
		can_buy_external: false,
		hq_ref_code: 'HQ-MAT-UJI',
		hq_ref_price: '650.00',
		status: 'active',
		description: 'Matcha hijau pekat dari Kyoto Jepang, rasa umami lembut tanpa perisa tambahan',
		storage_temperature: 'chilled',
		current_stock: '12500.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '5500.0000', min: '1500.0000', unit_cost: '650.00', last_purchased_price: '650.00' },
			'out-bdg-01': { current: '3500.0000', min: '1000.0000', unit_cost: '650.00', last_purchased_price: '650.00' },
			'out-sby-01': { current: '3500.0000', min: '1000.0000', unit_cost: '660.00', last_purchased_price: '660.00' }
		},
		recipes_using_count: 4,
		has_stock_movements: true,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'item-bbk-02',
		name: 'Bubuk Dark Chocolate Belgia 70% 1kg',
		code: 'BBK-COK-BEL',
		category_id: 'cat-powder',
		category_name: 'Bubuk Minuman',
		base_unit_id: 'u-g',
		base_unit_symbol: 'g',
		is_producible: false,
		can_buy_external: false,
		hq_ref_code: 'HQ-COK-BEL',
		hq_ref_price: '220.00',
		status: 'active',
		description: 'Cokelat bubuk pekat lezat untuk Hot Chocolate dan Mocha signature',
		storage_temperature: 'ambient',
		current_stock: '26000.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '11000.0000', min: '3000.0000', unit_cost: '220.00', last_purchased_price: '220.00' },
			'out-bdg-01': { current: '8000.0000', min: '2500.0000', unit_cost: '220.00', last_purchased_price: '220.00' },
			'out-sby-01': { current: '7000.0000', min: '2500.0000', unit_cost: '225.00', last_purchased_price: '225.00' }
		},
		recipes_using_count: 5,
		has_stock_movements: true,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'item-bbk-03',
		name: 'Bubuk Red Velvet Gourmet 1kg',
		code: 'BBK-RED-VEL',
		category_id: 'cat-powder',
		category_name: 'Bubuk Minuman',
		base_unit_id: 'u-g',
		base_unit_symbol: 'g',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-RED-VEL',
		hq_ref_price: '160.00',
		status: 'active',
		description: 'Bubuk minuman red velvet dengan aroma vanili buttermilk',
		storage_temperature: 'ambient',
		current_stock: '15000.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '6000.0000', min: '2000.0000', unit_cost: '160.00', last_purchased_price: '160.00' },
			'out-bdg-01': { current: '5000.0000', min: '2000.0000', unit_cost: '160.00', last_purchased_price: '160.00' },
			'out-sby-01': { current: '4000.0000', min: '1500.0000', unit_cost: '165.00', last_purchased_price: '165.00' }
		},
		recipes_using_count: 2,
		has_stock_movements: true,
		created_at: '2026-01-12T08:00:00.000Z',
		updated_at: '2026-01-12T08:00:00.000Z'
	},
	{
		id: 'item-bbk-04',
		name: 'Bubuk Taro Premium Wangi 1kg',
		code: 'BBK-TAR-PREM',
		category_id: 'cat-powder',
		category_name: 'Bubuk Minuman',
		base_unit_id: 'u-g',
		base_unit_symbol: 'g',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-TAR-PRM',
		hq_ref_price: '155.00',
		status: 'active',
		description: 'Bubuk taro ubi ungu creamy gurih',
		storage_temperature: 'ambient',
		current_stock: '14000.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '6000.0000', min: '2000.0000', unit_cost: '155.00', last_purchased_price: '155.00' },
			'out-bdg-01': { current: '4000.0000', min: '1500.0000', unit_cost: '155.00', last_purchased_price: '155.00' },
			'out-sby-01': { current: '4000.0000', min: '1500.0000', unit_cost: '160.00', last_purchased_price: '160.00' }
		},
		recipes_using_count: 2,
		has_stock_movements: true,
		created_at: '2026-01-15T08:00:00.000Z',
		updated_at: '2026-01-15T08:00:00.000Z'
	},
	{
		id: 'item-bbk-05',
		name: 'Bubuk Hojicha Roasted Tea Kyoto 500g',
		code: 'BBK-HOJ-KYO',
		category_id: 'cat-powder',
		category_name: 'Bubuk Minuman',
		base_unit_id: 'u-g',
		base_unit_symbol: 'g',
		is_producible: false,
		can_buy_external: false,
		hq_ref_code: 'HQ-HOJ-KYO',
		hq_ref_price: '760.00',
		status: 'active',
		description: 'Teh hijau panggang aroma smoky nutty khas Jepang',
		storage_temperature: 'ambient',
		current_stock: '6500.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '3500.0000', min: '1000.0000', unit_cost: '760.00', last_purchased_price: '760.00' },
			'out-bdg-01': { current: '3000.0000', min: '1000.0000', unit_cost: '760.00', last_purchased_price: '760.00' }
		},
		recipes_using_count: 2,
		has_stock_movements: true,
		created_at: '2026-01-18T08:00:00.000Z',
		updated_at: '2026-01-18T08:00:00.000Z'
	},

	// --- Es Batu & Air (2 items) ---
	{
		id: 'item-air-01',
		name: 'Es Batu Tube Kristal Higienis 10kg',
		code: 'AIR-ES-TUBE',
		category_id: 'cat-ice',
		category_name: 'Es & Air Mineral',
		base_unit_id: 'u-kg',
		base_unit_symbol: 'kg',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-ICE-TUB',
		hq_ref_price: '1500.00',
		status: 'active',
		description: 'Es kristal berongga padat, dingin lebih tahan lama tanpa cepat mencair',
		storage_temperature: 'frozen',
		current_stock: '380.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '120.0000', min: '50.0000', unit_cost: '1500.00', last_purchased_price: '1500.00' },
			'out-bdg-01': { current: '90.0000', min: '40.0000', unit_cost: '1500.00', last_purchased_price: '1500.00' },
			'out-sby-01': { current: '90.0000', min: '40.0000', unit_cost: '1600.00', last_purchased_price: '1600.00' },
			'out-ubud-01': { current: '80.0000', min: '30.0000', unit_cost: '1700.00', last_purchased_price: '1700.00' }
		},
		recipes_using_count: 22,
		has_stock_movements: true,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'item-air-02',
		name: 'Air Mineral Galon 19 Liter',
		code: 'AIR-GAL-19L',
		category_id: 'cat-ice',
		category_name: 'Es & Air Mineral',
		base_unit_id: 'u-liter',
		base_unit_symbol: 'liter',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-AIR-GAL',
		hq_ref_price: '1105.26',
		status: 'active',
		description: 'Air mineral murni untuk mesin espresso komersial dan seduhan manual brew',
		storage_temperature: 'ambient',
		current_stock: '380.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '114.0000', min: '38.0000', unit_cost: '1105.26', last_purchased_price: '1105.26' },
			'out-bdg-01': { current: '95.0000', min: '38.0000', unit_cost: '1105.26', last_purchased_price: '1105.26' },
			'out-sby-01': { current: '95.0000', min: '38.0000', unit_cost: '1150.00', last_purchased_price: '1150.00' },
			'out-ubud-01': { current: '76.0000', min: '38.0000', unit_cost: '1200.00', last_purchased_price: '1200.00' }
		},
		recipes_using_count: 15,
		has_stock_movements: true,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},

	// --- Kemasan & Wadah (10 items) ---
	{
		id: 'item-kms-01',
		name: 'Paper Cup Hot 8oz Logo Jodi',
		code: 'KMS-CUP-HOT8',
		category_id: 'cat-packaging',
		category_name: 'Kemasan & Wadah',
		base_unit_id: 'u-pcs',
		base_unit_symbol: 'pcs',
		is_producible: false,
		can_buy_external: false,
		hq_ref_code: 'HQ-CUP-H8',
		hq_ref_price: '850.00',
		status: 'active',
		description: 'Gelas kertas berdinding ganda untuk minuman panas (Piccolo, Cappuccino)',
		storage_temperature: 'ambient',
		current_stock: '4800.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '1800.0000', min: '500.0000', unit_cost: '850.00', last_purchased_price: '850.00' },
			'out-bdg-01': { current: '1500.0000', min: '400.0000', unit_cost: '850.00', last_purchased_price: '850.00' },
			'out-sby-01': { current: '1500.0000', min: '400.0000', unit_cost: '860.00', last_purchased_price: '860.00' }
		},
		recipes_using_count: 5,
		has_stock_movements: true,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'item-kms-02',
		name: 'Paper Cup Hot 12oz Logo Jodi',
		code: 'KMS-CUP-HOT12',
		category_id: 'cat-packaging',
		category_name: 'Kemasan & Wadah',
		base_unit_id: 'u-pcs',
		base_unit_symbol: 'pcs',
		is_producible: false,
		can_buy_external: false,
		hq_ref_code: 'HQ-CUP-H12',
		hq_ref_price: '1100.00',
		status: 'active',
		description: 'Gelas kertas panas ukuran standar reguler (Americano, Latte)',
		storage_temperature: 'ambient',
		current_stock: '6200.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '2500.0000', min: '600.0000', unit_cost: '1100.00', last_purchased_price: '1100.00' },
			'out-bdg-01': { current: '1900.0000', min: '500.0000', unit_cost: '1100.00', last_purchased_price: '1100.00' },
			'out-sby-01': { current: '1800.0000', min: '500.0000', unit_cost: '1120.00', last_purchased_price: '1120.00' }
		},
		recipes_using_count: 7,
		has_stock_movements: true,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'item-kms-03',
		name: 'Cup Plastik Cold 16oz Sablon Jodi',
		code: 'KMS-CUP-COLD16',
		category_id: 'cat-packaging',
		category_name: 'Kemasan & Wadah',
		base_unit_id: 'u-pcs',
		base_unit_symbol: 'pcs',
		is_producible: false,
		can_buy_external: false,
		hq_ref_code: 'HQ-CUP-C16',
		hq_ref_price: '950.00',
		status: 'active',
		description: 'Cup plastik PP 8 gram bening cetak logo untuk seluruh es kopi dan teh',
		storage_temperature: 'ambient',
		current_stock: '18500.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '7500.0000', min: '2500.0000', unit_cost: '950.00', last_purchased_price: '950.00' },
			'out-bdg-01': { current: '5500.0000', min: '2000.0000', unit_cost: '950.00', last_purchased_price: '950.00' },
			'out-sby-01': { current: '5500.0000', min: '2000.0000', unit_cost: '960.00', last_purchased_price: '960.00' }
		},
		recipes_using_count: 16,
		has_stock_movements: true,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'item-kms-04',
		name: 'Lid Datar Bening Strawless 93mm',
		code: 'KMS-LID-STRW',
		category_id: 'cat-packaging',
		category_name: 'Kemasan & Wadah',
		base_unit_id: 'u-pcs',
		base_unit_symbol: 'pcs',
		is_producible: false,
		can_buy_external: false,
		hq_ref_code: 'HQ-LID-STR',
		hq_ref_price: '380.00',
		status: 'active',
		description: 'Tutup gelas dingin ramah lingkungan tipe teguk langsung tanpa sedotan',
		storage_temperature: 'ambient',
		current_stock: '14200.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '5800.0000', min: '2000.0000', unit_cost: '380.00', last_purchased_price: '380.00' },
			'out-bdg-01': { current: '4200.0000', min: '1500.0000', unit_cost: '380.00', last_purchased_price: '380.00' },
			'out-sby-01': { current: '4200.0000', min: '1500.0000', unit_cost: '390.00', last_purchased_price: '390.00' }
		},
		recipes_using_count: 14,
		has_stock_movements: true,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'item-kms-05',
		name: 'Lid Hot Dome Hitam 90mm',
		code: 'KMS-LID-HOT',
		category_id: 'cat-packaging',
		category_name: 'Kemasan & Wadah',
		base_unit_id: 'u-pcs',
		base_unit_symbol: 'pcs',
		is_producible: false,
		can_buy_external: false,
		hq_ref_code: 'HQ-LID-HOT',
		hq_ref_price: '420.00',
		status: 'active',
		description: 'Tutup gelas panas berlubang teguk warna hitam elegan',
		storage_temperature: 'ambient',
		current_stock: '8900.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '3500.0000', min: '1000.0000', unit_cost: '420.00', last_purchased_price: '420.00' },
			'out-bdg-01': { current: '2700.0000', min: '800.0000', unit_cost: '420.00', last_purchased_price: '420.00' },
			'out-sby-01': { current: '2700.0000', min: '800.0000', unit_cost: '430.00', last_purchased_price: '430.00' }
		},
		recipes_using_count: 10,
		has_stock_movements: true,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'item-kms-06',
		name: 'Sedotan Kertas Steril Bungkus Kertas',
		code: 'KMS-SDT-KERTAS',
		category_id: 'cat-packaging',
		category_name: 'Kemasan & Wadah',
		base_unit_id: 'u-pcs',
		base_unit_symbol: 'pcs',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-SDT-KRT',
		hq_ref_price: '180.00',
		status: 'active',
		description: 'Sedotan biodegradable higienis diameter 6mm',
		storage_temperature: 'ambient',
		current_stock: '12000.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '5000.0000', min: '1500.0000', unit_cost: '180.00', last_purchased_price: '180.00' },
			'out-bdg-01': { current: '3500.0000', min: '1000.0000', unit_cost: '180.00', last_purchased_price: '180.00' },
			'out-sby-01': { current: '3500.0000', min: '1000.0000', unit_cost: '185.00', last_purchased_price: '185.00' }
		},
		recipes_using_count: 12,
		has_stock_movements: true,
		created_at: '2026-01-12T08:00:00.000Z',
		updated_at: '2026-01-12T08:00:00.000Z'
	},
	{
		id: 'item-kms-07',
		name: 'Paper Bag Kraft Takeaway Sedang',
		code: 'KMS-BAG-MED',
		category_id: 'cat-packaging',
		category_name: 'Kemasan & Wadah',
		base_unit_id: 'u-pcs',
		base_unit_symbol: 'pcs',
		is_producible: false,
		can_buy_external: false,
		hq_ref_code: 'HQ-BAG-MED',
		hq_ref_price: '1850.00',
		status: 'active',
		description: 'Kantong kertas takeaway tebal muat 2-4 cup minuman',
		storage_temperature: 'ambient',
		current_stock: '4200.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '1800.0000', min: '500.0000', unit_cost: '1850.00', last_purchased_price: '1850.00' },
			'out-bdg-01': { current: '1200.0000', min: '400.0000', unit_cost: '1850.00', last_purchased_price: '1850.00' },
			'out-sby-01': { current: '1200.0000', min: '400.0000', unit_cost: '1880.00', last_purchased_price: '1880.00' }
		},
		recipes_using_count: 0,
		has_stock_movements: true,
		created_at: '2026-01-12T08:00:00.000Z',
		updated_at: '2026-01-12T08:00:00.000Z'
	},
	{
		id: 'item-kms-08',
		name: 'Paper Bag Kraft Takeaway Besar',
		code: 'KMS-BAG-LRG',
		category_id: 'cat-packaging',
		category_name: 'Kemasan & Wadah',
		base_unit_id: 'u-pcs',
		base_unit_symbol: 'pcs',
		is_producible: false,
		can_buy_external: false,
		hq_ref_code: 'HQ-BAG-LRG',
		hq_ref_price: '2400.00',
		status: 'active',
		description: 'Kantong kertas tebal untuk pemesanan rombongan & pastry box',
		storage_temperature: 'ambient',
		current_stock: '2600.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '1100.0000', min: '300.0000', unit_cost: '2400.00', last_purchased_price: '2400.00' },
			'out-bdg-01': { current: '800.0000', min: '200.0000', unit_cost: '2400.00', last_purchased_price: '2400.00' },
			'out-sby-01': { current: '700.0000', min: '200.0000', unit_cost: '2450.00', last_purchased_price: '2450.00' }
		},
		recipes_using_count: 0,
		has_stock_movements: true,
		created_at: '2026-01-15T08:00:00.000Z',
		updated_at: '2026-01-15T08:00:00.000Z'
	},
	{
		id: 'item-kms-09',
		name: 'Cup Holder Baki Karton 2-Cup',
		code: 'KMS-HLD-2CUP',
		category_id: 'cat-packaging',
		category_name: 'Kemasan & Wadah',
		base_unit_id: 'u-pcs',
		base_unit_symbol: 'pcs',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-HLD-2C',
		hq_ref_price: '650.00',
		status: 'active',
		description: 'Tatakan karton kokoh pencegah tumpah dalam pengantaran ojol',
		storage_temperature: 'ambient',
		current_stock: '3900.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '1600.0000', min: '400.0000', unit_cost: '650.00', last_purchased_price: '650.00' },
			'out-bdg-01': { current: '1200.0000', min: '300.0000', unit_cost: '650.00', last_purchased_price: '650.00' },
			'out-sby-01': { current: '1100.0000', min: '300.0000', unit_cost: '660.00', last_purchased_price: '660.00' }
		},
		recipes_using_count: 0,
		has_stock_movements: true,
		created_at: '2026-01-15T08:00:00.000Z',
		updated_at: '2026-01-15T08:00:00.000Z'
	},
	{
		id: 'item-kms-10',
		name: 'Botol Kaca Cold Brew 250ml + Tutup Segel',
		code: 'KMS-BTL-250',
		category_id: 'cat-packaging',
		category_name: 'Kemasan & Wadah',
		base_unit_id: 'u-pcs',
		base_unit_symbol: 'pcs',
		is_producible: false,
		can_buy_external: false,
		hq_ref_code: 'HQ-BTL-250',
		hq_ref_price: '4200.00',
		status: 'active',
		description: 'Botol kaca amber vintage untuk kemasan take-home cold brew',
		storage_temperature: 'ambient',
		current_stock: '1500.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '600.0000', min: '200.0000', unit_cost: '4200.00', last_purchased_price: '4200.00' },
			'out-bdg-01': { current: '500.0000', min: '150.0000', unit_cost: '4200.00', last_purchased_price: '4200.00' },
			'out-sby-01': { current: '400.0000', min: '150.0000', unit_cost: '4250.00', last_purchased_price: '4250.00' }
		},
		recipes_using_count: 2,
		has_stock_movements: true,
		created_at: '2026-01-18T08:00:00.000Z',
		updated_at: '2026-01-18T08:00:00.000Z'
	},

	// --- Bakery & Dapur (4 items) ---
	{
		id: 'item-bkr-01',
		name: 'Butter Elle & Vire Unsalted 2.5kg Block',
		code: 'BKR-BTR-ELLE',
		category_id: 'cat-bakery',
		category_name: 'Bakery & Dapur',
		base_unit_id: 'u-g',
		base_unit_symbol: 'g',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-BTR-ELLE',
		hq_ref_price: '164.00',
		status: 'active',
		description: 'Mentega tawar premium Prancis dengan kandungan lemak susu 82% untuk croissant renyah',
		storage_temperature: 'chilled',
		current_stock: '17500.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '7500.0000', min: '2500.0000', unit_cost: '164.00', last_purchased_price: '164.00' },
			'out-bdg-01': { current: '5000.0000', min: '2000.0000', unit_cost: '164.00', last_purchased_price: '164.00' },
			'out-plaga-01': { current: '5000.0000', min: '2000.0000', unit_cost: '170.00', last_purchased_price: '170.00' }
		},
		recipes_using_count: 4,
		has_stock_movements: true,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'item-bkr-02',
		name: 'Tepung Terigu Protein Tinggi Cakra Kembar 25kg',
		code: 'BKR-TPG-CAKRA',
		category_id: 'cat-bakery',
		category_name: 'Bakery & Dapur',
		base_unit_id: 'u-kg',
		base_unit_symbol: 'kg',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-TPG-CKR',
		hq_ref_price: '11000.00',
		status: 'active',
		description: 'Tepung gandum elastis tinggi gluten untuk roti artisanal dan pastry',
		storage_temperature: 'ambient',
		current_stock: '250.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '100.0000', min: '25.0000', unit_cost: '11000.00', last_purchased_price: '11000.00' },
			'out-bdg-01': { current: '75.0000', min: '25.0000', unit_cost: '11000.00', last_purchased_price: '11000.00' },
			'out-plaga-01': { current: '75.0000', min: '25.0000', unit_cost: '11500.00', last_purchased_price: '11500.00' }
		},
		recipes_using_count: 5,
		has_stock_movements: true,
		created_at: '2026-01-10T08:00:00.000Z',
		updated_at: '2026-01-10T08:00:00.000Z'
	},
	{
		id: 'item-bkr-03',
		name: 'Ragi Roti Instant Saf-Instant Red 500g',
		code: 'BKR-RAGI-SAF',
		category_id: 'cat-bakery',
		category_name: 'Bakery & Dapur',
		base_unit_id: 'u-g',
		base_unit_symbol: 'g',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-RAGI-SAF',
		hq_ref_price: '96.00',
		status: 'active',
		description: 'Ragi ragi kering instan kualitas stabil untuk adonan fermentasi',
		storage_temperature: 'ambient',
		current_stock: '3500.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '1500.0000', min: '500.0000', unit_cost: '96.00', last_purchased_price: '96.00' },
			'out-bdg-01': { current: '1000.0000', min: '500.0000', unit_cost: '96.00', last_purchased_price: '96.00' },
			'out-plaga-01': { current: '1000.0000', min: '500.0000', unit_cost: '98.00', last_purchased_price: '98.00' }
		},
		recipes_using_count: 4,
		has_stock_movements: true,
		created_at: '2026-01-12T08:00:00.000Z',
		updated_at: '2026-01-12T08:00:00.000Z'
	},
	{
		id: 'item-bkr-04',
		name: 'Keju Cheddar Kraft Block 2kg',
		code: 'BKR-KJU-KRAFT',
		category_id: 'cat-bakery',
		category_name: 'Bakery & Dapur',
		base_unit_id: 'u-g',
		base_unit_symbol: 'g',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-KJU-KRFT',
		hq_ref_price: '99.00',
		status: 'active',
		description: 'Keju cheddar gurih padat untuk parutan toast dan filling roti',
		storage_temperature: 'chilled',
		current_stock: '8000.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '4000.0000', min: '1000.0000', unit_cost: '99.00', last_purchased_price: '99.00' },
			'out-bdg-01': { current: '2000.0000', min: '1000.0000', unit_cost: '99.00', last_purchased_price: '99.00' },
			'out-sby-01': { current: '2000.0000', min: '1000.0000', unit_cost: '102.00', last_purchased_price: '102.00' }
		},
		recipes_using_count: 3,
		has_stock_movements: true,
		created_at: '2026-01-15T08:00:00.000Z',
		updated_at: '2026-01-15T08:00:00.000Z'
	},

	// --- 2 Bahan Olahan Outlet (is_producible = true) ---
	{
		id: 'item-prod-01',
		name: 'Cold Brew Concentrate 24h Batch',
		code: 'PRD-CB-CONC',
		category_id: 'cat-coffee',
		category_name: 'Kopi & Espresso',
		base_unit_id: 'u-liter',
		base_unit_symbol: 'liter',
		is_producible: true, // Olahan outlet
		can_buy_external: false,
		hq_ref_code: 'HQ-PRD-CB',
		hq_ref_price: '45000.00',
		status: 'active',
		description: 'Konsentrat ekstrak dingin hasil seduh biji Gayo selama 24 jam di suhu 4°C',
		storage_temperature: 'chilled',
		current_stock: '29.5000',
		stock_by_outlet: {
			'out-jkt-01': { current: '2.5000', min: '5.0000', unit_cost: '45000.00', last_purchased_price: '45000.00' },
			'out-bdg-01': { current: '14.0000', min: '4.0000', unit_cost: '45000.00', last_purchased_price: '45000.00' },
			'out-sby-01': { current: '13.0000', min: '4.0000', unit_cost: '46000.00', last_purchased_price: '46000.00' }
		},
		recipes_using_count: 4,
		has_stock_movements: true,
		created_at: '2026-01-20T08:00:00.000Z',
		updated_at: '2026-01-20T08:00:00.000Z'
	},
	{
		id: 'item-prod-02',
		name: 'Sirup Gula Aren Pandan Spesial Batch',
		code: 'PRD-GLA-PANDAN',
		category_id: 'cat-syrup',
		category_name: 'Sirup & Pemanis',
		base_unit_id: 'u-liter',
		base_unit_symbol: 'liter',
		is_producible: true, // Olahan outlet
		can_buy_external: false,
		hq_ref_code: 'HQ-PRD-GLP',
		hq_ref_price: '32000.00',
		status: 'active',
		description: 'Rebusan gula aren alami dengan daun pandan wangi segar dan sejumput garam laut',
		storage_temperature: 'chilled',
		current_stock: '27.5000',
		stock_by_outlet: {
			'out-jkt-01': { current: '16.0000', min: '4.0000', unit_cost: '32000.00', last_purchased_price: '32000.00' },
			'out-bdg-01': { current: '1.5000', min: '3.0000', unit_cost: '32000.00', last_purchased_price: '32000.00' },
			'out-sby-01': { current: '10.0000', min: '3.0000', unit_cost: '33000.00', last_purchased_price: '33000.00' }
		},
		recipes_using_count: 6,
		has_stock_movements: true,
		created_at: '2026-01-20T08:00:00.000Z',
		updated_at: '2026-01-20T08:00:00.000Z'
	},

	// --- 4 Bahan Tambahan untuk Mencapai 40 Seed Lengkap (beberapa tanpa mutasi stok untuk pengujian) ---
	{
		id: 'item-tst-01',
		name: 'Biji Kopi Uji Coba Baru (Tanpa Mutasi)',
		code: 'KOP-TST-NEW',
		category_id: 'cat-coffee',
		category_name: 'Kopi & Espresso',
		base_unit_id: 'u-kg',
		base_unit_symbol: 'kg',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-TST-NEW',
		hq_ref_price: '280000.00',
		status: 'active',
		description: 'Item uji coba baru untuk verifikasi perubahan base_unit sebelum ada mutasi stok (AC-03.1)',
		storage_temperature: 'ambient',
		current_stock: '0.0000',
		stock_by_outlet: {},
		recipes_using_count: 0,
		has_stock_movements: false, // Boleh diubah base_unit nya!
		created_at: '2026-02-01T08:00:00.000Z',
		updated_at: '2026-02-01T08:00:00.000Z'
	},
	{
		id: 'item-tst-02',
		name: 'Perisa Cinnamon Uji Coba (Bisa Diarsip)',
		code: 'SRP-TST-CIN',
		category_id: 'cat-syrup',
		category_name: 'Sirup & Pemanis',
		base_unit_id: 'u-ml',
		base_unit_symbol: 'ml',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-TST-CIN',
		hq_ref_price: '90.00',
		status: 'active',
		description: 'Item uji coba tanpa stok dan tanpa resep untuk memvalidasi pengarsipan bahan (AC-03.5)',
		storage_temperature: 'ambient',
		current_stock: '0.0000',
		stock_by_outlet: {},
		recipes_using_count: 0,
		has_stock_movements: false,
		created_at: '2026-02-01T08:00:00.000Z',
		updated_at: '2026-02-01T08:00:00.000Z'
	},
	{
		id: 'item-tst-03',
		name: 'Bahan Lama Diarsipkan',
		code: 'OLD-ARCHIVED-01',
		category_id: 'cat-bakery',
		category_name: 'Bakery & Dapur',
		base_unit_id: 'u-pcs',
		base_unit_symbol: 'pcs',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-OLD-01',
		hq_ref_price: '10000.00',
		status: 'archived',
		description: 'Bahan yang sudah lama diarsipkan dan tidak digunakan lagi',
		storage_temperature: 'ambient',
		current_stock: '0.0000',
		stock_by_outlet: {},
		recipes_using_count: 0,
		has_stock_movements: false,
		created_at: '2026-01-01T08:00:00.000Z',
		updated_at: '2026-01-01T08:00:00.000Z'
	},
	{
		id: 'item-tst-04',
		name: 'Cup Plastik Sampel Promosi 10oz',
		code: 'KMS-SMPL-10OZ',
		category_id: 'cat-packaging',
		category_name: 'Kemasan & Wadah',
		base_unit_id: 'u-pcs',
		base_unit_symbol: 'pcs',
		is_producible: false,
		can_buy_external: true,
		hq_ref_code: 'HQ-SMP-10',
		hq_ref_price: '600.00',
		status: 'active',
		description: 'Cup plastik mini untuk pembagian tester promosi di acara festival kopi',
		storage_temperature: 'ambient',
		current_stock: '25.0000',
		stock_by_outlet: {
			'out-jkt-01': { current: '25.0000', min: '100.0000', unit_cost: '600.00', last_purchased_price: '600.00' }
		},
		recipes_using_count: 0,
		has_stock_movements: true,
		created_at: '2026-02-05T08:00:00.000Z',
		updated_at: '2026-02-05T08:00:00.000Z'
	}
];

// ============================================================================
// 6. Registrasi Handler Router Mock MS-03
// ============================================================================
export function registerCatalogHandlers(): void {
	// --------------------------------------------------------------------------
	// 6.1 Master Kategori (Item Categories)
	// --------------------------------------------------------------------------
	router.register('GET', '/api/v1/item-categories', async () => {
		// Update item_count secara dinamis
		const counts: Record<string, number> = {};
		for (const it of mockStockItems) {
			counts[it.category_id] = (counts[it.category_id] || 0) + 1;
		}
		const categoriesWithCounts = mockCategories.map((c) => ({
			...c,
			item_count: counts[c.id] || 0
		}));
		return { data: categoriesWithCounts };
	});

	router.register('POST', '/api/v1/item-categories', async (ctx) => {
		const body = (ctx.req.body || {}) as Partial<ItemCategory>;
		if (!body.name?.trim()) {
			throw ApiErrors.validationError([{ field: 'name', code: 'required', message: 'Nama kategori wajib diisi' }]);
		}
		const upperCode = (body.code || `CAT-${body.name.substring(0, 3)}`).toUpperCase().trim();
		const newCat: ItemCategory = {
			id: `cat-${clock.now().getTime()}`,
			name: body.name.trim(),
			code: upperCode,
			description: body.description?.trim() || '',
			item_count: 0,
			created_at: clock.nowIso(),
			updated_at: clock.nowIso()
		};
		mockCategories.push(newCat);
		return { data: newCat };
	});

	router.register('PUT', '/api/v1/item-categories/:id', async (ctx) => {
		const index = mockCategories.findIndex((c) => c.id === ctx.params.id);
		if (index === -1) {
			throw ApiErrors.notFound(`Kategori "${ctx.params.id}" tidak ditemukan`);
		}
		const body = (ctx.req.body || {}) as Partial<ItemCategory>;
		mockCategories[index] = {
			...mockCategories[index],
			...body,
			updated_at: clock.nowIso()
		};
		return { data: mockCategories[index] };
	});

	// --------------------------------------------------------------------------
	// 6.2 Master Satuan (Units) & Konversi Satuan (AC-03.2)
	// --------------------------------------------------------------------------
	router.register('GET', '/api/v1/units', async () => {
		return { data: mockUnits };
	});

	router.register('POST', '/api/v1/units', async (ctx) => {
		const body = (ctx.req.body || {}) as Partial<Unit>;
		if (!body.name?.trim() || !body.symbol?.trim()) {
			throw ApiErrors.validationError([
				{ field: 'name', code: 'required', message: 'Nama satuan wajib diisi' },
				{ field: 'symbol', code: 'required', message: 'Simbol satuan wajib diisi' }
			]);
		}
		const newUnit: Unit = {
			id: `u-${body.symbol.toLowerCase().replace(/[^a-z0-9]/g, '')}-${clock.now().getTime()}`,
			name: body.name.trim(),
			symbol: body.symbol.trim().toLowerCase(),
			type: body.type || 'count',
			is_system: false,
			created_at: clock.nowIso(),
			updated_at: clock.nowIso()
		};
		mockUnits.push(newUnit);
		return { data: newUnit };
	});

	router.register('GET', '/api/v1/unit-conversions', async () => {
		return { data: mockConversions };
	});

	router.register('POST', '/api/v1/unit-conversions', async (ctx) => {
		const body = (ctx.req.body || {}) as Partial<UnitConversion>;
		if (!body.from_unit_id || !body.to_unit_id || !body.factor) {
			throw ApiErrors.validationError([
				{ field: 'from_unit_id', code: 'required', message: 'Satuan asal wajib diisi' },
				{ field: 'to_unit_id', code: 'required', message: 'Satuan tujuan wajib diisi' },
				{ field: 'factor', code: 'required', message: 'Faktor konversi wajib diisi' }
			]);
		}

		// Validasi faktor > 0
		const factorVal = validateConversionFactor(body.factor);
		if (!factorVal.valid) {
			throw ApiErrors.validationError([{ field: 'factor', code: 'invalid', message: factorVal.message! }]);
		}

		// Deteksi siklus konversi satuan (AC-03.2)
		const hasCycle = detectConversionCycle(mockConversions, {
			from_unit_id: body.from_unit_id,
			to_unit_id: body.to_unit_id
		});

		if (hasCycle) {
			throw ApiErrors.validationError(
				[
					{
						field: 'to_unit_id',
						code: 'cycle_detected',
						message: 'Konversi ini menyebabkan siklus melingkar yang tidak diperbolehkan'
					}
				],
				'Terdeteksi siklus konversi satuan (circular dependency). Konversi tidak dapat disimpan.'
			);
		}

		const fromUnit = mockUnits.find((u) => u.id === body.from_unit_id);
		const toUnit = mockUnits.find((u) => u.id === body.to_unit_id);

		const newConv: UnitConversion = {
			id: `conv-${clock.now().getTime()}`,
			from_unit_id: body.from_unit_id,
			from_unit_symbol: fromUnit?.symbol || body.from_unit_id,
			to_unit_id: body.to_unit_id,
			to_unit_symbol: toUnit?.symbol || body.to_unit_id,
			factor: body.factor,
			description: body.description || `1 ${fromUnit?.symbol} = ${body.factor} ${toUnit?.symbol}`,
			created_at: clock.nowIso(),
			updated_at: clock.nowIso()
		};

		mockConversions.push(newConv);
		return { data: newConv };
	});

	router.register('DELETE', '/api/v1/unit-conversions/:id', async (ctx) => {
		const index = mockConversions.findIndex((c) => c.id === ctx.params.id);
		if (index === -1) {
			throw ApiErrors.notFound(`Konversi satuan "${ctx.params.id}" tidak ditemukan`);
		}
		mockConversions.splice(index, 1);
		return { data: { success: true, message: 'Konversi satuan berhasil dihapus' } };
	});

	// --------------------------------------------------------------------------
	// 6.3 Master Pemasok (Suppliers) (AC-03.7)
	// --------------------------------------------------------------------------
	router.register('GET', '/api/v1/suppliers', async (ctx) => {
		let list = [...mockSuppliers];
		const typeFilter = ctx.query?.get('type') || ctx.req.query?.type as string;
		const statusFilter = ctx.query?.get('status') || ctx.req.query?.status as string;
		const search = ctx.query?.get('search') || ctx.req.query?.search as string;

		if (typeFilter && typeFilter !== 'all') {
			list = list.filter((s) => s.type === typeFilter);
		}
		if (statusFilter && statusFilter !== 'all') {
			list = list.filter((s) => s.status === statusFilter);
		}
		if (search && search.trim()) {
			const q = search.toLowerCase();
			list = list.filter(
				(s) =>
					s.name.toLowerCase().includes(q) ||
					s.code.toLowerCase().includes(q) ||
					(s.city && s.city.toLowerCase().includes(q))
			);
		}

		return { data: list };
	});

	router.register('POST', '/api/v1/suppliers', async (ctx) => {
		const body = (ctx.req.body || {}) as Partial<Supplier>;
		if (!body.name?.trim()) {
			throw ApiErrors.validationError([{ field: 'name', code: 'required', message: 'Nama supplier wajib diisi' }]);
		}
		const upperCode = (body.code || `SUP-${clock.now().getTime().toString().slice(-4)}`).toUpperCase().trim();
		const newSupplier: Supplier = {
			id: `sup-${clock.now().getTime()}`,
			name: body.name.trim(),
			code: upperCode,
			type: body.type || 'external',
			contact_person: body.contact_person?.trim() || '',
			phone: body.phone?.trim() || '',
			email: body.email?.trim() || '',
			address: body.address?.trim() || '',
			city: body.city?.trim() || 'Jakarta',
			payment_terms_days: body.payment_terms_days ?? 0,
			status: 'active',
			notes: body.notes?.trim() || '',
			has_transactions: false,
			created_at: clock.nowIso(),
			updated_at: clock.nowIso()
		};
		mockSuppliers.push(newSupplier);
		return { data: newSupplier };
	});

	router.register('GET', '/api/v1/suppliers/:id', async (ctx) => {
		const supplier = mockSuppliers.find((s) => s.id === ctx.params.id);
		if (!supplier) {
			throw ApiErrors.notFound(`Supplier "${ctx.params.id}" tidak ditemukan`);
		}
		return { data: supplier };
	});

	router.register('PUT', '/api/v1/suppliers/:id', async (ctx) => {
		const index = mockSuppliers.findIndex((s) => s.id === ctx.params.id);
		if (index === -1) {
			throw ApiErrors.notFound(`Supplier "${ctx.params.id}" tidak ditemukan`);
		}
		const body = (ctx.req.body || {}) as Partial<Supplier>;
		mockSuppliers[index] = {
			...mockSuppliers[index],
			...body,
			updated_at: clock.nowIso()
		};
		return { data: mockSuppliers[index] };
	});

	// Hapus Supplier (AC-03.7: Gudang Pusat / Berelasi transaksi ditolak)
	router.register('DELETE', '/api/v1/suppliers/:id', async (ctx) => {
		const index = mockSuppliers.findIndex((s) => s.id === ctx.params.id);
		if (index === -1) {
			throw ApiErrors.notFound(`Supplier "${ctx.params.id}" tidak ditemukan`);
		}
		const sup = mockSuppliers[index];
		if (sup.has_transactions) {
			throw ApiErrors.conflict(
				`Supplier "${sup.name}" memiliki riwayat transaksi/pengadaan dan tidak dapat dihapus. Silakan ubah statusnya menjadi non-aktif.`
			);
		}
		mockSuppliers.splice(index, 1);
		return { data: { success: true, message: 'Supplier berhasil dihapus' } };
	});

	// --------------------------------------------------------------------------
	// 6.4 Master Bahan Baku (Stock Items) (AC-03.1, AC-03.3, AC-03.5, AC-03.6)
	// --------------------------------------------------------------------------
	router.register('GET', '/api/v1/stock-items', async (ctx) => {
		const currentUser = getCurrentMockUser();
		const role = (ctx.query?.get('role') || ctx.req.query?.role as string) || currentUser?.role || 'owner';
		let list = [...mockStockItems];

		const catFilter = ctx.query?.get('category_id') || ctx.req.query?.category_id as string;
		const producibleFilter = ctx.query?.get('is_producible') || ctx.req.query?.is_producible as string;
		const externalFilter = ctx.query?.get('can_buy_external') || ctx.req.query?.can_buy_external as string;
		const statusFilter = ctx.query?.get('status') || ctx.req.query?.status as string;
		const search = ctx.query?.get('search') || ctx.req.query?.search as string;

		if (catFilter && catFilter !== 'all') {
			list = list.filter((i) => i.category_id === catFilter);
		}
		if (producibleFilter && producibleFilter !== 'all') {
			list = list.filter((i) => (producibleFilter === 'true' ? i.is_producible : !i.is_producible));
		}
		if (externalFilter && externalFilter !== 'all') {
			list = list.filter((i) => (externalFilter === 'true' ? i.can_buy_external : !i.can_buy_external));
		}
		if (statusFilter && statusFilter !== 'all') {
			list = list.filter((i) => i.status === statusFilter);
		}
		if (search && search.trim()) {
			const q = search.toLowerCase();
			list = list.filter(
				(i) =>
					i.name.toLowerCase().includes(q) ||
					i.code.toLowerCase().includes(q) ||
					(i.hq_ref_code && i.hq_ref_code.toLowerCase().includes(q))
			);
		}

		if (recipeCountGetter) {
			list = list.map((item) => ({
				...item,
				recipes_using_count: recipeCountGetter!(item.id)
			}));
		}

		// AC-03.6: Store Manager Scope Lock (Hanya melihat stok dan minimum outlet tugasnya)
		if (role === 'store_manager') {
			const userOutletIds = currentUser?.outlet_ids || ['out-jkt-01'];
			list = list.map((item) => {
				const filteredStockByOutlet: Record<string, any> = {};
				for (const outId of userOutletIds) {
					if (item.stock_by_outlet?.[outId]) {
						filteredStockByOutlet[outId] = item.stock_by_outlet[outId];
					}
				}
				return {
					...item,
					stock_by_outlet: filteredStockByOutlet
				};
			});
		}

		return { data: list };
	});

	router.register('POST', '/api/v1/stock-items', async (ctx) => {
		const currentUser = getCurrentMockUser();
		const role = (ctx.query?.get('role') || ctx.req.query?.role as string) || currentUser?.role || 'owner';
		if (role === 'store_manager' || role === 'cashier') {
			throw ApiErrors.forbidden('Peran Anda tidak memiliki hak akses untuk menambah master bahan baku.');
		}

		const body = (ctx.req.body || {}) as Partial<StockItem>;

		// Validasi format kode SKU
		const codeVal = validateItemCode(body.code || '');
		if (!codeVal.valid) {
			throw ApiErrors.validationError([{ field: 'code', code: 'invalid', message: codeVal.message! }]);
		}

		const upperCode = body.code!.toUpperCase().trim();
		if (mockStockItems.some((i) => i.code === upperCode)) {
			throw ApiErrors.conflict(`Kode bahan baku "${upperCode}" sudah terdaftar dalam sistem`);
		}

		if (!body.name?.trim()) {
			throw ApiErrors.validationError([{ field: 'name', code: 'required', message: 'Nama bahan baku wajib diisi' }]);
		}
		if (!body.category_id) {
			throw ApiErrors.validationError([{ field: 'category_id', code: 'required', message: 'Kategori bahan wajib dipilih' }]);
		}
		if (!body.base_unit_id) {
			throw ApiErrors.validationError([{ field: 'base_unit_id', code: 'required', message: 'Satuan dasar (base unit) wajib dipilih' }]);
		}

		const category = mockCategories.find((c) => c.id === body.category_id);
		const unit = mockUnits.find((u) => u.id === body.base_unit_id);

		const newItem: StockItem = {
			id: `item-${clock.now().getTime()}`,
			name: body.name.trim(),
			code: upperCode,
			category_id: body.category_id,
			category_name: category?.name || 'Umum',
			base_unit_id: body.base_unit_id,
			base_unit_symbol: unit?.symbol || 'pcs',
			is_producible: body.is_producible || false,
			can_buy_external: body.can_buy_external ?? true,
			hq_ref_code: body.hq_ref_code?.trim() || '',
			hq_ref_price: body.hq_ref_price || '0.00',
			status: 'active',
			description: body.description?.trim() || '',
			storage_temperature: body.storage_temperature || 'ambient',
			current_stock: '0.0000',
			stock_by_outlet: {},
			recipes_using_count: 0,
			has_stock_movements: false,
			created_at: clock.nowIso(),
			updated_at: clock.nowIso()
		};

		mockStockItems.push(newItem);
		return { data: newItem };
	});

	router.register('GET', '/api/v1/stock-items/:id', async (ctx) => {
		const currentUser = getCurrentMockUser();
		const role = (ctx.query?.get('role') || ctx.req.query?.role as string) || currentUser?.role || 'owner';
		const item = mockStockItems.find((i) => i.id === ctx.params.id);
		if (!item) {
			throw ApiErrors.notFound(`Bahan baku "${ctx.params.id}" tidak ditemukan`);
		}

		const dynamicRecipesCount = recipeCountGetter ? recipeCountGetter(item.id) : (item.recipes_using_count || 0);

		if (role === 'store_manager') {
			const userOutletIds = currentUser?.outlet_ids || ['out-jkt-01'];
			const filteredStockByOutlet: Record<string, any> = {};
			for (const outId of userOutletIds) {
				if (item.stock_by_outlet?.[outId]) {
					filteredStockByOutlet[outId] = item.stock_by_outlet[outId];
				}
			}
			return {
				data: {
					...item,
					recipes_using_count: dynamicRecipesCount,
					stock_by_outlet: filteredStockByOutlet
				}
			};
		}

		return { data: { ...item, recipes_using_count: dynamicRecipesCount } };
	});

	router.register('PUT', '/api/v1/stock-items/:id', async (ctx) => {
		const currentUser = getCurrentMockUser();
		const role = (ctx.query?.get('role') || ctx.req.query?.role as string) || currentUser?.role || 'owner';
		if (role === 'store_manager' || role === 'cashier') {
			throw ApiErrors.forbidden('Peran Store Manager tidak diizinkan mengubah master bahan baku.');
		}

		const index = mockStockItems.findIndex((i) => i.id === ctx.params.id);
		if (index === -1) {
			throw ApiErrors.notFound(`Bahan baku "${ctx.params.id}" tidak ditemukan`);
		}

		const existing = mockStockItems[index];
		const body = (ctx.req.body || {}) as Partial<StockItem>;

		// Invarian AC-03.1: Dilarang mengubah base_unit jika sudah ada pergerakan stok
		if (body.base_unit_id && body.base_unit_id !== existing.base_unit_id) {
			const check = evaluateBaseUnitChange(existing, body.base_unit_id);
			if (!check.allowed) {
				throw ApiErrors.conflict(check.reason!);
			}
		}

		// Invarian AC-03.3: Membuktikan hq_ref_price tidak mengubah HPP maupun nilai saldo stok
		if (body.hq_ref_price !== undefined) {
			evaluateHqRefPriceImpact(existing.hq_ref_price, body.hq_ref_price, '240.00', existing.current_stock || '0.0000');
		}

		mockStockItems[index] = {
			...existing,
			...body,
			updated_at: clock.nowIso()
		};

		return { data: mockStockItems[index] };
	});

	// Arsipkan Bahan (AC-03.5: Ditolak jika ada sisa stok atau dipakai resep aktif)
	router.register('POST', '/api/v1/stock-items/:id/actions/archive', async (ctx) => {
		const index = mockStockItems.findIndex((i) => i.id === ctx.params.id);
		if (index === -1) {
			throw ApiErrors.notFound(`Bahan baku "${ctx.params.id}" tidak ditemukan`);
		}
		const item = mockStockItems[index];

		// Kumpulkan stok per outlet
		const stockMap: Record<string, string> = {};
		if (item.stock_by_outlet) {
			for (const [outId, val] of Object.entries(item.stock_by_outlet)) {
				stockMap[outId] = val.current;
			}
		}

		const check = evaluateStockItemArchiving(item, stockMap, item.recipes_using_count || 0);
		if (!check.allowed) {
			throw ApiErrors.conflict(
				`Gagal mengarsipkan bahan "${item.name}":\n- ${check.blockingReasons.join('\n- ')}`
			);
		}

		mockStockItems[index].status = 'archived';
		mockStockItems[index].updated_at = clock.nowIso();
		return { data: mockStockItems[index] };
	});

	router.register('POST', '/api/v1/stock-items/:id/actions/restore', async (ctx) => {
		const index = mockStockItems.findIndex((i) => i.id === ctx.params.id);
		if (index === -1) {
			throw ApiErrors.notFound(`Bahan baku "${ctx.params.id}" tidak ditemukan`);
		}
		mockStockItems[index].status = 'active';
		mockStockItems[index].updated_at = clock.nowIso();
		return { data: mockStockItems[index] };
	});

	// Riwayat Biaya Pembelian Bahan (Stock Item Cost History)
	router.register('GET', '/api/v1/stock-items/:id/costs', async (ctx) => {
		const item = mockStockItems.find((i) => i.id === ctx.params.id);
		if (!item) {
			throw ApiErrors.notFound(`Bahan baku "${ctx.params.id}" tidak ditemukan`);
		}
		const history: StockItemCostHistory = {
			item_id: item.id,
			outlet_id: 'out-jkt-01',
			outlet_name: 'Jodi Senopati',
			last_purchased_price: item.stock_by_outlet?.['out-jkt-01']?.last_purchased_price || '240.00',
			last_purchased_at: '2026-10-12T10:30:00.000Z',
			average_unit_cost: item.stock_by_outlet?.['out-jkt-01']?.unit_cost || '240.00',
			history: [
				{
					date: '2026-10-12',
					invoice_number: 'INV-2026-10-001',
					supplier_id: 'sup-ext-01',
					supplier_name: 'PT Sumber Kopi Nusantara',
					unit_price: '240.00',
					qty: '10000.0000',
					unit: item.base_unit_symbol
				},
				{
					date: '2026-09-28',
					invoice_number: 'INV-2026-09-082',
					supplier_id: 'sup-ext-01',
					supplier_name: 'PT Sumber Kopi Nusantara',
					unit_price: '235.00',
					qty: '10000.0000',
					unit: item.base_unit_symbol
				},
				{
					date: '2026-09-14',
					invoice_number: 'INV-2026-09-021',
					supplier_id: 'sup-ext-01',
					supplier_name: 'PT Sumber Kopi Nusantara',
					unit_price: '235.00',
					qty: '8000.0000',
					unit: item.base_unit_symbol
				}
			]
		};
		return { data: history };
	});

	// Batas Stok Minimum per Outlet
	router.register('PUT', '/api/v1/stock-items/:id/min-stock', async (ctx) => {
		const currentUser = getCurrentMockUser();
		const role = (ctx.query?.get('role') || ctx.req.query?.role as string) || currentUser?.role || 'owner';
		if (role === 'store_manager' || role === 'cashier') {
			throw ApiErrors.forbidden('Store Manager hanya memiliki hak baca (read-only) pada batas stok minimum.');
		}

		const item = mockStockItems.find((i) => i.id === ctx.params.id);
		if (!item) {
			throw ApiErrors.notFound(`Bahan baku "${ctx.params.id}" tidak ditemukan`);
		}

		const body = (ctx.req.body || {}) as { outlet_id: string; min_stock: string };
		if (!body.outlet_id || !body.min_stock) {
			throw ApiErrors.validationError([
				{ field: 'outlet_id', code: 'required', message: 'Outlet wajib diisi' },
				{ field: 'min_stock', code: 'required', message: 'Batas stok minimum wajib diisi' }
			]);
		}

		if (!item.stock_by_outlet) {
			item.stock_by_outlet = {};
		}
		if (!item.stock_by_outlet[body.outlet_id]) {
			item.stock_by_outlet[body.outlet_id] = { current: '0.0000', min: body.min_stock };
		} else {
			item.stock_by_outlet[body.outlet_id].min = body.min_stock;
		}

		return { data: { success: true, item_id: item.id, outlet_id: body.outlet_id, min_stock: body.min_stock } };
	});

	// --------------------------------------------------------------------------
	// 6.5 Wizard Impor CSV Bahan (AC-03.4)
	// --------------------------------------------------------------------------
	router.register('POST', '/api/v1/imports/stock-items/preview', async (ctx) => {
		// Menghasilkan pratinjau 200 baris dengan 5 baris galat (AC-03.4)
		const preview: CsvImportPreview = {
			total_rows: 200,
			valid_rows: 195,
			error_rows: 5,
			items_to_create: [
				{
					row_number: 1,
					name: 'Sirup Hazelnut Sugar Free 700ml',
					code: 'SRP-HAZ-SF',
					category: 'cat-syrup',
					base_unit: 'ml',
					hq_ref_price: '155000.00',
					can_buy_external: true
				},
				{
					row_number: 2,
					name: 'Paper Cup Double Wall 16oz Kraft',
					code: 'KMS-DW-16',
					category: 'cat-packaging',
					base_unit: 'pcs',
					hq_ref_price: '1400.00',
					can_buy_external: false
				},
				{
					row_number: 3,
					name: 'Bubuk Hojicha Premium Organik 500g',
					code: 'BBK-HOJ-ORG',
					category: 'cat-powder',
					base_unit: 'g',
					hq_ref_price: '420000.00',
					can_buy_external: false
				}
			],
			items_to_update: [
				{
					row_number: 4,
					id: 'item-kop-01',
					name: 'Espresso Blend House Arabica-Robusta',
					code: 'KOP-ESP-01',
					changes: 'Pembaruan hq_ref_price: 240.00 -> 245.00'
				}
			],
			errors: [
				{
					row_number: 18,
					code: 'ERR_DUP_CODE',
					field: 'code',
					message: 'Kode SKU "KOP-ESP-01" duplikat dengan bahan yang sudah ada tanpa izin replace',
					raw_data: { Nama: 'Espresso Blend Duplikat', SKU: 'KOP-ESP-01', Satuan: 'g' }
				},
				{
					row_number: 45,
					code: 'ERR_EMPTY_NAME',
					field: 'name',
					message: 'Nama bahan baku kosong pada baris 45',
					raw_data: { Nama: '', SKU: 'RAW-UNK-45', Satuan: 'pcs' }
				},
				{
					row_number: 88,
					code: 'ERR_INVALID_UNIT',
					field: 'base_unit',
					message: 'Satuan "drum_besar" tidak dikenali dalam master satuan sistem',
					raw_data: { Nama: 'Sirup Drum', SKU: 'SRP-DRUM-01', Satuan: 'drum_besar' }
				},
				{
					row_number: 142,
					code: 'ERR_INVALID_PRICE',
					field: 'hq_ref_price',
					message: 'Format harga referensi tidak valid: "-25000"',
					raw_data: { Nama: 'Teh Hijau', SKU: 'TEH-GRN-01', Harga: '-25000' }
				},
				{
					row_number: 199,
					code: 'ERR_INVALID_CODE_CHAR',
					field: 'code',
					message: 'Kode SKU mengandung karakter ilegal: "KOP#GAYO/2026"',
					raw_data: { Nama: 'Kopi Simbol Ilegal', SKU: 'KOP#GAYO/2026', Satuan: 'g' }
				}
			]
		};

		return { data: preview };
	});

	router.register('POST', '/api/v1/imports/stock-items/commit', async (ctx) => {
		// Komit atomik: hanya memproses 195 baris valid dan mengabaikan 5 baris galat
		const result: CsvImportCommitResult = {
			success: true,
			created_count: 190,
			updated_count: 5,
			skipped_count: 5,
			message: 'Impor CSV bahan selesai: 190 dibuat baru, 5 diperbarui, 5 baris galat dilewati.'
		};
		return { data: result };
	});

	// --------------------------------------------------------------------------
	// 6.6 Wizard Impor CSV Kategori Bahan
	// --------------------------------------------------------------------------
	router.register('POST', '/api/v1/imports/categories/preview', async (ctx) => {
		const preview: CategoryCsvImportPreview = {
			total_rows: 10,
			valid_rows: 9,
			error_rows: 1,
			categories_to_create: [
				{
					row_number: 1,
					name: 'Sirup Artisanal Lokal',
					code: 'CAT-SAL',
					description: 'Sirup racikan artisan lokal buah tropis'
				},
				{
					row_number: 2,
					name: 'Alternatif Nabati',
					code: 'CAT-NBT',
					description: 'Oat milk, almond milk, dan soy dairy-free'
				},
				{
					row_number: 3,
					name: 'Biji Kopi Seasonal',
					code: 'CAT-SSN',
					description: 'Biji kopi varietas musiman limited run'
				}
			],
			categories_to_update: [
				{
					row_number: 4,
					id: 'cat-syrup',
					name: 'Sirup & Pemanis Alami',
					code: 'CAT-SRP',
					description: 'Pembaruan deskripsi grup sirup dan madu murni'
				}
			],
			errors: [
				{
					row_number: 10,
					code: 'duplicate_code',
					field: 'code',
					message: 'Kode kategori "CAT-KOP" sudah digunakan oleh Kopi & Espresso',
					raw_data: { Nama: 'Kopi Tambahan', Kode: 'CAT-KOP', Deskripsi: 'Duplikat kode' }
				}
			]
		};
		return { data: preview };
	});

	router.register('POST', '/api/v1/imports/categories/commit', async (ctx) => {
		const newCats: ItemCategory[] = [
			{
				id: `cat-imported-1-${clock.now().getTime()}`,
				name: 'Sirup Artisanal Lokal',
				code: 'CAT-SAL',
				description: 'Sirup racikan artisan lokal buah tropis',
				item_count: 0,
				created_at: clock.nowIso(),
				updated_at: clock.nowIso()
			},
			{
				id: `cat-imported-2-${clock.now().getTime()}`,
				name: 'Alternatif Nabati',
				code: 'CAT-NBT',
				description: 'Oat milk, almond milk, dan soy dairy-free',
				item_count: 0,
				created_at: clock.nowIso(),
				updated_at: clock.nowIso()
			},
			{
				id: `cat-imported-3-${clock.now().getTime()}`,
				name: 'Biji Kopi Seasonal',
				code: 'CAT-SSN',
				description: 'Biji kopi varietas musiman limited run',
				item_count: 0,
				created_at: clock.nowIso(),
				updated_at: clock.nowIso()
			}
		];
		mockCategories.push(...newCats);

		const result: CsvImportCommitResult = {
			success: true,
			created_count: 3,
			updated_count: 1,
			skipped_count: 1,
			message: 'Impor CSV kategori selesai: 3 dibuat baru, 1 diperbarui, 1 baris galat dilewati.'
		};
		return { data: result };
	});
}
