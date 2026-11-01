/**
 * Mock Handler: Katalog Menu, Modifier, Resep, Harga & Channel (MS-04)
 * Referensi: MILESTONE.md §MS-04, AC-04.1 s/d AC-04.10, Golden Rule 6 (Clock)
 */

import { router } from '../engine/router.js';
import { clock } from '../engine/clock.js';
import { ApiErrors } from '../../../contract/errors.js';
import { getCurrentMockUser } from './auth.js';
import { mockStockItems, setRecipeCountGetter } from './catalog.js';

import { calculateChannelPrice } from '../../../../domain/pricing.js';
import {
	resolveRecipe,
	validateRecipeOverlap,
	applyModifierEffects,
	sortRecipesByActiveStatus
} from '../../../../domain/recipe.js';
import { calculateVariantHpp } from '../../../../domain/hpp.js';
import {
	validateModifierGroup,
	isMenuItemVisibleForOutlet
} from '../../../../domain/menu.js';

import type {
	MenuCategory,
	MenuItem,
	MenuVariant,
	ModifierGroup,
	ModifierOption,
	NotePreset,
	Recipe,
	RecipeIngredient,
	ProductionRecipe,
	SalesChannel,
	ChannelMarkup,
	BasePrice,
	PriceOverride,
	MenuAvailability,
	PricingPreviewResponse,
	HppPreviewResponse
} from '../../../contract/types.js';

// ============================================================================
// 1. In-Memory State: Kategori Menu Siap Jual (5 Kategori)
// ============================================================================
export let mockMenuCategories: MenuCategory[] = [
	{
		id: 'cat-m-coffee',
		code: 'MNU-CAT-COF',
		name: 'Kopi & Espresso',
		sort_order: 1,
		is_active: true,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z'
	},
	{
		id: 'cat-m-noncoffee',
		code: 'MNU-CAT-NON',
		name: 'Non-Kopi & Chocolate',
		sort_order: 2,
		is_active: true,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z'
	},
	{
		id: 'cat-m-tea',
		code: 'MNU-CAT-TEA',
		name: 'Artisan Tea & Refresher',
		sort_order: 3,
		is_active: true,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z'
	},
	{
		id: 'cat-m-pastry',
		code: 'MNU-CAT-PST',
		name: 'Pastry & Bakery',
		sort_order: 4,
		is_active: true,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z'
	},
	{
		id: 'cat-m-food',
		code: 'MNU-CAT-FOD',
		name: 'Makanan Ringan & Toast',
		sort_order: 5,
		is_active: true,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z'
	}
];

// ============================================================================
// 2. In-Memory State: 6 Grup Modifier (Ukuran, Gula, Es, Add-on, Susu, Topping)
// ============================================================================
export let mockModifierGroups: ModifierGroup[] = [
	{
		id: 'grp-size',
		name: 'Ukuran Cup (Size)',
		code: 'GRP-SIZE',
		description: 'Pilihan ukuran gelas saji minuman',
		min_select: 1,
		max_select: 1,
		is_required: true,
		version: 1,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		options: [
			{
				id: 'opt-sz-reg',
				group_id: 'grp-size',
				name: 'Regular (12oz / 360ml)',
				code: 'SIZE-REG',
				price_delta: '0.00',
				is_default: true,
				sort_order: 1,
				recipe_effects: []
			},
			{
				id: 'opt-sz-lrg',
				group_id: 'grp-size',
				name: 'Large (16oz / 480ml)',
				code: 'SIZE-LRG',
				price_delta: '5000.00',
				is_default: false,
				sort_order: 2,
				recipe_effects: [
					{
						type: 'multiply',
						target_stock_item_id: 'item-kop-01',
						target_stock_item_name: 'Espresso Blend House',
						multiplier: '1.2500'
					},
					{
						type: 'multiply',
						target_stock_item_id: 'item-sus-01',
						target_stock_item_name: 'Susu Fresh Milk Greenfields',
						multiplier: '1.2500'
					}
				]
			}
		]
	},
	{
		id: 'grp-sugar',
		name: 'Tingkat Kemanisan (Sugar Level)',
		code: 'GRP-SUGAR',
		description: 'Penyesuaian takaran pemanis / gula aren',
		min_select: 1,
		max_select: 1,
		is_required: true,
		version: 1,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		options: [
			{
				id: 'opt-sug-100',
				group_id: 'grp-sugar',
				name: 'Normal Sweet (100%)',
				code: 'SUG-100',
				price_delta: '0.00',
				is_default: true,
				sort_order: 1,
				recipe_effects: []
			},
			{
				id: 'opt-sug-50',
				group_id: 'grp-sugar',
				name: 'Less Sugar (50%)',
				code: 'SUG-50',
				price_delta: '0.00',
				is_default: false,
				sort_order: 2,
				recipe_effects: [
					{
						type: 'multiply',
						target_stock_item_id: 'item-srp-04',
						target_stock_item_name: 'Gula Aren Cair Organik',
						multiplier: '0.5000'
					}
				]
			},
			{
				id: 'opt-sug-0',
				group_id: 'grp-sugar',
				name: 'No Sugar (0%)',
				code: 'SUG-0',
				price_delta: '0.00',
				is_default: false,
				sort_order: 3,
				recipe_effects: [
					{
						type: 'multiply',
						target_stock_item_id: 'item-srp-04',
						target_stock_item_name: 'Gula Aren Cair Organik',
						multiplier: '0.0000'
					}
				]
			}
		]
	},
	{
		id: 'grp-ice',
		name: 'Tingkat Es (Ice Level)',
		code: 'GRP-ICE',
		description: 'Kepadatan es kristal dalam gelas saji',
		min_select: 1,
		max_select: 1,
		is_required: true,
		version: 1,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		options: [
			{
				id: 'opt-ice-norm',
				group_id: 'grp-ice',
				name: 'Normal Ice (100g)',
				code: 'ICE-NORM',
				price_delta: '0.00',
				is_default: true,
				sort_order: 1,
				recipe_effects: []
			},
			{
				id: 'opt-ice-less',
				group_id: 'grp-ice',
				name: 'Less Ice (50g)',
				code: 'ICE-LESS',
				price_delta: '0.00',
				is_default: false,
				sort_order: 2,
				recipe_effects: [
					{
						type: 'multiply',
						target_stock_item_id: 'item-air-01',
						target_stock_item_name: 'Es Batu Tube Kristal Higienis',
						multiplier: '0.5000'
					}
				]
			},
			{
				id: 'opt-ice-none',
				group_id: 'grp-ice',
				name: 'No Ice',
				code: 'ICE-NONE',
				price_delta: '0.00',
				is_default: false,
				sort_order: 3,
				recipe_effects: [
					{
						type: 'multiply',
						target_stock_item_id: 'item-air-01',
						target_stock_item_name: 'Es Batu Tube Kristal Higienis',
						multiplier: '0.0000'
					}
				]
			}
		]
	},
	{
		id: 'grp-milk',
		name: 'Pilihan Jenis Susu (Milk Base)',
		code: 'GRP-MILK',
		description: 'Pengganti susu sapi dengan alternatif plant-based',
		min_select: 0,
		max_select: 1,
		is_required: false,
		version: 1,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		options: [
			{
				id: 'opt-mlk-fresh',
				group_id: 'grp-milk',
				name: 'Fresh Milk Greenfields (Standard)',
				code: 'MLK-FRESH',
				price_delta: '0.00',
				is_default: true,
				sort_order: 1,
				recipe_effects: []
			},
			{
				id: 'opt-mlk-oat',
				group_id: 'grp-milk',
				name: 'Oat Milk Oatly Barista',
				code: 'MLK-OAT',
				price_delta: '6000.00',
				is_default: false,
				sort_order: 2,
				linked_stock_item_id: 'item-sus-02',
				linked_stock_item_name: 'Susu Oat Milk Oatly Barista Edition',
				stock_quantity: '150.0000',
				stock_unit: 'ml',
				recipe_effects: [
					{
						type: 'replace',
						target_stock_item_id: 'item-sus-01',
						target_stock_item_name: 'Susu Fresh Milk Greenfields Barista',
						replacement_stock_item_id: 'item-sus-02',
						replacement_stock_item_name: 'Susu Oat Milk Oatly Barista Edition',
						ratio: '1.0000'
					}
				]
			},
			{
				id: 'opt-mlk-almond',
				group_id: 'grp-milk',
				name: 'Almond Milk Breeze Blend',
				code: 'MLK-ALM',
				price_delta: '7000.00',
				is_default: false,
				sort_order: 3,
				linked_stock_item_id: 'item-sus-03',
				linked_stock_item_name: 'Susu Almond Breeze Barista Blend',
				stock_quantity: '150.0000',
				stock_unit: 'ml',
				recipe_effects: [
					{
						type: 'replace',
						target_stock_item_id: 'item-sus-01',
						target_stock_item_name: 'Susu Fresh Milk Greenfields Barista',
						replacement_stock_item_id: 'item-sus-03',
						replacement_stock_item_name: 'Susu Almond Breeze Barista Blend',
						ratio: '1.0000'
					}
				]
			}
		]
	},
	{
		id: 'grp-extra',
		name: 'Tambahan Espresso (Add-ons)',
		code: 'GRP-EXTRA',
		description: 'Ekstra espresso shot dan pemanis gourmet',
		min_select: 0,
		max_select: 3,
		is_required: false,
		version: 1,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		options: [
			{
				id: 'opt-extra-shot',
				group_id: 'grp-extra',
				name: 'Extra Shot Espresso',
				code: 'EXT-SHOT',
				price_delta: '3000.00',
				is_default: false,
				sort_order: 1,
				linked_stock_item_id: 'item-kop-01',
				linked_stock_item_name: 'Espresso Blend House Arabica-Robusta',
				stock_quantity: '18.0000',
				stock_unit: 'g',
				recipe_effects: [
					{
						type: 'add',
						target_stock_item_id: 'item-kop-01',
						target_stock_item_name: 'Espresso Blend House Arabica-Robusta',
						added_quantity: '18.0000',
						serving_unit: 'g'
					}
				]
			},
			{
				id: 'opt-extra-vanilla',
				group_id: 'grp-extra',
				name: 'Extra Sirup Vanilla Monin (+10ml)',
				code: 'EXT-VAN',
				price_delta: '4000.00',
				is_default: false,
				sort_order: 2,
				linked_stock_item_id: 'item-srp-01',
				linked_stock_item_name: 'Sirup Vanilla Monin 700ml',
				stock_quantity: '10.0000',
				stock_unit: 'ml',
				recipe_effects: [
					{
						type: 'add',
						target_stock_item_id: 'item-srp-01',
						target_stock_item_name: 'Sirup Vanilla Monin 700ml',
						added_quantity: '10.0000',
						serving_unit: 'ml'
					}
				]
			}
		]
	},
	{
		id: 'grp-topping',
		name: 'Topping Tambahan',
		code: 'GRP-TOPPING',
		description: 'Jelly dan boba kenyal khas Hanjo',
		min_select: 0,
		max_select: 2,
		is_required: false,
		version: 1,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		options: [
			{
				id: 'opt-top-boba',
				group_id: 'grp-topping',
				name: 'Boba Aren Brown Sugar',
				code: 'TOP-BOBA',
				price_delta: '4000.00',
				is_default: false,
				sort_order: 1,
				linked_stock_item_id: 'item-boba-01',
				linked_stock_item_name: 'Topping Boba Brown Sugar',
				stock_quantity: '40.0000',
				stock_unit: 'g',
				recipe_effects: []
			},
			{
				id: 'opt-top-jelly',
				group_id: 'grp-topping',
				name: 'Coffee Jelly Cube',
				code: 'TOP-JELLY',
				price_delta: '4000.00',
				is_default: false,
				sort_order: 2,
				linked_stock_item_id: 'item-jelly-01',
				linked_stock_item_name: 'Coffee Jelly Cube',
				stock_quantity: '40.0000',
				stock_unit: 'g',
				recipe_effects: []
			}
		]
	}
];

