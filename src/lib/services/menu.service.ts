/**
 * Service: Master Menu, Modifier, Resep Berversi, Harga Channel & Ketersediaan (MS-04)
 * Referensi: MILESTONE.md §MS-04, AGENTS.md Golden Rule 1
 *
 * Mengikuti Golden Rule 1: UI -> Domain Service -> ApiClient -> DataDriver.
 */

import { apiClient } from '../api/client.js';
import { Endpoints } from '../api/contract/endpoints.js';
import type {
	MenuItem,
	MenuCategory,
	ModifierGroup,
	ModifierOption,
	Recipe,
	ProductionRecipe,
	SalesChannel,
	ChannelMarkup,
	BasePrice,
	PriceOverride,
	MenuAvailability,
	PricingPreviewResponse,
	HppPreviewResponse
} from '../api/contract/types.js';

export interface MenuFilterQuery {
	category_id?: string;
	status?: string;
	search?: string;
	outlet_id?: string;
}

export class MenuService {
	// --------------------------------------------------------------------------
	// 1. Master Menu & Varian
	// --------------------------------------------------------------------------
	async getMenuItems(query?: MenuFilterQuery): Promise<MenuItem[]> {
		return apiClient.get<MenuItem[]>(Endpoints.MENU.ITEMS, {
			query: query as Record<string, unknown>
		});
	}

	async getMenuItem(id: string): Promise<MenuItem> {
		return apiClient.get<MenuItem>(Endpoints.MENU.ITEM_DETAIL(id));
	}

	async createMenuItem(data: Partial<MenuItem>): Promise<MenuItem> {
		return apiClient.post<MenuItem>(Endpoints.MENU.ITEMS, data);
	}

	async updateMenuItem(id: string, data: Partial<MenuItem>): Promise<MenuItem> {
		return apiClient.put<MenuItem>(Endpoints.MENU.ITEM_DETAIL(id), data);
	}

	async getCategories(): Promise<MenuCategory[]> {
		return apiClient.get<MenuCategory[]>(Endpoints.MENU.CATEGORIES);
	}

	async getCategory(id: string): Promise<MenuCategory> {
		return apiClient.get<MenuCategory>(Endpoints.MENU.CATEGORY_DETAIL(id));
	}

	async createCategory(data: Partial<MenuCategory>): Promise<MenuCategory> {
		return apiClient.post<MenuCategory>(Endpoints.MENU.CATEGORIES, data);
	}

	async updateCategory(id: string, data: Partial<MenuCategory>): Promise<MenuCategory> {
		return apiClient.put<MenuCategory>(Endpoints.MENU.CATEGORY_DETAIL(id), data);
	}

	async deleteCategory(id: string): Promise<{ success: boolean; id: string }> {
		return apiClient.delete<{ success: boolean; id: string }>(Endpoints.MENU.CATEGORY_DETAIL(id));
	}

	// --------------------------------------------------------------------------
	// 2. Modifier Groups & Efek Resep
	// --------------------------------------------------------------------------
	async getModifierGroups(): Promise<ModifierGroup[]> {
		return apiClient.get<ModifierGroup[]>(Endpoints.MENU.MODIFIER_GROUPS);
	}

	async getModifierGroup(id: string): Promise<ModifierGroup> {
		return apiClient.get<ModifierGroup>(Endpoints.MENU.MODIFIER_GROUP_DETAIL(id));
	}

	async createModifierGroup(data: Partial<ModifierGroup>): Promise<ModifierGroup> {
		return apiClient.post<ModifierGroup>(Endpoints.MENU.MODIFIER_GROUPS, data);
	}

	async updateModifierGroup(id: string, data: Partial<ModifierGroup>): Promise<ModifierGroup> {
		return apiClient.put<ModifierGroup>(Endpoints.MENU.MODIFIER_GROUP_DETAIL(id), data);
	}

