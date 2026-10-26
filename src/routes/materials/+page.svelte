<script lang="ts">
	/**
	 * Halaman Master Bahan Baku, Kategori, Satuan & Konversi
	 * Referensi: PRD §8, MILESTONE.md §MS-03, AGENTS.md Golden Rules 1, 2, 4, 8, 10, 12, 14, 15
	 */
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { catalogStore } from '#lib/features/catalog/stores/catalog.svelte.js';
	import { session } from '#lib/auth/session.svelte.js';
	import { can } from '#lib/auth/can.js';
	import { formatRupiah } from '#lib/utils/format.js';
	import '#lib/features/catalog/catalog.css';

	import Icon from '#lib/components/data/Icon.svelte';
	import StatusBadge from '#lib/components/data/StatusBadge.svelte';
	import Skeleton from '#lib/components/feedback/Skeleton.svelte';
	import EmptyState from '#lib/components/feedback/EmptyState.svelte';
	import ErrorState from '#lib/components/feedback/ErrorState.svelte';
	import ActionMenu from '#lib/components/feedback/ActionMenu.svelte';
	import Pagination from '#lib/components/data/Pagination.svelte';
	import Drawer from '#lib/components/feedback/Drawer.svelte';

	import StockItemFormModal from '#lib/features/catalog/components/StockItemFormModal.svelte';
	import StockItemDetailDrawer from '#lib/features/catalog/components/StockItemDetailDrawer.svelte';
	import CategoryFormModal from '#lib/features/catalog/components/CategoryFormModal.svelte';
	import UnitFormModal from '#lib/features/catalog/components/UnitFormModal.svelte';
	import ConversionFormModal from '#lib/features/catalog/components/ConversionFormModal.svelte';
	import CsvImportModal from '#lib/features/catalog/components/CsvImportModal.svelte';

	import type { StockItem } from '#lib/api/contract/types.js';

	let itemViewMode = $state<'grid' | 'table'>('table');
	let itemsPage = $state(1);
	let itemsPerPage = $state(10);

	let activeTab = $state<'items' | 'categories' | 'units'>('items');
	let isFilterDrawerOpen = $state(false);

	const activeFiltersCount = $derived(
		(catalogStore.selectedCategoryFilter !== 'all' ? 1 : 0) +
		(catalogStore.selectedProducibleFilter !== 'all' ? 1 : 0) +
		(catalogStore.selectedExternalFilter !== 'all' ? 1 : 0) +
		(catalogStore.selectedStatusFilter !== 'active' ? 1 : 0) +
		(catalogStore.selectedStockLevelFilter !== 'all' ? 1 : 0)
	);

	function resetAllFilters() {
		catalogStore.selectedCategoryFilter = 'all';
		catalogStore.selectedProducibleFilter = 'all';
		catalogStore.selectedExternalFilter = 'all';
		catalogStore.selectedStatusFilter = 'active';
		catalogStore.selectedStockLevelFilter = 'all';
	}

	function getCategoryName(catId: string): string {
		const cat = catalogStore.categories.find((c) => c.id === catId);
		return cat ? cat.name : catId;
	}

	function goToRecipesWithIngredient(item: StockItem) {
		goto(`/menu?tab=recipes&ingredient_id=${encodeURIComponent(item.id)}&ingredient_name=${encodeURIComponent(item.name)}#recipes`);
	}

	// Reset pagination saat query pencarian atau filter bahan baku berubah
	$effect(() => {
		const _ = `${catalogStore.itemSearchQuery}|${catalogStore.selectedCategoryFilter}|${catalogStore.selectedProducibleFilter}|${catalogStore.selectedExternalFilter}|${catalogStore.selectedStatusFilter}|${catalogStore.selectedStockLevelFilter}`;
		itemsPage = 1;
	});

	const totalFilteredItems = $derived(catalogStore.filteredItems.length);
	const paginatedItems = $derived.by(() => {
		const start = (itemsPage - 1) * itemsPerPage;
		return catalogStore.filteredItems.slice(start, start + itemsPerPage);
	});

	onMount(() => {
		catalogStore.loadAll();
		try {
			const saved = localStorage.getItem('hanjo_materials_view_mode');
			if (saved === 'grid' || saved === 'table') {
				itemViewMode = saved;
			}
			const hash = window.location.hash.replace('#', '');
			if (hash === 'categories' || hash === 'units') {
				activeTab = hash;
			} else {
				activeTab = 'items';
			}
		} catch {}
	});

	function setTab(tab: 'items' | 'categories' | 'units') {
		activeTab = tab;
		try {
			window.location.hash = tab;
		} catch {}
	}

	function setItemViewMode(mode: 'grid' | 'table') {
		itemViewMode = mode;
		try {
			localStorage.setItem('hanjo_materials_view_mode', mode);
		} catch {}
	}

	const userRole = $derived(session.user?.role || 'owner');
	const isStoreManager = $derived(userRole === 'store_manager' || userRole === 'cashier');
	const canManageCatalog = $derived(!isStoreManager && userRole !== 'finance');

	function getItemStockLevel(item: StockItem): 'out_of_stock' | 'low_stock' | 'normal' {
		if (item.status === 'archived') return 'normal';
		const total = parseFloat(item.current_stock || '0');
		if (total <= 0) return 'out_of_stock';

		if (item.stock_by_outlet && Object.keys(item.stock_by_outlet).length > 0) {
			const entries = Object.values(item.stock_by_outlet);
			const hasLow = entries.some((d) => {
				const curr = parseFloat(d.current || '0');
				const min = parseFloat(d.min || '0');
				return min > 0 && curr <= min;
			});
			if (hasLow) return 'low_stock';
		}

		return 'normal';
	}
