/**
 * State Controller: Katalog Bahan, Satuan, Konversi, Pemasok & Impor CSV (MS-03)
 * Menggunakan Svelte 5 Runes ($state, $derived)
 *
 * Mengikuti Golden Rule 2: Logika state terpisah dari file .svelte.
 */

import { catalogService, type CatalogFilterQuery } from '../../../services/catalog.service.js';
import { supplierService, type SupplierFilterQuery } from '../../../services/supplier.service.js';
import { getItemStockLevel } from '../../../domain/catalog.js';
import { session } from '../../../auth/session.svelte.js';
import { toast } from '../../../components/feedback/toast.svelte.js';
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
} from '../../../api/contract/types.js';

export class CatalogStore {
	// =========================================================================
	// State Navigasi Tab
	// =========================================================================
	activeTab = $state<
		'items' | 'menus' | 'recipes' | 'modifiers' | 'pricing' | 'availability' | 'categories' | 'units' | 'suppliers'
	>('items');

	// =========================================================================
	// State Bahan Baku (Stock Items)
	// =========================================================================
	items = $state<StockItem[]>([]);
	categories = $state<ItemCategory[]>([]);
	units = $state<Unit[]>([]);
	conversions = $state<UnitConversion[]>([]);
	suppliers = $state<Supplier[]>([]);

	selectedCategoryFilter = $state<string>('all');
	selectedProducibleFilter = $state<'all' | 'true' | 'false'>('all');
	selectedExternalFilter = $state<'all' | 'true' | 'false'>('all');
	selectedStatusFilter = $state<'all' | 'active' | 'archived'>('active');
	selectedStockLevelFilter = $state<'all' | 'low_stock' | 'out_of_stock'>('all');
	itemSearchQuery = $state<string>('');

	// Detail & Edit Bahan
	selectedItem = $state<StockItem | null>(null);
	selectedItemCosts = $state<StockItemCostHistory | null>(null);
	isDetailDrawerOpen = $state<boolean>(false);
	detailDrawerTab = $state<'info' | 'units' | 'stock' | 'pricing' | 'min_stock' | 'recipes' | 'history'>('info');

	// Modal Form Bahan
	isItemModalOpen = $state<boolean>(false);
	editingItem = $state<StockItem | null>(null);

	// =========================================================================
	// State Kategori & Satuan
	// =========================================================================
	isCategoryModalOpen = $state<boolean>(false);
	editingCategory = $state<ItemCategory | null>(null);

	isUnitModalOpen = $state<boolean>(false);
	editingUnit = $state<Unit | null>(null);

	isConversionModalOpen = $state<boolean>(false);

	// =========================================================================
	// State Pemasok (Suppliers)
	// =========================================================================
	selectedSupplierTypeFilter = $state<'all' | 'hq_warehouse' | 'external'>('all');
	selectedSupplierStatusFilter = $state<'all' | 'active' | 'inactive'>('all');
	supplierSearchQuery = $state<string>('');

	isSupplierModalOpen = $state<boolean>(false);
	editingSupplier = $state<Supplier | null>(null);
	selectedSupplierDetail = $state<Supplier | null>(null);

	// =========================================================================
	// State Wizard Impor CSV Bahan (AC-03.4) & Kategori
	// =========================================================================
	isCsvModalOpen = $state<boolean>(false);
	csvStep = $state<'upload' | 'mapping' | 'preview' | 'success'>('upload');
	csvPreview = $state<CsvImportPreview | null>(null);
	csvCommitResult = $state<CsvImportCommitResult | null>(null);
	isCsvLoading = $state<boolean>(false);

	isCategoryCsvModalOpen = $state<boolean>(false);
	categoryCsvStep = $state<'upload' | 'preview' | 'success'>('upload');
	categoryCsvPreview = $state<CategoryCsvImportPreview | null>(null);
	categoryCsvCommitResult = $state<CsvImportCommitResult | null>(null);
	isCategoryCsvLoading = $state<boolean>(false);

	// Loading & Global Error states
	isLoading = $state<boolean>(false);
	error = $state<string | null>(null);

