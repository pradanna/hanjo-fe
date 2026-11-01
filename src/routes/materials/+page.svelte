<script lang="ts">
	/**
	 * Halaman Master Bahan Baku, Kategori, Satuan & Konversi
	 * Referensi: PRD §8, MILESTONE.md §MS-03, AGENTS.md Golden Rules 1, 2, 4, 8, 9, 10, 12, 14, 15
	 */
	import { onMount } from 'svelte';
	import { catalogStore } from '#lib/features/catalog/stores/catalog.svelte.js';
	import { session } from '#lib/auth/session.svelte.js';
	import { can } from '#lib/auth/can.js';
	import '#lib/features/catalog/catalog.css';

	import Icon from '#lib/components/data/Icon.svelte';
	import StockItemsTab from '#lib/features/catalog/components/StockItemsTab.svelte';
	import CategoriesTab from '#lib/features/catalog/components/CategoriesTab.svelte';
	import UnitsTab from '#lib/features/catalog/components/UnitsTab.svelte';
	import MaterialsFilterDrawer from '#lib/features/catalog/components/MaterialsFilterDrawer.svelte';
	import StockItemFormModal from '#lib/features/catalog/components/StockItemFormModal.svelte';
	import StockItemDetailDrawer from '#lib/features/catalog/components/StockItemDetailDrawer.svelte';
	import CategoryFormModal from '#lib/features/catalog/components/CategoryFormModal.svelte';
	import UnitFormModal from '#lib/features/catalog/components/UnitFormModal.svelte';
	import ConversionFormModal from '#lib/features/catalog/components/ConversionFormModal.svelte';
	import CsvImportModal from '#lib/features/catalog/components/CsvImportModal.svelte';
	import CategoryCsvImportModal from '#lib/features/catalog/components/CategoryCsvImportModal.svelte';

	let activeTab = $state<'items' | 'categories' | 'units'>('items');
	let isFilterDrawerOpen = $state(false);

	// Otorisasi PBAC Terpusat (Golden Rule 9)
	const canManageCatalog = $derived(can(session.user, 'catalog:manage'));

	function setTab(tab: 'items' | 'categories' | 'units') {
		activeTab = tab;
		try { window.location.hash = tab; } catch {}
	}

	onMount(() => {
		catalogStore.loadAll();
		try {
			const hash = window.location.hash.replace('#', '');
			activeTab = (hash === 'categories' || hash === 'units') ? hash : 'items';
		} catch {}
	});
</script>

<svelte:head>
	<title>Master Bahan Baku &amp; Inventaris | Hanjo ERP</title>
</svelte:head>

