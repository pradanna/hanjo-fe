<script lang="ts">
	/**
	 * Subkomponen: Tab Daftar Bahan Baku (Grid & Table View)
	 * Bagian dari modul Master Bahan (MS-03)
	 * Mengikuti Golden Rule 2 (Thin Svelte) & Golden Rule 8 (4 Screen States)
	 */
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { catalogStore } from '#lib/features/catalog/stores/catalog.svelte.js';
	import { getItemStockLevel } from '#lib/domain/catalog.js';
	import { formatRupiah } from '#lib/utils/format.js';
	import Icon from '#lib/components/data/Icon.svelte';
	import StatusBadge from '#lib/components/data/StatusBadge.svelte';
	import CodeBadge from '#lib/components/data/CodeBadge.svelte';
	import Skeleton from '#lib/components/feedback/Skeleton.svelte';
	import EmptyState from '#lib/components/feedback/EmptyState.svelte';
	import ErrorState from '#lib/components/feedback/ErrorState.svelte';
	import ActionMenu from '#lib/components/feedback/ActionMenu.svelte';
	import Pagination from '#lib/components/data/Pagination.svelte';
	import type { StockItem } from '#lib/api/contract/types.js';

	interface Props {
		canManageCatalog: boolean;
		onopenfilter: () => void;
	}

	let { canManageCatalog, onopenfilter }: Props = $props();

	let itemViewMode = $state<'grid' | 'table'>('table');
	let itemsPage = $state(1);
	let itemsPerPage = $state(10);

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

	function setItemViewMode(mode: 'grid' | 'table') {
		itemViewMode = mode;
		try {
			localStorage.setItem('hanjo_materials_view_mode', mode);
		} catch {}
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
		try {
			const saved = localStorage.getItem('hanjo_materials_view_mode');
			if (saved === 'grid' || saved === 'table') {
				itemViewMode = saved;
			}
		} catch {}
	});
</script>

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

		<!-- Tombol Filter Drawer -->
		<button
			type="button"
			class="filter-trigger-btn btn btn-secondary {activeFiltersCount > 0 ? 'filter-active' : ''}"
			onclick={onopenfilter}
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
						<CodeBadge code={item.code} />
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
						<span class="metric-label">Harga Acuan Pusat</span>
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
					<th class="text-right">Harga Acuan Pusat</th>
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
							<CodeBadge code={item.code} />
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