	// =========================================================================
	// Derived State
	// =========================================================================

	filteredItems = $derived.by(() => {
		let list = this.items;

		if (this.selectedCategoryFilter !== 'all') {
			list = list.filter((i) => i.category_id === this.selectedCategoryFilter);
		}
		if (this.selectedProducibleFilter !== 'all') {
			list = list.filter((i) =>
				this.selectedProducibleFilter === 'true' ? i.is_producible : !i.is_producible
			);
		}
		if (this.selectedExternalFilter !== 'all') {
			list = list.filter((i) =>
				this.selectedExternalFilter === 'true' ? i.can_buy_external : !i.can_buy_external
			);
		}
		if (this.selectedStatusFilter !== 'all') {
			list = list.filter((i) => i.status === this.selectedStatusFilter);
		}
		if (this.selectedStockLevelFilter !== 'all') {
			list = list.filter((i) => getItemStockLevel(i) === this.selectedStockLevelFilter);
		}
		if (this.itemSearchQuery.trim()) {
			const q = this.itemSearchQuery.toLowerCase();
			list = list.filter(
				(i) =>
					i.name.toLowerCase().includes(q) ||
					i.code.toLowerCase().includes(q) ||
					(i.hq_ref_code && i.hq_ref_code.toLowerCase().includes(q))
			);
		}
		return list;
	});

	filteredSuppliers = $derived.by(() => {
		let list = this.suppliers;

		if (this.selectedSupplierTypeFilter !== 'all') {
			list = list.filter((s) => s.type === this.selectedSupplierTypeFilter);
		}
		if (this.selectedSupplierStatusFilter !== 'all') {
			list = list.filter((s) => s.status === this.selectedSupplierStatusFilter);
		}
		if (this.supplierSearchQuery.trim()) {
			const q = this.supplierSearchQuery.toLowerCase();
			list = list.filter(
				(s) =>
					s.name.toLowerCase().includes(q) ||
					s.code.toLowerCase().includes(q) ||
					(s.city && s.city.toLowerCase().includes(q)) ||
					(s.contact_person && s.contact_person.toLowerCase().includes(q))
			);
		}
		return list;
	});

	// =========================================================================
	// Actions: Muat Data Awal
	// =========================================================================

	async loadAll(): Promise<void> {
		this.isLoading = true;
		this.error = null;
		try {
			const currentRole = session.user?.role;
			const [items, categories, units, conversions, suppliers] = await Promise.all([
				catalogService.getItems({ role: currentRole }),
				catalogService.getCategories(),
				catalogService.getUnits(),
				catalogService.getConversions(),
				supplierService.getSuppliers()
			]);
			this.items = items;
			this.categories = categories;
			this.units = units;
			this.conversions = conversions;
			this.suppliers = suppliers;
		} catch (err: any) {
			this.error = err?.message || 'Gagal memuat master data katalog.';
			toast.error(this.error || 'Galat jaringan saat memuat data');
		} finally {
			this.isLoading = false;
		}
	}

	async loadItems(): Promise<void> {
		try {
			const currentRole = session.user?.role;
			this.items = await catalogService.getItems({ role: currentRole });
		} catch (err: any) {
			toast.error(err?.message || 'Gagal memperbarui daftar bahan');
		}
	}

	// =========================================================================
	// Actions: Bahan Baku (Stock Items)
	// =========================================================================

	async openItemDetail(item: StockItem): Promise<void> {
		this.selectedItem = item;
		this.isDetailDrawerOpen = true;
		this.detailDrawerTab = 'info';
		try {
			this.selectedItemCosts = await catalogService.getItemCosts(item.id);
		} catch {
			this.selectedItemCosts = null;
		}
	}

	closeItemDetail(): void {
		this.isDetailDrawerOpen = false;
		this.selectedItem = null;
		this.selectedItemCosts = null;
	}

	openCreateItem(): void {
		this.editingItem = null;
		this.isItemModalOpen = true;
	}

