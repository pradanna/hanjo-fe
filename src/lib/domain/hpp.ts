/**
 * Logika Domain Murni: Kalkulasi HPP Dinamis Varian per Outlet (§6.4)
 *
 * Formula: HPP = Σ [ qty_bahan × (1 + waste_pct/100) × avg_cost_outlet(bahan) ] setelah efek modifier.
 *
 * Vektor Uji (§6.4 - Aren Latte Iced):
 * - Biji kopi: 18 g @ 280/g = 5.040
 * - Susu: 150 ml @ 18/ml = 2.700
 * - Gula aren: 20 ml @ 25/ml = 500
 * - Es: 100 g @ 3/g = 300
 * - Cup+tutup: 1 pcs @ 600/pcs = 600
 * Total HPP: 9.140
 * Harga jual: 28.000 -> Margin: (28.000 - 9.140) / 28.000 = 67.4%
 *
 * Tambahan Opsi "Extra Shot" (+18 g biji kopi @ 280):
 * Total HPP: 9.140 + 5.040 = 14.180
 */

import type {
	RecipeIngredient,
	EffectiveIngredient,
	HppIngredientCostBreakdown,
	HppPreviewResponse,
	DecimalString
} from '../api/contract/types.js';

export interface IngredientCostLookup {
	unitCost?: number | string | null;
	costSource?: 'outlet_avg_cost' | 'last_purchase_price' | 'none';
}

export interface CalculateHppParams {
	variantId: string;
	variantName?: string;
	outletId: string;
	outletName?: string;
	recipeVersionNumber?: number;
	recipeScope?: 'standard' | 'outlet_override';
	ingredients: Array<EffectiveIngredient | RecipeIngredient>;
	costMap: Record<string, IngredientCostLookup>; // stock_item_id -> { unitCost, costSource }
	basePrice?: number | string;
	modifierDelta?: number | string;
	sellingPrice?: number | string;
	warnings?: string[];
}

/**
 * Menghitung HPP total dan rincian per bahan baku berdasarkan biaya outlet (§6.4).
 */
export function calculateVariantHpp(params: CalculateHppParams): HppPreviewResponse {
	const {
		variantId,
		variantName = 'Menu Varian',
		outletId,
		outletName = 'Outlet',
		recipeVersionNumber = 1,
		recipeScope = 'standard',
		ingredients,
		costMap,
		basePrice,
		modifierDelta,
		sellingPrice = 0,
		warnings = []
	} = params;

	let totalHppNumber = 0;
	const missingCostItems: string[] = [];
	const breakdown: HppIngredientCostBreakdown[] = [];

	for (const ing of ingredients) {
		const qtyNum = parseFloat(ing.quantity) || 0;
		const wastePctNum = parseFloat(ing.waste_pct) || 0;
		const grossQtyNum = qtyNum * (1 + wastePctNum / 100);

		const costInfo = costMap[ing.stock_item_id];
		const hasValidCost =
			costInfo &&
			costInfo.unitCost !== null &&
			costInfo.unitCost !== undefined &&
			costInfo.unitCost !== '';

		let unitCostNum = 0;
		let costSource: 'outlet_avg_cost' | 'last_purchase_price' | 'none' = 'none';

		if (hasValidCost) {
			unitCostNum =
				typeof costInfo.unitCost === 'string'
					? parseFloat(costInfo.unitCost) || 0
					: Number(costInfo.unitCost);
			costSource = costInfo.costSource || 'outlet_avg_cost';
		} else {
			missingCostItems.push(ing.stock_item_name || ing.stock_item_id);
		}

		const subtotalCostNum = grossQtyNum * unitCostNum;
		totalHppNumber += subtotalCostNum;

		const effectNote = 'source_effect' in ing ? (ing as EffectiveIngredient).source_effect : undefined;

		breakdown.push({
			stock_item_id: ing.stock_item_id,
			stock_item_name: ing.stock_item_name,
			stock_item_code: ing.stock_item_code || '',
			serving_unit: ing.serving_unit,
			quantity: qtyNum.toFixed(4),
			waste_pct: wastePctNum.toFixed(2),
			gross_quantity: grossQtyNum.toFixed(4),
			unit_cost: unitCostNum.toFixed(2),
			cost_source: costSource,
			subtotal_cost: subtotalCostNum.toFixed(2),
			is_cost_missing: !hasValidCost,
			effect_note: effectNote
		});
	}

	const isComplete = missingCostItems.length === 0;

	const basePriceNum =
		basePrice !== undefined
			? typeof basePrice === 'string' ? parseFloat(basePrice) || 0 : Number(basePrice)
			: undefined;

	const modifierDeltaNum =
		modifierDelta !== undefined
			? typeof modifierDelta === 'string' ? parseFloat(modifierDelta) || 0 : Number(modifierDelta)
			: undefined;

	const sellingPriceNum =
		typeof sellingPrice === 'string' ? parseFloat(sellingPrice) || 0 : Number(sellingPrice);

	const grossMarginAmountNum = sellingPriceNum - totalHppNumber;
	const grossMarginPctNum =
		sellingPriceNum > 0 ? (grossMarginAmountNum / sellingPriceNum) * 100 : 0;

	return {
		variant_id: variantId,
		variant_name: variantName,
		outlet_id: outletId,
		outlet_name: outletName,
		recipe_version_number: recipeVersionNumber,
		recipe_scope: recipeScope,
		is_complete: isComplete,
		missing_cost_items: missingCostItems,
		total_hpp: totalHppNumber.toFixed(2),
		selling_price: sellingPriceNum.toFixed(2),
		base_price: basePriceNum !== undefined ? basePriceNum.toFixed(2) : undefined,
		modifier_delta: modifierDeltaNum !== undefined ? modifierDeltaNum.toFixed(2) : undefined,
		gross_margin_amount: grossMarginAmountNum.toFixed(2),
		gross_margin_pct: grossMarginPctNum.toFixed(1), // format "67.4"
		breakdown,
		warnings
	};
}
