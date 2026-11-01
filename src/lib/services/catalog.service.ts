/**
 * Service: Katalog Bahan, Satuan, Konversi & Impor CSV (MS-03)
 * Referensi: MILESTONE.md §MS-03, AGENTS.md Golden Rule 1
 *
 * Mengikuti Golden Rule 1: UI -> Domain Service -> ApiClient -> DataDriver.
 */

import { apiClient } from '../api/client.js';
import { Endpoints } from '../api/contract/endpoints.js';
import type {
	StockItem,
	ItemCategory,
	Unit,
	UnitConversion,
	StockItemCostHistory,
	CsvImportPreview,
	CsvImportCommitResult,
	CategoryCsvImportPreview
} from '../api/contract/types.js';

export interface CatalogFilterQuery {
	category_id?: string;
	is_producible?: string;
	can_buy_external?: string;
	status?: string;
	search?: string;
	role?: string;
}

export class CatalogService {
	// =========================================================================
	// 1. Master Bahan Baku (Stock Items)
	// =========================================================================

	async getItems(query?: CatalogFilterQuery): Promise<StockItem[]> {
		return apiClient.get<StockItem[]>(Endpoints.CATALOG.ITEMS, {
			query: query as Record<string, unknown>
		});
	}

	async getItem(id: string, role?: string): Promise<StockItem> {
		return apiClient.get<StockItem>(Endpoints.CATALOG.ITEM_DETAIL(id), {
			query: role ? { role } : undefined
		});
	}

	async createItem(data: Partial<StockItem>): Promise<StockItem> {
		return apiClient.post<StockItem>(Endpoints.CATALOG.ITEMS, data);
	}

	async updateItem(id: string, data: Partial<StockItem>): Promise<StockItem> {
		return apiClient.put<StockItem>(Endpoints.CATALOG.ITEM_DETAIL(id), data);
	}

	async archiveItem(id: string): Promise<StockItem> {
		return apiClient.post<StockItem>(Endpoints.CATALOG.ITEM_ARCHIVE(id));
	}

	async restoreItem(id: string): Promise<StockItem> {
		return apiClient.post<StockItem>(Endpoints.CATALOG.ITEM_RESTORE(id));
	}

	async getItemCosts(id: string): Promise<StockItemCostHistory> {
		return apiClient.get<StockItemCostHistory>(Endpoints.CATALOG.ITEM_COSTS(id));
	}

	async updateItemMinStock(id: string, outlet_id: string, min_stock: string): Promise<{ success: boolean; min_stock: string }> {
		return apiClient.put<{ success: boolean; min_stock: string }>(Endpoints.CATALOG.ITEM_MIN_STOCK(id), {
			outlet_id,
			min_stock
		});
	}

	// =========================================================================
	// 2. Master Kategori Item (Categories)
	// =========================================================================

	async getCategories(): Promise<ItemCategory[]> {
		return apiClient.get<ItemCategory[]>(Endpoints.CATALOG.CATEGORIES);
	}

	async createCategory(data: Partial<ItemCategory>): Promise<ItemCategory> {
		return apiClient.post<ItemCategory>(Endpoints.CATALOG.CATEGORIES, data);
	}

	async updateCategory(id: string, data: Partial<ItemCategory>): Promise<ItemCategory> {
		return apiClient.put<ItemCategory>(`${Endpoints.CATALOG.CATEGORIES}/${id}`, data);
	}

	// =========================================================================
	// 3. Master Satuan & Konversi Satuan (Units & Conversions)
	// =========================================================================

	async getUnits(): Promise<Unit[]> {
		return apiClient.get<Unit[]>(Endpoints.CATALOG.UNITS);
	}

	async createUnit(data: Partial<Unit>): Promise<Unit> {
		return apiClient.post<Unit>(Endpoints.CATALOG.UNITS, data);
	}

	async getConversions(): Promise<UnitConversion[]> {
		return apiClient.get<UnitConversion[]>(Endpoints.CATALOG.CONVERSIONS);
	}

	async createConversion(data: Partial<UnitConversion>): Promise<UnitConversion> {
		return apiClient.post<UnitConversion>(Endpoints.CATALOG.CONVERSIONS, data);
	}

	async deleteConversion(id: string): Promise<{ success: boolean; message: string }> {
		return apiClient.delete<{ success: boolean; message: string }>(`${Endpoints.CATALOG.CONVERSIONS}/${id}`);
	}

	// =========================================================================
	// 4. Wizard Impor CSV Bahan Baku
	// =========================================================================

	async previewCsvImport(payload?: Record<string, unknown>): Promise<CsvImportPreview> {
		return apiClient.post<CsvImportPreview>(Endpoints.CATALOG.CSV_PREVIEW, payload || {});
	}

	async commitCsvImport(payload?: Record<string, unknown>): Promise<CsvImportCommitResult> {
		return apiClient.post<CsvImportCommitResult>(Endpoints.CATALOG.CSV_COMMIT, payload || {});
	}

	// =========================================================================
	// 5. Wizard Impor CSV Kategori Bahan
	// =========================================================================

	async previewCategoryCsvImport(payload?: Record<string, unknown>): Promise<CategoryCsvImportPreview> {
		return apiClient.post<CategoryCsvImportPreview>(Endpoints.CATALOG.CATEGORY_CSV_PREVIEW, payload || {});
	}

	async commitCategoryCsvImport(payload?: Record<string, unknown>): Promise<CsvImportCommitResult> {
		return apiClient.post<CsvImportCommitResult>(Endpoints.CATALOG.CATEGORY_CSV_COMMIT, payload || {});
	}
}

export const catalogService = new CatalogService();