	openEditItem(item: StockItem): void {
		this.editingItem = item;
		this.isItemModalOpen = true;
	}

	closeItemModal(): void {
		this.isItemModalOpen = false;
		this.editingItem = null;
	}

	async saveItem(data: Partial<StockItem>): Promise<boolean> {
		try {
			if (this.editingItem) {
				const updated = await catalogService.updateItem(this.editingItem.id, data);
				const idx = this.items.findIndex((i) => i.id === updated.id);
				if (idx !== -1) this.items[idx] = updated;
				if (this.selectedItem?.id === updated.id) this.selectedItem = updated;
				toast.success(`Bahan "${updated.name}" berhasil diperbarui`);
			} else {
				const created = await catalogService.createItem(data);
				this.items = [created, ...this.items];
				toast.success(`Bahan baru "${created.name}" berhasil ditambahkan`);
			}
			this.closeItemModal();
			return true;
		} catch (err: any) {
			toast.error(err?.message || 'Gagal menyimpan bahan baku');
			return false;
		}
	}

	async archiveItem(item: StockItem): Promise<boolean> {
		try {
			const archived = await catalogService.archiveItem(item.id);
			const idx = this.items.findIndex((i) => i.id === archived.id);
			if (idx !== -1) this.items[idx] = archived;
			if (this.selectedItem?.id === archived.id) this.selectedItem = archived;
			toast.success(`Bahan "${item.name}" berhasil diarsipkan`);
			return true;
		} catch (err: any) {
			toast.error(err?.message || 'Gagal mengarsipkan bahan baku');
			return false;
		}
	}

	async restoreItem(item: StockItem): Promise<boolean> {
		try {
			const restored = await catalogService.restoreItem(item.id);
			const idx = this.items.findIndex((i) => i.id === restored.id);
			if (idx !== -1) this.items[idx] = restored;
			if (this.selectedItem?.id === restored.id) this.selectedItem = restored;
			toast.success(`Bahan "${item.name}" berhasil diaktifkan kembali`);
			return true;
		} catch (err: any) {
			toast.error(err?.message || 'Gagal mengaktifkan bahan baku');
			return false;
		}
	}

	async updateMinStock(outletId: string, minStock: string): Promise<boolean> {
		if (!this.selectedItem) return false;
		try {
			await catalogService.updateItemMinStock(this.selectedItem.id, outletId, minStock);
			if (!this.selectedItem.stock_by_outlet) this.selectedItem.stock_by_outlet = {};
			if (!this.selectedItem.stock_by_outlet[outletId]) {
				this.selectedItem.stock_by_outlet[outletId] = { current: '0.0000', min: minStock };
			} else {
				this.selectedItem.stock_by_outlet[outletId].min = minStock;
			}
			toast.success('Batas stok minimum outlet berhasil diperbarui');
			return true;
		} catch (err: any) {
			toast.error(err?.message || 'Gagal memperbarui batas stok minimum');
			return false;
		}
	}

	// =========================================================================
	// Actions: Kategori
	// =========================================================================

	openCreateCategory(): void {
		this.editingCategory = null;
		this.isCategoryModalOpen = true;
	}

	openEditCategory(cat: ItemCategory): void {
		this.editingCategory = cat;
		this.isCategoryModalOpen = true;
	}

	closeCategoryModal(): void {
		this.isCategoryModalOpen = false;
		this.editingCategory = null;
	}

	async saveCategory(data: Partial<ItemCategory>): Promise<boolean> {
		try {
			if (this.editingCategory) {
				const updated = await catalogService.updateCategory(this.editingCategory.id, data);
				const idx = this.categories.findIndex((c) => c.id === updated.id);
				if (idx !== -1) this.categories[idx] = updated;
				toast.success(`Kategori "${updated.name}" berhasil diperbarui`);
			} else {
				const created = await catalogService.createCategory(data);
				this.categories = [...this.categories, created];
				toast.success(`Kategori "${created.name}" berhasil ditambahkan`);
			}
			this.closeCategoryModal();
			return true;
		} catch (err: any) {
			toast.error(err?.message || 'Gagal menyimpan kategori');
			return false;
		}
	}

