<script lang="ts">
	/**
	 * Halaman Direktori Supplier & Mitra Pemasok
	 * Referensi: PRD §8, MILESTONE.md §MS-03, AGENTS.md Golden Rules 1, 2, 4, 8, 10, 12, 14, 15
	 */
	import { onMount } from 'svelte';
	import { catalogStore } from '#lib/features/catalog/stores/catalog.svelte.js';
	import { session } from '#lib/auth/session.svelte.js';
	import { can } from '#lib/auth/can.js';
	import '#lib/features/catalog/catalog.css';

	import Icon from '#lib/components/data/Icon.svelte';
	import StatusBadge from '#lib/components/data/StatusBadge.svelte';
	import Skeleton from '#lib/components/feedback/Skeleton.svelte';
	import EmptyState from '#lib/components/feedback/EmptyState.svelte';
	import ErrorState from '#lib/components/feedback/ErrorState.svelte';

	import SupplierFormModal from '#lib/features/catalog/components/SupplierFormModal.svelte';
	import SupplierDetailModal from '#lib/features/catalog/components/SupplierDetailModal.svelte';
	import Drawer from '#lib/components/feedback/Drawer.svelte';

	let isFilterDrawerOpen = $state(false);

	const activeFiltersCount = $derived(
		(catalogStore.selectedSupplierTypeFilter !== 'all' ? 1 : 0) +
		(catalogStore.selectedSupplierStatusFilter !== 'all' ? 1 : 0)
	);

	function resetAllFilters() {
		catalogStore.selectedSupplierTypeFilter = 'all';
		catalogStore.selectedSupplierStatusFilter = 'all';
	}

	onMount(() => {
		catalogStore.loadAll();
	});

	const userRole = $derived(session.user?.role || 'owner');
	const isStoreManager = $derived(userRole === 'store_manager' || userRole === 'cashier');
	const canManageCatalog = $derived(!isStoreManager && userRole !== 'finance');
</script>

<svelte:head>
	<title>Direktori Supplier &amp; Pemasok | Hanjo ERP</title>
</svelte:head>

