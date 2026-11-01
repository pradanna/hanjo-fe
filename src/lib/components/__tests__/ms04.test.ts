import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { calculateChannelPrice, applyRounding } from '../../domain/pricing.js';
import {
	resolveRecipe,
	validateRecipeOverlap,
	applyModifierEffects,
	isRecipeActive,
	sortRecipesByActiveStatus,
	formatRecipeEffect
} from '../../domain/recipe.js';
import { calculateVariantHpp } from '../../domain/hpp.js';
import { validateModifierGroup, isMenuItemVisibleForOutlet } from '../../domain/menu.js';
import { menuService } from '../../services/menu.service.js';
import { setCurrentMockUser } from '../../api/drivers/mock/handlers/auth.js';
import type { Recipe, RecipeIngredient, ModifierOption, MenuItem, ModifierGroup } from '../../api/contract/types.js';

describe('MS-04: Logika Domain Murni Menu, Varian, Modifier, Resep & Pricing', () => {
	// =========================================================================
	// Uji 1: AC-04.1 Formula Channel Pricing & Pembulatan (§6.1)
	// =========================================================================
	describe('Uji 1: AC-04.1 Vektor Uji Penetapan Harga Channel (§6.1)', () => {
		it('Vektor 1: dasar 28.000, modifier +3.000, markup 5%, nearest 500 = 32.500', () => {
			const res = calculateChannelPrice({
				basePrice: 28000,
				modifierPriceDeltas: [3000],
				markupPct: 5,
				roundingMode: 'nearest',
				roundingStep: 500
			});

			assert.equal(res.subtotalBeforeMarkup, '31000.00');
			assert.equal(res.rawPrice, '32550.00');
			assert.equal(res.finalPrice, '32500.00');
			assert.equal(res.finalPriceNumber, 32500);
		});

		it('Vektor 2: dasar 28.000, tanpa modifier, markup 0% = 28.000', () => {
			const res = calculateChannelPrice({
				basePrice: 28000,
				modifierPriceDeltas: [],
				markupPct: 0,
				roundingMode: 'nearest',
				roundingStep: 500
			});

			assert.equal(res.subtotalBeforeMarkup, '28000.00');
			assert.equal(res.rawPrice, '28000.00');
			assert.equal(res.finalPrice, '28000.00');
			assert.equal(res.finalPriceNumber, 28000);
		});

		it('Vektor 3: dasar 25.000, markup 5%, up 1.000 = 27.000', () => {
			const res = calculateChannelPrice({
				basePrice: 25000,
				modifierPriceDeltas: [],
				markupPct: 5,
				roundingMode: 'up',
				roundingStep: 1000
			});

			// 25.000 × 1.05 = 26.250 -> dibulatkan ke atas per 1.000 = 27.000
			assert.equal(res.rawPrice, '26250.00');
			assert.equal(res.finalPrice, '27000.00');
			assert.equal(res.finalPriceNumber, 27000);
		});

		it('Pembulatan mode down bekerja sesuai aturan kelipatan', () => {
			const rounded = applyRounding(26700, 'down', 500);
			assert.equal(rounded, 26500);
		});
	});

	// =========================================================================
	// Uji 2: AC-04.2 Vektor HPP Aren Latte Iced & Extra Shot (§6.4)
	// =========================================================================
	describe('Uji 2: AC-04.2 Vektor HPP Varian Dinamis (§6.4)', () => {
		const baseIngredients: RecipeIngredient[] = [
			{
				id: 'ing-1',
				stock_item_id: 'item-coffee-bean',
				stock_item_name: 'Biji Kopi Arabika',
				stock_item_code: 'KOP-ESP-01',
				quantity: '18.0000',
				serving_unit: 'g',
				waste_pct: '0.00'
			},
			{
				id: 'ing-2',
				stock_item_id: 'item-fresh-milk',
				stock_item_name: 'Fresh Milk',
				stock_item_code: 'DRY-MLK-01',
				quantity: '150.0000',
				serving_unit: 'ml',
				waste_pct: '0.00'
			},
			{
				id: 'ing-3',
				stock_item_id: 'item-palm-sugar',
				stock_item_name: 'Gula Aren Cair',
				stock_item_code: 'SYR-GLA-01',
				quantity: '20.0000',
				serving_unit: 'ml',
				waste_pct: '0.00'
			},
			{
				id: 'ing-4',
				stock_item_id: 'item-ice-tube',
				stock_item_name: 'Es Kristal Tube',
				stock_item_code: 'ICE-TUB-01',
				quantity: '100.0000',
				serving_unit: 'g',
				waste_pct: '0.00'
			},
			{
				id: 'ing-5',
				stock_item_id: 'item-cup-16oz',
				stock_item_name: 'Cup & Lid 16oz',
				stock_item_code: 'PKG-CUP-16',
				quantity: '1.0000',
				serving_unit: 'pcs',
				waste_pct: '0.00'
			}
		];

		const costMap = {
			'item-coffee-bean': { unitCost: 280, costSource: 'outlet_avg_cost' as const },
			'item-fresh-milk': { unitCost: 18, costSource: 'outlet_avg_cost' as const },
			'item-palm-sugar': { unitCost: 25, costSource: 'outlet_avg_cost' as const },
			'item-ice-tube': { unitCost: 3, costSource: 'outlet_avg_cost' as const },
			'item-cup-16oz': { unitCost: 600, costSource: 'outlet_avg_cost' as const }
		};

		it('Aren Latte Iced menghasilkan HPP 9.140 dan Margin 67.4% pada harga 28.000', () => {
			const res = calculateVariantHpp({
				variantId: 'var-aren-iced',
				variantName: 'Aren Latte Iced',
				outletId: 'out-jkt-01',
				ingredients: baseIngredients,
				costMap,
				sellingPrice: 28000
			});

			assert.equal(res.total_hpp, '9140.00');
			assert.equal(res.selling_price, '28000.00');
			assert.equal(res.gross_margin_amount, '18860.00');
			assert.equal(res.gross_margin_pct, '67.4');
			assert.equal(res.is_complete, true);
			assert.equal(res.missing_cost_items.length, 0);
		});

		it('Dengan Extra Shot (+18 g biji kopi), HPP menjadi 14.180', () => {
			const extraShotOption: ModifierOption = {
				id: 'opt-extra-shot',
				group_id: 'grp-extra',
				name: 'Extra Shot Espresso',
				code: 'EXTRA_SHOT',
				price_delta: '3000.00',
				is_default: false,
				sort_order: 1,
				recipe_effects: [
					{
						type: 'add',
						target_stock_item_id: 'item-coffee-bean',
						target_stock_item_name: 'Biji Kopi Arabika',
						added_quantity: '18.0000',
						serving_unit: 'g'
					}
				]
			};

			const modRes = applyModifierEffects(baseIngredients, [extraShotOption]);
			assert.equal(modRes.effectiveIngredients.length, 5);

			const coffeeIng = modRes.effectiveIngredients.find((i) => i.stock_item_id === 'item-coffee-bean');
			assert.ok(coffeeIng);
			assert.equal(coffeeIng.quantity, '36.0000'); // 18 + 18 = 36 g

			const hppRes = calculateVariantHpp({
				variantId: 'var-aren-iced',
				variantName: 'Aren Latte Iced (Extra Shot)',
				outletId: 'out-jkt-01',
				ingredients: modRes.effectiveIngredients,
				costMap,
				sellingPrice: 31000 // 28.000 + 3.000
			});

			// 9.140 + (18 × 280 = 5.040) = 14.180
			assert.equal(hppRes.total_hpp, '14180.00');
		});

		it('AC-04.9 Bahan tanpa biaya menghasilkan penanda "HPP tidak lengkap"', () => {
			const incompleteCostMap = {
				...costMap,
				'item-palm-sugar': { unitCost: null, costSource: 'none' as const }
			};

			const res = calculateVariantHpp({
				variantId: 'var-aren-iced',
				variantName: 'Aren Latte Iced',
				outletId: 'out-jkt-01',
				ingredients: baseIngredients,
				costMap: incompleteCostMap,
				sellingPrice: 28000
			});

			assert.equal(res.is_complete, false);
			assert.ok(res.missing_cost_items.includes('Gula Aren Cair'));
		});
	});

	// =========================================================================
	// Uji 3: AC-04.3 & AC-04.6 Resolusi Resep & Override Outlet (§6.2)
	// =========================================================================
	describe('Uji 3: AC-04.3 & AC-04.6 Resolusi Resep Berversi & Override Outlet (§6.2)', () => {
		const recipes: Recipe[] = [
			{
				id: 'rcp-aren-v1',
				variant_id: 'var-aren-iced',
				version_number: 1,
				effective_from: '2026-01-01T00:00:00Z',
				effective_until: '2026-06-01T00:00:00Z',
				is_active: true,
				scope_type: 'standard',
				ingredients: [],
				version: 1,
				created_at: '2026-01-01T00:00:00Z'
			},
			{
				id: 'rcp-aren-v2',
				variant_id: 'var-aren-iced',
				version_number: 2,
				effective_from: '2026-06-01T00:00:00Z',
				effective_until: undefined,
				is_active: true,
				scope_type: 'standard',
				ingredients: [],
				version: 1,
				created_at: '2026-06-01T00:00:00Z'
			},
			{
				id: 'rcp-aren-gubeng-override',
				variant_id: 'var-aren-iced',
				version_number: 1,
				effective_from: '2026-02-01T00:00:00Z',
				effective_until: undefined,
				is_active: true,
				scope_type: 'outlet_override',
				outlet_id: 'out-sub-01', // Jodi Gubeng
				ingredients: [],
				version: 1,
				created_at: '2026-02-01T00:00:00Z'
			}
		];

		it('AC-04.3 Mengaktifkan v2 tidak mengubah hasil resolusi untuk transaksi sebelum effective_from', () => {
			const resolvedBefore = resolveRecipe(recipes, {
				variantId: 'var-aren-iced',
				outletId: 'out-jkt-01',
				atTime: '2026-03-15T10:00:00Z'
			});

			assert.ok(resolvedBefore);
			assert.equal(resolvedBefore.id, 'rcp-aren-v1');
			assert.equal(resolvedBefore.version_number, 1);

			const resolvedAfter = resolveRecipe(recipes, {
				variantId: 'var-aren-iced',
				outletId: 'out-jkt-01',
				atTime: '2026-07-01T10:00:00Z'
			});

			assert.ok(resolvedAfter);
			assert.equal(resolvedAfter.id, 'rcp-aren-v2');
			assert.equal(resolvedAfter.version_number, 2);
		});

		it('AC-04.6 Override resep Jodi Gubeng mengalahkan resep standar khusus untuk gerai Gubeng', () => {
			const resGubeng = resolveRecipe(recipes, {
				variantId: 'var-aren-iced',
				outletId: 'out-sub-01',
				atTime: '2026-08-01T10:00:00Z'
			});

			assert.ok(resGubeng);
			assert.equal(resGubeng.id, 'rcp-aren-gubeng-override');
			assert.equal(resGubeng.scope_type, 'outlet_override');

			// Di Senopati tetap mendapat resep standar v2
			const resSenopati = resolveRecipe(recipes, {
				variantId: 'var-aren-iced',
				outletId: 'out-jkt-01',
				atTime: '2026-08-01T10:00:00Z'
			});

			assert.ok(resSenopati);
			assert.equal(resSenopati.id, 'rcp-aren-v2');
		});

		it('AC-04.5 Deteksi dan tolak resep aktif yang tumpang tindih waktu untuk scope yang sama', () => {
			const overlapCandidate = {
				variant_id: 'var-aren-iced',
				scope_type: 'standard' as const,
				effective_from: '2026-03-01T00:00:00Z',
				effective_until: '2026-08-01T00:00:00Z'
			};

			const validation = validateRecipeOverlap(recipes, overlapCandidate);
			assert.equal(validation.isValid, false);
			assert.ok(validation.conflictReason?.includes('rcp-aren-v1'));
		});

		it('Pengurutan Resep: Resep aktif di atas dan resep historis/kedaluwarsa di bawah', () => {
			const atTime = '2026-08-01T00:00:00Z';
			// v1 (kedaluwarsa 2026-06-01) harus false pada 2026-08-01
			assert.equal(isRecipeActive(recipes[0], atTime), false);
			// v2 (berlaku sejak 2026-06-01, tanpa effective_until) harus true
			assert.equal(isRecipeActive(recipes[1], atTime), true);

			// Pengurutan: v2 dan gubeng-override (keduanya aktif) harus di atas v1 (historis)
			const sorted = sortRecipesByActiveStatus(recipes, atTime);
			assert.equal(sorted[sorted.length - 1].id, 'rcp-aren-v1'); // Historis berada di paling bawah
			assert.equal(isRecipeActive(sorted[0], atTime), true); // Yang paling atas adalah aktif
		});
	});

	// =========================================================================
	// Uji 4: AC-04.4 Urutan Efek Modifier (replace -> add -> multiply)
	// =========================================================================
	describe('Uji 4: AC-04.4 Efek Modifier Berantai pada Resep (§6.3)', () => {
		const baseIngredients: RecipeIngredient[] = [
			{
				id: 'b-1',
				stock_item_id: 'susu-sapi',
				stock_item_name: 'Susu Sapi Segar',
				stock_item_code: 'MLK-COW',
				quantity: '150.0000',
				serving_unit: 'ml',
				waste_pct: '0.00'
			},
			{
				id: 'b-2',
				stock_item_id: 'biji-kopi',
				stock_item_name: 'Biji Kopi House Blend',
				stock_item_code: 'COF-BLD',
				quantity: '18.0000',
				serving_unit: 'g',
				waste_pct: '0.00'
			},
			{
				id: 'b-3',
				stock_item_id: 'es-kristal',
				stock_item_name: 'Es Kristal',
				stock_item_code: 'ICE-CRIS',
				quantity: '100.0000',
				serving_unit: 'g',
				waste_pct: '0.00'
			}
		];

		it('Efek replace, add, dan multiply diterapkan sesuai urutan prioritas §6.3', () => {
			const options: ModifierOption[] = [
				{
					id: 'opt-less-ice',
					group_id: 'g-ice',
					name: 'Less Ice',
					code: 'LESS_ICE',
					price_delta: '0.00',
					is_default: false,
					sort_order: 1,
					recipe_effects: [
						{
							type: 'multiply',
							target_stock_item_id: 'es-kristal',
							target_stock_item_name: 'Es Kristal',
							multiplier: '0.5000'
						}
					]
				},
				{
					id: 'opt-susu-oat',
					group_id: 'g-milk',
					name: 'Susu Oat (Oat Milk)',
					code: 'OAT_MILK',
					price_delta: '6000.00',
					is_default: false,
					sort_order: 2,
					recipe_effects: [
						{
							type: 'replace',
							target_stock_item_id: 'susu-sapi',
							target_stock_item_name: 'Susu Sapi Segar',
							replacement_stock_item_id: 'susu-oat',
							replacement_stock_item_name: 'Oat Milk Barista Edition',
							ratio: '1.0000'
						}
					]
				},
				{
					id: 'opt-extra-shot',
					group_id: 'g-add',
					name: 'Extra Shot Espresso',
					code: 'EXTRA_SHOT',
					price_delta: '3000.00',
					is_default: false,
					sort_order: 3,
					recipe_effects: [
						{
							type: 'add',
							target_stock_item_id: 'biji-kopi',
							target_stock_item_name: 'Biji Kopi House Blend',
							added_quantity: '18.0000',
							serving_unit: 'g'
						}
					]
				}
			];

			const res = applyModifierEffects(baseIngredients, options);
			assert.equal(res.warnings.length, 0);

			// 1. Susu sapi diganti susu oat 150ml (rasio 1.0)
			const oat = res.effectiveIngredients.find((i) => i.stock_item_id === 'susu-oat');
			assert.ok(oat);
			assert.equal(oat.quantity, '150.0000');
			assert.equal(res.effectiveIngredients.some((i) => i.stock_item_id === 'susu-sapi'), false);

			// 2. Biji kopi ditambah 18g: 18 + 18 = 36g
			const coffee = res.effectiveIngredients.find((i) => i.stock_item_id === 'biji-kopi');
			assert.ok(coffee);
			assert.equal(coffee.quantity, '36.0000');

			// 3. Es dikalikan 0.5: 100 × 0.5 = 50g
			const ice = res.effectiveIngredients.find((i) => i.stock_item_id === 'es-kristal');
			assert.ok(ice);
			assert.equal(ice.quantity, '50.0000');
		});

		it('Efek replace pada bahan yang tidak ada menghasilkan peringatan tanpa galat', () => {
			const invalidOption: ModifierOption = {
				id: 'opt-invalid',
				group_id: 'g-dummy',
				name: 'Sirup Hazelnut',
				code: 'HAZEL',
				price_delta: '4000.00',
				is_default: false,
				sort_order: 1,
				recipe_effects: [
					{
						type: 'replace',
						target_stock_item_id: 'sirup-karamel', // tidak ada di resep dasar
						target_stock_item_name: 'Sirup Karamel',
						replacement_stock_item_id: 'sirup-hazelnut',
						ratio: '1.0000'
					}
				]
			};

			const res = applyModifierEffects(baseIngredients, [invalidOption]);
			assert.equal(res.warnings.length, 1);
			assert.ok(res.warnings[0].includes('tidak ditemukan'));
			// Bahan asli tidak terganggu
			assert.equal(res.effectiveIngredients.length, 3);
		});

		it('formatRecipeEffect menghasilkan label operasional ramah pengguna tanpa jargon teknis', () => {
			// 1. Replace
			const replaceEff = formatRecipeEffect({
				type: 'replace',
				target_stock_item_id: 'item-sus-01',
				target_stock_item_name: 'Susu Fresh Milk',
				replacement_stock_item_id: 'item-sus-02',
				replacement_stock_item_name: 'Susu Oat Oatly'
			});
			assert.equal(replaceEff.badgeLabel, 'Substitusi');
			assert.equal(replaceEff.detailText, 'Susu Fresh Milk ➔ Susu Oat Oatly');
			assert.equal(replaceEff.badgeClass, 'modifier-effect-replace');

			// 2. Add
			const addEff = formatRecipeEffect({
				type: 'add',
				target_stock_item_id: 'item-kop-01',
				target_stock_item_name: 'Espresso Blend',
				added_quantity: '18.0000',
				serving_unit: 'g'
			});
			assert.equal(addEff.badgeLabel, 'Tambah');
			assert.equal(addEff.detailText, '+18 g Espresso Blend');
			assert.equal(addEff.badgeClass, 'modifier-effect-add');

			// 3. Multiply less (50%)
			const multLessEff = formatRecipeEffect({
				type: 'multiply',
				target_stock_item_id: 'item-srp-01',
				target_stock_item_name: 'Gula Aren',
				multiplier: '0.5000'
			});
			assert.equal(multLessEff.badgeLabel, 'Takaran');
			assert.equal(multLessEff.detailText, '50% Gula Aren');
			assert.equal(multLessEff.badgeClass, 'modifier-effect-multiply');

			// 4. Multiply zero (0% / Tanpa Bahan)
			const multZeroEff = formatRecipeEffect({
				type: 'multiply',
				target_stock_item_id: 'item-srp-01',
				target_stock_item_name: 'Gula Aren',
				multiplier: '0.0000'
			});
			assert.equal(multZeroEff.badgeLabel, 'Tanpa Bahan');
			assert.equal(multZeroEff.detailText, '0% (Tanpa Gula Aren)');
			assert.equal(multZeroEff.badgeClass, 'modifier-effect-zero');

			// 5. Multiply extra (>1)
			const multExtraEff = formatRecipeEffect({
				type: 'multiply',
				target_stock_item_id: 'item-kop-01',
				target_stock_item_name: 'Espresso Blend',
				multiplier: '1.2500'
			});
			assert.equal(multExtraEff.badgeLabel, 'Porsi Ekstra');
			assert.equal(multExtraEff.detailText, '1.25× Espresso Blend');
			assert.equal(multExtraEff.badgeClass, 'modifier-effect-multiply');
		});
	});

	// =========================================================================
	// Uji 5: AC-04.7 Cakupan Outlet & Visibilitas Menu Khusus
	// =========================================================================
	describe('Uji 5: AC-04.7 Visibilitas Menu Berdasarkan Cakupan Outlet', () => {
		const regularMenu: MenuItem = {
			id: 'm-latte',
			name: 'Hanjo Latte',
			code: 'MNU-LAT',
			category_id: 'cat-coffee',
			status: 'active',
			scope_type: 'all_outlets',
			variants: [],
			modifier_group_ids: [],
			created_at: '2026-01-01T00:00:00Z',
			updated_at: '2026-01-01T00:00:00Z',
			version: 1
		};

		const dagoSeasonalMenu: MenuItem = {
			id: 'm-dago-peach',
			name: 'Dago Peach Cold Brew',
			code: 'MNU-DAGO-PCH',
			category_id: 'cat-coffee',
			status: 'active',
			scope_type: 'outlet_set',
			target_outlet_ids: ['out-bdg-01'], // Khusus Jodi Dago
			is_time_limited: true,
			available_from: '2026-06-01',
			available_until: '2026-12-31',
			variants: [],
			modifier_group_ids: [],
			created_at: '2026-06-01T00:00:00Z',
			updated_at: '2026-06-01T00:00:00Z',
			version: 1
		};

		it('Menu reguler all_outlets tampil di Senopati dan Dago', () => {
			assert.equal(isMenuItemVisibleForOutlet(regularMenu, 'out-jkt-01'), true);
			assert.equal(isMenuItemVisibleForOutlet(regularMenu, 'out-bdg-01'), true);
		});

		it('AC-04.7 Menu khusus Dago tampil di Jodi Dago namun tersembunyi di Jodi Senopati', () => {
			// Jodi Senopati (SM Budi)
			const visibleAtSenopati = isMenuItemVisibleForOutlet(dagoSeasonalMenu, 'out-jkt-01', '2026-10-13');
			assert.equal(visibleAtSenopati, false);

			// Jodi Dago (SM Sari)
			const visibleAtDago = isMenuItemVisibleForOutlet(dagoSeasonalMenu, 'out-bdg-01', '2026-10-13');
			assert.equal(visibleAtDago, true);
		});

		it('Menu terbatas waktu tersembunyi di luar jendela tanggal', () => {
			const expiredAtDago = isMenuItemVisibleForOutlet(dagoSeasonalMenu, 'out-bdg-01', '2027-01-15');
			assert.equal(expiredAtDago, false);
		});
	});

	// =========================================================================
	// Uji 6: Validasi Grup Modifier (min_select <= max_select)
	// =========================================================================
	describe('Uji 6: Validasi Invarian Grup Modifier', () => {
		it('Grup modifier valid diterima', () => {
			const group: Partial<ModifierGroup> = {
				name: 'Tingkat Kemanisan',
				min_select: 1,
				max_select: 1,
				options: [
					{ id: '1', group_id: 'g', name: 'Normal', code: '100', price_delta: '0.00', is_default: true, sort_order: 1, recipe_effects: [] },
					{ id: '2', group_id: 'g', name: 'Less Sugar', code: '50', price_delta: '0.00', is_default: false, sort_order: 2, recipe_effects: [] }
				]
			};

			const v = validateModifierGroup(group);
			assert.equal(v.isValid, true);
			assert.equal(v.errors.length, 0);
		});

		it('min_select melebihi max_select ditolak', () => {
			const invalidGroup: Partial<ModifierGroup> = {
				min_select: 3,
				max_select: 2,
				options: []
			};

			const v = validateModifierGroup(invalidGroup);
			assert.equal(v.isValid, false);
			assert.ok(v.errors.some((e) => e.includes('melebihi batas maksimum')));
		});
	});

	// =========================================================================
	// Uji 7: Pengujian Terintegrasi Service API & Mock Handlers
	// =========================================================================
	describe('Uji 7: Pengujian Terintegrasi Service API & Mock Handlers (AC-04.1 s/d AC-04.10)', () => {
		it('AC-04.1 Service: getPricingPreview mengembalikan 32.500 dan 28.000 presisi', async () => {
			// Skenario 1: Aren Latte (28.000) + Extra Shot (+3.000) di App (5%, nearest 500)
			const resApp = await menuService.getPricingPreview({
				variant_id: 'var-aren-iced',
				channel_code: 'app',
				option_ids: ['opt-extra-shot']
			});

			assert.equal(resApp.subtotal_before_markup, '31000.00');
			assert.equal(resApp.markup_pct, '5.00');
			assert.equal(resApp.final_price, '32500.00');

			// Skenario 2: Aren Latte di POS (markup 0%)
			const resPos = await menuService.getPricingPreview({
				variant_id: 'var-aren-iced',
				channel_code: 'pos'
			});

			assert.equal(resPos.subtotal_before_markup, '28000.00');
			assert.equal(resPos.markup_pct, '0.00');
			assert.equal(resPos.final_price, '28000.00');
		});

		it('AC-04.2 Service: getHppPreview mengembalikan 9.140 (margin 67.4%) dan 14.180 dengan extra shot', async () => {
			// 1. Aren Latte Standar
			const hppStandard = await menuService.getHppPreview({
				variant_id: 'var-aren-iced',
				outlet_id: 'out-jkt-01'
			});

			assert.equal(hppStandard.total_hpp, '9140.00');
			assert.equal(hppStandard.selling_price, '28000.00');
			assert.equal(hppStandard.gross_margin_pct, '67.4');
			assert.equal(hppStandard.is_complete, true);

			// 2. Aren Latte dengan Extra Shot
			const hppExtraShot = await menuService.getHppPreview({
				variant_id: 'var-aren-iced',
				outlet_id: 'out-jkt-01',
				option_ids: ['opt-extra-shot']
			});

			assert.equal(hppExtraShot.total_hpp, '14180.00');
		});

		it('AC-04.3 Service: Resolusi resep sebelum effective_from mengembalikan v1, sesudahnya v2', async () => {
			const v1 = await menuService.resolveRecipe({
				variant_id: 'var-aren-iced',
				outlet_id: 'out-jkt-01',
				at: '2026-03-01T00:00:00Z'
			});
			assert.equal(v1.version_number, 1);

			const v2 = await menuService.resolveRecipe({
				variant_id: 'var-aren-iced',
				outlet_id: 'out-jkt-01',
				at: '2026-08-01T00:00:00Z'
			});
			assert.equal(v2.version_number, 2);
		});

		it('AC-04.6 Service: Jodi Gubeng mendapatkan resep override lokal sedangkan Senopati resep standar', async () => {
			const resGubeng = await menuService.resolveRecipe({
				variant_id: 'var-aren-iced',
				outlet_id: 'out-sub-01',
				at: '2026-08-01T00:00:00Z'
			});
			assert.equal(resGubeng.scope_type, 'outlet_override');
			assert.equal(resGubeng.outlet_id, 'out-sub-01');

			const resSenopati = await menuService.resolveRecipe({
				variant_id: 'var-aren-iced',
				outlet_id: 'out-jkt-01',
				at: '2026-08-01T00:00:00Z'
			});
			assert.equal(resSenopati.scope_type, 'standard');
		});

		it('AC-04.5 Service: Menyimpan dua resep aktif bertanggal tumpang tindih ditolak 409 Conflict', async () => {
			setCurrentMockUser({
				id: 'usr-admin',
				name: 'HQ Master Admin',
				email: 'admin@hanjo.id',
				role: 'hq_admin',
				organization_id: 'org-jodi',
				outlet_ids: ['out-jkt-01', 'out-bdg-01', 'out-sub-01']
			});

			await assert.rejects(
				async () => {
					await menuService.createRecipe({
						variant_id: 'var-aren-iced',
						scope_type: 'standard',
						effective_from: '2026-02-01T00:00:00Z',
						effective_until: '2026-08-01T00:00:00Z',
						ingredients: [
							{
								id: 'ing-x',
								stock_item_id: 'item-kop-01',
								stock_item_name: 'Biji Kopi',
								stock_item_code: 'KOP',
								quantity: '18.0000',
								serving_unit: 'g',
								waste_pct: '0.00'
							}
						]
					});
				},
				(err: any) => {
					assert.equal(err.status, 409);
					return true;
				}
			);
		});

		it('AC-04.10 Service: Role Finance ditolak 403 Forbidden saat membuat menu item baru', async () => {
			setCurrentMockUser({
				id: 'usr-fin',
				name: 'Finance Maya',
				email: 'finance@hanjo.id',
				role: 'finance',
				organization_id: 'org-jodi',
				outlet_ids: ['out-jkt-01']
			});

			await assert.rejects(
				async () => {
					await menuService.createMenuItem({
						name: 'Menu Baru Ilegal',
						code: 'MNU-ILEGAL',
						category_id: 'cat-m-coffee'
					});
				},
				(err: any) => {
					assert.equal(err.status, 403);
					return true;
				}
			);
		});
	});
});