// ============================================================================
// 2.1 In-Memory State: Preset Catatan Dapur / Barista (Lapis 3: Rp 0, Tanpa Biaya)
// ============================================================================
export let mockNotePresets: NotePreset[] = [
	{ id: 'np-1', category: 'beverage', name: 'Less Sugar (50%)', code: 'NOTE-LESS-SUG', sort_order: 1, is_active: true },
	{ id: 'np-2', category: 'beverage', name: 'Normal Sugar (100%)', code: 'NOTE-NORM-SUG', sort_order: 2, is_active: true },
	{ id: 'np-3', category: 'beverage', name: 'No Sugar (0%)', code: 'NOTE-NO-SUG', sort_order: 3, is_active: true },
	{ id: 'np-4', category: 'beverage', name: 'Less Ice', code: 'NOTE-LESS-ICE', sort_order: 4, is_active: true },
	{ id: 'np-5', category: 'beverage', name: 'No Ice', code: 'NOTE-NO-ICE', sort_order: 5, is_active: true },
	{ id: 'np-6', category: 'beverage', name: 'Extra Hot', code: 'NOTE-EXTRA-HOT', sort_order: 6, is_active: true },
	{ id: 'np-7', category: 'general', name: 'Tanpa Sedotan', code: 'NOTE-NO-STRAW', sort_order: 7, is_active: true },
	{ id: 'np-8', category: 'food', name: 'Pedas', code: 'NOTE-PEDAS', sort_order: 8, is_active: true },
	{ id: 'np-9', category: 'food', name: 'Sedang', code: 'NOTE-SEDANG', sort_order: 9, is_active: true },
	{ id: 'np-10', category: 'food', name: 'Tidak Pedas', code: 'NOTE-TDK-PEDAS', sort_order: 10, is_active: true },
	{ id: 'np-11', category: 'food', name: 'Pisah Sambal', code: 'NOTE-PISAH-SAMBAL', sort_order: 11, is_active: true },
	{ id: 'np-12', category: 'food', name: 'Tanpa Bawang Goreng', code: 'NOTE-NO-ONION', sort_order: 12, is_active: true }
];