<div class="catalog-page-container">
	<!-- 1. Page Header -->
	<header class="catalog-page-header">
		<div class="page-header-lead">
			<div class="page-header-icon"><Icon name="cube" size={26} /></div>
			<div class="page-header-text">
				<h1 class="page-title">Master Bahan Baku &amp; Inventaris</h1>
				<p class="page-subtitle">Master inventaris bahan baku, spesifikasi penyimpanan, klasifikasi kategori, dan konversi satuan dasar.</p>
			</div>
		</div>
	</header>

	<!-- 2. Hero KPI Strip (4 Kolom Responsif) -->
	<div class="catalog-hero-stats">
		<div class="stat-box">
			<span class="stat-box-title">Total Bahan Baku</span>
			<span class="stat-box-val">{catalogStore.items.length}</span>
			<span class="stat-box-sub">Resep Menu Master</span>
		</div>
		<div class="stat-box">
			<span class="stat-box-title">Bahan Olahan Gerai</span>
			<span class="stat-box-val">{catalogStore.items.filter((i) => i.is_producible).length}</span>
			<span class="stat-box-sub">Produksi Batch Internal</span>
		</div>
		<div class="stat-box">
			<span class="stat-box-title">Kategori Bahan</span>
			<span class="stat-box-val">{catalogStore.categories.length}</span>
			<span class="stat-box-sub">Klasifikasi Grup Bahan</span>
		</div>
		<div class="stat-box">
			<span class="stat-box-title">Satuan &amp; Konversi</span>
			<span class="stat-box-val">{catalogStore.units.length} Satuan</span>
			<span class="stat-box-sub">{catalogStore.conversions.length} Aturan Konversi</span>
		</div>
	</div>

	<!-- 3. Workspace Terpadu (1 Panel Solid: Tab, Toolbar, dan Tabel Menyatu) -->
	<div class="catalog-workspace-panel">
		<nav class="catalog-tabs-nav" aria-label="Tab Master Bahan">
			<button type="button" class="catalog-tab-btn {activeTab === 'items' ? 'active' : ''}" onclick={() => setTab('items')} id="tab-bahan-baku">
				<Icon name="cube" size={16} />
				<span>Bahan Baku ({catalogStore.items.length})</span>
			</button>
			<button type="button" class="catalog-tab-btn {activeTab === 'categories' ? 'active' : ''}" onclick={() => setTab('categories')} id="tab-kategori">
				<Icon name="tag" size={16} />
				<span>Kategori ({catalogStore.categories.length})</span>
			</button>
			<button type="button" class="catalog-tab-btn {activeTab === 'units' ? 'active' : ''}" onclick={() => setTab('units')} id="tab-satuan">
				<Icon name="scale" size={16} />
				<span>Satuan &amp; Konversi ({catalogStore.units.length})</span>
			</button>
		</nav>

		{#if activeTab === 'items'}
			<StockItemsTab {canManageCatalog} onopenfilter={() => (isFilterDrawerOpen = true)} />
		{:else if activeTab === 'categories'}
			<CategoriesTab {canManageCatalog} onselectcategory={(catId) => { catalogStore.selectedCategoryFilter = catId; setTab('items'); }} />
		{:else if activeTab === 'units'}
			<UnitsTab {canManageCatalog} />
		{/if}
	</div>
</div>

<!-- Modal Dialogs & Drawers -->
<StockItemFormModal
	open={catalogStore.isItemModalOpen} item={catalogStore.editingItem}
	categories={catalogStore.categories} units={catalogStore.units}
	onclose={() => catalogStore.closeItemModal()} onsave={(data) => catalogStore.saveItem(data)}
/>
<StockItemDetailDrawer
	open={catalogStore.isDetailDrawerOpen} item={catalogStore.selectedItem}
	costHistory={catalogStore.selectedItemCosts} onclose={() => catalogStore.closeItemDetail()}
	onedit={(item) => catalogStore.openEditItem(item)} onarchive={(item) => catalogStore.archiveItem(item)}
	onrestore={(item) => catalogStore.restoreItem(item)} onupdateminstock={(outId, min) => catalogStore.updateMinStock(outId, min)}
/>
<CategoryFormModal
	open={catalogStore.isCategoryModalOpen} category={catalogStore.editingCategory}
	onclose={() => catalogStore.closeCategoryModal()} onsave={(data) => catalogStore.saveCategory(data)}
/>
<UnitFormModal
	open={catalogStore.isUnitModalOpen} onclose={() => catalogStore.closeUnitModal()} onsave={(data) => catalogStore.saveUnit(data)}
/>
<ConversionFormModal
	open={catalogStore.isConversionModalOpen} units={catalogStore.units}
	existingConversions={catalogStore.conversions} onclose={() => catalogStore.closeConversionModal()}
	onsave={(data) => catalogStore.saveConversion(data)}
/>
<CsvImportModal
	open={catalogStore.isCsvModalOpen} step={catalogStore.csvStep}
	preview={catalogStore.csvPreview} commitResult={catalogStore.csvCommitResult}
	isLoading={catalogStore.isCsvLoading} onclose={() => catalogStore.closeCsvModal()}
	onrunpreview={() => catalogStore.runCsvPreview()} onruncommit={() => catalogStore.runCsvCommit()}
	ondownloaderrors={() => catalogStore.downloadCsvErrors()}
/>
<CategoryCsvImportModal
	open={catalogStore.isCategoryCsvModalOpen} step={catalogStore.categoryCsvStep}
	preview={catalogStore.categoryCsvPreview} commitResult={catalogStore.categoryCsvCommitResult}
	isLoading={catalogStore.isCategoryCsvLoading} onclose={() => catalogStore.closeCategoryCsvModal()}
	onrunpreview={() => catalogStore.runCategoryCsvPreview()} onruncommit={() => catalogStore.runCategoryCsvCommit()}
	ondownloaderrors={() => catalogStore.downloadCategoryCsvErrors()}
/>
<MaterialsFilterDrawer open={isFilterDrawerOpen} onclose={() => (isFilterDrawerOpen = false)} />