	// --------------------------------------------------------------------------
	// 3. Resep Berversi & Resolusi (§6.2)
	// --------------------------------------------------------------------------
	async getRecipes(query?: { variant_id?: string; outlet_id?: string }): Promise<Recipe[]> {
		return apiClient.get<Recipe[]>(Endpoints.MENU.RECIPES, {
			query: query as Record<string, unknown>
		});
	}

	async resolveRecipe(query: { variant_id: string; outlet_id?: string; at?: string }): Promise<Recipe> {
		return apiClient.get<Recipe>(Endpoints.MENU.RECIPE_RESOLVE, {
			query: query as Record<string, unknown>
		});
	}

	async createRecipe(data: Partial<Recipe>): Promise<Recipe> {
		return apiClient.post<Recipe>(Endpoints.MENU.RECIPES, data);
	}

	async retireRecipe(id: string): Promise<Recipe> {
		return apiClient.post<Recipe>(Endpoints.MENU.RECIPE_ACTION(id, 'retire'));
	}

	// --------------------------------------------------------------------------
	// 4. Pratinjau HPP Dinamis (§6.4) & Channel Pricing (§6.1)
	// --------------------------------------------------------------------------
	async getHppPreview(query: {
		variant_id: string;
		outlet_id?: string;
		option_ids?: string[];
		at?: string;
	}): Promise<HppPreviewResponse> {
		const q: Record<string, unknown> = {
			outlet_id: query.outlet_id,
			at: query.at
		};
		if (query.option_ids && query.option_ids.length > 0) {
			q.option_ids = query.option_ids.join(',');
		}
		return apiClient.get<HppPreviewResponse>(Endpoints.MENU.HPP_PREVIEW(query.variant_id), {
			query: q
		});
	}

	async getPricingPreview(query: {
		variant_id: string;
		outlet_id?: string;
		channel_code: string;
		option_ids?: string[];
	}): Promise<PricingPreviewResponse> {
		const q: Record<string, unknown> = {
			variant_id: query.variant_id,
			outlet_id: query.outlet_id,
			channel_code: query.channel_code
		};
		if (query.option_ids && query.option_ids.length > 0) {
			q.option_ids = query.option_ids.join(',');
		}
		return apiClient.get<PricingPreviewResponse>(Endpoints.MENU.PRICING_PREVIEW, {
			query: q
		});
	}

	// --------------------------------------------------------------------------
	// 5. Sales Channels & Channel Markups
	// --------------------------------------------------------------------------
	async getSalesChannels(): Promise<SalesChannel[]> {
		return apiClient.get<SalesChannel[]>(Endpoints.MENU.CHANNELS);
	}

	async createChannelMarkup(channelId: string, data: Partial<ChannelMarkup>): Promise<ChannelMarkup> {
		return apiClient.post<ChannelMarkup>(Endpoints.MENU.CHANNEL_MARKUPS(channelId), data);
	}

	// --------------------------------------------------------------------------
	// 6. Matriks Ketersediaan Menu per Outlet & Channel
	// --------------------------------------------------------------------------
	async getMenuAvailability(query?: { outlet_id?: string }): Promise<MenuAvailability[]> {
		return apiClient.get<MenuAvailability[]>(Endpoints.MENU.AVAILABILITY, {
			query: query as Record<string, unknown>
		});
	}

	async markSoldOut(id: string, reason?: string): Promise<MenuAvailability> {
		return apiClient.post<MenuAvailability>(Endpoints.MENU.AVAILABILITY_ACTION(id, 'mark-sold-out'), {
			reason
		});
	}

	async restoreAvailability(id: string): Promise<MenuAvailability> {
		return apiClient.post<MenuAvailability>(Endpoints.MENU.AVAILABILITY_ACTION(id, 'restore'));
	}

	// --------------------------------------------------------------------------
	// 7. Resep Produksi Bahan Olahan (Flag 'production')
	// --------------------------------------------------------------------------
	async getProductionRecipes(): Promise<ProductionRecipe[]> {
		return apiClient.get<ProductionRecipe[]>(Endpoints.MENU.PRODUCTION_RECIPES);
	}
}

export const menuService = new MenuService();