</script>

<svelte:head>
	<title>Master Bahan Baku &amp; Inventaris | Hanjo ERP</title>
</svelte:head>

<div class="catalog-page-container">
	<!-- 1. Page Header -->
	<header class="catalog-page-header">
		<div class="page-header-lead">
			<div class="page-header-icon">
				<Icon name="cube" size={26} />
			</div>
			<div class="page-header-text">
				<h1 class="page-title">Master Bahan Baku &amp; Inventaris</h1>
				<p class="page-subtitle">
					Master inventaris bahan baku, spesifikasi penyimpanan, klasifikasi kategori, dan konversi satuan dasar.
				</p>
			</div>
		</div>

	</header>

	<!-- 2. Hero KPI Strip (4 Kolom Responsif) -->
	<div class="catalog-hero-stats">
		<div class="stat-box">
			<span class="stat-box-title">Total Bahan Baku</span>
			<span class="stat-box-val">{catalogStore.items.length}</span>
			<span class="stat-box-sub">BOM &amp; Resep Master</span>
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
			<button
				type="button"
				class="catalog-tab-btn {activeTab === 'items' ? 'active' : ''}"
				onclick={() => setTab('items')}
				id="tab-bahan-baku"
			>
				<Icon name="cube" size={16} />
				<span>Bahan Baku ({catalogStore.items.length})</span>
			</button>

			<button
				type="button"
				class="catalog-tab-btn {activeTab === 'categories' ? 'active' : ''}"
				onclick={() => setTab('categories')}
				id="tab-kategori"
			>
				<Icon name="tag" size={16} />
				<span>Kategori ({catalogStore.categories.length})</span>
			</button>

			<button
				type="button"
				class="catalog-tab-btn {activeTab === 'units' ? 'active' : ''}"
				onclick={() => setTab('units')}
				id="tab-satuan"
			>
				<Icon name="scale" size={16} />
				<span>Satuan &amp; Konversi ({catalogStore.units.length})</span>
			</button>
		</nav>

		<!-- TAB 1: DAFTAR BAHAN BAKU -->
		{#if activeTab === 'items'}
		<!-- Toolbar Filter & Tombol Aksi Kontekstual di Bawah Tab (Golden Rule 15) -->
		<div class="catalog-toolbar">
			<div class="toolbar-left">
				<!-- Pencarian -->
				<div class="toolbar-search">
					<Icon name="magnifying-glass" size={15} class="toolbar-search-icon" />
					<input
						type="text"
						class="toolbar-search-input"
						placeholder="Cari nama bahan, kode SKU, atau ref HQ..."
						bind:value={catalogStore.itemSearchQuery}
						id="input-search-items"
					/>
				</div>

				<!-- Tombol Filter Drawer (Menggantikan 4 dropdown inline yang sesak) -->
				<button
					type="button"
					class="filter-trigger-btn btn btn-secondary {activeFiltersCount > 0 ? 'filter-active' : ''}"
					onclick={() => (isFilterDrawerOpen = true)}
					id="btn-filter-drawer"
					aria-label="Buka filter bahan baku"
				>
					<Icon name="funnel" size={16} />
					<span>Filter</span>
					{#if activeFiltersCount > 0}
						<span class="filter-count-badge">{activeFiltersCount}</span>
					{/if}
				</button>
			</div>

			<!-- Tombol Aksi Kontekstual di Bawah Tab (Golden Rule 15) -->
			<div class="toolbar-right">
				<!-- Toggle Pilihan Tampilan (Grid / Tabel) -->
				<div class="view-mode-toggle" role="group" aria-label="Mode Tampilan Bahan">
					<button
						type="button"
						class="view-toggle-btn {itemViewMode === 'grid' ? 'active' : ''}"
						onclick={() => setItemViewMode('grid')}
						title="Tampilan Grid Kartu"
						id="btn-view-grid"
					>
						<Icon name="squares-2x2" size={15} />
						<span class="hidden sm:inline">Grid</span>
					</button>
					<button
						type="button"
						class="view-toggle-btn {itemViewMode === 'table' ? 'active' : ''}"
						onclick={() => setItemViewMode('table')}
						title="Tampilan Tabel Data"
						id="btn-view-table"
					>
						<Icon name="table-cells" size={15} />
						<span class="hidden sm:inline">Tabel</span>
					</button>
				</div>

				{#if canManageCatalog}
					<button
						type="button"
						class="btn btn-secondary"
						onclick={() => catalogStore.openCsvModal()}
						id="btn-import-csv"
					>
						<Icon name="arrow-up-tray" size={16} />
						<span>Impor CSV</span>
					</button>

					<button
						type="button"
						class="btn btn-primary"
						onclick={() => catalogStore.openCreateItem()}
						id="btn-tambah-bahan"
					>
						<Icon name="plus" size={16} />
						<span>Tambah Bahan Baru</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- Active Filters Pills Bar (Tampil jika ada filter aktif dengan tombol silang) -->
		{#if activeFiltersCount > 0}
			<div class="active-filters-bar" role="region" aria-label="Filter yang diterapkan">
				<span class="active-filters-label">Filter Aktif:</span>
				<div class="filter-pills-list">
					{#if catalogStore.selectedCategoryFilter !== 'all'}
						<div class="filter-pill">
							<span>Kategori: <strong>{getCategoryName(catalogStore.selectedCategoryFilter)}</strong></span>
							<button
								type="button"
								class="filter-pill-remove"
								onclick={() => (catalogStore.selectedCategoryFilter = 'all')}
								title="Hapus filter kategori"
								aria-label="Hapus filter kategori"
							>
								<Icon name="x-mark" size={12} strokeWidth={2.4} />
							</button>
						</div>
					{/if}

					{#if catalogStore.selectedProducibleFilter !== 'all'}
						<div class="filter-pill">
							<span>Tipe: <strong>{catalogStore.selectedProducibleFilter === 'true' ? 'Olahan Gerai' : 'Siap Pakai'}</strong></span>
							<button
								type="button"
								class="filter-pill-remove"
								onclick={() => (catalogStore.selectedProducibleFilter = 'all')}
								title="Hapus filter tipe bahan"
								aria-label="Hapus filter tipe bahan"
							>
								<Icon name="x-mark" size={12} strokeWidth={2.4} />
							</button>
						</div>
					{/if}

					{#if catalogStore.selectedExternalFilter !== 'all'}
						<div class="filter-pill">
							<span>Izin Beli: <strong>{catalogStore.selectedExternalFilter === 'true' ? 'Beli Luar (PO)' : 'Hanya Gudang HQ'}</strong></span>
							<button
								type="button"
								class="filter-pill-remove"
								onclick={() => (catalogStore.selectedExternalFilter = 'all')}
								title="Hapus filter izin beli luar"
								aria-label="Hapus filter izin beli luar"
							>
								<Icon name="x-mark" size={12} strokeWidth={2.4} />
							</button>
						</div>
					{/if}

					{#if catalogStore.selectedStatusFilter !== 'active'}
						<div class="filter-pill">
							<span>Status: <strong>{catalogStore.selectedStatusFilter === 'archived' ? 'Diarsipkan' : 'Semua Status'}</strong></span>
							<button
								type="button"
								class="filter-pill-remove"
								onclick={() => (catalogStore.selectedStatusFilter = 'active')}
								title="Hapus filter status"
								aria-label="Hapus filter status"
							>
								<Icon name="x-mark" size={12} strokeWidth={2.4} />
							</button>
						</div>
					{/if}

					{#if catalogStore.selectedStockLevelFilter !== 'all'}
						<div class="filter-pill">
							<span>Kondisi Stok: <strong>{catalogStore.selectedStockLevelFilter === 'low_stock' ? 'Hampir Habis' : 'Habis'}</strong></span>
							<button
								type="button"
								class="filter-pill-remove"
								onclick={() => (catalogStore.selectedStockLevelFilter = 'all')}
								title="Hapus filter kondisi stok"
								aria-label="Hapus filter kondisi stok"
							>
								<Icon name="x-mark" size={12} strokeWidth={2.4} />
							</button>
						</div>
					{/if}

					<button
						type="button"
						class="filter-reset-all-btn"
						onclick={resetAllFilters}
						aria-label="Reset semua filter ke kondisi awal"
					>
						Reset Semua
					</button>
				</div>
			</div>
		{/if}

		<!-- 4 Screen States Wajib (Golden Rule 8) -->
		{#if catalogStore.isLoading}
			<div class="py-8">
				<Skeleton count={6} variant="card" />
			</div>
		{:else if catalogStore.error}
			<ErrorState
				title="Gagal Memuat Katalog Bahan"
				message={catalogStore.error}
				onretry={() => catalogStore.loadAll()}
			/>
		{:else if catalogStore.filteredItems.length === 0}
			<EmptyState
				title="Tidak Ada Bahan Baku Ditemukan"
				description="Cobalah menyesuaikan kriteria filter atau tambahkan bahan baku baru ke dalam katalog."
			/>
		{:else if itemViewMode === 'grid'}
			<!-- Grid Daftar Bahan Baku (Responsive 4-Tier) -->
			<div class="items-grid">
				{#each paginatedItems as item}
					{@const stockLevel = getItemStockLevel(item)}
					<div
						class="item-card {stockLevel === 'out_of_stock' ? 'card-out-of-stock' : stockLevel === 'low_stock' ? 'card-low-stock' : ''}"
						id="item-card-{item.id}"
					>
						<div class="item-card-top">
							<div class="item-identity">
								<span class="item-code-badge">{item.code}</span>
								<h3 class="item-title">{item.name}</h3>
								<span class="item-category-tag">
									<Icon name="tag" size={13} />
									<span>{item.category_name || 'Umum'}</span>
								</span>
							</div>

							<div class="flex items-center gap-1.5">
								<StatusBadge status={item.status === 'active' ? 'active' : 'inactive'} />
								<ActionMenu
									items={[
										{
											label: 'Lihat Detail & Stok',
											icon: 'eye',
											onclick: () => catalogStore.openItemDetail(item)
										},
										...(canManageCatalog
											? [
													{
														label: 'Ubah Data Bahan',
														icon: 'pencil-square',
														onclick: () => catalogStore.openEditItem(item)
													},
													{
														divider: true,
														label: item.status === 'active' ? 'Arsipkan Bahan' : 'Aktifkan Kembali',
														icon: item.status === 'active' ? 'archive-box' : 'arrow-path',
														variant: item.status === 'active' ? ('danger' as const) : ('success' as const),
														onclick: () =>
															item.status === 'active'
																? catalogStore.archiveItem(item)
																: catalogStore.restoreItem(item)
													}
												]
											: [])
									]}
								/>
							</div>
						</div>

						<div class="item-badges-row">
							{#if item.is_producible}
								<span class="pill-badge pill-info">Bahan Olahan Gerai</span>
							{:else if !item.can_buy_external}
								<span class="pill-badge pill-warning">Hanya Suplai HQ</span>
							{:else}
								<span class="pill-badge pill-success">Boleh Beli Luar</span>
							{/if}
							{#if item.storage_temperature === 'chilled'}
								<span class="pill-badge pill-info">Kulkas (Chilled)</span>
							{:else if item.storage_temperature === 'frozen'}
								<span class="pill-badge pill-danger">Freezer (Beku)</span>
							{/if}
						</div>

						{#if item.description}
							<p class="item-desc">{item.description}</p>
						{/if}

						<!-- Sub-box Metrik Cepat -->
						<div class="item-metrics-subbox">
							<div class="metric-col">
								<span class="metric-label">Satuan Dasar</span>
								<span class="metric-val font-mono">{item.base_unit_symbol}</span>
							</div>
							<div class="metric-col">
								<span class="metric-label">Harga Ref. HQ</span>
								<span class="metric-val text-xs">{formatRupiah(item.hq_ref_price || 0)}</span>
							</div>
						</div>

						<div class="item-card-footer">
							{#if (item.recipes_using_count || 0) > 0}
								<button
									type="button"
									class="recipe-card-link"
									onclick={() => goToRecipesWithIngredient(item)}
									title={`Klik untuk melihat ${item.recipes_using_count} resep yang menggunakan ${item.name}`}
								>
									<span>Dipakai di <strong>{item.recipes_using_count} resep</strong></span>
									<Icon name="arrow-top-right-on-square" size={11} />
								</button>
							{:else}
								<span class="text-xs text-[var(--text-subtle)]">
									Dipakai di <strong>0 resep</strong>
								</span>
							{/if}
							<button
								type="button"
								class="btn btn-secondary text-xs"
								style="min-height: 32px; padding: 4px 12px;"
								onclick={() => catalogStore.openItemDetail(item)}
							>
								<span>Lihat Stok</span>
								<Icon name="arrow-right" size={13} />
							</button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<!-- Tabel Daftar Bahan Baku (High-Density Data Table) -->
			<div class="data-table-container">
				<table class="data-table items-table">
					<thead>
						<tr>
							<th class="w-32">Kode SKU</th>
							<th>Nama Bahan Baku</th>
							<th>Kategori</th>
							<th class="text-center">Satuan Dasar</th>
							<th class="text-right">Harga Ref. HQ</th>
							<th class="text-center">Resep</th>
							<th class="text-center">Status</th>
							<th class="text-right w-20">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedItems as item}
							{@const stockLevel = getItemStockLevel(item)}
							<tr
								id="item-row-{item.id}"
								class={stockLevel === 'out_of_stock' ? 'row-out-of-stock' : stockLevel === 'low_stock' ? 'row-low-stock' : ''}
								title={stockLevel === 'out_of_stock' ? 'Stok Habis (0)' : stockLevel === 'low_stock' ? 'Stok Menipis (di bawah batas minimum gerai)' : undefined}
							>
								<td>
									<span class="item-code-badge">{item.code}</span>
								</td>
								<td>
									<button
										type="button"
										class="text-left font-bold text-[var(--text-main)] hover:text-emerald-400 transition cursor-pointer"
										onclick={() => catalogStore.openItemDetail(item)}
									>
										{item.name}
									</button>
								</td>
								<td>
									<span class="item-category-tag">
										<Icon name="tag" size={12} />
										<span>{item.category_name || 'Umum'}</span>
									</span>
								</td>
								<td class="text-center">
									<span class="font-mono font-semibold px-2.5 py-1 rounded bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--text-main)] text-xs">
										{item.base_unit_symbol}
									</span>
								</td>
								<td class="text-right">
									<span class="font-mono font-bold text-emerald-400">
										{formatRupiah(item.hq_ref_price || 0)}
									</span>
								</td>
								<td class="text-center">
									{#if (item.recipes_using_count || 0) > 0}
										<button
											type="button"
											class="recipe-count-badge"
											onclick={() => goToRecipesWithIngredient(item)}
											title={`Klik untuk melihat ${item.recipes_using_count} formula resep yang menggunakan ${item.name}`}
										>
											<span>{item.recipes_using_count} resep</span>
											<Icon name="arrow-top-right-on-square" size={11} />
										</button>
									{:else}
										<span class="text-xs text-[var(--text-subtle)] font-mono">0 resep</span>
									{/if}
								</td>
								<td class="text-center">
									<StatusBadge status={item.status === 'active' ? 'active' : 'inactive'} />
								</td>
								<td class="text-right">
									<div class="flex items-center justify-end">
										<ActionMenu
											items={[
												{
													label: 'Lihat Detail & Stok',
													icon: 'eye',
													onclick: () => catalogStore.openItemDetail(item)
												},
												...(canManageCatalog
													? [
															{
																label: 'Ubah Data Bahan',
																icon: 'pencil-square',
																onclick: () => catalogStore.openEditItem(item)
															},
															{
																divider: true,
																label: item.status === 'active' ? 'Arsipkan Bahan' : 'Aktifkan Kembali',
																icon: item.status === 'active' ? 'archive-box' : 'arrow-path',
																variant: item.status === 'active' ? ('danger' as const) : ('success' as const),
																onclick: () =>
																	item.status === 'active'
																		? catalogStore.archiveItem(item)
																		: catalogStore.restoreItem(item)
															}
														]
													: [])
											]}
										/>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<!-- Pagination Terpadu di Footer Panel -->
		{#if catalogStore.filteredItems.length > 0}
			<div class="catalog-panel-footer">
				<Pagination
					page={itemsPage}
					perPage={itemsPerPage}
					total={totalFilteredItems}
					perPageOptions={[10, 25, 50]}
					hrefBuilder={(p, pp) => `?tab=items&page=${p}&per_page=${pp}`}
					onpagechange={(newPage) => (itemsPage = newPage)}
					onperpagechange={(newSize) => {
						itemsPerPage = newSize;
						itemsPage = 1;
					}}
				/>
			</div>
		{/if}

	<!-- TAB 2: MASTER KATEGORI -->
	{:else if activeTab === 'categories'}
		<div class="catalog-toolbar">
			<div class="toolbar-left">
				<span class="text-xs text-[var(--text-muted)] font-medium">
					Kelola klasifikasi bahan baku untuk pelaporan dan pengaturan POS.
				</span>
			</div>
			<div class="toolbar-right">
				{#if canManageCatalog}
					<button
						type="button"
						class="btn btn-primary"
						onclick={() => catalogStore.openCreateCategory()}
						id="btn-tambah-kategori"
					>
						<Icon name="plus" size={16} />
						<span>Tambah Kategori Baru</span>
					</button>
				{/if}
			</div>
		</div>

		<div class="data-table-container">
			<table class="data-table">
				<thead>
					<tr>
						<th>Kode</th>
						<th>Nama Kategori</th>
						<th>Deskripsi</th>
						<th>Jumlah Bahan Terdaftar</th>
						{#if canManageCatalog}
							<th class="w-24 text-right">Aksi</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each catalogStore.categories as cat}
						<tr>
							<td class="font-mono font-bold text-emerald-400">{cat.code}</td>
							<td><strong class="text-[var(--text-main)]">{cat.name}</strong></td>
							<td class="text-xs text-[var(--text-muted)]">{cat.description || '-'}</td>
							<td>
								<span class="pill-badge pill-info font-mono">{cat.item_count || 0} bahan</span>
							</td>
							{#if canManageCatalog}
								<td class="text-right">
									<button
										type="button"
										class="px-2.5 py-1 text-xs rounded bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
										onclick={() => catalogStore.openEditCategory(cat)}
									>
										Ubah
									</button>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

	<!-- TAB 3: SATUAN UKURAN & KONVERSI -->
	{:else if activeTab === 'units'}
		<!-- Section 1: Master Satuan Ukuran -->
		<div class="catalog-section-bar">
			<div class="toolbar-left">
				<div class="flex flex-col gap-0.5">
					<h3 class="text-sm font-bold text-[var(--text-main)]">Master Satuan Ukuran (Units of Measurement)</h3>
					<span class="text-xs text-[var(--text-subtle)]">Daftar satuan standar untuk kuantitas inventaris dan resep master</span>
				</div>
			</div>
			<div class="toolbar-right">
				{#if canManageCatalog}
					<button
						type="button"
						class="btn btn-primary text-xs"
						style="min-height: 36px;"
						onclick={() => catalogStore.openCreateUnit()}
						id="btn-tambah-satuan"
					>
						<Icon name="plus" size={14} />
						<span>Tambah Satuan</span>
					</button>
				{/if}
			</div>
		</div>

		<div class="data-table-container">
			<table class="data-table">
				<thead>
					<tr>
						<th>Simbol Satuan</th>
						<th>Nama Lengkap</th>
						<th>Tipe Besaran</th>
						<th>Status Sistem</th>
					</tr>
				</thead>
				<tbody>
					{#each catalogStore.units as u}
						<tr>
							<td class="font-mono font-bold text-emerald-400">{u.symbol}</td>
							<td><strong class="text-[var(--text-main)]">{u.name}</strong></td>
							<td><span class="capitalize text-xs text-[var(--text-muted)]">{u.type}</span></td>
							<td>
								{#if u.is_system}
									<span class="pill-badge pill-info">Baku Sistem</span>
								{:else}
									<span class="pill-badge pill-success">Kustom</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Section 2: Aturan Konversi Satuan -->
		<div class="catalog-section-bar">
			<div class="toolbar-left">
				<div class="flex flex-col gap-0.5">
					<h3 class="text-sm font-bold text-[var(--text-main)]">Aturan Konversi Antar-Satuan (Bebas Siklus)</h3>
					<span class="text-xs text-[var(--text-subtle)]">Konversi terverifikasi mencegah siklus rekursif (AC-03.2)</span>
				</div>
			</div>
			<div class="toolbar-right">
				{#if canManageCatalog}
					<button
						type="button"
						class="btn btn-primary text-xs"
						style="min-height: 36px;"
						onclick={() => catalogStore.openCreateConversion()}
						id="btn-tambah-konversi"
					>
						<Icon name="plus" size={14} />
						<span>Tambah Aturan Konversi</span>
					</button>
				{/if}
			</div>
		</div>

		<div class="data-table-container">
			<table class="data-table">
				<thead>
					<tr>
						<th>Dari Satuan</th>
						<th>Ke Satuan</th>
						<th>Faktor Pengali</th>
						<th>Formula Hubungan</th>
						{#if canManageCatalog}
							<th class="w-24 text-right">Aksi</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each catalogStore.conversions as conv}
						<tr>
							<td class="font-mono font-bold text-[var(--text-main)]">{conv.from_unit_symbol}</td>
							<td class="font-mono font-bold text-emerald-400">{conv.to_unit_symbol}</td>
							<td class="font-mono font-semibold">{parseFloat(conv.factor).toLocaleString('id-ID')}</td>
							<td class="text-xs text-[var(--text-muted)]">{conv.description}</td>
							{#if canManageCatalog}
								<td class="text-right">
									<button
										type="button"
										class="px-2 py-1 text-xs rounded text-rose-400 hover:bg-rose-500/10 transition"
										onclick={() => catalogStore.deleteConversion(conv.id)}
									>
										Hapus
									</button>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
</div>

<!-- MODAL DIALOGS MASTER BAHAN -->
<StockItemFormModal
	open={catalogStore.isItemModalOpen}
	item={catalogStore.editingItem}
	categories={catalogStore.categories}
	units={catalogStore.units}
	onclose={() => catalogStore.closeItemModal()}
	onsave={(data) => catalogStore.saveItem(data)}
/>

<StockItemDetailDrawer
	open={catalogStore.isDetailDrawerOpen}
	item={catalogStore.selectedItem}
	costHistory={catalogStore.selectedItemCosts}
	onclose={() => catalogStore.closeItemDetail()}
	onedit={(item) => catalogStore.openEditItem(item)}
	onarchive={(item) => catalogStore.archiveItem(item)}
	onrestore={(item) => catalogStore.restoreItem(item)}
	onupdateminstock={(outId, min) => catalogStore.updateMinStock(outId, min)}
/>

<CategoryFormModal
	open={catalogStore.isCategoryModalOpen}
	category={catalogStore.editingCategory}
	onclose={() => catalogStore.closeCategoryModal()}
	onsave={(data) => catalogStore.saveCategory(data)}
/>

<UnitFormModal
	open={catalogStore.isUnitModalOpen}
	onclose={() => catalogStore.closeUnitModal()}
	onsave={(data) => catalogStore.saveUnit(data)}
/>

<ConversionFormModal
	open={catalogStore.isConversionModalOpen}
	units={catalogStore.units}
	existingConversions={catalogStore.conversions}
	onclose={() => catalogStore.closeConversionModal()}
	onsave={(data) => catalogStore.saveConversion(data)}
/>

<CsvImportModal
	open={catalogStore.isCsvModalOpen}
	step={catalogStore.csvStep}
	preview={catalogStore.csvPreview}
	commitResult={catalogStore.csvCommitResult}
	isLoading={catalogStore.isCsvLoading}
	onclose={() => catalogStore.closeCsvModal()}
	onrunpreview={() => catalogStore.runCsvPreview()}
	onruncommit={() => catalogStore.runCsvCommit()}
	ondownloaderrors={() => catalogStore.downloadCsvErrors()}
/>

<!-- DRAWER FILTER BAHAN BAKU -->
<Drawer
	open={isFilterDrawerOpen}
	title="Filter Bahan Baku"
	subtitle="Penyaringan katalog inventaris bahan baku"
	width="420px"
	onclose={() => (isFilterDrawerOpen = false)}
>
	<div class="filter-drawer-form">
		<div class="filter-drawer-field">
			<label for="drawer-filter-cat" class="filter-drawer-label">Kategori Bahan</label>
			<p class="filter-drawer-desc">Saring berdasarkan grup klasifikasi bahan</p>
			<select
				id="drawer-filter-cat"
				class="filter-drawer-select"
				bind:value={catalogStore.selectedCategoryFilter}
			>
				<option value="all">Semua Kategori ({catalogStore.categories.length})</option>
				{#each catalogStore.categories as cat}
					<option value={cat.id}>{cat.name}</option>
				{/each}
			</select>
		</div>

		<div class="filter-drawer-field">
			<label for="drawer-filter-producible" class="filter-drawer-label">Tipe Pengolahan Bahan</label>
			<p class="filter-drawer-desc">Bahan mentah siap pakai vs bahan olahan internal dapur</p>
			<select
				id="drawer-filter-producible"
				class="filter-drawer-select"
				bind:value={catalogStore.selectedProducibleFilter}
			>
				<option value="all">Semua Tipe Bahan</option>
				<option value="true">Bahan Olahan Gerai (Produksi Internal)</option>
				<option value="false">Bahan Baku Siap Pakai (Direct Raw)</option>
			</select>
		</div>

		<div class="filter-drawer-field">
			<label for="drawer-filter-external" class="filter-drawer-label">Izin Pembelian Langsung (PO Luar)</label>
			<p class="filter-drawer-desc">Hak gerai membeli langsung dari pemasok lokal</p>
			<select
				id="drawer-filter-external"
				class="filter-drawer-select"
				bind:value={catalogStore.selectedExternalFilter}
			>
				<option value="all">Semua Izin Beli</option>
				<option value="true">Boleh Beli Luar (PO Langsung)</option>
				<option value="false">Hanya Melalui Gudang HQ</option>
			</select>
		</div>

		<div class="filter-drawer-field">
			<label for="drawer-filter-status" class="filter-drawer-label">Status Bahan Baku</label>
			<p class="filter-drawer-desc">Tampilkan bahan baku yang aktif digunakan atau diarsipkan</p>
			<select
				id="drawer-filter-status"
				class="filter-drawer-select"
				bind:value={catalogStore.selectedStatusFilter}
			>
				<option value="active">Bahan Aktif (Operasional)</option>
				<option value="archived">Diarsipkan (Nonaktif)</option>
				<option value="all">Semua Status</option>
			</select>
		</div>

		<div class="filter-drawer-field">
			<label for="drawer-filter-stock-level" class="filter-drawer-label">Kondisi Stok</label>
			<p class="filter-drawer-desc">Saring bahan yang stoknya hampir habis atau habis</p>
			<select
				id="drawer-filter-stock-level"
				class="filter-drawer-select"
				bind:value={catalogStore.selectedStockLevelFilter}
			>
				<option value="all">Semua</option>
				<option value="low_stock">Hampir Habis</option>
				<option value="out_of_stock">Habis</option>
			</select>
		</div>
	</div>

	{#snippet footer()}
		<div class="flex items-center justify-between w-full gap-3">
			<button
				type="button"
				class="btn btn-secondary"
				onclick={resetAllFilters}
				disabled={activeFiltersCount === 0}
			>
				Reset Filter
			</button>
			<button
				type="button"
				class="btn btn-primary"
				onclick={() => (isFilterDrawerOpen = false)}
			>
				Terapkan Filter {#if activeFiltersCount > 0}({activeFiltersCount}){/if}
			</button>
		</div>
	{/snippet}
</Drawer>
