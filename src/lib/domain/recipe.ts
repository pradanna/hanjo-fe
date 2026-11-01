/**
 * Logika Domain Murni: Resolusi Resep & Efek Modifier (§6.2, §6.3)
 *
 * §6.2: Resolusi Resep:
 * Untuk (varian, outlet O, waktu T): pilih resep override outlet O yang aktif pada T;
 * jika tidak ada, pilih resep standar yang aktif pada T.
 *
 * §6.3: Efek Modifier:
 * Urutan penerapan: replace -> add -> multiply.
 * Menghasilkan resep efektif dengan gross quantity = qty × (1 + waste_pct / 100).
 */

import type {
	Recipe,
	RecipeIngredient,
	EffectiveIngredient,
	ModifierOption,
	RecipeEffect,
	ISODateTime
} from '../api/contract/types.js';

export interface RecipeResolutionQuery {
	variantId: string;
	outletId?: string;
	atTime?: ISODateTime | string; // ISO UTC string, default: waktu sekarang
}

/**
 * Memilih resep yang berlaku untuk varian, outlet, dan waktu tertentu (§6.2).
 * Override outlet mengalahkan resep standar.
 */
export function resolveRecipe(
	recipes: Recipe[],
	query: RecipeResolutionQuery
): Recipe | null {
	const { variantId, outletId, atTime } = query;
	const targetTimestamp = atTime ? new Date(atTime).getTime() : Date.now();

	// Filter resep yang cocok dengan varian dan aktif pada target waktu
	const validRecipes = recipes.filter((r) => {
		if (r.variant_id !== variantId) return false;
		if (!r.is_active) return false;

		const fromTime = new Date(r.effective_from).getTime();
		if (isNaN(fromTime) || targetTimestamp < fromTime) return false;

		if (r.effective_until) {
			const untilTime = new Date(r.effective_until).getTime();
			if (!isNaN(untilTime) && targetTimestamp >= untilTime) return false;
		}

		return true;
	});

	if (validRecipes.length === 0) return null;

	// 1. Cek apakah ada resep spesifik override outlet
	if (outletId) {
		const outletOverride = validRecipes.find(
			(r) => r.scope_type === 'outlet_override' && r.outlet_id === outletId
		);
		if (outletOverride) {
			return outletOverride;
		}
	}

	// 2. Jika tidak ada override outlet, gunakan resep standar
	const standardRecipe = validRecipes.find((r) => r.scope_type === 'standard' || !r.outlet_id);
	return standardRecipe || null;
}

/**
 * Mengecek apakah resep berstatus aktif dan sedang berlaku (belum kedaluwarsa/historis).
 */
export function isRecipeActive(recipe: Recipe, atTime?: string | number): boolean {
	if (!recipe.is_active) return false;
	const targetTimestamp = atTime ? new Date(atTime).getTime() : Date.now();
	const fromTime = new Date(recipe.effective_from).getTime();
	if (!isNaN(fromTime) && targetTimestamp < fromTime) return false;

	if (recipe.effective_until) {
		const untilTime = new Date(recipe.effective_until).getTime();
		if (!isNaN(untilTime) && targetTimestamp >= untilTime) return false;
	}

	return true;
}

/**
 * Mengurutkan daftar resep:
 * 1. Resep aktif berjalan berada di paling atas
 * 2. Resep historis / tidak dipakai berada di bagian bawah
 * 3. Dalam kelompok status yang sama, nomor versi lebih tinggi (terbaru) berada di atas
 */
export function sortRecipesByActiveStatus(recipes: Recipe[], atTime?: string | number): Recipe[] {
	return [...recipes].sort((a, b) => {
		const aActive = isRecipeActive(a, atTime);
		const bActive = isRecipeActive(b, atTime);
		if (aActive && !bActive) return -1;
		if (!aActive && bActive) return 1;
		return (b.version_number || 0) - (a.version_number || 0);
	});
}

/**
 * Validasi pencegahan tumpang tindih periode aktif dua resep pada varian dan scope yang sama (AC-04.5).
 */