	// =========================================================================
	// Actions: Satuan & Konversi
	// =========================================================================

	openCreateUnit(): void {
		this.editingUnit = null;
		this.isUnitModalOpen = true;
	}

	closeUnitModal(): void {
		this.isUnitModalOpen = false;
		this.editingUnit = null;
	}

	async saveUnit(data: Partial<Unit>): Promise<boolean> {
		try {
			const created = await catalogService.createUnit(data);
			this.units = [...this.units, created];
			toast.success(`Satuan "${created.name} (${created.symbol})" berhasil ditambahkan`);
			this.closeUnitModal();
			return true;
		} catch (err: any) {
			toast.error(err?.message || 'Gagal menambahkan satuan');
			return false;
		}
	}

	openCreateConversion(): void {
		this.isConversionModalOpen = true;
	}

	closeConversionModal(): void {
		this.isConversionModalOpen = false;
	}

	async saveConversion(data: Partial<UnitConversion>): Promise<boolean> {
		try {
			const created = await catalogService.createConversion(data);
			this.conversions = [...this.conversions, created];
			toast.success(`Aturan konversi "${created.description}" berhasil disimpan`);
			this.closeConversionModal();
			return true;
		} catch (err: any) {
			toast.error(err?.message || 'Gagal menyimpan aturan konversi');
			return false;
		}
	}

	async deleteConversion(id: string): Promise<boolean> {
		try {
			await catalogService.deleteConversion(id);
			this.conversions = this.conversions.filter((c) => c.id !== id);
			toast.success('Aturan konversi satuan berhasil dihapus');
			return true;
		} catch (err: any) {
			toast.error(err?.message || 'Gagal menghapus aturan konversi');
			return false;
		}
	}

	// =========================================================================
	// Actions: Pemasok (Suppliers)
	// =========================================================================

	openCreateSupplier(): void {
		this.editingSupplier = null;
		this.isSupplierModalOpen = true;
	}

	openEditSupplier(supplier: Supplier): void {
		this.editingSupplier = supplier;
		this.isSupplierModalOpen = true;
	}

	closeSupplierModal(): void {
		this.isSupplierModalOpen = false;
		this.editingSupplier = null;
	}

	openSupplierDetail(supplier: Supplier): void {
		this.selectedSupplierDetail = supplier;
	}

	closeSupplierDetail(): void {
		this.selectedSupplierDetail = null;
	}

	async saveSupplier(data: Partial<Supplier>): Promise<boolean> {
		try {
			if (this.editingSupplier) {
				const updated = await supplierService.updateSupplier(this.editingSupplier.id, data);
				const idx = this.suppliers.findIndex((s) => s.id === updated.id);
				if (idx !== -1) this.suppliers[idx] = updated;
				if (this.selectedSupplierDetail?.id === updated.id) this.selectedSupplierDetail = updated;
				toast.success(`Supplier "${updated.name}" berhasil diperbarui`);
			} else {
				const created = await supplierService.createSupplier(data);
				this.suppliers = [created, ...this.suppliers];
				toast.success(`Supplier "${created.name}" berhasil ditambahkan`);
			}
			this.closeSupplierModal();
			return true;
		} catch (err: any) {
			toast.error(err?.message || 'Gagal menyimpan supplier');
			return false;
		}
	}

	async deleteSupplier(supplier: Supplier): Promise<boolean> {
		try {
			await supplierService.deleteSupplier(supplier.id);
			this.suppliers = this.suppliers.filter((s) => s.id !== supplier.id);
			if (this.selectedSupplierDetail?.id === supplier.id) {
				this.selectedSupplierDetail = null;
			}
			toast.success(`Supplier "${supplier.name}" berhasil dihapus`);
			return true;
		} catch (err: any) {
			toast.error(err?.message || 'Gagal menghapus supplier');
			return false;
		}
	}

	// =========================================================================
	// Actions: Wizard Impor CSV Bahan (AC-03.4)
	// =========================================================================

