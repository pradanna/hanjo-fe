<script lang="ts">
	/**
	 * Subkomponen Tab 1: Menu & Varian Siap Jual
	 * Referensi: PRD §6, MILESTONE.md §MS-04
	 */
	import { onMount } from 'svelte';
	import { menuStore } from '../../stores/menu.svelte.js';
	import { session } from '../../../../auth/session.svelte.js';
	import { can } from '../../../../auth/can.js';
	import { formatRupiah } from '../../../../utils/format.js';

	import Icon from '../../../../components/data/Icon.svelte';
	import StatusBadge from '../../../../components/data/StatusBadge.svelte';
	import CodeBadge from '../../../../components/data/CodeBadge.svelte';
	import Skeleton from '../../../../components/feedback/Skeleton.svelte';
	import EmptyState from '../../../../components/feedback/EmptyState.svelte';
	import ErrorState from '../../../../components/feedback/ErrorState.svelte';
	import Pagination from '../../../../components/data/Pagination.svelte';
	import ActionMenu from '../../../../components/feedback/ActionMenu.svelte';
	import MenuFilterDrawer from '../MenuFilterDrawer.svelte';

	let menuViewMode = $state<'grid' | 'table'>('table');
	let menuPage = $state(1);
	let menuPerPage = $state(10);
	let isFilterDrawerOpen = $state(false);

	const canManageCatalog = $derived(can(session.user, 'catalog:manage'));

	const activeFiltersCount = $derived(
		(menuStore.selectedCategoryFilter !== 'all' ? 1 : 0) +
		(menuStore.selectedScopeFilter !== 'all' ? 1 : 0) +
		(menuStore.selectedStatusFilter !== 'active' ? 1 : 0)
	);

	function resetAllFilters() {
		menuStore.selectedCategoryFilter = 'all';
		menuStore.selectedScopeFilter = 'all';
		menuStore.selectedStatusFilter = 'active';
	}

	function getCategoryName(catId: string): string {
		const cat = menuStore.categories.find((c) => c.id === catId);
		return cat ? cat.name : catId;
	}

	// Reset halaman saat filter menu berubah
	$effect(() => {
		const _ = `${menuStore.searchQuery}|${menuStore.selectedCategoryFilter}|${menuStore.selectedScopeFilter}|${menuStore.selectedStatusFilter}`;
		menuPage = 1;
	});

	const totalFilteredMenus = $derived(menuStore.filteredMenuItems.length);
	const paginatedMenus = $derived.by(() => {
		const start = (menuPage - 1) * menuPerPage;
		return menuStore.filteredMenuItems.slice(start, start + menuPerPage);
	});

	onMount(() => {
		try {
			const saved = localStorage.getItem('hanjo_menu_view_mode');
			if (saved === 'grid' || saved === 'table') {
				menuViewMode = saved;
			}
		} catch {}
	});

	function setViewMode(mode: 'grid' | 'table') {
		menuViewMode = mode;
		try {
			localStorage.setItem('hanjo_menu_view_mode', mode);
		} catch {}
	}
</script>