export function validateRecipeOverlap(
	existingRecipes: Recipe[],
	candidate: Partial<Recipe> & { variant_id: string; effective_from: string }
): { isValid: boolean; conflictReason?: string; conflictingRecipeId?: string } {
	const candFrom = new Date(candidate.effective_from).getTime();
	const candUntil = candidate.effective_until ? new Date(candidate.effective_until).getTime() : Infinity;

	if (candUntil <= candFrom) {
		return {
			isValid: false,
			conflictReason: 'Tanggal effective_until harus lebih besar dari effective_from.'
		};
	}

	const candScope = candidate.scope_type || 'standard';
	const candOutletId = candidate.outlet_id || null;

	for (const r of existingRecipes) {
		// Abaikan resep yang sama jika sedang memperbarui
		if (candidate.id && r.id === candidate.id) continue;
		if (r.variant_id !== candidate.variant_id) continue;
		if (!r.is_active) continue;

		// Cek kesesuaian scope
		const rScope = r.scope_type || 'standard';
		const rOutletId = r.outlet_id || null;

		const isSameScope =
			candScope === rScope &&
			(candScope === 'standard' || candOutletId === rOutletId);

		if (!isSameScope) continue;

		const rFrom = new Date(r.effective_from).getTime();
		const rUntil = r.effective_until ? new Date(r.effective_until).getTime() : Infinity;

		// Cek irisan rentang waktu: [candFrom, candUntil) dan [rFrom, rUntil)
		const overlaps = candFrom < rUntil && candUntil > rFrom;
		if (overlaps) {
			return {
				isValid: false,
				conflictingRecipeId: r.id,
				conflictReason: `Terdapat konflik tumpang tindih waktu dengan Resep Versi ${r.version_number} (${r.id}) yang berlaku dari ${r.effective_from} s/d ${r.effective_until || 'seterusnya'}.`
			};
		}
	}

	return { isValid: true };
}

export interface ModifierEffectResult {
	effectiveIngredients: EffectiveIngredient[];
	warnings: string[];
}

/**
 * Menerapkan efek opsi modifier pada resep dasar (§6.3, AC-04.4).
 * Urutan penerapan: 'replace' -> 'add' -> 'multiply'.
 */
export function applyModifierEffects(
	baseIngredients: RecipeIngredient[],
	selectedOptions: ModifierOption[]
): ModifierEffectResult {
	const warnings: string[] = [];

	// Kumpulkan seluruh efek dari opsi yang dipilih
	const allEffects: Array<{ effect: RecipeEffect; optionName: string }> = [];
	for (const opt of selectedOptions) {
		for (const effect of opt.recipe_effects || []) {
			allEffects.push({ effect, optionName: opt.name });
		}
	}

	// 1. Salin bahan dasar ke struktur mutasi kerja
	type WorkingItem = {
		stock_item_id: string;
		stock_item_name: string;
		stock_item_code: string;
		quantity: number;
		serving_unit: string;
		waste_pct: number;
		effectsApplied: string[];
	};

	let workingItems: WorkingItem[] = baseIngredients.map((bi) => ({
		stock_item_id: bi.stock_item_id,
		stock_item_name: bi.stock_item_name,
		stock_item_code: bi.stock_item_code,
		quantity: parseFloat(bi.quantity) || 0,
		serving_unit: bi.serving_unit,
		waste_pct: parseFloat(bi.waste_pct) || 0,
		effectsApplied: []
	}));

	// Pisahkan efek berdasarkan tipe urutan: replace -> add -> multiply (§6.3)
	const replaceEffects = allEffects.filter((e) => e.effect.type === 'replace');
	const addEffects = allEffects.filter((e) => e.effect.type === 'add');
	const multiplyEffects = allEffects.filter((e) => e.effect.type === 'multiply');

	// TAHAP 1: REPLACE
	for (const { effect, optionName } of replaceEffects) {
		const targetIndex = workingItems.findIndex(
			(item) => item.stock_item_id === effect.target_stock_item_id
		);

		if (targetIndex === -1) {
			warnings.push(
				`Efek opsi "${optionName}" (replace): Bahan target (${effect.target_stock_item_name || effect.target_stock_item_id}) tidak ditemukan dalam resep dasar.`
			);
			continue;
		}

		const current = workingItems[targetIndex];
		const ratio = effect.ratio ? parseFloat(effect.ratio) || 1.0 : 1.0;
		const newQty = current.quantity * ratio;

		workingItems[targetIndex] = {
			...current,
			stock_item_id: effect.replacement_stock_item_id || current.stock_item_id,
			stock_item_name: effect.replacement_stock_item_name || effect.target_stock_item_name || current.stock_item_name,
			quantity: newQty,
			effectsApplied: [...current.effectsApplied, `Diganti oleh "${optionName}" (rasio ${ratio})`]
		};
	}

	// TAHAP 2: ADD
	for (const { effect, optionName } of addEffects) {
		const targetIndex = workingItems.findIndex(
			(item) => item.stock_item_id === effect.target_stock_item_id
		);

		const addedQty = effect.added_quantity ? parseFloat(effect.added_quantity) || 0 : 0;

		if (targetIndex >= 0) {
			const current = workingItems[targetIndex];
			workingItems[targetIndex] = {
				...current,
				quantity: current.quantity + addedQty,
				effectsApplied: [...current.effectsApplied, `Ditambah ${addedQty} ${current.serving_unit} oleh "${optionName}"`]
			};
		} else {
			// Jika belum ada di resep dasar, tambahkan baris bahan baru
			workingItems.push({
				stock_item_id: effect.target_stock_item_id,
				stock_item_name: effect.target_stock_item_name || 'Bahan Tambahan',
				stock_item_code: '',
				quantity: addedQty,
				serving_unit: effect.serving_unit || 'pcs',
				waste_pct: 0,
				effectsApplied: [`Baris baru dari opsi "${optionName}" (+${addedQty})`]
			});
		}
	}

	// TAHAP 3: MULTIPLY
	for (const { effect, optionName } of multiplyEffects) {
		const targetIndex = workingItems.findIndex(
			(item) => item.stock_item_id === effect.target_stock_item_id
		);

		if (targetIndex === -1) {
			warnings.push(
				`Efek opsi "${optionName}" (multiply): Bahan target (${effect.target_stock_item_name || effect.target_stock_item_id}) tidak ditemukan dalam resep.`
			);
			continue;
		}

		const current = workingItems[targetIndex];
		const multiplier = effect.multiplier ? parseFloat(effect.multiplier) || 1.0 : 1.0;
		const newQty = current.quantity * multiplier;

		workingItems[targetIndex] = {
			...current,
			quantity: newQty,
			effectsApplied: [...current.effectsApplied, `Dikalikan ${multiplier} oleh "${optionName}"`]
		};
	}

	// Buat hasil EffectiveIngredient
	const effectiveIngredients: EffectiveIngredient[] = workingItems.map((item) => {
		const gross = item.quantity * (1 + item.waste_pct / 100);
		return {
			stock_item_id: item.stock_item_id,
			stock_item_name: item.stock_item_name,
			stock_item_code: item.stock_item_code,
			quantity: item.quantity.toFixed(4),
			serving_unit: item.serving_unit,
			waste_pct: item.waste_pct.toFixed(2),
			gross_quantity: gross.toFixed(4),
			source_effect: item.effectsApplied.length > 0 ? item.effectsApplied.join('; ') : undefined
		};
	});

	return {
		effectiveIngredients,
		warnings
	};
}