<div class="catalog-page-container">
	<!-- 1. Page Header -->
	<header class="catalog-page-header">
		<div class="page-header-lead">
			<div class="page-header-icon">
				<Icon name="truck" size={26} />
			</div>
			<div class="page-header-text">
				<h1 class="page-title">Direktori Supplier &amp; Pemasok</h1>
				<p class="page-subtitle">
					Manajemen rekanan penyuplai bahan baku gerai, gudang logistik pusat (HQ Hub), kontak PIC, dan syarat termin pembayaran.
				</p>
			</div>
		</div>

	</header>

	<!-- 2. Hero KPI Strip (4 Kolom Responsif) -->
	<div class="catalog-hero-stats">
		<div class="stat-box">
			<span class="stat-box-title">Total Mitra Pemasok</span>
			<span class="stat-box-val">{catalogStore.suppliers.length}</span>
			<span class="stat-box-sub">Gudang HQ &amp; Vendor Luar</span>
		</div>

		<div class="stat-box">
			<span class="stat-box-title">Gudang Logistik Pusat</span>
			<span class="stat-box-val">{catalogStore.suppliers.filter((s) => s.type === 'hq_warehouse').length} Hub</span>
			<span class="stat-box-sub">Pasokan Sentralisasi HQ</span>
		</div>

		<div class="stat-box">
			<span class="stat-box-title">Rekanan Vendor Eksternal</span>
			<span class="stat-box-val">{catalogStore.suppliers.filter((s) => s.type !== 'hq_warehouse').length} Rekanan</span>
			<span class="stat-box-sub">Pemasok Lokal &amp; Direct PO</span>
		</div>

		<div class="stat-box">
			<span class="stat-box-title">Pemasok Aktif</span>
			<span class="stat-box-val">{catalogStore.suppliers.filter((s) => s.status === 'active').length}</span>
			<span class="stat-box-sub">Siap Pemesanan Barang</span>
		</div>
	</div>

	<!-- 3. Workspace Terpadu Pemasok (1 Panel Solid: Toolbar dan Tabel Menyatu) -->
	<div class="catalog-workspace-panel">
		<!-- Toolbar Pencarian & Filter -->
		<div class="catalog-toolbar">
			<div class="toolbar-left">
				<!-- Pencarian -->
				<div class="toolbar-search">
					<Icon name="magnifying-glass" size={15} class="toolbar-search-icon" />
					<input
						type="text"
						class="toolbar-search-input"
						placeholder="Cari nama pemasok, kontak PIC, atau kota..."
						bind:value={catalogStore.supplierSearchQuery}
						id="input-search-suppliers"
					/>
				</div>

				<!-- Tombol Filter Drawer Pemasok -->
				<button
					type="button"
					class="filter-trigger-btn btn btn-secondary {activeFiltersCount > 0 ? 'filter-active' : ''}"
					onclick={() => (isFilterDrawerOpen = true)}
					id="btn-filter-drawer-supplier"
					aria-label="Buka filter pemasok"
				>
					<Icon name="funnel" size={16} />
					<span>Filter</span>
					{#if activeFiltersCount > 0}
						<span class="filter-count-badge">{activeFiltersCount}</span>
					{/if}
				</button>
			</div>

			<div class="toolbar-right">
				{#if canManageCatalog}
					<button
						type="button"
						class="btn btn-primary"
						onclick={() => catalogStore.openCreateSupplier()}
						id="btn-tambah-pemasok"
					>
						<Icon name="plus" size={16} />
						<span>Tambah Pemasok Baru</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- Active Filters Pills Bar Pemasok -->
		{#if activeFiltersCount > 0}
			<div class="active-filters-bar" role="region" aria-label="Filter pemasok yang diterapkan">
				<span class="active-filters-label">Filter Aktif:</span>
				<div class="filter-pills-list">
					{#if catalogStore.selectedSupplierTypeFilter !== 'all'}
						<div class="filter-pill">
							<span>Tipe: <strong>{catalogStore.selectedSupplierTypeFilter === 'hq_warehouse' ? 'Gudang Pusat (HQ Hub)' : 'Vendor Eksternal'}</strong></span>
							<button
								type="button"
								class="filter-pill-remove"
								onclick={() => (catalogStore.selectedSupplierTypeFilter = 'all')}
								title="Hapus filter tipe pemasok"
								aria-label="Hapus filter tipe pemasok"
							>
								<Icon name="x-mark" size={12} strokeWidth={2.4} />
							</button>
						</div>
					{/if}

					{#if catalogStore.selectedSupplierStatusFilter !== 'all'}
						<div class="filter-pill">
							<span>Status: <strong>{catalogStore.selectedSupplierStatusFilter === 'active' ? 'Pemasok Aktif' : 'Nonaktif'}</strong></span>
							<button
								type="button"
								class="filter-pill-remove"
								onclick={() => (catalogStore.selectedSupplierStatusFilter = 'all')}
								title="Hapus filter status pemasok"
								aria-label="Hapus filter status pemasok"
							>
								<Icon name="x-mark" size={12} strokeWidth={2.4} />
							</button>
						</div>
					{/if}

					<button
						type="button"
						class="filter-reset-all-btn"
						onclick={resetAllFilters}
						aria-label="Reset semua filter pemasok"
					>
						Reset Semua
					</button>
				</div>
			</div>
		{/if}

		<!-- 4. 4 Screen States Wajib (Golden Rule 8) -->
		{#if catalogStore.isLoading}
			<div class="py-8 px-6">
				<Skeleton count={5} variant="card" />
			</div>
		{:else if catalogStore.error}
			<div class="p-6">
				<ErrorState
					title="Gagal Memuat Daftar Pemasok"
					message={catalogStore.error}
					onretry={() => catalogStore.loadAll()}
				/>
			</div>
		{:else if catalogStore.filteredSuppliers.length === 0}
			<EmptyState
				title="Tidak Ada Pemasok Ditemukan"
				description="Cobalah ubah filter pencarian atau daftarkan pemasok baru."
			/>
		{:else}
			<!-- Tabel Direktori Pemasok -->
			<div class="data-table-container">
				<table class="data-table">
					<thead>
						<tr>
							<th>Kode</th>
							<th>Nama Pemasok</th>
							<th>Tipe Rekanan</th>
							<th>Kontak PIC &amp; Telepon</th>
							<th>Kota</th>
							<th>Syarat Pembayaran</th>
							<th>Status</th>
							<th class="w-24 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each catalogStore.filteredSuppliers as sup}
							<tr>
								<td class="font-mono font-bold text-emerald-400">{sup.code}</td>
								<td>
									<div class="flex flex-col">
										<strong class="text-[var(--text-main)]">{sup.name}</strong>
										{#if sup.has_transactions}
											<span class="text-[10.5px] text-[var(--text-subtle)]">Ada riwayat transaksi</span>
										{/if}
									</div>
								</td>
								<td>
									{#if sup.type === 'hq_warehouse'}
										<span class="pill-badge pill-info font-bold">Gudang Pusat HQ</span>
									{:else}
										<span class="pill-badge pill-success">Vendor Luar</span>
									{/if}
								</td>
								<td>
									<div class="flex flex-col text-xs">
										<span class="text-[var(--text-main)] font-medium">{sup.contact_person || '-'}</span>
										<span class="text-[var(--text-subtle)] font-mono">{sup.phone || '-'}</span>
									</div>
								</td>
								<td class="text-xs">{sup.city || '-'}</td>
								<td>
									<span class="text-xs font-semibold text-emerald-400">
										{sup.payment_terms_days === 0 ? 'COD' : `Net ${sup.payment_terms_days}h`}
									</span>
								</td>
								<td>
									<StatusBadge status={sup.status === 'active' ? 'active' : 'inactive'} />
								</td>
								<td class="text-right">
									<button
										type="button"
										class="px-2.5 py-1 text-xs rounded bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
										onclick={() => catalogStore.openSupplierDetail(sup)}
									>
										Detail
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<!-- MODAL DIALOGS PEMASOK -->
<SupplierFormModal
	open={catalogStore.isSupplierModalOpen}
	supplier={catalogStore.editingSupplier}
	onclose={() => catalogStore.closeSupplierModal()}
	onsave={(data) => catalogStore.saveSupplier(data)}
/>

<SupplierDetailModal
	open={!!catalogStore.selectedSupplierDetail}
	supplier={catalogStore.selectedSupplierDetail}
	onclose={() => catalogStore.closeSupplierDetail()}
	onedit={(sup) => catalogStore.openEditSupplier(sup)}
	ondelete={(sup) => catalogStore.deleteSupplier(sup)}
/>

<!-- DRAWER FILTER PEMASOK -->
<Drawer
	open={isFilterDrawerOpen}
	title="Filter Pemasok"
	subtitle="Penyaringan direktori pemasok dan rekanan logistik"
	width="400px"
	onclose={() => (isFilterDrawerOpen = false)}
>
	<div class="filter-drawer-form">
		<div class="filter-drawer-field">
			<label for="drawer-filter-sup-type" class="filter-drawer-label">Tipe Pemasok</label>
			<p class="filter-drawer-desc">Gudang internal pusat vs vendor pihak ketiga</p>
			<select
				id="drawer-filter-sup-type"
				class="filter-drawer-select"
				bind:value={catalogStore.selectedSupplierTypeFilter}
			>
				<option value="all">Semua Tipe Pemasok</option>
				<option value="hq_warehouse">Gudang Pusat (HQ Hub)</option>
				<option value="external">Vendor Eksternal</option>
			</select>
		</div>

		<div class="filter-drawer-field">
			<label for="drawer-filter-sup-status" class="filter-drawer-label">Status Hubungan Bisnis</label>
			<p class="filter-drawer-desc">Pemasok aktif untuk order vs pemasok nonaktif</p>
			<select
				id="drawer-filter-sup-status"
				class="filter-drawer-select"
				bind:value={catalogStore.selectedSupplierStatusFilter}
			>
				<option value="all">Semua Status</option>
				<option value="active">Pemasok Aktif (Operasional)</option>
				<option value="inactive">Nonaktif</option>
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