<div class="catalog-toolbar">
	<div class="toolbar-left">
		<!-- Pencarian Menu -->
		<div class="toolbar-search">
			<Icon name="magnifying-glass" size={15} class="toolbar-search-icon" />
			<input
				type="text"
				class="toolbar-search-input"
				placeholder="Cari nama menu, kode, varian SKU..."
				bind:value={menuStore.searchQuery}
				id="input-search-menus"
			/>
		</div>

		<!-- Tombol Filter Drawer Menu -->
		<button
			type="button"
			class="filter-trigger-btn btn btn-secondary {activeFiltersCount > 0 ? 'filter-active' : ''}"
			onclick={() => (isFilterDrawerOpen = true)}
			id="btn-filter-drawer-menu"
			aria-label="Buka filter menu"
		>
			<Icon name="funnel" size={16} />
			<span>Filter</span>
			{#if activeFiltersCount > 0}
				<span class="filter-count-badge">{activeFiltersCount}</span>
			{/if}
		</button>
	</div>

	<div class="toolbar-right">
		<!-- Toggle Pilihan Tampilan (Grid / Tabel) -->
		<div class="view-mode-toggle" role="group" aria-label="Mode Tampilan Menu">
			<button
				type="button"
				class="view-toggle-btn {menuViewMode === 'grid' ? 'active' : ''}"
				onclick={() => setViewMode('grid')}
				title="Tampilan Grid Kartu"
				id="btn-menu-view-grid"
			>
				<Icon name="squares-2x2" size={15} />
				<span class="hidden sm:inline">Grid</span>
			</button>
			<button
				type="button"
				class="view-toggle-btn {menuViewMode === 'table' ? 'active' : ''}"
				onclick={() => setViewMode('table')}
				title="Tampilan Tabel Data"
				id="btn-menu-view-table"
			>
				<Icon name="table-cells" size={15} />
				<span class="hidden sm:inline">Tabel</span>
			</button>
		</div>

		{#if canManageCatalog}
			<button
				type="button"
				class="btn btn-primary"
				onclick={() => {
					menuStore.editingMenuItem = null;
					menuStore.isMenuModalOpen = true;
				}}
				id="btn-tambah-menu"
			>
				<Icon name="plus" size={16} />
				<span>Tambah Menu Baru</span>
			</button>
		{/if}
	</div>
</div>

<!-- Active Filters Pills Bar Menu -->
{#if activeFiltersCount > 0}
	<div class="active-filters-bar" role="region" aria-label="Filter menu yang diterapkan">
		<span class="active-filters-label">Filter Aktif:</span>
		<div class="filter-pills-list">
			{#if menuStore.selectedCategoryFilter !== 'all'}
				<div class="filter-pill">
					<span>Kategori: <strong>{getCategoryName(menuStore.selectedCategoryFilter)}</strong></span>
					<button
						type="button"
						class="filter-pill-remove"
						onclick={() => (menuStore.selectedCategoryFilter = 'all')}
						title="Hapus filter kategori"
						aria-label="Hapus filter kategori"
					>
						<Icon name="x-mark" size={12} strokeWidth={2.4} />
					</button>
				</div>
			{/if}

			{#if menuStore.selectedScopeFilter !== 'all'}
				<div class="filter-pill">
					<span>Cakupan: <strong>{menuStore.selectedScopeFilter === 'all_outlets' ? 'Semua Gerai' : 'Khusus Gerai Tertentu'}</strong></span>
					<button
						type="button"
						class="filter-pill-remove"
						onclick={() => (menuStore.selectedScopeFilter = 'all')}
						title="Hapus filter cakupan gerai"
						aria-label="Hapus filter cakupan gerai"
					>
						<Icon name="x-mark" size={12} strokeWidth={2.4} />
					</button>
				</div>
			{/if}

			{#if menuStore.selectedStatusFilter !== 'active'}
				<div class="filter-pill">
					<span>Status: <strong>{menuStore.selectedStatusFilter === 'archived' ? 'Diarsipkan' : 'Semua Status'}</strong></span>
					<button
						type="button"
						class="filter-pill-remove"
						onclick={() => (menuStore.selectedStatusFilter = 'active')}
						title="Hapus filter status"
						aria-label="Hapus filter status"
					>
						<Icon name="x-mark" size={12} strokeWidth={2.4} />
					</button>
				</div>
			{/if}

			<button
				type="button"
				class="filter-reset-all-btn"
				onclick={resetAllFilters}
				aria-label="Reset semua filter menu"
			>
				Reset Semua
			</button>
		</div>
	</div>
{/if}

{#if menuStore.isLoading}
	<div class="py-8">
		<Skeleton count={6} variant="card" />
	</div>
{:else if menuStore.error}
	<ErrorState
		title="Gagal Memuat Katalog Menu"
		message={menuStore.error}
		onretry={() => menuStore.loadAll()}
	/>
{:else if menuStore.filteredMenuItems.length === 0}
	<EmptyState
		title="Tidak Ada Menu Ditemukan"
		description="Cobalah sesuaikan kriteria pencarian atau tambahkan menu siap jual baru."
	/>
{:else if menuViewMode === 'grid'}
	<!-- Grid Menu Siap Jual -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
		{#each paginatedMenus as menu}
			<div
				class="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-panel)] flex flex-col justify-between hover:border-emerald-500/50 transition cursor-pointer"
				onclick={() => menuStore.openMenuDetail(menu)}
				role="button"
				tabindex="0"
				onkeydown={(e) => e.key === 'Enter' && menuStore.openMenuDetail(menu)}
			>
				<div>
					<div class="flex items-start justify-between gap-3 mb-2">
						<div>
							<CodeBadge code={menu.code} />
							<h3 class="text-base font-bold text-[var(--text-main)] mt-1.5">{menu.name}</h3>
						</div>
						<StatusBadge status={menu.status === 'active' ? 'active' : 'inactive'} />
					</div>

					{#if menu.description}
						<p class="text-xs text-[var(--text-muted)] line-clamp-2 mb-3">{menu.description}</p>
					{/if}

					<div class="flex flex-wrap gap-1.5 mb-4">
						<span class="pill-badge pill-info">{menu.category_name}</span>
						{#if menu.scope_type === 'all_outlets'}
							<span class="pill-badge pill-success">Semua Gerai</span>
						{:else}
							<span class="pill-badge pill-warning">Khusus {menu.target_outlet_ids?.length || 0} Gerai</span>
						{/if}
					</div>
				</div>

				<div class="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
					<div class="flex flex-col">
						<span class="text-[11px] text-[var(--text-subtle)]">Harga Mulai</span>
						<span class="text-sm font-bold text-emerald-400 font-mono">
							{formatRupiah(menu.variants[0]?.base_price || 0)}
						</span>
					</div>

					<div class="flex items-center gap-2">
						<span class="text-xs text-[var(--text-muted)]">
							{menu.variants.length} Varian
						</span>
						<button
							type="button"
							class="btn btn-secondary text-xs"
							style="min-height: 38px; padding: 6px 16px;"
							onclick={(e) => {
								e.stopPropagation();
								menuStore.openMenuDetail(menu);
							}}
						>
							Detail
						</button>
					</div>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<!-- Tabel Menu Siap Jual -->
	<div class="data-table-container">
		<table class="data-table">
			<thead>
				<tr>
					<th class="w-28">Kode Menu</th>
					<th>Nama Menu</th>
					<th>Kategori</th>
					<th>Cakupan Gerai</th>
					<th>Daftar Varian &amp; Harga Dasar</th>
					<th class="text-center">Status</th>
					<th class="w-16 text-right">Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#each paginatedMenus as menu}
					<tr>
						<td><CodeBadge code={menu.code} /></td>
						<td>
							<button
								type="button"
								class="text-left font-bold text-[var(--text-main)] hover:text-emerald-400 transition cursor-pointer"
								onclick={() => menuStore.openMenuDetail(menu)}
							>
								{menu.name}
							</button>
						</td>
						<td><span class="pill-badge pill-info">{menu.category_name}</span></td>
						<td>
							{#if menu.scope_type === 'all_outlets'}
								<span class="text-xs text-emerald-400 font-medium">Seluruh Gerai</span>
							{:else}
								<span class="text-xs text-amber-400 font-medium">Khusus {menu.target_outlet_ids?.length || 0} Gerai</span>
							{/if}
						</td>
						<td>
							<div class="flex flex-wrap gap-1.5">
								{#each menu.variants as v}
									<span class="text-xs px-3 py-1 rounded-full bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--text-main)] whitespace-nowrap">
										<strong>{v.name}</strong>: <span class="font-mono text-emerald-400">{formatRupiah(v.base_price)}</span>
									</span>
								{/each}
							</div>
						</td>
						<td class="text-center">
							<StatusBadge status={menu.status === 'active' ? 'active' : 'inactive'} />
						</td>
						<td class="text-right">
							<div class="flex items-center justify-end">
								<ActionMenu
									items={[
										{
											label: 'Lihat Rincian & Resep',
											icon: 'eye',
											onclick: () => menuStore.openMenuDetail(menu)
										},
										{
											label: 'Kelola Varian (' + menu.variants.length + ')',
											icon: 'squares-2x2',
											onclick: () => menuStore.openDetailDrawer(menu, 'variants')
										},
										...(canManageCatalog
											? [
													{
														label: 'Ubah Data Menu',
														icon: 'pencil-square',
														onclick: () => {
															menuStore.editingMenuItem = menu;
															menuStore.isMenuModalOpen = true;
														}
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

<!-- Pagination Menu di Footer Panel -->
{#if menuStore.filteredMenuItems.length > 0}
	<div class="catalog-panel-footer">
		<Pagination
			page={menuPage}
			perPage={menuPerPage}
			total={totalFilteredMenus}
			perPageOptions={[10, 25, 50]}
			hrefBuilder={(p, pp) => `?tab=menus&page=${p}&per_page=${pp}`}
			onpagechange={(newPage) => (menuPage = newPage)}
			onperpagechange={(newSize) => {
				menuPerPage = newSize;
				menuPage = 1;
			}}
		/>
	</div>
{/if}

<!-- Filter Drawer Component -->
<MenuFilterDrawer bind:open={isFilterDrawerOpen} />