export interface FormattedRecipeEffect {
	type: 'replace' | 'add' | 'multiply';
	badgeLabel: string;
	detailText: string;
	badgeClass: 'modifier-effect-replace' | 'modifier-effect-add' | 'modifier-effect-multiply' | 'modifier-effect-zero';
}

/**
 * Format efek modifier resep menjadi representasi teks operasional yang ramah pengguna,
 * menggantikan formula teknis/developer ("Kali (Multiply)", "Ganti (Replace)", "Tambah (Add)").
 */
export function formatRecipeEffect(eff: RecipeEffect): FormattedRecipeEffect {
	if (eff.type === 'replace') {
		const target = eff.target_stock_item_name || eff.target_stock_item_id || 'Bahan Standar';
		const replacement = eff.replacement_stock_item_name || eff.replacement_stock_item_id;
		return {
			type: 'replace',
			badgeLabel: 'Substitusi',
			detailText: replacement ? `${target} ➔ ${replacement}` : `Ganti ke: ${target}`,
			badgeClass: 'modifier-effect-replace'
		};
	}

	if (eff.type === 'add') {
		const qty = eff.added_quantity ? parseFloat(eff.added_quantity) : 0;
		const unit = eff.serving_unit ? ` ${eff.serving_unit}` : '';
		const target = eff.target_stock_item_name || eff.target_stock_item_id || 'Bahan Tambahan';
		const qtyStr = qty > 0 ? `+${qty}${unit} ` : '+ ';
		return {
			type: 'add',
			badgeLabel: 'Tambah',
			detailText: `${qtyStr}${target}`,
			badgeClass: 'modifier-effect-add'
		};
	}

	// eff.type === 'multiply'
	const mult = eff.multiplier !== undefined && eff.multiplier !== null ? parseFloat(eff.multiplier) : 1;
	const target = eff.target_stock_item_name || eff.target_stock_item_id || 'Bahan Baku';

	if (mult === 0 || isNaN(mult)) {
		return {
			type: 'multiply',
			badgeLabel: 'Tanpa Bahan',
			detailText: `0% (Tanpa ${target})`,
			badgeClass: 'modifier-effect-zero'
		};
	}

	if (mult < 1) {
		return {
			type: 'multiply',
			badgeLabel: 'Takaran',
			detailText: `${Math.round(mult * 100)}% ${target}`,
			badgeClass: 'modifier-effect-multiply'
		};
	}

	if (mult > 1) {
		return {
			type: 'multiply',
			badgeLabel: 'Porsi Ekstra',
			detailText: `${mult}× ${target}`,
			badgeClass: 'modifier-effect-multiply'
		};
	}

	return {
		type: 'multiply',
		badgeLabel: 'Takaran',
		detailText: `100% ${target}`,
		badgeClass: 'modifier-effect-multiply'
	};
}

