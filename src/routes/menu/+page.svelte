<script lang="ts">
	/**
	 * Halaman Menu, Varian, Resep Berversi (BOM), Modifier & Ketersediaan Gerai
	 * Referensi: PRD §6, MILESTONE.md §MS-04, AGENTS.md Golden Rules 1, 2, 4, 8, 10, 12, 14, 15
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { menuStore } from '#lib/features/menu/stores/menu.svelte.js';
	import { catalogStore } from '#lib/features/catalog/stores/catalog.svelte.js';
	import { session } from '#lib/auth/session.svelte.js';
	import { can } from '#lib/auth/can.js';
	import { formatRupiah } from '#lib/utils/format.js';
	import { calculateChannelPrice } from '#lib/domain/pricing.js';
	import { DEMO_OUTLETS } from '#lib/auth/scope.js';

	import '#lib/features/catalog/catalog.css';
	import '#lib/features/menu/menu.css';

	import Icon from '#lib/components/data/Icon.svelte';
	import StatusBadge from '#lib/components/data/StatusBadge.svelte';
	import Skeleton from '#lib/components/feedback/Skeleton.svelte';
	import EmptyState from '#lib/components/feedback/EmptyState.svelte';
	import ErrorState from '#lib/components/feedback/ErrorState.svelte';
	import Pagination from '#lib/components/data/Pagination.svelte';
	import Drawer from '#lib/components/feedback/Drawer.svelte';

	import MenuItemDetailDrawer from '#lib/features/menu/components/MenuItemDetailDrawer.svelte';
	import MenuItemFormModal from '#lib/features/menu/components/MenuItemFormModal.svelte';
	import MenuCategoryFormModal from '#lib/features/menu/components/MenuCategoryFormModal.svelte';
	import RecipeEditorModal from '#lib/features/menu/components/RecipeEditorModal.svelte';
	import ModifierGroupFormModal from '#lib/features/menu/components/ModifierGroupFormModal.svelte';
	import PricingCalculatorModal from '#lib/features/menu/components/PricingCalculatorModal.svelte';
	import HppSimulationPanel from '#lib/features/menu/components/HppSimulationPanel.svelte';

	let menuViewMode = $state<'grid' | 'table'>('table');
	let menuPage = $state(1);
	let menuPerPage = $state(10);

	let activeTab = $state<'menus' | 'categories' | 'recipes' | 'modifiers' | 'pricing' | 'availability'>('menus');
	let isFilterDrawerOpen = $state(false);

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

	// Sinkronisasi URL query parameter (mis. /menu?tab=recipes&ingredient_id=item-kop-01)
	$effect(() => {
		const tabParam = page.url.searchParams.get('tab');
		const ingredientParam = page.url.searchParams.get('ingredient_id') || page.url.searchParams.get('ingredient');
		const hash = page.url.hash.replace('#', '');

		if (tabParam && ['menus', 'categories', 'recipes', 'modifiers', 'pricing', 'availability'].includes(tabParam)) {
			activeTab = tabParam as any;
		} else if (hash && ['menus', 'categories', 'recipes', 'modifiers', 'pricing', 'availability'].includes(hash)) {
			activeTab = hash as any;
		}

		if (ingredientParam) {
			menuStore.recipeIngredientFilter = ingredientParam;
		}
	});

	const totalFilteredMenus = $derived(menuStore.filteredMenuItems.length);
	const paginatedMenus = $derived.by(() => {
		const start = (menuPage - 1) * menuPerPage;
		return menuStore.filteredMenuItems.slice(start, start + menuPerPage);
	});

	onMount(() => {
		catalogStore.loadAll();
		menuStore.loadAll();
		try {
			const saved = localStorage.getItem('hanjo_menu_view_mode');
			if (saved === 'grid' || saved === 'table') {
				menuViewMode = saved;
			}
			const hash = window.location.hash.replace('#', '');
			if (hash && ['menus', 'categories', 'recipes', 'modifiers', 'pricing', 'availability'].includes(hash)) {
				activeTab = hash as any;
			} else if (hash === 'proposals') {
				activeTab = 'recipes';
			}
		} catch {}
	});

	function setTab(tab: 'menus' | 'categories' | 'recipes' | 'modifiers' | 'pricing' | 'availability') {
		activeTab = tab;
		try {
			window.location.hash = tab;
		} catch {}
	}

	const userRole = $derived(session.user?.role || 'owner');
	const isStoreManager = $derived(userRole === 'store_manager' || userRole === 'cashier');
	const canManageCatalog = $derived(!isStoreManager && userRole !== 'finance');
</script>

<svelte:head>
	<title>Menu &amp; Resep | Hanjo ERP</title>
</svelte:head>

<div class="catalog-page-container">
	<!-- 1. Page Header -->
	<header class="catalog-page-header">
		<div class="page-header-lead">
			<div class="page-header-icon">
				<Icon name="book-open" size={26} />
			</div>
			<div class="page-header-text">
				<h1 class="page-title">Katalog Menu &amp; Resep</h1>
				<p class="page-subtitle">
					Master menu siap jual, formula resep berversi (BOM), modifier opsional, margin HPP, dan ketersediaan per gerai.
				</p>
			</div>
		</div>

	</header>

	<!-- 2. Hero KPI Strip (4 Kolom Responsif) -->
	<div class="catalog-hero-stats">
		<div class="stat-box">
			<span class="stat-box-title">Menu Siap Jual</span>
			<span class="stat-box-val">{menuStore.menuItems.length}</span>
			<span class="stat-box-sub">{menuStore.totalVariantsCount} Varian Aktif</span>
		</div>

		<div class="stat-box">
			<span class="stat-box-title">Resep Berversi</span>
			<span class="stat-box-val">{menuStore.recipes.length}</span>
			<span class="stat-box-sub">Formula BOM &amp; Override</span>
		</div>

		<div class="stat-box">
			<span class="stat-box-title">Grup Modifier</span>
			<span class="stat-box-val">{menuStore.modifierGroups.length} Grup</span>
			<span class="stat-box-sub">Opsi Tambahan &amp; Efek Resep</span>
		</div>

		<div class="stat-box">
			<span class="stat-box-title">Channel Penjualan</span>
			<span class="stat-box-val">{menuStore.channels.length} Channel</span>
			<span class="stat-box-sub">Dine-In, App, Marketplace</span>
		</div>
	</div>

	<!-- 3. Workspace Terpadu Menu & Resep (1 Panel Solid) -->
	<div class="catalog-workspace-panel">
		<nav class="catalog-tabs-nav" aria-label="Tab Menu dan Resep">
			<button
				type="button"
				class="catalog-tab-btn {activeTab === 'menus' ? 'active' : ''}"
				onclick={() => setTab('menus')}
				id="tab-menu-siap-jual"
			>
				<Icon name="book-open" size={16} />
				<span>Menu &amp; Varian ({menuStore.menuItems.length})</span>
			</button>

			<button
				type="button"
				class="catalog-tab-btn {activeTab === 'categories' ? 'active' : ''}"
				onclick={() => setTab('categories')}
				id="tab-kategori-menu"
			>
				<Icon name="tag" size={16} />
				<span>Kategori Menu ({menuStore.categories.length})</span>
			</button>

		<button
			type="button"
			class="catalog-tab-btn {activeTab === 'recipes' ? 'active' : ''}"
			onclick={() => setTab('recipes')}
			id="tab-resep-berversi"
		>
			<Icon name="clipboard-document-list" size={16} />
			<span>Resep &amp; HPP ({menuStore.recipes.length})</span>
		</button>

		<button
			type="button"
			class="catalog-tab-btn {activeTab === 'modifiers' ? 'active' : ''}"
			onclick={() => setTab('modifiers')}
			id="tab-modifier"
		>
			<Icon name="sparkles" size={16} />
			<span>Modifier &amp; Efek ({menuStore.modifierGroups.length})</span>
		</button>

		<button
			type="button"
			class="catalog-tab-btn {activeTab === 'pricing' ? 'active' : ''}"
			onclick={() => setTab('pricing')}
			id="tab-harga-channel"
		>
			<Icon name="calculator" size={16} />
			<span>Harga &amp; Channel ({menuStore.channels.length})</span>
		</button>

		<button
			type="button"
			class="catalog-tab-btn {activeTab === 'availability' ? 'active' : ''}"
			onclick={() => setTab('availability')}
			id="tab-ketersediaan"
		>
			<Icon name="building-storefront" size={16} />
			<span>Ketersediaan Gerai</span>
		</button>
	</nav>

	<!-- TAB 1: MENU & VARIAN SIAP JUAL -->
	{#if activeTab === 'menus'}
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
						onclick={() => (menuViewMode = 'grid')}
						title="Tampilan Grid Kartu"
						id="btn-menu-view-grid"
					>
						<Icon name="squares-2x2" size={15} />
						<span class="hidden sm:inline">Grid</span>
					</button>
					<button
						type="button"
						class="view-toggle-btn {menuViewMode === 'table' ? 'active' : ''}"
						onclick={() => (menuViewMode = 'table')}
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
							<span>Cakupan: <strong>{menuStore.selectedScopeFilter === 'all_outlets' ? 'Seluruh Gerai (Nasional)' : 'Khusus Gerai Tertentu'}</strong></span>
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
									<span class="text-xs font-mono px-2 py-0.5 rounded bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
										{menu.code}
									</span>
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

						<div class="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
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
									class="px-2.5 py-1 text-xs rounded bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--text-main)] hover:bg-[var(--bg-panel-hover)] transition"
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
							<th class="w-28 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedMenus as menu}
							<tr>
								<td class="font-mono text-xs font-bold text-[var(--text-muted)]">{menu.code}</td>
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
											<span class="text-xs px-2 py-0.5 rounded bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--text-main)]">
												<strong>{v.name}</strong>: <span class="font-mono text-emerald-400">{formatRupiah(v.base_price)}</span>
											</span>
										{/each}
									</div>
								</td>
								<td class="text-center">
									<StatusBadge status={menu.status === 'active' ? 'active' : 'inactive'} />
								</td>
								<td class="text-right">
									<button
										type="button"
										class="px-2.5 py-1 text-xs rounded bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--text-main)] hover:bg-[var(--bg-panel-hover)] transition"
										onclick={() => menuStore.openMenuDetail(menu)}
									>
										Rincian
									</button>
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

	<!-- TAB 2: KATEGORI MENU SIAP JUAL -->
	{:else if activeTab === 'categories'}
		<div class="catalog-section-bar">
			<div class="toolbar-left">
				<div class="flex flex-col gap-0.5">
					<h3 class="text-sm font-bold text-[var(--text-main)]">Master Kategori Menu Siap Jual</h3>
					<span class="text-xs text-[var(--text-subtle)]">
						Pengelompokan kategori untuk menu POS dan katalog penjualan ({menuStore.categories.length} kategori terdaftar)
					</span>
				</div>
			</div>
			<div class="toolbar-right">
				{#if canManageCatalog}
					<button
						type="button"
						class="btn btn-primary text-xs"
						style="min-height: 36px;"
						onclick={() => menuStore.openCreateCategory()}
						id="btn-tambah-kategori-menu"
					>
						<Icon name="plus" size={14} />
						<span>Tambah Kategori Menu</span>
					</button>
				{/if}
			</div>
		</div>

		<div class="data-table-container">
			<table class="data-table">
				<thead>
					<tr>
						<th class="w-20 text-center">Urutan</th>
						<th class="w-36">Kode</th>
						<th>Nama Kategori Menu</th>
						<th class="text-center">Jumlah Menu Terdaftar</th>
						<th class="text-center">Status</th>
						{#if canManageCatalog}
							<th class="w-32 text-right">Aksi</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#if menuStore.categories.length === 0}
						<tr>
							<td colspan={canManageCatalog ? 6 : 5} class="text-center py-8 text-xs text-[var(--text-subtle)]">
								Belum ada kategori menu yang terdaftar.
							</td>
						</tr>
					{:else}
						{#each menuStore.categories as cat}
							<tr>
								<td class="text-center font-mono font-semibold text-[var(--text-muted)]">
									#{cat.sort_order}
								</td>
								<td class="font-mono font-bold text-emerald-400">
									{cat.code}
								</td>
								<td>
									<strong class="text-[var(--text-main)]">{cat.name}</strong>
								</td>
								<td class="text-center">
									<span class="pill-badge pill-info font-mono">
										{cat.item_count || 0} menu
									</span>
								</td>
								<td class="text-center">
									<StatusBadge status={cat.is_active ? 'active' : 'inactive'} />
								</td>
								{#if canManageCatalog}
									<td class="text-right">
										<div class="flex items-center justify-end gap-1.5">
											<button
												type="button"
												class="px-2.5 py-1 text-xs rounded bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
												onclick={() => menuStore.openEditCategory(cat)}
												title="Ubah kategori"
											>
												Ubah
											</button>
											<button
												type="button"
												class="px-2.5 py-1 text-xs rounded bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-red-400/80 hover:text-red-300 hover:border-red-500/30 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
												onclick={() => menuStore.deleteCategory(cat)}
												disabled={(cat.item_count || 0) > 0}
												title={(cat.item_count || 0) > 0 ? `Kategori digunakan oleh ${cat.item_count} menu, tidak dapat dihapus` : 'Hapus kategori'}
											>
												Hapus
											</button>
										</div>
									</td>
								{/if}
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>

	<!-- TAB 3: RESEP BERVERSI & HPP -->
	{:else if activeTab === 'recipes'}
		<div class="flex flex-col gap-6">
			<div class="catalog-toolbar">
				<div class="toolbar-left">
					<div class="flex flex-col gap-0.5">
						<h3 class="text-sm font-bold text-[var(--text-main)]">Master Formula Resep Berversi (BOM) &amp; Penentuan HPP</h3>
						<span class="text-xs text-[var(--text-subtle)]">
							Mendukung resep berversi, audit riwayat versi, dan penimpaan (override) khusus gerai tertentu (PRD §6.2).
						</span>
					</div>
				</div>

				<div class="toolbar-right">
					{#if canManageCatalog}
						<button
							type="button"
							class="btn btn-primary"
							onclick={() => {
								menuStore.editingRecipe = null;
								menuStore.isRecipeModalOpen = true;
							}}
							id="btn-tambah-resep"
						>
							<Icon name="plus" size={16} />
							<span>Rilis Versi Resep Baru</span>
						</button>
					{/if}
				</div>
			</div>

			<!-- Toolbar Filter & Pencarian Resep -->
			<div class="flex flex-wrap items-center gap-3 bg-[var(--bg-panel-sub)] p-3.5 rounded-xl border border-[var(--border-subtle)]">
				<div class="relative flex-1 min-w-[240px]">
					<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-subtle)]">
						<Icon name="magnifying-glass" size={15} />
					</div>
					<input
						type="text"
						placeholder="Cari formula varian menu atau bahan baku..."
						class="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg pl-9 pr-8 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-subtle)] focus:outline-none focus:border-emerald-500"
						bind:value={menuStore.recipeSearchQuery}
					/>
					{#if menuStore.recipeSearchQuery}
						<button
							type="button"
							class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[var(--text-subtle)] hover:text-[var(--text-main)]"
							onclick={() => (menuStore.recipeSearchQuery = '')}
							title="Hapus pencarian"
						>
							<Icon name="x-mark" size={14} />
						</button>
					{/if}
				</div>

				<div class="flex items-center gap-2">
					<label for="filter-recipe-ingredient" class="text-xs text-[var(--text-muted)] whitespace-nowrap font-medium">
						Filter Bahan:
					</label>
					<select
						id="filter-recipe-ingredient"
						class="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-emerald-500 max-w-[240px]"
						bind:value={menuStore.recipeIngredientFilter}
					>
						<option value="all">Semua Bahan Baku</option>
						{#each (catalogStore.items.length > 0 ? catalogStore.items : menuStore.stockItems) as itm}
							<option value={itm.id}>{itm.name} ({itm.code})</option>
						{/each}
					</select>
				</div>

				<div class="flex items-center gap-2">
					<label for="filter-recipe-scope" class="text-xs text-[var(--text-muted)] whitespace-nowrap font-medium">
						Cakupan:
					</label>
					<select
						id="filter-recipe-scope"
						class="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-emerald-500"
						bind:value={menuStore.recipeScopeFilter}
					>
						<option value="all">Semua Cakupan</option>
						<option value="standard">Standar Nasional</option>
						<option value="outlet_override">Override Gerai</option>
					</select>
				</div>

				{#if menuStore.recipeIngredientFilter !== 'all' || menuStore.recipeSearchQuery || menuStore.recipeScopeFilter !== 'all'}
					<button
						type="button"
						class="btn btn-secondary text-xs"
						style="min-height: 34px; padding: 4px 12px;"
						onclick={() => menuStore.clearRecipeFilter()}
					>
						<Icon name="x-mark" size={13} />
						<span>Reset Filter</span>
					</button>
				{/if}
			</div>

			<!-- Banner Bahan Aktif Terfilter -->
			{#if menuStore.recipeIngredientFilter !== 'all'}
				{@const activeIngItem = catalogStore.items.find((i) => i.id === menuStore.recipeIngredientFilter) || menuStore.stockItems.find((i) => i.id === menuStore.recipeIngredientFilter)}
				<div class="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs">
					<div class="flex items-center gap-2 flex-wrap">
						<Icon name="funnel" size={15} />
						<span class="text-[var(--text-muted)]">Menampilkan resep yang menggunakan bahan:</span>
						<strong class="text-emerald-300 font-bold text-[13px]">
							{activeIngItem?.name || menuStore.recipeIngredientFilter}
						</strong>
						{#if activeIngItem?.code}
							<span class="font-mono text-[11px] text-emerald-400/80 bg-emerald-500/15 px-2 py-0.5 rounded">
								{activeIngItem.code}
							</span>
						{/if}
					</div>
					<div class="flex items-center gap-3">
						<span class="text-[var(--text-muted)] font-medium">
							Ditemukan <strong>{menuStore.filteredRecipes.length}</strong> formula resep
						</span>
						<button
							type="button"
							class="text-xs text-emerald-400 hover:text-emerald-300 underline font-semibold cursor-pointer"
							onclick={() => (menuStore.recipeIngredientFilter = 'all')}
						>
							Tampilkan Semua Resep
						</button>
					</div>
				</div>
			{/if}

			<div class="data-table-container">
				<table class="data-table">
					<thead>
						<tr>
							<th>Varian Menu</th>
							<th>Versi</th>
							<th>Cakupan Formula</th>
							<th>Tanggal Efektif</th>
							<th>Bahan Baku BOM</th>
							<th>Catatan Rilis</th>
							<th>Status</th>
							<th class="w-36 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each menuStore.filteredRecipes as r}
							<tr>
								<td>
									<div class="flex flex-col">
										<strong class="text-[var(--text-main)]">{r.variant_name || r.variant_id}</strong>
										<span class="text-[11px] text-[var(--text-subtle)] font-mono">{r.variant_id}</span>
									</div>
								</td>
								<td>
									<span class="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-bold">
										v{r.version_number}
									</span>
								</td>
								<td>
									{#if r.scope_type === 'standard'}
										<span class="pill-badge pill-info">Standar Nasional</span>
									{:else}
										<span class="badge-override">
											<Icon name="building-storefront" size={12} />
											<span>Override: {DEMO_OUTLETS.find((o) => o.id === r.outlet_id)?.name || r.outlet_id}</span>
										</span>
									{/if}
								</td>
								<td class="text-xs font-mono">
									{r.effective_from ? r.effective_from.split('T')[0] : '2026-01-01'}
									{#if r.effective_until}
										s/d {r.effective_until.split('T')[0]}
									{:else}
										<span class="text-emerald-400 font-semibold">(Sekarang)</span>
									{/if}
								</td>
								<td>
									<div class="flex flex-wrap gap-1">
										{#each r.ingredients as ing}
											{@const isMatched = menuStore.recipeIngredientFilter !== 'all' && (ing.stock_item_id === menuStore.recipeIngredientFilter || ing.stock_item_code === menuStore.recipeIngredientFilter)}
											<button
												type="button"
												class="text-[11px] px-2 py-0.5 rounded transition text-left cursor-pointer {isMatched ? 'bg-emerald-500/25 border border-emerald-400 text-emerald-200 font-bold shadow-sm ring-1 ring-emerald-400/40' : 'bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-emerald-500/40 hover:text-[var(--text-main)]'}"
												onclick={() => (menuStore.recipeIngredientFilter = ing.stock_item_id)}
												title={`Filter resep yang menggunakan ${ing.stock_item_name}`}
											>
												{ing.stock_item_name} ({parseFloat(ing.quantity).toLocaleString('id-ID')} {ing.serving_unit})
											</button>
										{/each}
									</div>
								</td>
								<td class="text-xs text-[var(--text-muted)] max-w-xs truncate">
									{r.notes || '-'}
								</td>
								<td>
									{#if r.is_active}
										<span class="pill-badge pill-success">Aktif</span>
									{:else}
										<span class="pill-badge pill-neutral">Arsip</span>
									{/if}
								</td>
								<td class="text-right">
									<div class="flex items-center justify-end gap-1.5">
										<button
											type="button"
											class="px-2.5 py-1 text-xs rounded bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-sky-400 hover:text-sky-300 transition"
											onclick={() => {
												menuStore.simVariantId = r.variant_id;
												if (r.outlet_id) menuStore.simOutletId = r.outlet_id;
												menuStore.refreshHppSimulation();
											}}
											title="Simulasikan HPP untuk varian ini"
										>
											Simulasi HPP
										</button>
										{#if canManageCatalog}
											<button
												type="button"
												class="px-2.5 py-1 text-xs rounded bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
												onclick={() => {
													menuStore.editingRecipe = {
														variant_id: r.variant_id,
														scope_type: r.scope_type,
														outlet_id: r.outlet_id,
														ingredients: [...r.ingredients],
														notes: `Turunan dari v${r.version_number}`
													};
													menuStore.isRecipeModalOpen = true;
												}}
												title="Buat versi baru berdasarkan resep ini"
											>
												Revisi
											</button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
						{#if menuStore.filteredRecipes.length === 0}
							<tr>
								<td colspan="8" class="text-center py-10">
									<div class="flex flex-col items-center justify-center gap-2">
										<Icon name="information-circle" size={24} />
										<span class="text-sm font-semibold text-[var(--text-main)]">Tidak Ada Formula Resep Ditemukan</span>
										<span class="text-xs text-[var(--text-muted)]">Tidak ada formula resep yang cocok dengan kriteria filter atau bahan baku yang dipilih.</span>
										<button
											type="button"
											class="btn btn-secondary text-xs mt-2"
											onclick={() => menuStore.clearRecipeFilter()}
										>
											Tampilkan Semua Resep
										</button>
									</div>
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>

			<!-- Simulator HPP Interaktif Terintegrasi -->
			<div class="mt-4">
				<HppSimulationPanel />
			</div>
		</div>

	<!-- TAB 3: MODIFIER & EFEK RESEP -->
	{:else if activeTab === 'modifiers'}
		<div class="flex flex-col gap-6">
			<div class="catalog-toolbar">
				<div class="toolbar-left">
					<div class="flex flex-col gap-0.5">
						<h3 class="text-sm font-bold text-[var(--text-main)]">Grup Modifier &amp; Efek Resep BOM</h3>
						<span class="text-xs text-[var(--text-subtle)]">
							Aturan batasan pilihan (Min/Max) dan efek resep dinamis (substitusi replace, adisi add, multiplikasi multiply) (PRD §6.3, AC-04.4).
						</span>
					</div>
				</div>

				<div class="toolbar-right">
					{#if canManageCatalog}
						<button
							type="button"
							class="btn btn-primary"
							onclick={() => {
								menuStore.editingModifierGroup = null;
								menuStore.isModifierModalOpen = true;
							}}
							id="btn-tambah-modifier"
						>
							<Icon name="plus" size={16} />
							<span>Tambah Grup Modifier</span>
						</button>
					{/if}
				</div>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
				{#each menuStore.modifierGroups as g}
					<div class="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex flex-col justify-between hover:border-indigo-500/40 transition">
						<div>
							<div class="flex items-start justify-between gap-3 mb-2">
								<div>
									<span class="text-xs font-mono px-2 py-0.5 rounded bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
										{g.code}
									</span>
									<h4 class="text-base font-bold text-[var(--text-main)] mt-1.5">{g.name}</h4>
								</div>
								{#if canManageCatalog}
									<button
										type="button"
										class="px-2.5 py-1 text-xs rounded bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
										onclick={() => {
											menuStore.editingModifierGroup = g;
											menuStore.isModifierModalOpen = true;
										}}
									>
										Ubah
									</button>
								{/if}
							</div>

							{#if g.description}
								<p class="text-xs text-[var(--text-muted)] mb-3">{g.description}</p>
							{/if}

							<div class="flex items-center gap-2 mb-4">
								<span class="text-xs px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold">
									Min: {g.min_select} &bull; Max: {g.max_select}
								</span>
								{#if g.min_select > 0}
									<span class="pill-badge pill-danger">Wajib Pilih</span>
								{:else}
									<span class="pill-badge pill-neutral">Opsional</span>
								{/if}
							</div>

							<!-- Daftar Pilihan Modifier -->
							<div class="space-y-2">
								<span class="text-[11px] font-semibold text-[var(--text-subtle)] uppercase tracking-wider block">
									Pilihan &amp; Efek Resep ({g.options.length})
								</span>
								{#each g.options as opt}
									<div class="p-2.5 rounded-lg bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] flex flex-col gap-1.5">
										<div class="flex items-center justify-between text-xs">
											<span class="font-medium text-[var(--text-main)] flex items-center gap-1.5">
												<span>{opt.name}</span>
												{#if opt.is_default}
													<span class="text-[10px] text-emerald-400 font-semibold">(Default)</span>
												{/if}
											</span>
											<span class="font-mono font-bold {parseFloat(opt.price_delta) > 0 ? 'text-sky-400' : 'text-[var(--text-muted)]'}">
												{parseFloat(opt.price_delta) > 0 ? `+${formatRupiah(opt.price_delta)}` : 'Rp 0'}
											</span>
										</div>

										{#if opt.recipe_effects && opt.recipe_effects.length > 0}
											<div class="flex flex-wrap gap-1 mt-0.5">
												{#each opt.recipe_effects as eff}
													<span class="text-[10px] px-2 py-0.5 rounded {eff.type === 'replace' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : eff.type === 'add' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'}">
														{eff.type === 'replace' ? 'Ganti (Replace)' : eff.type === 'add' ? 'Tambah (Add)' : 'Kali (Multiply)'}:
														{eff.target_stock_item_name || eff.target_stock_item_id}
													</span>
												{/each}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

	<!-- TAB 4: HARGA CHANNEL & PEMBULATAN -->
	{:else if activeTab === 'pricing'}
		<div class="flex flex-col gap-6">
			<div class="catalog-toolbar">
				<div class="toolbar-left">
					<div class="flex flex-col gap-0.5">
						<h3 class="text-sm font-bold text-[var(--text-main)]">Penetapan Harga per Channel &amp; Aturan Pembulatan</h3>
						<span class="text-xs text-[var(--text-subtle)]">
							Perhitungan otomatis harga jual per channel berdasarkan formula resmi (§6.1, AC-04.1).
						</span>
					</div>
				</div>

				<div class="toolbar-right">
					<button
						type="button"
						class="btn btn-primary"
						onclick={() => (menuStore.isPricingCalculatorOpen = true)}
						id="btn-buka-kalkulator-harga"
					>
						<Icon name="calculator" size={16} />
						<span>Buka Simulator Harga Channel</span>
					</button>
				</div>
			</div>

			<!-- Strip Konfigurasi Channel Penjualan -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div class="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<span class="font-bold text-[var(--text-main)] flex items-center gap-2">
							<Icon name="building-storefront" size={18} class="text-emerald-400" />
							<span>Kasir Langsung (POS)</span>
						</span>
						<span class="text-xs px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono font-bold">
							Markup 0%
						</span>
					</div>
					<p class="text-xs text-[var(--text-muted)]">
						Sesuai harga dasar master tanpa penyesuaian markup aplikasi.
					</p>
					<span class="text-[11px] text-[var(--text-subtle)] font-mono">
						Pembulatan: Tidak ada pembulatan
					</span>
				</div>

				<div class="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<span class="font-bold text-[var(--text-main)] flex items-center gap-2">
							<Icon name="device-tablet" size={18} class="text-sky-400" />
							<span>Aplikasi Online (App)</span>
						</span>
						<span class="text-xs px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 font-mono font-bold">
							Markup +5%
						</span>
					</div>
					<p class="text-xs text-[var(--text-muted)]">
						Dikenakan biaya platform digital in-house dengan pembulatan kelipatan 500 terdekat.
					</p>
					<span class="text-[11px] text-[var(--text-subtle)] font-mono">
						Pembulatan: Nearest 500
					</span>
				</div>

				<div class="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<span class="font-bold text-[var(--text-main)] flex items-center gap-2">
							<Icon name="shopping-cart" size={18} class="text-amber-400" />
							<span>Marketplace (GoFood/Grab/Shopee)</span>
						</span>
						<span class="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono font-bold">
							Markup +20%
						</span>
					</div>
					<p class="text-xs text-[var(--text-muted)]">
						Kompensasi komisi merchant agregator dengan pembulatan kelipatan 1.000 terdekat.
					</p>
					<span class="text-[11px] text-[var(--text-subtle)] font-mono">
						Pembulatan: Nearest 1000
					</span>
				</div>
			</div>

			<!-- Matriks Perbandingan Harga Jual Lintas Channel -->
			<div class="data-table-container">
				<table class="data-table">
					<thead>
						<tr>
							<th>Menu &amp; Varian</th>
							<th>SKU</th>
							<th class="text-right">Harga Dasar</th>
							<th class="text-right">POS Kasir (0%)</th>
							<th class="text-right">Aplikasi (+5%, Rnd 500)</th>
							<th class="text-right">Marketplace (+20%, Rnd 1k)</th>
							<th class="text-right w-28">Simulasi</th>
						</tr>
					</thead>
					<tbody>
						{#each menuStore.menuItems as m}
							{#each m.variants as v}
								{@const posPrice = calculateChannelPrice({ basePrice: v.base_price, markupPct: 0 }).finalPrice}
								{@const appPrice = calculateChannelPrice({ basePrice: v.base_price, markupPct: 5, roundingMode: 'nearest', roundingStep: 500 }).finalPrice}
								{@const mktPrice = calculateChannelPrice({ basePrice: v.base_price, markupPct: 20, roundingMode: 'nearest', roundingStep: 1000 }).finalPrice}
								<tr>
									<td>
										<div class="flex flex-col">
											<strong class="text-[var(--text-main)]">{m.name}</strong>
											<span class="text-xs text-[var(--text-muted)]">{v.name}</span>
										</div>
									</td>
									<td class="font-mono text-xs text-[var(--text-subtle)]">{v.sku}</td>
									<td class="text-right font-mono font-bold text-[var(--text-muted)]">
										{formatRupiah(v.base_price)}
									</td>
									<td class="text-right font-mono font-bold text-emerald-400">
										{formatRupiah(posPrice)}
									</td>
									<td class="text-right font-mono font-bold text-sky-400">
										{formatRupiah(appPrice)}
									</td>
									<td class="text-right font-mono font-bold text-amber-400">
										{formatRupiah(mktPrice)}
									</td>
									<td class="text-right">
										<button
											type="button"
											class="px-2.5 py-1 text-xs rounded bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-indigo-300 hover:text-indigo-200 transition"
											onclick={() => {
												menuStore.calcVariantId = v.id;
												menuStore.isPricingCalculatorOpen = true;
											}}
										>
											Kalkulator
										</button>
									</td>
								</tr>
							{/each}
						{/each}
					</tbody>
				</table>
			</div>
		</div>

	<!-- TAB 5: KETERSEDIAAN MENU PER GERAI -->
	{:else if activeTab === 'availability'}
		<div class="flex flex-col gap-6">
			<div class="catalog-toolbar">
				<div class="toolbar-left">
					<div class="flex flex-col gap-0.5">
						<h3 class="text-sm font-bold text-[var(--text-main)]">Matriks Ketersediaan Menu per Gerai &amp; Channel</h3>
						<span class="text-xs text-[var(--text-subtle)]">
							Kontrol menu yang habis (sold-out) tanpa menghapus master data (AC-04.5).
						</span>
					</div>

					<select
						class="toolbar-select ml-2"
						bind:value={menuStore.selectedOutletFilter}
						onchange={() => menuStore.loadAll()}
						aria-label="Pilih Gerai Ketersediaan"
					>
						{#each DEMO_OUTLETS as out}
							<option value={out.id}>{out.name} ({out.code})</option>
						{/each}
					</select>
				</div>

				<div class="toolbar-right">
					<span class="text-xs px-3 py-1.5 rounded-full bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-mono">
						Terpantau: {menuStore.availability.length} Status Gerai
					</span>
				</div>
			</div>

			<div class="data-table-container">
				<table class="data-table">
					<thead>
						<tr>
							<th>Menu &amp; Varian</th>
							<th>Gerai</th>
							<th>Channel Penjualan</th>
							<th>Status Ketersediaan</th>
							<th>Alasan / Keterangan</th>
							<th>Waktu Update</th>
							<th class="w-36 text-right">Aksi Cepat</th>
						</tr>
					</thead>
					<tbody>
						{#each menuStore.availability as a}
							<tr>
								<td>
									<div class="flex flex-col">
										<strong class="text-[var(--text-main)]">{a.menu_item_name}</strong>
										<span class="text-xs text-[var(--text-muted)] font-mono">{a.variant_id || 'Semua Varian'}</span>
									</div>
								</td>
								<td>
									<span class="font-medium text-xs text-[var(--text-main)]">
										{DEMO_OUTLETS.find((o) => o.id === a.outlet_id)?.name || a.outlet_id}
									</span>
								</td>
								<td>
									<span class="uppercase text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
										{a.channel_code}
									</span>
								</td>
								<td>
									{#if a.is_available}
										<span class="pill-badge pill-success">Tersedia Siap Jual</span>
									{:else}
										<span class="pill-badge pill-danger">HABIS (Sold Out)</span>
									{/if}
								</td>
								<td class="text-xs text-[var(--text-muted)]">
									{a.sold_out_reason || '-'}
								</td>
								<td class="text-xs text-[var(--text-subtle)] font-mono">
									{a.updated_at ? new Date(a.updated_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
								</td>
								<td class="text-right">
									<button
										type="button"
										class="px-2.5 py-1 text-xs rounded font-medium transition {a.is_available ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30'}"
										onclick={() => menuStore.toggleMenuAvailability(a, 'Stok habis sementara')}
									>
										{a.is_available ? 'Tandai Habis' : 'Pulihkan Tersedia'}
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
	</div>
</div>

<!-- MODAL DIALOGS & DRAWERS MENU & RESEP -->
<MenuItemDetailDrawer />
<MenuItemFormModal />
<MenuCategoryFormModal
	open={menuStore.isCategoryModalOpen}
	category={menuStore.editingCategory}
	onclose={() => menuStore.closeCategoryModal()}
	onsave={(data) => menuStore.saveCategory(data)}
/>
<RecipeEditorModal />
<ModifierGroupFormModal />
<PricingCalculatorModal />

<!-- DRAWER FILTER MENU -->
<Drawer
	open={isFilterDrawerOpen}
	title="Filter Menu &amp; Varian"
	subtitle="Penyaringan katalog menu dan varian jual"
	width="420px"
	onclose={() => (isFilterDrawerOpen = false)}
>
	<div class="filter-drawer-form">
		<div class="filter-drawer-field">
			<label for="drawer-filter-menu-cat" class="filter-drawer-label">Kategori Menu</label>
			<p class="filter-drawer-desc">Saring berdasarkan kelompok menu</p>
			<select
				id="drawer-filter-menu-cat"
				class="filter-drawer-select"
				bind:value={menuStore.selectedCategoryFilter}
			>
				<option value="all">Semua Kategori Menu ({menuStore.categories.length})</option>
				{#each menuStore.categories as cat}
					<option value={cat.id}>{cat.name}</option>
				{/each}
			</select>
		</div>

		<div class="filter-drawer-field">
			<label for="drawer-filter-menu-scope" class="filter-drawer-label">Cakupan Distribusi Gerai</label>
			<p class="filter-drawer-desc">Menu nasional vs menu eksklusif outlet tertentu</p>
			<select
				id="drawer-filter-menu-scope"
				class="filter-drawer-select"
				bind:value={menuStore.selectedScopeFilter}
			>
				<option value="all">Semua Cakupan</option>
				<option value="all_outlets">Seluruh Gerai (Nasional)</option>
				<option value="outlet_set">Khusus Gerai Tertentu</option>
			</select>
		</div>

		<div class="filter-drawer-field">
			<label for="drawer-filter-menu-status" class="filter-drawer-label">Status Penjualan Menu</label>
			<p class="filter-drawer-desc">Menu aktif siap order vs menu yang diarsipkan</p>
			<select
				id="drawer-filter-menu-status"
				class="filter-drawer-select"
				bind:value={menuStore.selectedStatusFilter}
			>
				<option value="active">Menu Aktif (Siap Jual)</option>
				<option value="archived">Diarsipkan (Nonaktif)</option>
				<option value="all">Semua Status</option>
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