// ============================================================================
// 3. In-Memory State: 18 Menu Items & 30 Varian (Termasuk Aren Latte, Americano, dll.)
// ============================================================================
export let mockMenuItems: MenuItem[] = [
	{
		id: 'mnu-aren-latte',
		name: 'Hanjo Aren Latte Signature',
		code: 'MNU-LAT-AREN',
		category_id: 'cat-m-coffee',
		category_name: 'Kopi & Espresso',
		description: 'Kopi susu gula aren signature racikan house espresso blend dan nira aren murni',
		image_url: '/images/menu/aren-latte.webp',
		status: 'active',
		scope_type: 'all_outlets',
		variants: [
			{
				id: 'var-aren-iced',
				menu_item_id: 'mnu-aren-latte',
				name: 'Iced',
				code: 'VAR-AREN-ICED',
				sku: 'VAR-AREN-ICED',
				is_active: true,
				base_price: '28000.00',
				sort_order: 1,
				created_at: '2026-01-01T00:00:00.000Z',
				updated_at: '2026-01-01T00:00:00.000Z'
			},
			{
				id: 'var-aren-hot',
				menu_item_id: 'mnu-aren-latte',
				name: 'Hot',
				code: 'VAR-AREN-HOT',
				sku: 'VAR-AREN-HOT',
				is_active: true,
				base_price: '26000.00',
				sort_order: 2,
				created_at: '2026-01-01T00:00:00.000Z',
				updated_at: '2026-01-01T00:00:00.000Z'
			}
		],
		modifier_group_ids: ['grp-size', 'grp-sugar', 'grp-ice', 'grp-milk', 'grp-extra', 'grp-topping'],
		version: 1,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z'
	},
	{
		id: 'mnu-americano',
		name: 'Caffe Americano Classic',
		code: 'MNU-COF-AME',
		category_id: 'cat-m-coffee',
		category_name: 'Kopi & Espresso',
		description: 'Double shot espresso murni dipadukan dengan air mineral suhu seimbang',
		image_url: '/images/menu/americano.webp',
		status: 'active',
		scope_type: 'all_outlets',
		variants: [
			{
				id: 'var-ame-iced',
				menu_item_id: 'mnu-americano',
				name: 'Iced',
				code: 'VAR-AME-ICED',
				sku: 'VAR-AME-ICED',
				is_active: true,
				base_price: '22000.00',
				sort_order: 1,
				created_at: '2026-01-01T00:00:00.000Z',
				updated_at: '2026-01-01T00:00:00.000Z'
			},
			{
				id: 'var-ame-hot',
				menu_item_id: 'mnu-americano',
				name: 'Hot',
				code: 'VAR-AME-HOT',
				sku: 'VAR-AME-HOT',
				is_active: true,
				base_price: '20000.00',
				sort_order: 2,
				created_at: '2026-01-01T00:00:00.000Z',
				updated_at: '2026-01-01T00:00:00.000Z'
			}
		],
		modifier_group_ids: ['grp-size', 'grp-ice', 'grp-extra'],
		version: 1,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z'
	},
	{
		id: 'mnu-matcha-latte',
		name: 'Kyoto Matcha Latte Premium',
		code: 'MNU-TEA-MATCHA',
		category_id: 'cat-m-tea',
		category_name: 'Artisan Tea & Refresher',
		description: 'Matcha Uji ceremonial grade berpadu dengan susu segar lembut dan manis pas',
		image_url: '/images/menu/matcha.webp',
		status: 'active',
		scope_type: 'all_outlets',
		variants: [
			{
				id: 'var-matcha-iced',
				menu_item_id: 'mnu-matcha-latte',
				name: 'Iced',
				code: 'VAR-MATCHA-ICED',
				sku: 'VAR-MATCHA-ICED',
				is_active: true,
				base_price: '32000.00',
				sort_order: 1,
				created_at: '2026-01-01T00:00:00.000Z',
				updated_at: '2026-01-01T00:00:00.000Z'
			},
			{
				id: 'var-matcha-hot',
				menu_item_id: 'mnu-matcha-latte',
				name: 'Hot',
				code: 'VAR-MATCHA-HOT',
				sku: 'VAR-MATCHA-HOT',
				is_active: true,
				base_price: '30000.00',
				sort_order: 2,
				created_at: '2026-01-01T00:00:00.000Z',
				updated_at: '2026-01-01T00:00:00.000Z'
			}
		],
		modifier_group_ids: ['grp-size', 'grp-sugar', 'grp-ice', 'grp-milk', 'grp-topping'],
		version: 1,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z'
	},
	{
		id: 'mnu-spanish-latte',
		name: 'Spanish Latte Con Leche',
		code: 'MNU-LAT-SPANISH',
		category_id: 'cat-m-coffee',
		category_name: 'Kopi & Espresso',
		description: 'Kopi susu ala Spanyol dengan kombinasi susu segar dan sentuhan kental manis gurih',
		image_url: '/images/menu/spanish-latte.webp',
		status: 'active',
		scope_type: 'all_outlets',
		variants: [
			{
				id: 'var-spanish-iced',
				menu_item_id: 'mnu-spanish-latte',
				name: 'Iced',
				code: 'VAR-SPANISH-ICED',
				sku: 'VAR-SPANISH-ICED',
				is_active: true,
				base_price: '30000.00',
				sort_order: 1,
				created_at: '2026-01-01T00:00:00.000Z',
				updated_at: '2026-01-01T00:00:00.000Z'
			},
			{
				id: 'var-spanish-hot',
				menu_item_id: 'mnu-spanish-latte',
				name: 'Hot',
				code: 'VAR-SPANISH-HOT',
				sku: 'VAR-SPANISH-HOT',
				is_active: true,
				base_price: '28000.00',
				sort_order: 2,
				created_at: '2026-01-01T00:00:00.000Z',
				updated_at: '2026-01-01T00:00:00.000Z'
			}
		],
		modifier_group_ids: ['grp-size', 'grp-ice', 'grp-milk', 'grp-extra'],
		version: 1,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z'
	},
	{
		id: 'mnu-chocolate',
		name: 'Belgian Dark Chocolate',
		code: 'MNU-NON-CHOC',
		category_id: 'cat-m-noncoffee',
		category_name: 'Non-Kopi & Chocolate',
		description: 'Cokelat hitam Belgia 70% dengan tekstur creamy pekat dan tidak terlalu manis',
		image_url: '/images/menu/chocolate.webp',
		status: 'active',
		scope_type: 'all_outlets',
		variants: [
			{
				id: 'var-choc-iced',
				menu_item_id: 'mnu-chocolate',
				name: 'Iced',
				code: 'VAR-CHOC-ICED',
				sku: 'VAR-CHOC-ICED',
				is_active: true,
				base_price: '28000.00',
				sort_order: 1,
				created_at: '2026-01-01T00:00:00.000Z',
				updated_at: '2026-01-01T00:00:00.000Z'
			},
			{
				id: 'var-choc-hot',
				menu_item_id: 'mnu-chocolate',
				name: 'Hot',
				code: 'VAR-CHOC-HOT',
				sku: 'VAR-CHOC-HOT',
				is_active: true,
				base_price: '26000.00',
				sort_order: 2,
				created_at: '2026-01-01T00:00:00.000Z',
				updated_at: '2026-01-01T00:00:00.000Z'
			}
		],
		modifier_group_ids: ['grp-size', 'grp-sugar', 'grp-ice', 'grp-milk', 'grp-topping'],
		version: 1,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z'
	},
	{
		id: 'mnu-croissant',
		name: 'Butter Croissant Artisan',
		code: 'MNU-PST-CROISSANT',
		category_id: 'cat-m-pastry',
		category_name: 'Pastry & Bakery',
		description: 'Pastry renyah berlapis dengan aroma mentega murni Prancis',
		image_url: '/images/menu/croissant.webp',
		status: 'active',
		scope_type: 'all_outlets',
		variants: [
			{
				id: 'var-croissant-std',
				menu_item_id: 'mnu-croissant',
				name: 'Standard',
				code: 'VAR-CROI-STD',
				sku: 'VAR-CROI-STD',
				is_active: true,
				base_price: '25000.00',
				sort_order: 1,
				created_at: '2026-01-01T00:00:00.000Z',
				updated_at: '2026-01-01T00:00:00.000Z'
			}
		],
		modifier_group_ids: [],
		version: 1,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z'
	},
	{
		id: 'mnu-caramel-macchiato',
		name: 'Caramel Macchiato',
		code: 'MNU-LAT-CARAMEL',
		category_id: 'cat-m-coffee',
		category_name: 'Kopi & Espresso',
		description: 'Espresso di atas susu vanilla dengan drizzle saus karamel lezat',
		status: 'active',
		scope_type: 'all_outlets',
		variants: [
			{ id: 'var-caramel-iced', menu_item_id: 'mnu-caramel-macchiato', name: 'Iced', code: 'VAR-CAR-ICED', sku: 'VAR-CAR-ICED', is_active: true, base_price: '32000.00', sort_order: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
			{ id: 'var-caramel-hot', menu_item_id: 'mnu-caramel-macchiato', name: 'Hot', code: 'VAR-CAR-HOT', sku: 'VAR-CAR-HOT', is_active: true, base_price: '30000.00', sort_order: 2, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
		],
		modifier_group_ids: ['grp-size', 'grp-ice', 'grp-milk', 'grp-extra'],
		version: 1,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z'
	},
	{
		id: 'mnu-vanilla-latte',
		name: 'Madagascar Vanilla Latte',
		code: 'MNU-LAT-VANILLA',
		category_id: 'cat-m-coffee',
		category_name: 'Kopi & Espresso',
		description: 'Kopi susu dengan sirup vanilla Madagaskar yang wangi dan lembut',
		status: 'active',
		scope_type: 'all_outlets',
		variants: [
			{ id: 'var-van-iced', menu_item_id: 'mnu-vanilla-latte', name: 'Iced', code: 'VAR-VAN-ICED', sku: 'VAR-VAN-ICED', is_active: true, base_price: '30000.00', sort_order: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
			{ id: 'var-van-hot', menu_item_id: 'mnu-vanilla-latte', name: 'Hot', code: 'VAR-VAN-HOT', sku: 'VAR-VAN-HOT', is_active: true, base_price: '28000.00', sort_order: 2, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
		],
		modifier_group_ids: ['grp-size', 'grp-ice', 'grp-milk', 'grp-extra'],
		version: 1,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z'
	},
	{
		id: 'mnu-cold-brew',
		name: 'Signature Cold Brew 24h',
		code: 'MNU-COF-CLDBRW',
		category_id: 'cat-m-coffee',
		category_name: 'Kopi & Espresso',
		description: 'Kopi seduh dingin selama 24 jam dengan citarasa buah dan keasaman sangat rendah',
		status: 'active',
		scope_type: 'all_outlets',
		variants: [
			{ id: 'var-cldbrw-reg', menu_item_id: 'mnu-cold-brew', name: 'Regular 250ml', code: 'VAR-CLD-REG', sku: 'VAR-CLD-REG', is_active: true, base_price: '28000.00', sort_order: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
		],
		modifier_group_ids: ['grp-ice'],
		version: 1,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z'
	},
	{
		id: 'mnu-pandan-latte',
		name: 'Kopi Pandan Suji Asli',
		code: 'MNU-LAT-PANDAN',
		category_id: 'cat-m-coffee',
		category_name: 'Kopi & Espresso',
		description: 'Kopi susu aromatik berpadu dengan perasan daun suji dan pandan segar',
		status: 'active',
		scope_type: 'all_outlets',
		variants: [
			{ id: 'var-pan-iced', menu_item_id: 'mnu-pandan-latte', name: 'Iced', code: 'VAR-PAN-ICED', sku: 'VAR-PAN-ICED', is_active: true, base_price: '29000.00', sort_order: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
			{ id: 'var-pan-hot', menu_item_id: 'mnu-pandan-latte', name: 'Hot', code: 'VAR-PAN-HOT', sku: 'VAR-PAN-HOT', is_active: true, base_price: '27000.00', sort_order: 2, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
		],
		modifier_group_ids: ['grp-size', 'grp-sugar', 'grp-ice', 'grp-milk'],
		version: 1,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z'
	},
	{
		id: 'mnu-lychee-tea',
		name: 'Lychee Tea Refresher',
		code: 'MNU-TEA-LYCHEE',
		category_id: 'cat-m-tea',
		category_name: 'Artisan Tea & Refresher',
		description: 'Teh hitam seduh dingin dengan sirup buah leci dan 2 butir buah leci utuh',
		status: 'active',
		scope_type: 'all_outlets',
		variants: [
			{ id: 'var-lychee-reg', menu_item_id: 'mnu-lychee-tea', name: 'Iced Regular', code: 'VAR-LYC-REG', sku: 'VAR-LYC-REG', is_active: true, base_price: '24000.00', sort_order: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
		],
		modifier_group_ids: ['grp-size', 'grp-sugar', 'grp-ice', 'grp-topping'],
		version: 1,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z'
	},
	{
		id: 'mnu-earl-grey-tea',
		name: 'Earl Grey Artisan Milk Tea',
		code: 'MNU-TEA-EGREY',
		category_id: 'cat-m-tea',
		category_name: 'Artisan Tea & Refresher',
		description: 'Teh Earl Grey bergamot dipadukan dengan fresh milk lembut',
		status: 'active',
		scope_type: 'all_outlets',
		variants: [
			{ id: 'var-egrey-iced', menu_item_id: 'mnu-earl-grey-tea', name: 'Iced', code: 'VAR-EGR-ICED', sku: 'VAR-EGR-ICED', is_active: true, base_price: '26000.00', sort_order: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
			{ id: 'var-egrey-hot', menu_item_id: 'mnu-earl-grey-tea', name: 'Hot', code: 'VAR-EGR-HOT', sku: 'VAR-EGR-HOT', is_active: true, base_price: '24000.00', sort_order: 2, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
		],
		modifier_group_ids: ['grp-size', 'grp-sugar', 'grp-ice', 'grp-topping'],
		version: 1,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z'
	},
	{
		id: 'mnu-pain-choc',
		name: 'Pain au Chocolat Belgia',
		code: 'MNU-PST-PAINCHOC',
		category_id: 'cat-m-pastry',
		category_name: 'Pastry & Bakery',
		description: 'Croissant lumer dengan dua batang cokelat dark Belgia di dalamnya',
		status: 'active',
		scope_type: 'all_outlets',
		variants: [
			{ id: 'var-pain-std', menu_item_id: 'mnu-pain-choc', name: 'Standard', code: 'VAR-PAIN-STD', sku: 'VAR-PAIN-STD', is_active: true, base_price: '28000.00', sort_order: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
		],
		modifier_group_ids: [],
		version: 1,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z'
	},
	{
		id: 'mnu-cinnamon-roll',
		name: 'Cinnamon Roll Vanilla Glaze',
		code: 'MNU-PST-CINNAMON',
		category_id: 'cat-m-pastry',
		category_name: 'Pastry & Bakery',
		description: 'Roti gulung kayu manis lembut dengan lelehan icing gula vanilla',
		status: 'active',
		scope_type: 'all_outlets',
		variants: [
			{ id: 'var-cin-std', menu_item_id: 'mnu-cinnamon-roll', name: 'Standard', code: 'VAR-CIN-STD', sku: 'VAR-CIN-STD', is_active: true, base_price: '24000.00', sort_order: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
		],
		modifier_group_ids: [],
		version: 1,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z'
	},
	{
		id: 'mnu-almond-croissant',
		name: 'Almond Frangipane Croissant',
		code: 'MNU-PST-ALMOND',
		category_id: 'cat-m-pastry',
		category_name: 'Pastry & Bakery',
		description: 'Croissant panggang ganda dengan isian krim almond frangipane dan taburan almond slice',
		status: 'active',
		scope_type: 'all_outlets',
		variants: [
			{ id: 'var-almcroi-std', menu_item_id: 'mnu-almond-croissant', name: 'Standard', code: 'VAR-ALMCROI-STD', sku: 'VAR-ALMCROI-STD', is_active: true, base_price: '32000.00', sort_order: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
		],
		modifier_group_ids: [],
		version: 1,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z'
	},

	// --- 2 Menu Khusus Outlet B (Jodi Dago out-bdg-01) (AC-04.7) ---
	{
		id: 'mnu-dago-peach',
		name: 'Dago Peach Cold Brew Splash',
		code: 'MNU-DAGO-PEACH',
		category_id: 'cat-m-coffee',
		category_name: 'Kopi & Espresso',
		description: 'Menu kreasi khusus Jodi Dago: Cold brew segar dipadukan dengan sari buah persik manis',
		status: 'active',
		scope_type: 'outlet_set',
		target_outlet_ids: ['out-bdg-01'], // Terkunci khusus Jodi Dago
		is_time_limited: false,
		variants: [
			{ id: 'var-dago-pch-std', menu_item_id: 'mnu-dago-peach', name: 'Regular', code: 'VAR-DPCH-STD', sku: 'VAR-DPCH-STD', is_active: true, base_price: '34000.00', sort_order: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
		],
		modifier_group_ids: ['grp-ice'],
		version: 1,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z'
	},
	{
		id: 'mnu-dago-strawberry',
		name: 'Dago Strawberry Cream Croissant',
		code: 'MNU-DAGO-STRAW',
		category_id: 'cat-m-pastry',
		category_name: 'Pastry & Bakery',
		description: 'Croissant renyah dengan isian selai stroberi segar Ciwidey Bandung dan mascarpone cream',
		status: 'active',
		scope_type: 'outlet_set',
		target_outlet_ids: ['out-bdg-01'], // Terkunci khusus Jodi Dago
		is_time_limited: false,
		variants: [
			{ id: 'var-dstraw-std', menu_item_id: 'mnu-dago-strawberry', name: 'Standard', code: 'VAR-DSTR-STD', sku: 'VAR-DSTR-STD', is_active: true, base_price: '35000.00', sort_order: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
		],
		modifier_group_ids: [],
		version: 1,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z'
	},

	// --- 1 Menu Musiman Terbatas Waktu (Time-Limited Seasonal) ---
	{
		id: 'mnu-summer-bliss',
		name: 'Summer Bliss Yuzu Cold Brew',
		code: 'MNU-SEA-YUZU',
		category_id: 'cat-m-coffee',
		category_name: 'Kopi & Espresso',
		description: 'Kopi dingin segar dengan sirup yuzu citrus Jepang khusus musim panas',
		status: 'active',
		scope_type: 'all_outlets',
		is_time_limited: true,
		available_from: '2026-06-01',
		available_until: '2026-12-31',
		variants: [
			{ id: 'var-yuzu-std', menu_item_id: 'mnu-summer-bliss', name: 'Regular', code: 'VAR-YUZU-STD', sku: 'VAR-YUZU-STD', is_active: true, base_price: '33000.00', sort_order: 1, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' }
		],
		modifier_group_ids: ['grp-ice'],
		version: 1,
		created_at: '2026-06-01T00:00:00Z',
		updated_at: '2026-06-01T00:00:00Z'
	}
];

// ============================================================================
// 4. In-Memory State: Resep Berversi & Override Outlet (§6.2, §6.4)
// ============================================================================
export let mockRecipes: Recipe[] = [
	// --- Hanjo Aren Latte Iced: Versi 1 (Historis s/d 2026-06-01) ---
	{
		id: 'rcp-aren-iced-v1',
		variant_id: 'var-aren-iced',
		variant_name: 'Hanjo Aren Latte - Iced',
		menu_item_id: 'mnu-aren-latte',
		menu_item_name: 'Hanjo Aren Latte Signature',
		version_number: 1,
		effective_from: '2026-01-01T00:00:00.000Z',
		effective_until: '2026-06-01T00:00:00.000Z',
		is_active: true,
		scope_type: 'standard',
		version: 1,
		created_by: 'Gunawan (HQ Master Roaster)',
		created_at: '2026-01-01T00:00:00.000Z',
		notes: 'Formula original pembukaan awal tahun: 16g espresso blend dan 160ml susu',
		ingredients: [
			{ id: 'ing-ar1-1', stock_item_id: 'item-kop-01', stock_item_name: 'Espresso Blend House Arabica-Robusta', stock_item_code: 'KOP-ESP-01', quantity: '16.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-ar1-2', stock_item_id: 'item-sus-01', stock_item_name: 'Susu Fresh Milk Greenfields Barista', stock_item_code: 'SUS-GRN-01', quantity: '160.0000', serving_unit: 'ml', waste_pct: '0.00' },
			{ id: 'ing-ar1-3', stock_item_id: 'item-srp-04', stock_item_name: 'Gula Aren Cair Organik 1 Liter', stock_item_code: 'SRP-GLA-AREN', quantity: '25.0000', serving_unit: 'ml', waste_pct: '0.00' },
			{ id: 'ing-ar1-4', stock_item_id: 'item-air-01', stock_item_name: 'Es Batu Tube Kristal Higienis 10kg', stock_item_code: 'AIR-ES-TUBE', quantity: '100.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-ar1-5', stock_item_id: 'item-kms-03', stock_item_name: 'Cup Plastik Cold 16oz Sablon Jodi', stock_item_code: 'KMS-CUP-COLD16', quantity: '1.0000', serving_unit: 'pcs', waste_pct: '0.00' }
		]
	},

	// --- Hanjo Aren Latte Iced: Versi 2 (Aktif Sekarang, Uji Vektor §6.4: HPP 9.140) ---
	{
		id: 'rcp-aren-iced-v2',
		variant_id: 'var-aren-iced',
		variant_name: 'Hanjo Aren Latte - Iced',
		menu_item_id: 'mnu-aren-latte',
		menu_item_name: 'Hanjo Aren Latte Signature',
		version_number: 2,
		effective_from: '2026-06-01T00:00:00.000Z',
		effective_until: undefined, // aktif seterusnya
		is_active: true,
		scope_type: 'standard',
		version: 1,
		created_by: 'Gunawan (HQ Master Roaster)',
		created_at: '2026-06-01T00:00:00.000Z',
		notes: 'Penyempurnaan rasa: 18g espresso blend lebih bold, 150ml susu, 20ml aren murni (Vektor §6.4: HPP 9.140)',
		ingredients: [
			{ id: 'ing-ar2-1', stock_item_id: 'item-kop-01', stock_item_name: 'Espresso Blend House Arabica-Robusta', stock_item_code: 'KOP-ESP-01', quantity: '18.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-ar2-2', stock_item_id: 'item-sus-01', stock_item_name: 'Susu Fresh Milk Greenfields Barista', stock_item_code: 'SUS-GRN-01', quantity: '150.0000', serving_unit: 'ml', waste_pct: '0.00' },
			{ id: 'ing-ar2-3', stock_item_id: 'item-srp-04', stock_item_name: 'Gula Aren Cair Organik 1 Liter', stock_item_code: 'SRP-GLA-AREN', quantity: '20.0000', serving_unit: 'ml', waste_pct: '0.00' },
			{ id: 'ing-ar2-4', stock_item_id: 'item-air-01', stock_item_name: 'Es Batu Tube Kristal Higienis 10kg', stock_item_code: 'AIR-ES-TUBE', quantity: '100.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-ar2-5', stock_item_id: 'item-kms-03', stock_item_name: 'Cup Plastik Cold 16oz Sablon Jodi', stock_item_code: 'KMS-CUP-COLD16', quantity: '1.0000', serving_unit: 'pcs', waste_pct: '0.00' }
		]
	},

	// --- Hanjo Aren Latte Iced: Override Resep Khusus Jodi Gubeng (out-sub-01) (AC-04.6) ---
	{
		id: 'rcp-aren-iced-gubeng',
		variant_id: 'var-aren-iced',
		variant_name: 'Hanjo Aren Latte - Iced (Gubeng Special Blend)',
		menu_item_id: 'mnu-aren-latte',
		menu_item_name: 'Hanjo Aren Latte Signature',
		version_number: 1,
		effective_from: '2026-03-01T00:00:00.000Z',
		effective_until: undefined,
		is_active: true,
		scope_type: 'outlet_override',
		outlet_id: 'out-sub-01', // Jodi Gubeng Surabaya
		outlet_name: 'Jodi Gubeng (Surabaya)',
		version: 1,
		created_by: 'Sari (Brand Manager Jatim)',
		created_at: '2026-03-01T00:00:00.000Z',
		notes: 'Karakter lokal Surabaya: takaran gula aren 25ml lebih legit manis sesuai selera pasar Jatim',
		ingredients: [
			{ id: 'ing-arg-1', stock_item_id: 'item-kop-01', stock_item_name: 'Espresso Blend House Arabica-Robusta', stock_item_code: 'KOP-ESP-01', quantity: '18.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-arg-2', stock_item_id: 'item-sus-01', stock_item_name: 'Susu Fresh Milk Greenfields Barista', stock_item_code: 'SUS-GRN-01', quantity: '145.0000', serving_unit: 'ml', waste_pct: '0.00' },
			{ id: 'ing-arg-3', stock_item_id: 'item-srp-04', stock_item_name: 'Gula Aren Cair Organik 1 Liter', stock_item_code: 'SRP-GLA-AREN', quantity: '25.0000', serving_unit: 'ml', waste_pct: '0.00' },
			{ id: 'ing-arg-4', stock_item_id: 'item-air-01', stock_item_name: 'Es Batu Tube Kristal Higienis 10kg', stock_item_code: 'AIR-ES-TUBE', quantity: '100.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-arg-5', stock_item_id: 'item-kms-03', stock_item_name: 'Cup Plastik Cold 16oz Sablon Jodi', stock_item_code: 'KMS-CUP-COLD16', quantity: '1.0000', serving_unit: 'pcs', waste_pct: '0.00' }
		]
	},

	// --- Hanjo Aren Latte Hot: Versi 1 (Aktif Standar) ---
	{
		id: 'rcp-aren-hot-v1',
		variant_id: 'var-aren-hot',
		variant_name: 'Hanjo Aren Latte - Hot',
		menu_item_id: 'mnu-aren-latte',
		menu_item_name: 'Hanjo Aren Latte Signature',
		version_number: 1,
		effective_from: '2026-01-01T00:00:00.000Z',
		effective_until: undefined,
		is_active: true,
		scope_type: 'standard',
		version: 1,
		created_by: 'Gunawan (HQ Master Roaster)',
		created_at: '2026-01-01T00:00:00.000Z',
		notes: 'Formula sajian panas: 18g espresso blend, 180ml steamed fresh milk, 20ml aren murni (paper cup hot 8oz)',
		ingredients: [
			{ id: 'ing-arh1-1', stock_item_id: 'item-kop-01', stock_item_name: 'Espresso Blend House Arabica-Robusta', stock_item_code: 'KOP-ESP-01', quantity: '18.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-arh1-2', stock_item_id: 'item-sus-01', stock_item_name: 'Susu Fresh Milk Greenfields Barista', stock_item_code: 'SUS-GRN-01', quantity: '180.0000', serving_unit: 'ml', waste_pct: '0.00' },
			{ id: 'ing-arh1-3', stock_item_id: 'item-srp-04', stock_item_name: 'Gula Aren Cair Organik 1 Liter', stock_item_code: 'SRP-GLA-AREN', quantity: '20.0000', serving_unit: 'ml', waste_pct: '0.00' },
			{ id: 'ing-arh1-4', stock_item_id: 'item-kms-01', stock_item_name: 'Paper Cup Hot 8oz Logo Jodi', stock_item_code: 'KMS-CUP-HOT8', quantity: '1.0000', serving_unit: 'pcs', waste_pct: '0.00' }
		]
	},

	// --- Americano Iced: Versi 1 & 2 ---
	{
		id: 'rcp-ame-iced-v1',
		variant_id: 'var-ame-iced',
		variant_name: 'Americano - Iced',
		menu_item_id: 'mnu-americano',
		version_number: 1,
		effective_from: '2026-01-01T00:00:00.000Z',
		effective_until: '2026-06-01T00:00:00.000Z',
		is_active: true,
		scope_type: 'standard',
		version: 1,
		created_at: '2026-01-01T00:00:00.000Z',
		ingredients: [
			{ id: 'ing-am1-1', stock_item_id: 'item-kop-01', stock_item_name: 'Espresso Blend House', stock_item_code: 'KOP-ESP-01', quantity: '16.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-am1-2', stock_item_id: 'item-air-02', stock_item_name: 'Air Mineral Galon', stock_item_code: 'AIR-GAL-19L', quantity: '180.0000', serving_unit: 'ml', waste_pct: '0.00' },
			{ id: 'ing-am1-3', stock_item_id: 'item-air-01', stock_item_name: 'Es Batu Tube Kristal', stock_item_code: 'AIR-ES-TUBE', quantity: '100.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-am1-4', stock_item_id: 'item-kms-03', stock_item_name: 'Cup Plastik Cold 16oz', stock_item_code: 'KMS-CUP-COLD16', quantity: '1.0000', serving_unit: 'pcs', waste_pct: '0.00' }
		]
	},
	{
		id: 'rcp-ame-iced-v2',
		variant_id: 'var-ame-iced',
		variant_name: 'Americano - Iced',
		menu_item_id: 'mnu-americano',
		version_number: 2,
		effective_from: '2026-06-01T00:00:00.000Z',
		effective_until: undefined,
		is_active: true,
		scope_type: 'standard',
		version: 1,
		created_at: '2026-06-01T00:00:00.000Z',
		ingredients: [
			{ id: 'ing-am2-1', stock_item_id: 'item-kop-01', stock_item_name: 'Espresso Blend House', stock_item_code: 'KOP-ESP-01', quantity: '18.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-am2-2', stock_item_id: 'item-air-02', stock_item_name: 'Air Mineral Galon', stock_item_code: 'AIR-GAL-19L', quantity: '180.0000', serving_unit: 'ml', waste_pct: '0.00' },
			{ id: 'ing-am2-3', stock_item_id: 'item-air-01', stock_item_name: 'Es Batu Tube Kristal', stock_item_code: 'AIR-ES-TUBE', quantity: '100.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-am2-4', stock_item_id: 'item-kms-03', stock_item_name: 'Cup Plastik Cold 16oz', stock_item_code: 'KMS-CUP-COLD16', quantity: '1.0000', serving_unit: 'pcs', waste_pct: '0.00' }
		]
	},

	// --- Kyoto Matcha Latte Iced: Versi 1 & 2 ---
	{
		id: 'rcp-matcha-iced-v1',
		variant_id: 'var-matcha-iced',
		variant_name: 'Kyoto Matcha Latte - Iced',
		menu_item_id: 'mnu-matcha-latte',
		version_number: 1,
		effective_from: '2026-01-01T00:00:00.000Z',
		effective_until: '2026-07-01T00:00:00.000Z',
		is_active: true,
		scope_type: 'standard',
		version: 1,
		created_at: '2026-01-01T00:00:00.000Z',
		ingredients: [
			{ id: 'ing-m1-1', stock_item_id: 'item-bbk-01', stock_item_name: 'Bubuk Pure Uji Matcha', stock_item_code: 'BBK-MAT-UJI', quantity: '8.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-m1-2', stock_item_id: 'item-sus-01', stock_item_name: 'Susu Fresh Milk Greenfields', stock_item_code: 'SUS-GRN-01', quantity: '150.0000', serving_unit: 'ml', waste_pct: '0.00' },
			{ id: 'ing-m1-3', stock_item_id: 'item-srp-05', stock_item_name: 'Simple Syrup Tebu Alami', stock_item_code: 'SRP-SIM-TEBU', quantity: '20.0000', serving_unit: 'ml', waste_pct: '0.00' },
			{ id: 'ing-m1-4', stock_item_id: 'item-air-01', stock_item_name: 'Es Batu Tube Kristal', stock_item_code: 'AIR-ES-TUBE', quantity: '100.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-m1-5', stock_item_id: 'item-kms-03', stock_item_name: 'Cup Plastik Cold 16oz', stock_item_code: 'KMS-CUP-COLD16', quantity: '1.0000', serving_unit: 'pcs', waste_pct: '0.00' }
		]
	},
	{
		id: 'rcp-matcha-iced-v2',
		variant_id: 'var-matcha-iced',
		variant_name: 'Kyoto Matcha Latte - Iced',
		menu_item_id: 'mnu-matcha-latte',
		version_number: 2,
		effective_from: '2026-07-01T00:00:00.000Z',
		effective_until: undefined,
		is_active: true,
		scope_type: 'standard',
		version: 1,
		created_at: '2026-07-01T00:00:00.000Z',
		notes: 'Rasa matcha lebih pekat: 10g Uji matcha murni',
		ingredients: [
			{ id: 'ing-m2-1', stock_item_id: 'item-bbk-01', stock_item_name: 'Bubuk Pure Uji Matcha', stock_item_code: 'BBK-MAT-UJI', quantity: '10.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-m2-2', stock_item_id: 'item-sus-01', stock_item_name: 'Susu Fresh Milk Greenfields', stock_item_code: 'SUS-GRN-01', quantity: '150.0000', serving_unit: 'ml', waste_pct: '0.00' },
			{ id: 'ing-m2-3', stock_item_id: 'item-srp-05', stock_item_name: 'Simple Syrup Tebu Alami', stock_item_code: 'SRP-SIM-TEBU', quantity: '20.0000', serving_unit: 'ml', waste_pct: '0.00' },
			{ id: 'ing-m2-4', stock_item_id: 'item-air-01', stock_item_name: 'Es Batu Tube Kristal', stock_item_code: 'AIR-ES-TUBE', quantity: '100.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-m2-5', stock_item_id: 'item-kms-03', stock_item_name: 'Cup Plastik Cold 16oz', stock_item_code: 'KMS-CUP-COLD16', quantity: '1.0000', serving_unit: 'pcs', waste_pct: '0.00' }
		]
	},

	// --- Spanish Latte Iced: Versi 1 & 2 ---
	{
		id: 'rcp-spanish-iced-v1',
		variant_id: 'var-spanish-iced',
		variant_name: 'Spanish Latte - Iced',
		menu_item_id: 'mnu-spanish-latte',
		version_number: 1,
		effective_from: '2026-01-01T00:00:00.000Z',
		effective_until: '2026-05-01T00:00:00.000Z',
		is_active: true,
		scope_type: 'standard',
		version: 1,
		created_at: '2026-01-01T00:00:00.000Z',
		ingredients: [
			{ id: 'ing-sp1-1', stock_item_id: 'item-kop-01', stock_item_name: 'Espresso Blend House', stock_item_code: 'KOP-ESP-01', quantity: '18.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-sp1-2', stock_item_id: 'item-sus-01', stock_item_name: 'Susu Fresh Milk Greenfields', stock_item_code: 'SUS-GRN-01', quantity: '120.0000', serving_unit: 'ml', waste_pct: '0.00' },
			{ id: 'ing-sp1-3', stock_item_id: 'item-sus-04', stock_item_name: 'Susu Kental Manis Carnation', stock_item_code: 'SUS-SKM-CARN', quantity: '30.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-sp1-4', stock_item_id: 'item-air-01', stock_item_name: 'Es Batu Tube Kristal', stock_item_code: 'AIR-ES-TUBE', quantity: '100.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-sp1-5', stock_item_id: 'item-kms-03', stock_item_name: 'Cup Plastik Cold 16oz', stock_item_code: 'KMS-CUP-COLD16', quantity: '1.0000', serving_unit: 'pcs', waste_pct: '0.00' }
		]
	},
	{
		id: 'rcp-spanish-iced-v2',
		variant_id: 'var-spanish-iced',
		variant_name: 'Spanish Latte - Iced',
		menu_item_id: 'mnu-spanish-latte',
		version_number: 2,
		effective_from: '2026-05-01T00:00:00.000Z',
		effective_until: undefined,
		is_active: true,
		scope_type: 'standard',
		version: 1,
		created_at: '2026-05-01T00:00:00.000Z',
		notes: 'Peningkatan tekstur: paduan 130ml fresh milk dan 25g kental manis',
		ingredients: [
			{ id: 'ing-sp2-1', stock_item_id: 'item-kop-01', stock_item_name: 'Espresso Blend House', stock_item_code: 'KOP-ESP-01', quantity: '18.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-sp2-2', stock_item_id: 'item-sus-01', stock_item_name: 'Susu Fresh Milk Greenfields', stock_item_code: 'SUS-GRN-01', quantity: '130.0000', serving_unit: 'ml', waste_pct: '0.00' },
			{ id: 'ing-sp2-3', stock_item_id: 'item-sus-04', stock_item_name: 'Susu Kental Manis Carnation', stock_item_code: 'SUS-SKM-CARN', quantity: '25.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-sp2-4', stock_item_id: 'item-air-01', stock_item_name: 'Es Batu Tube Kristal', stock_item_code: 'AIR-ES-TUBE', quantity: '100.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-sp2-5', stock_item_id: 'item-kms-03', stock_item_name: 'Cup Plastik Cold 16oz', stock_item_code: 'KMS-CUP-COLD16', quantity: '1.0000', serving_unit: 'pcs', waste_pct: '0.00' }
		]
	},

	// --- Belgian Dark Chocolate Iced ---
	{
		id: 'rcp-choc-iced-v1',
		variant_id: 'var-choc-iced',
		variant_name: 'Belgian Dark Chocolate - Iced',
		menu_item_id: 'mnu-chocolate',
		version_number: 1,
		effective_from: '2026-01-01T00:00:00.000Z',
		effective_until: undefined,
		is_active: true,
		scope_type: 'standard',
		version: 1,
		created_at: '2026-01-01T00:00:00.000Z',
		ingredients: [
			{ id: 'ing-ch-1', stock_item_id: 'item-bbk-02', stock_item_name: 'Bubuk Dark Chocolate Belgia 70%', stock_item_code: 'BBK-CHO-BEL', quantity: '25.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-ch-2', stock_item_id: 'item-sus-01', stock_item_name: 'Susu Fresh Milk Greenfields', stock_item_code: 'SUS-GRN-01', quantity: '140.0000', serving_unit: 'ml', waste_pct: '0.00' },
			{ id: 'ing-ch-3', stock_item_id: 'item-srp-05', stock_item_name: 'Simple Syrup Tebu Alami', stock_item_code: 'SRP-SIM-TEBU', quantity: '15.0000', serving_unit: 'ml', waste_pct: '0.00' },
			{ id: 'ing-ch-4', stock_item_id: 'item-air-01', stock_item_name: 'Es Batu Tube Kristal', stock_item_code: 'AIR-ES-TUBE', quantity: '100.0000', serving_unit: 'g', waste_pct: '0.00' },
			{ id: 'ing-ch-5', stock_item_id: 'item-kms-03', stock_item_name: 'Cup Plastik Cold 16oz', stock_item_code: 'KMS-CUP-COLD16', quantity: '1.0000', serving_unit: 'pcs', waste_pct: '0.00' }
		]
	},

	// --- Butter Croissant Standard ---
	{
		id: 'rcp-croissant-std-v1',
		variant_id: 'var-croissant-std',
		variant_name: 'Butter Croissant - Standard',
		menu_item_id: 'mnu-croissant',
		version_number: 1,
		effective_from: '2026-01-01T00:00:00.000Z',
		effective_until: undefined,
		is_active: true,
		scope_type: 'standard',
		version: 1,
		created_at: '2026-01-01T00:00:00.000Z',
		ingredients: [
			{ id: 'ing-cr-1', stock_item_id: 'item-bkr-01', stock_item_name: 'Adonan Croissant Dough Frozen', stock_item_code: 'BKR-CROI-FRZ', quantity: '1.0000', serving_unit: 'pcs', waste_pct: '5.00' }
		]
	}
];

// ============================================================================
// 5. In-Memory State: 2 Resep Produksi Bahan Olahan (Flag 'production')
// ============================================================================
export let mockProductionRecipes: ProductionRecipe[] = [
	{
		id: 'prod-cold-brew',
		output_stock_item_id: 'item-cld-10l',
		output_stock_item_name: 'Cold Brew Concentrate Batch 10L',
		output_quantity: '10.0000',
		output_unit: 'liter',
		standard_duration_minutes: 1440, // 24 jam ekstraksi dingin
		instructions: 'Giling kasar biji kopi house blend, seduh dengan air dingin steril, diamkan di chiller 4°C selama 24 jam sebelum disaring ganda.',
		is_active: true,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		ingredients: [
			{ id: 'p-ing-1', stock_item_id: 'item-kop-01', stock_item_name: 'Espresso Blend House Arabica-Robusta', stock_item_code: 'KOP-ESP-01', quantity: '1000.0000', serving_unit: 'g', waste_pct: '2.00' },
			{ id: 'p-ing-2', stock_item_id: 'item-air-02', stock_item_name: 'Air Mineral Galon 19 Liter', stock_item_code: 'AIR-GAL-19L', quantity: '10.5000', serving_unit: 'liter', waste_pct: '5.00' }
		]
	},
	{
		id: 'prod-gula-aren',
		output_stock_item_id: 'item-srp-04',
		output_stock_item_name: 'Gula Aren Cair Organik 1 Liter',
		output_quantity: '5.0000',
		output_unit: 'liter',
		standard_duration_minutes: 60,
		instructions: 'Rebus lelehan balok gula aren organik dengan daun pandan wangi hingga mencapai 65 brix, dinginkan dan kemas dalam botol 1 Liter.',
		is_active: true,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		ingredients: [
			{ id: 'p-ing-3', stock_item_id: 'item-raw-aren', stock_item_name: 'Gula Balok Aren Murni', stock_item_code: 'RAW-AREN-BLK', quantity: '4.0000', serving_unit: 'kg', waste_pct: '1.00' },
			{ id: 'p-ing-4', stock_item_id: 'item-air-02', stock_item_name: 'Air Mineral Galon 19 Liter', stock_item_code: 'AIR-GAL-19L', quantity: '2.0000', serving_unit: 'liter', waste_pct: '0.00' }
		]
	}
];

// ============================================================================
// 6. In-Memory State: Sales Channels, Markup & Rounding (§6.1)
// ============================================================================
export let mockSalesChannels: SalesChannel[] = [
	{
		id: 'chn-pos',
		code: 'pos',
		name: 'POS Kasir Gerai (Dine-in / Takeaway)',
		is_active: true,
		default_markup_pct: '0.00',
		rounding_mode: 'nearest',
		rounding_step: 100,
		markups: [
			{ id: 'mk-pos-1', channel_code: 'pos', markup_pct: '0.00', effective_from: '2026-01-01T00:00:00Z', status: 'active' }
		],
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z'
	},
	{
		id: 'chn-app',
		code: 'app',
		name: 'Aplikasi Konsumen Hanjo (Loyalty & Delivery)',
		is_active: true,
		default_markup_pct: '5.00',
		rounding_mode: 'nearest',
		rounding_step: 500,
		markups: [
			{ id: 'mk-app-1', channel_code: 'app', markup_pct: '5.00', effective_from: '2026-01-01T00:00:00Z', status: 'active' }
		],
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z'
	},
	{
		id: 'chn-market',
		code: 'marketplace',
		name: 'Marketplace & Aggregator (GrabFood / GoFood)',
		is_active: true,
		default_markup_pct: '0.00', // [OPEN] label: belum diputuskan
		rounding_mode: 'nearest',
		rounding_step: 500,
		markups: [
			{ id: 'mk-market-1', channel_code: 'marketplace', markup_pct: '0.00', effective_from: '2026-01-01T00:00:00Z', status: 'active', notes: 'Belum diputuskan oleh manajemen pusat' }
		],
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z'
	}
];

// ============================================================================
// 7. In-Memory State: Harga Dasar & Override Outlet
// ============================================================================
export let mockBasePrices: BasePrice[] = [
	{ id: 'bp-1', variant_id: 'var-aren-iced', price: '28000.00', currency: 'IDR', effective_from: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z' },
	{ id: 'bp-2', variant_id: 'var-aren-hot', price: '26000.00', currency: 'IDR', effective_from: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z' },
	{ id: 'bp-3', variant_id: 'var-ame-iced', price: '22000.00', currency: 'IDR', effective_from: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z' },
	{ id: 'bp-4', variant_id: 'var-matcha-iced', price: '32000.00', currency: 'IDR', effective_from: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z' },
	{ id: 'bp-5', variant_id: 'var-croissant-std', price: '25000.00', currency: 'IDR', effective_from: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z' }
];

export let mockPriceOverrides: PriceOverride[] = [
	{
		id: 'p-ovr-1',
		variant_id: 'var-aren-iced',
		outlet_id: 'out-sub-01',
		outlet_name: 'Jodi Gubeng (Surabaya)',
		price: '27000.00',
		effective_from: '2026-01-01T00:00:00Z',
		reason: 'Penyesuaian daya beli regional dan kompetisi gerai lokal',
		created_at: '2026-01-01T00:00:00Z'
	}
];

// ============================================================================
// 8. In-Memory State: Matriks Ketersediaan Menu per Outlet & Channel
// ============================================================================
export let mockMenuAvailability: MenuAvailability[] = [
	{
		id: 'av-1',
		menu_item_id: 'mnu-aren-latte',
		menu_item_name: 'Hanjo Aren Latte Signature',
		variant_id: 'var-aren-iced',
		outlet_id: 'out-jkt-01',
		channel_code: 'pos',
		is_available: true,
		updated_at: '2026-10-13T06:00:00Z'
	},
	{
		id: 'av-2',
		menu_item_id: 'mnu-aren-latte',
		menu_item_name: 'Hanjo Aren Latte Signature',
		variant_id: 'var-aren-iced',
		outlet_id: 'out-jkt-01',
		channel_code: 'app',
		is_available: true,
		updated_at: '2026-10-13T06:00:00Z'
	},
	{
		id: 'av-3',
		menu_item_id: 'mnu-croissant',
		menu_item_name: 'Butter Croissant Artisan',
		variant_id: 'var-croissant-std',
		outlet_id: 'out-jkt-01',
		channel_code: 'pos',
		is_available: false,
		sold_out_reason: 'Batch pagi habis terjual, menunggu jadwal baking batch sore 16:00',
		sold_out_at: '2026-10-13T12:30:00Z',
		updated_at: '2026-10-13T12:30:00Z'
	},
	{
		id: 'av-4',
		menu_item_id: 'mnu-croissant',
		menu_item_name: 'Butter Croissant Artisan',
		variant_id: 'var-croissant-std',
		outlet_id: 'out-jkt-01',
		channel_code: 'app',
		is_available: false,
		sold_out_reason: 'Habis terjual di gerai',
		sold_out_at: '2026-10-13T12:30:00Z',
		updated_at: '2026-10-13T12:30:00Z'
	}
];

// ============================================================================
// 9. Registrasi Mock Handlers Router
// ============================================================================
export function registerMenuHandlers(): void {
	// Sinkronisasi dinamis jumlah formula resep yang menggunakan setiap bahan baku (AC-03.5)
	setRecipeCountGetter((stockItemId: string) => {
		return mockRecipes.filter((r) =>
			r.ingredients.some((ing) => ing.stock_item_id === stockItemId)
		).length;
	});

	// --------------------------------------------------------------------------
	// 9.1 Menu Items & Varian
	// --------------------------------------------------------------------------
	router.register('GET', '/api/v1/menu-items', async (ctx) => {
		const currentUser = getCurrentMockUser();
		const categoryId = ctx.query.get('category_id');
		const status = ctx.query.get('status');
		const search = (ctx.query.get('search') || '').toLowerCase().trim();
		const outletIdFilter = ctx.query.get('outlet_id');

		let list = [...mockMenuItems];

		// Scope Locking untuk Store Manager (AC-04.7, AC-04.11)
		if (currentUser && currentUser.role === 'store_manager') {
			const smOutletId = currentUser.outlet_ids?.[0] || 'out-jkt-01';
			list = list.filter((item) =>
				isMenuItemVisibleForOutlet(item, smOutletId, clock.businessDate())
			);
		} else if (outletIdFilter && outletIdFilter !== 'all') {
			list = list.filter((item) =>
				isMenuItemVisibleForOutlet(item, outletIdFilter, clock.businessDate())
			);
		}

		if (categoryId && categoryId !== 'all') {
			list = list.filter((item) => item.category_id === categoryId);
		}

		if (status && status !== 'all') {
			list = list.filter((item) => item.status === status);
		}

		if (search) {
			list = list.filter(
				(item) =>
					item.name.toLowerCase().includes(search) ||
					item.code.toLowerCase().includes(search) ||
					item.variants.some((v) => v.name.toLowerCase().includes(search) || v.sku.toLowerCase().includes(search))
			);
		}

		return { data: list };
	});

	router.register('GET', '/api/v1/menu-items/:id', async (ctx) => {
		const item = mockMenuItems.find((m) => m.id === ctx.params.id);
		if (!item) {
			throw ApiErrors.notFound(`Menu item dengan ID "${ctx.params.id}" tidak ditemukan.`);
		}
		return { data: item };
	});

	router.register('POST', '/api/v1/menu-items', async (ctx) => {
		const currentUser = getCurrentMockUser();
		// AC-04.10: Hanya Admin (dan Owner) yang memiliki akses ubah; Store Manager dan Finance ditolak
		if (currentUser && (currentUser.role === 'store_manager' || currentUser.role === 'finance')) {
			throw ApiErrors.forbidden('Peran Anda tidak memiliki hak akses untuk menambah atau mengubah master menu.');
		}

		const body = ctx.req.body as Partial<MenuItem>;
		if (!body.name || !body.code || !body.category_id) {
			throw ApiErrors.validationError([{ field: 'name', code: 'required', message: 'Nama, kode menu, dan kategori menu wajib diisi.' }], 'Nama, kode menu, dan kategori menu wajib diisi.');
		}

		const existing = mockMenuItems.find((m) => m.code.toLowerCase() === body.code?.toLowerCase());
		if (existing) {
			throw ApiErrors.conflict(`Kode menu "${body.code}" sudah digunakan.`);
		}

		const newItem: MenuItem = {
			id: `mnu-${clock.now().getTime()}`,
			name: body.name,
			code: body.code,
			category_id: body.category_id,
			category_name: mockMenuCategories.find((c) => c.id === body.category_id)?.name || 'Menu Kategori',
			description: body.description || '',
			image_url: body.image_url || '/images/menu/placeholder.webp',
			status: body.status || 'active',
			scope_type: body.scope_type || 'all_outlets',
			target_outlet_ids: body.target_outlet_ids || [],
			is_time_limited: body.is_time_limited || false,
			available_from: body.available_from,
			available_until: body.available_until,
			variants: body.variants || [
				{
					id: `var-${clock.now().getTime()}-1`,
					menu_item_id: `mnu-${clock.now().getTime()}`,
					name: 'Standard',
					code: `${body.code}-STD`,
					sku: `${body.code}-STD`,
					is_active: true,
					base_price: '25000.00',
					sort_order: 1,
					created_at: clock.nowIso(),
					updated_at: clock.nowIso()
				}
			],
			modifier_group_ids: body.modifier_group_ids || [],
			version: 1,
			created_at: clock.nowIso(),
			updated_at: clock.nowIso()
		};

		mockMenuItems.unshift(newItem);
		return { data: newItem };
	});

	router.register('PUT', '/api/v1/menu-items/:id', async (ctx) => {
		const currentUser = getCurrentMockUser();
		if (currentUser && (currentUser.role === 'store_manager' || currentUser.role === 'finance')) {
			throw ApiErrors.forbidden('Peran Anda tidak memiliki hak akses untuk mengedit master menu.');
		}

		const index = mockMenuItems.findIndex((m) => m.id === ctx.params.id);
		if (index === -1) {
			throw ApiErrors.notFound(`Menu item dengan ID "${ctx.params.id}" tidak ditemukan.`);
		}

		const body = ctx.req.body as Partial<MenuItem>;
		const existing = mockMenuItems[index];

		const updated: MenuItem = {
			...existing,
			...body,
			id: existing.id,
			updated_at: clock.nowIso(),
			version: existing.version + 1
		};

		mockMenuItems[index] = updated;
		return { data: updated };
	});

	router.register('GET', '/api/v1/menu-categories', async () => {
		const categoriesWithCount = mockMenuCategories.map((c) => ({
			...c,
			item_count: mockMenuItems.filter((m) => m.category_id === c.id).length
		})).sort((a, b) => a.sort_order - b.sort_order);
		return { data: categoriesWithCount };
	});

	router.register('POST', '/api/v1/menu-categories', async (ctx) => {
		const currentUser = getCurrentMockUser();
		if (currentUser && (currentUser.role === 'store_manager' || currentUser.role === 'finance')) {
			throw ApiErrors.forbidden('Peran Anda tidak memiliki hak akses untuk menambah kategori menu.');
		}

		const body = ctx.req.body as Partial<MenuCategory>;
		if (!body.name || !body.code) {
			throw ApiErrors.validationError([
				{ field: 'name', code: 'required', message: 'Nama dan kode kategori menu wajib diisi.' }
			], 'Nama dan kode kategori menu wajib diisi.');
		}

		const existing = mockMenuCategories.find((c) => c.code.toLowerCase() === body.code?.toLowerCase());
		if (existing) {
			throw ApiErrors.conflict(`Kode kategori menu "${body.code}" sudah digunakan.`);
		}

		const newCat: MenuCategory = {
			id: `cat-m-${clock.now().getTime()}`,
			name: body.name.trim(),
			code: body.code.trim().toUpperCase(),
			sort_order: Number(body.sort_order) || (mockMenuCategories.length + 1),
			is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
			created_at: clock.nowIso(),
			updated_at: clock.nowIso()
		};

		mockMenuCategories.push(newCat);
		return { data: newCat };
	});

	router.register('PUT', '/api/v1/menu-categories/:id', async (ctx) => {
		const currentUser = getCurrentMockUser();
		if (currentUser && (currentUser.role === 'store_manager' || currentUser.role === 'finance')) {
			throw ApiErrors.forbidden('Peran Anda tidak memiliki hak akses untuk mengubah kategori menu.');
		}

		const index = mockMenuCategories.findIndex((c) => c.id === ctx.params.id);
		if (index === -1) {
			throw ApiErrors.notFound(`Kategori menu dengan ID "${ctx.params.id}" tidak ditemukan.`);
		}

		const body = ctx.req.body as Partial<MenuCategory>;
		const existing = mockMenuCategories[index];

		if (body.code && body.code.toLowerCase() !== existing.code.toLowerCase()) {
			const dup = mockMenuCategories.find(
				(c) => c.id !== existing.id && c.code.toLowerCase() === body.code?.toLowerCase()
			);
			if (dup) {
				throw ApiErrors.conflict(`Kode kategori menu "${body.code}" sudah digunakan.`);
			}
		}

		const updated: MenuCategory = {
			...existing,
			name: body.name !== undefined ? body.name.trim() : existing.name,
			code: body.code !== undefined ? body.code.trim().toUpperCase() : existing.code,
			sort_order: body.sort_order !== undefined ? Number(body.sort_order) : existing.sort_order,
			is_active: body.is_active !== undefined ? Boolean(body.is_active) : existing.is_active,
			updated_at: clock.nowIso()
		};

		mockMenuCategories[index] = updated;

		// Sinkronisasi category_name pada menu items jika nama berubah
		if (updated.name !== existing.name) {
			for (const item of mockMenuItems) {
				if (item.category_id === updated.id) {
					item.category_name = updated.name;
				}
			}
		}

		return { data: updated };
	});

	router.register('DELETE', '/api/v1/menu-categories/:id', async (ctx) => {
		const currentUser = getCurrentMockUser();
		if (currentUser && (currentUser.role === 'store_manager' || currentUser.role === 'finance')) {
			throw ApiErrors.forbidden('Peran Anda tidak memiliki hak akses untuk menghapus kategori menu.');
		}

		const index = mockMenuCategories.findIndex((c) => c.id === ctx.params.id);
		if (index === -1) {
			throw ApiErrors.notFound(`Kategori menu dengan ID "${ctx.params.id}" tidak ditemukan.`);
		}

		const cat = mockMenuCategories[index];
		const inUseCount = mockMenuItems.filter((m) => m.category_id === cat.id).length;
		if (inUseCount > 0) {
			throw ApiErrors.conflict(
				`Kategori "${cat.name}" tidak dapat dihapus karena masih digunakan oleh ${inUseCount} menu siap jual.`
			);
		}

		mockMenuCategories.splice(index, 1);
		return { data: { success: true, id: ctx.params.id } };
	});

	// --------------------------------------------------------------------------
	// 9.2 Modifier Groups & Options
	// --------------------------------------------------------------------------
	router.register('GET', '/api/v1/modifier-groups', async () => {
		return { data: mockModifierGroups };
	});

	router.register('GET', '/api/v1/modifier-groups/:id', async (ctx) => {
		const group = mockModifierGroups.find((g) => g.id === ctx.params.id);
		if (!group) throw ApiErrors.notFound(`Modifier group "${ctx.params.id}" tidak ditemukan.`);
		return { data: group };
	});

	router.register('POST', '/api/v1/modifier-groups', async (ctx) => {
		const currentUser = getCurrentMockUser();
		if (currentUser && (currentUser.role === 'store_manager' || currentUser.role === 'finance')) {
			throw ApiErrors.forbidden('Peran Anda tidak memiliki hak akses untuk membuat grup modifier.');
		}

		const body = ctx.req.body as Partial<ModifierGroup>;
		const val = validateModifierGroup(body);
		if (!val.isValid) {
			throw ApiErrors.validationError(val.errors.map((e) => ({ field: 'group', code: 'invalid', message: e })), val.errors.join(' '));
		}

		const newGroup: ModifierGroup = {
			id: `grp-${clock.now().getTime()}`,
			name: body.name || 'Grup Modifier',
			code: body.code || `GRP-${clock.now().getTime()}`,
			description: body.description || '',
			min_select: body.min_select ?? 0,
			max_select: body.max_select ?? 1,
			is_required: (body.min_select ?? 0) > 0,
			options: body.options || [],
			version: 1,
			created_at: clock.nowIso(),
			updated_at: clock.nowIso()
		};

		mockModifierGroups.push(newGroup);
		return { data: newGroup };
	});

	router.register('PUT', '/api/v1/modifier-groups/:id', async (ctx) => {
		const currentUser = getCurrentMockUser();
		if (currentUser && (currentUser.role === 'store_manager' || currentUser.role === 'finance')) {
			throw ApiErrors.forbidden('Peran Anda tidak memiliki hak akses untuk mengedit grup modifier.');
		}

		const index = mockModifierGroups.findIndex((g) => g.id === ctx.params.id);
		if (index === -1) {
			throw ApiErrors.notFound(`Grup modifier "${ctx.params.id}" tidak ditemukan.`);
		}

		const body = ctx.req.body as Partial<ModifierGroup>;
		const val = validateModifierGroup(body);
		if (!val.isValid) {
			throw ApiErrors.validationError(val.errors.map((e) => ({ field: 'group', code: 'invalid', message: e })), val.errors.join(' '));
		}

		const existing = mockModifierGroups[index];
		const updated: ModifierGroup = {
			...existing,
			...body,
			id: existing.id,
			version: existing.version + 1,
			updated_at: clock.nowIso()
		};

		mockModifierGroups[index] = updated;
		return { data: updated };
	});

	// --------------------------------------------------------------------------
	// 9.2B Preset Catatan Dapur / Barista (Lapis 3: Rp 0)
	// --------------------------------------------------------------------------
	router.register('GET', '/api/v1/note-presets', async (ctx) => {
		const category = ctx.query.get('category');
		let list = [...mockNotePresets];
		if (category && category !== 'all') {
			list = list.filter((p) => p.category === category);
		}
		return { data: list.sort((a, b) => a.sort_order - b.sort_order) };
	});

	router.register('POST', '/api/v1/note-presets', async (ctx) => {
		const currentUser = getCurrentMockUser();
		if (currentUser && (currentUser.role === 'store_manager' || currentUser.role === 'finance')) {
			throw ApiErrors.forbidden('Peran Anda tidak memiliki hak akses untuk menambah preset catatan dapur.');
		}
		const body = ctx.req.body as Partial<NotePreset>;
		if (!body.name || !body.name.trim()) {
			throw ApiErrors.validationError([{ field: 'name', code: 'required', message: 'Nama preset catatan wajib diisi.' }]);
		}
		const newPreset: NotePreset = {
			id: `np-${clock.now().getTime()}`,
			name: body.name.trim(),
			code: body.code?.trim().toUpperCase() || `NOTE-${clock.now().getTime()}`,
			category: body.category || 'general',
			sort_order: body.sort_order ?? (mockNotePresets.length + 1),
			is_active: body.is_active ?? true,
			created_at: clock.nowIso(),
			updated_at: clock.nowIso()
		};
		mockNotePresets.push(newPreset);
		return { data: newPreset };
	});

	router.register('PUT', '/api/v1/note-presets/:id', async (ctx) => {
		const currentUser = getCurrentMockUser();
		if (currentUser && (currentUser.role === 'store_manager' || currentUser.role === 'finance')) {
			throw ApiErrors.forbidden('Peran Anda tidak memiliki hak akses untuk mengubah preset catatan dapur.');
		}
		const target = mockNotePresets.find((p) => p.id === ctx.params.id);
		if (!target) throw ApiErrors.notFound(`Preset catatan "${ctx.params.id}" tidak ditemukan.`);
		const body = ctx.req.body as Partial<NotePreset>;
		if (body.name !== undefined) target.name = body.name.trim();
		if (body.code !== undefined) target.code = body.code.trim().toUpperCase();
		if (body.category !== undefined) target.category = body.category;
		if (body.sort_order !== undefined) target.sort_order = body.sort_order;
		if (body.is_active !== undefined) target.is_active = body.is_active;
		target.updated_at = clock.nowIso();
		return { data: target };
	});

	router.register('DELETE', '/api/v1/note-presets/:id', async (ctx) => {
		const currentUser = getCurrentMockUser();
		if (currentUser && (currentUser.role === 'store_manager' || currentUser.role === 'finance')) {
			throw ApiErrors.forbidden('Peran Anda tidak memiliki hak akses untuk menghapus preset catatan dapur.');
		}
		const idx = mockNotePresets.findIndex((p) => p.id === ctx.params.id);
		if (idx === -1) throw ApiErrors.notFound(`Preset catatan "${ctx.params.id}" tidak ditemukan.`);
		mockNotePresets.splice(idx, 1);
		return { data: { success: true } };
	});

	// --------------------------------------------------------------------------
	// 9.3 Resep Berversi & Resolusi (§6.2)
	// --------------------------------------------------------------------------
	router.register('GET', '/api/v1/recipes', async (ctx) => {
		const variantId = ctx.query.get('variant_id');
		const outletId = ctx.query.get('outlet_id');

		let list = [...mockRecipes];
		if (variantId) {
			list = list.filter((r) => r.variant_id === variantId);
		}
		if (outletId && outletId !== 'all') {
			list = list.filter((r) => r.scope_type === 'standard' || r.outlet_id === outletId);
		}

		return { data: sortRecipesByActiveStatus(list) };
	});

	router.register('GET', '/api/v1/recipes/resolve', async (ctx) => {
		const variantId = ctx.query.get('variant_id') || '';
		const outletId = ctx.query.get('outlet_id') || undefined;
		const atTime = ctx.query.get('at') || clock.nowIso();

		if (!variantId) {
			throw ApiErrors.validationError([{ field: 'variant_id', code: 'required', message: 'Parameter query "variant_id" wajib disertakan.' }], 'Parameter query "variant_id" wajib disertakan.');
		}

		const resolved = resolveRecipe(mockRecipes, { variantId, outletId, atTime });
		if (!resolved) {
			throw ApiErrors.notFound(`Tidak ada resep aktif yang berlaku untuk varian "${variantId}" pada waktu ${atTime}.`);
		}

		return { data: resolved };
	});

	router.register('POST', '/api/v1/recipes', async (ctx) => {
		const currentUser = getCurrentMockUser();
		if (currentUser && (currentUser.role === 'store_manager' || currentUser.role === 'finance')) {
			throw ApiErrors.forbidden('Peran Anda tidak memiliki hak akses untuk merilis versi resep baru.');
		}

		const body = ctx.req.body as Partial<Recipe>;
		if (!body.variant_id || !body.effective_from || !body.ingredients || body.ingredients.length === 0) {
			throw ApiErrors.validationError([{ field: 'ingredients', code: 'required', message: 'variant_id, effective_from, dan daftar ingredients wajib disertakan.' }], 'variant_id, effective_from, dan daftar ingredients wajib disertakan.');
		}

		// Validasi overlap waktu (AC-04.5)
		const overlapCheck = validateRecipeOverlap(mockRecipes, {
			variant_id: body.variant_id,
			effective_from: body.effective_from,
			effective_until: body.effective_until,
			scope_type: body.scope_type || 'standard',
			outlet_id: body.outlet_id
		});

		if (!overlapCheck.isValid) {
			throw ApiErrors.conflict(overlapCheck.conflictReason || 'Terdapat tumpang tindih periode aktif resep.');
		}

		// Tentukan nomor versi baru berikutnya
		const existingForVariant = mockRecipes.filter(
			(r) => r.variant_id === body.variant_id && r.scope_type === (body.scope_type || 'standard')
		);
		const maxVersion = existingForVariant.reduce((max, r) => Math.max(max, r.version_number), 0);

		const newRecipe: Recipe = {
			id: `rcp-${clock.now().getTime()}`,
			variant_id: body.variant_id,
			variant_name: body.variant_name,
			menu_item_id: body.menu_item_id,
			menu_item_name: body.menu_item_name,
			version_number: maxVersion + 1,
			effective_from: body.effective_from,
			effective_until: body.effective_until,
			is_active: true,
			scope_type: body.scope_type || 'standard',
			outlet_id: body.outlet_id,
			outlet_name: body.outlet_name,
			ingredients: body.ingredients,
			notes: body.notes,
			created_by: currentUser?.name || 'HQ Admin',
			created_at: clock.nowIso(),
			version: 1
		};

		mockRecipes.unshift(newRecipe);
		return { data: newRecipe };
	});

	router.register('POST', '/api/v1/recipes/:id/actions/retire', async (ctx) => {
		const recipe = mockRecipes.find((r) => r.id === ctx.params.id);
		if (!recipe) throw ApiErrors.notFound(`Resep "${ctx.params.id}" tidak ditemukan.`);

		recipe.is_active = false;
		recipe.effective_until = clock.nowIso();
		return { data: recipe };
	});

	// --------------------------------------------------------------------------
	// 9.4 Pratinjau Kalkulasi HPP Dinamis (§6.4)
	// --------------------------------------------------------------------------
	router.register('GET', '/api/v1/menu-variants/:id/hpp', async (ctx) => {
		const variantId = ctx.params.id;
		const outletId = ctx.query.get('outlet_id') || 'out-jkt-01';
		const optionIds = (ctx.query.get('option_ids') || '').split(',').filter(Boolean);
		const atTime = ctx.query.get('at') || clock.nowIso();

		// 1. Cari resep yang berlaku
		const recipe = resolveRecipe(mockRecipes, { variantId, outletId, atTime });
		if (!recipe) {
			throw ApiErrors.notFound(`Tidak ada resep aktif yang ditemukan untuk varian "${variantId}".`);
		}

		// 2. Kumpulkan opsi modifier yang dipilih
		const selectedOptions: ModifierOption[] = [];
		for (const grp of mockModifierGroups) {
			for (const opt of grp.options) {
				if (optionIds.includes(opt.id) || optionIds.includes(opt.code)) {
					selectedOptions.push(opt);
				}
			}
		}

		// 3. Terapkan efek modifier berantai (§6.3)
		const effectResult = applyModifierEffects(recipe.ingredients, selectedOptions);

		// 4. Siapkan peta biaya per bahan di outlet target
		const costMap: Record<string, { unitCost: number | null; costSource: 'outlet_avg_cost' | 'last_purchase_price' | 'none' }> = {};

		for (const ing of effectResult.effectiveIngredients) {
			// Kasus vektor uji spesifik §6.4 (Aren Latte Iced)
			if (ing.stock_item_id === 'item-kop-01' || ing.stock_item_id === 'item-coffee-bean') {
				costMap[ing.stock_item_id] = { unitCost: 280, costSource: 'outlet_avg_cost' };
			} else if (ing.stock_item_id === 'item-sus-01' || ing.stock_item_id === 'item-fresh-milk') {
				costMap[ing.stock_item_id] = { unitCost: 18, costSource: 'outlet_avg_cost' };
			} else if (ing.stock_item_id === 'item-srp-04' || ing.stock_item_id === 'item-palm-sugar') {
				costMap[ing.stock_item_id] = { unitCost: 25, costSource: 'outlet_avg_cost' };
			} else if (ing.stock_item_id === 'item-air-01' || ing.stock_item_id === 'item-ice-tube') {
				costMap[ing.stock_item_id] = { unitCost: 3, costSource: 'outlet_avg_cost' };
			} else if (ing.stock_item_id === 'item-kms-03' || ing.stock_item_id === 'item-cup-16oz') {
				costMap[ing.stock_item_id] = { unitCost: 600, costSource: 'outlet_avg_cost' };
			} else if (ing.stock_item_id === 'item-kms-01' || ing.stock_item_id === 'item-cup-hot8') {
				costMap[ing.stock_item_id] = { unitCost: 850, costSource: 'outlet_avg_cost' };
			} else {
				// Cari dari data mockStockItems
				const stockItem = mockStockItems.find((s) => s.id === ing.stock_item_id);
				const outletStock = stockItem?.stock_by_outlet?.[outletId];

				if (outletStock && outletStock.unit_cost) {
					costMap[ing.stock_item_id] = {
						unitCost: parseFloat(outletStock.unit_cost),
						costSource: 'outlet_avg_cost'
					};
				} else if (stockItem && stockItem.hq_ref_price) {
					costMap[ing.stock_item_id] = {
						unitCost: parseFloat(stockItem.hq_ref_price),
						costSource: 'last_purchase_price'
					};
				} else {
					costMap[ing.stock_item_id] = {
						unitCost: null,
						costSource: 'none'
					};
				}
			}
		}

		// 5. Cari harga jual dasar & tambahkan delta modifier yang dipilih
		let basePrice = 28000;
		for (const m of mockMenuItems) {
			const v = m.variants.find((vr) => vr.id === variantId);
			if (v) {
				basePrice = parseFloat(v.base_price) || 28000;
				break;
			}
		}

		let modifierDelta = 0;
		for (const opt of selectedOptions) {
			modifierDelta += parseFloat(opt.price_delta) || 0;
		}

		const sellingPrice = basePrice + modifierDelta;

		const result: HppPreviewResponse = calculateVariantHpp({
			variantId,
			variantName: recipe.variant_name || 'Varian Menu',
			outletId,
			outletName: recipe.outlet_name || outletId,
			recipeVersionNumber: recipe.version_number,
			recipeScope: recipe.scope_type,
			ingredients: effectResult.effectiveIngredients,
			costMap,
			basePrice,
			modifierDelta,
			sellingPrice,
			warnings: effectResult.warnings
		});

		return { data: result };
	});

	// --------------------------------------------------------------------------
	// 9.5 Pratinjau Kalkulator Channel Pricing (§6.1)
	// --------------------------------------------------------------------------
	router.register('GET', '/api/v1/pricing/preview', async (ctx) => {
		const variantId = ctx.query.get('variant_id') || 'var-aren-iced';
		const outletId = ctx.query.get('outlet_id') || 'out-jkt-01';
		const channelCode = ctx.query.get('channel_code') || 'pos';
		const optionIds = (ctx.query.get('option_ids') || '').split(',').filter(Boolean);

		// 1. Ambil harga dasar (cek apakah ada override outlet aktif)
		let basePrice = 28000;
		let priceOverrideApplied = false;

		const override = mockPriceOverrides.find(
			(po) => po.variant_id === variantId && po.outlet_id === outletId
		);
		if (override) {
			basePrice = parseFloat(override.price) || 28000;
			priceOverrideApplied = true;
		} else {
			for (const m of mockMenuItems) {
				const v = m.variants.find((vr) => vr.id === variantId);
				if (v) {
					basePrice = parseFloat(v.base_price) || 28000;
					break;
				}
			}
		}

		// 2. Kumpulkan price_delta dari modifier yang dipilih
		const modifierPriceDeltas: number[] = [];
		for (const grp of mockModifierGroups) {
			for (const opt of grp.options) {
				if (optionIds.includes(opt.id) || optionIds.includes(opt.code)) {
					modifierPriceDeltas.push(parseFloat(opt.price_delta) || 0);
				}
			}
		}

		// 3. Ambil konfigurasi channel
		const channel = mockSalesChannels.find((c) => c.code === channelCode) || mockSalesChannels[0];
		const markupPct = parseFloat(channel.default_markup_pct) || 0;

		const calc = calculateChannelPrice({
			basePrice,
			modifierPriceDeltas,
			markupPct,
			roundingMode: channel.rounding_mode,
			roundingStep: channel.rounding_step
		});

		const response: PricingPreviewResponse = {
			variant_id: variantId,
			outlet_id: outletId,
			channel_code: channel.code,
			channel_name: channel.name,
			base_price: calc.basePrice,
			price_override_applied: priceOverrideApplied,
			modifier_price_delta: calc.modifierTotalDelta,
			subtotal_before_markup: calc.subtotalBeforeMarkup,
			markup_pct: calc.markupPct,
			markup_amount: calc.markupAmount,
			rounding_mode: calc.roundingMode,
			rounding_step: calc.roundingStep,
			final_price: calc.finalPrice,
			calculation_formula: calc.formulaText
		};

		return { data: response };
	});

	// --------------------------------------------------------------------------
	// 9.6 Sales Channels & Markup
	// --------------------------------------------------------------------------
	router.register('GET', '/api/v1/sales-channels', async () => {
		return { data: mockSalesChannels };
	});

	router.register('POST', '/api/v1/sales-channels/:id/markups', async (ctx) => {
		const currentUser = getCurrentMockUser();
		if (currentUser && (currentUser.role === 'store_manager' || currentUser.role === 'finance')) {
			throw ApiErrors.forbidden('Peran Anda tidak memiliki hak akses untuk mengubah markup channel.');
		}

		const channel = mockSalesChannels.find((c) => c.id === ctx.params.id);
		if (!channel) throw ApiErrors.notFound(`Channel "${ctx.params.id}" tidak ditemukan.`);

		const body = ctx.req.body as Partial<ChannelMarkup>;
		const newMarkup: ChannelMarkup = {
			id: `mk-${clock.now().getTime()}`,
			channel_code: channel.code,
			markup_pct: body.markup_pct || '5.00',
			effective_from: body.effective_from || clock.nowIso(),
			status: 'active',
			notes: body.notes
		};

		channel.markups.push(newMarkup);
		channel.default_markup_pct = newMarkup.markup_pct;
		return { data: newMarkup };
	});

	// --------------------------------------------------------------------------
	// 9.7 Matriks Ketersediaan Menu per Outlet & Channel
	// --------------------------------------------------------------------------
	router.register('GET', '/api/v1/menu-availability', async (ctx) => {
		const outletId = ctx.query.get('outlet_id');
		let list = [...mockMenuAvailability];
		if (outletId && outletId !== 'all') {
			list = list.filter((a) => a.outlet_id === outletId);
		}
		return { data: list };
	});

	router.register('POST', '/api/v1/menu-availability/:id/actions/mark-sold-out', async (ctx) => {
		const body = ctx.req.body as { reason?: string };
		const avail = mockMenuAvailability.find((a) => a.id === ctx.params.id);
		if (!avail) throw ApiErrors.notFound('Entri ketersediaan menu tidak ditemukan.');

		avail.is_available = false;
		avail.sold_out_reason = body.reason || 'Ditandai habis secara manual';
		avail.sold_out_at = clock.nowIso();
		avail.updated_at = clock.nowIso();
		return { data: avail };
	});

	router.register('POST', '/api/v1/menu-availability/:id/actions/restore', async (ctx) => {
		const avail = mockMenuAvailability.find((a) => a.id === ctx.params.id);
		if (!avail) throw ApiErrors.notFound('Entri ketersediaan menu tidak ditemukan.');

		avail.is_available = true;
		avail.sold_out_reason = undefined;
		avail.sold_out_at = undefined;
		avail.updated_at = clock.nowIso();
		return { data: avail };
	});

	// --------------------------------------------------------------------------
	// 9.8 Resep Produksi Bahan Olahan (Flag 'production')
	// --------------------------------------------------------------------------
	router.register('GET', '/api/v1/production-recipes', async () => {
		return { data: mockProductionRecipes };
	});
}