	openCsvModal(): void {
		this.isCsvModalOpen = true;
		this.csvStep = 'upload';
		this.csvPreview = null;
		this.csvCommitResult = null;
		this.isCsvLoading = false;
	}

	closeCsvModal(): void {
		this.isCsvModalOpen = false;
		this.csvPreview = null;
		this.csvCommitResult = null;
		this.isCsvLoading = false;
	}

	async runCsvPreview(): Promise<void> {
		this.isCsvLoading = true;
		try {
			const preview = await catalogService.previewCsvImport();
			this.csvPreview = preview;
			this.csvStep = 'preview';
			toast.info(`Pratinjau CSV selesai: ${preview.valid_rows} valid, ${preview.error_rows} baris galat.`);
		} catch (err: any) {
			toast.error(err?.message || 'Gagal memproses pratinjau CSV');
		} finally {
			this.isCsvLoading = false;
		}
	}

	async runCsvCommit(): Promise<void> {
		this.isCsvLoading = true;
		try {
			const res = await catalogService.commitCsvImport();
			this.csvCommitResult = res;
			this.csvStep = 'success';
			await this.loadItems();
			toast.success(res.message);
		} catch (err: any) {
			toast.error(err?.message || 'Gagal mengommit impor data bahan');
		} finally {
			this.isCsvLoading = false;
		}
	}

	downloadCsvErrors(): void {
		if (!this.csvPreview || this.csvPreview.errors.length === 0) return;
		const headers = ['Baris', 'Kode_Galat', 'Kolom', 'Pesan_Galat', 'Data_Mentah'];
		const rows = this.csvPreview.errors.map((e) => [
			e.row_number,
			e.code,
			e.field,
			`"${e.message.replace(/"/g, '""')}"`,
			`"${JSON.stringify(e.raw_data).replace(/"/g, '""')}"`
		]);
		const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `galat_impor_bahan_${Date.now()}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		toast.info('Berkas daftar galat CSV berhasil diunduh');
	}

	// =========================================================================
	// Wizard Impor CSV Kategori
	// =========================================================================

	openCategoryCsvModal(): void {
		this.isCategoryCsvModalOpen = true;
		this.categoryCsvStep = 'upload';
		this.categoryCsvPreview = null;
		this.categoryCsvCommitResult = null;
		this.isCategoryCsvLoading = false;
	}

	closeCategoryCsvModal(): void {
		this.isCategoryCsvModalOpen = false;
	}

	async runCategoryCsvPreview(): Promise<void> {
		this.isCategoryCsvLoading = true;
		try {
			const res = await catalogService.previewCategoryCsvImport();
			this.categoryCsvPreview = res;
			this.categoryCsvStep = 'preview';
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Gagal memvalidasi berkas CSV kategori');
		} finally {
			this.isCategoryCsvLoading = false;
		}
	}

	async runCategoryCsvCommit(): Promise<void> {
		this.isCategoryCsvLoading = true;
		try {
			const res = await catalogService.commitCategoryCsvImport();
			this.categoryCsvCommitResult = res;
			this.categoryCsvStep = 'success';
			await this.loadAll();
			toast.success(res.message || 'Kategori berhasil diimpor');
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Gagal mengommit impor kategori');
		} finally {
			this.isCategoryCsvLoading = false;
		}
	}

	downloadCategoryCsvErrors(): void {
		if (!this.categoryCsvPreview || this.categoryCsvPreview.errors.length === 0) return;
		const headers = ['Baris', 'Kode_Galat', 'Kolom', 'Pesan_Galat', 'Data_Mentah'];
		const rows = this.categoryCsvPreview.errors.map((e) => [
			e.row_number,
			e.code,
			e.field,
			`"${e.message.replace(/"/g, '""')}"`,
			`"${JSON.stringify(e.raw_data).replace(/"/g, '""')}"`
		]);
		const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `galat_impor_kategori_${Date.now()}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		toast.info('Berkas daftar galat CSV kategori berhasil diunduh');
	}
}

export const catalogStore = new CatalogStore();
