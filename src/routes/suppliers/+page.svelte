<script lang="ts">
	/**
	 * Halaman Direktori Supplier
	 * Referensi: PRD §8, MILESTONE.md §MS-03, AGENTS.md Golden Rules 1, 2, 4, 8, 10, 12, 14, 15
	 */
	import { onMount } from 'svelte';
	import { catalogStore } from '#lib/features/catalog/stores/catalog.svelte.js';
	import { session } from '#lib/auth/session.svelte.js';
	import { can } from '#lib/auth/can.js';
	import '#lib/features/catalog/catalog.css';

	import Icon from '#lib/components/data/Icon.svelte';
	import Badge from '#lib/components/data/Badge.svelte';
	import StatusBadge from '#lib/components/data/StatusBadge.svelte';
	import CodeBadge from '#lib/components/data/CodeBadge.svelte';
	import ActionMenu from '#lib/components/feedback/ActionMenu.svelte';
	import Select from '#lib/components/forms/Select.svelte';
	import Skeleton from '#lib/components/feedback/Skeleton.svelte';
	import EmptyState from '#lib/components/feedback/EmptyState.svelte';
	import ErrorState from '#lib/components/feedback/ErrorState.svelte';

	import SupplierFormModal from '#lib/features/catalog/components/SupplierFormModal.svelte';
	import SupplierDetailModal from '#lib/features/catalog/components/SupplierDetailModal.svelte';
	import Drawer from '#lib/components/feedback/Drawer.svelte';

	let isFilterDrawerOpen = $state(false);

	const supplierTypeOptions = [
		{ value: 'all', label: 'Semua Tipe Supplier' },
		{ value: 'hq_warehouse', label: 'Gudang Pusat (HQ Hub)', subtitle: 'Penyedia pasokan sentralisasi internal' },
		{ value: 'external', label: 'Vendor Eksternal', subtitle: 'Penyedia bahan baku pihak ketiga' }
	];

	const supplierStatusOptions = [
		{ value: 'all', label: 'Semua Status' },
		{ value: 'active', label: 'Supplier Aktif (Operasional)', subtitle: 'Siap untuk pemesanan barang' },
		{ value: 'inactive', label: 'Nonaktif', subtitle: 'Tidak dapat menerima order baru' }
	];

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
	<title>Direktori Supplier | Hanjo ERP</title>
</svelte:head>

<div class="catalog-page-container">
	<!-- 1. Page Header -->
	<header class="catalog-page-header">
		<div class="page-header-lead">
			<div class="page-header-icon">
				<Icon name="truck" size={26} />
			</div>
			<div class="page-header-text">
				<h1 class="page-title">Direktori Supplier</h1>
				<p class="page-subtitle">
					Manajemen rekanan penyuplai bahan baku gerai, gudang logistik pusat (HQ Hub), kontak PIC, dan syarat termin pembayaran.
				</p>
			</div>
		</div>

	</header>

	<!-- 2. Hero KPI Strip (4 Kolom Responsif) -->
	<div class="catalog-hero-stats">
		<div class="stat-box">
			<span class="stat-box-title">Total Mitra Supplier</span>
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
			<span class="stat-box-sub">Supplier Lokal &amp; Direct PO</span>
		</div>

		<div class="stat-box">
			<span class="stat-box-title">Supplier Aktif</span>
			<span class="stat-box-val">{catalogStore.suppliers.filter((s) => s.status === 'active').length}</span>
			<span class="stat-box-sub">Siap Pemesanan Barang</span>
		</div>
	</div>

	<!-- 3. Workspace Terpadu Supplier (1 Panel Solid: Toolbar dan Tabel Menyatu) -->
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
						placeholder="Cari nama supplier, kontak PIC, atau kota..."
						bind:value={catalogStore.supplierSearchQuery}
						id="input-search-suppliers"
					/>
				</div>

				<!-- Tombol Filter Drawer Supplier -->
				<button
					type="button"
					class="filter-trigger-btn btn btn-secondary {activeFiltersCount > 0 ? 'filter-active' : ''}"
					onclick={() => (isFilterDrawerOpen = true)}
					id="btn-filter-drawer-supplier"
					aria-label="Buka filter supplier"
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
						id="btn-tambah-supplier"
					>
						<Icon name="plus" size={16} />
						<span>Tambah Supplier Baru</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- Active Filters Pills Bar Supplier -->
		{#if activeFiltersCount > 0}
			<div class="active-filters-bar" role="region" aria-label="Filter supplier yang diterapkan">
				<span class="active-filters-label">Filter Aktif:</span>
				<div class="filter-pills-list">
					{#if catalogStore.selectedSupplierTypeFilter !== 'all'}
						<div class="filter-pill">
							<span>Tipe: <strong>{catalogStore.selectedSupplierTypeFilter === 'hq_warehouse' ? 'Gudang Pusat (HQ Hub)' : 'Vendor Eksternal'}</strong></span>
							<button
								type="button"
								class="filter-pill-remove"
								onclick={() => (catalogStore.selectedSupplierTypeFilter = 'all')}
								title="Hapus filter tipe supplier"
								aria-label="Hapus filter tipe supplier"
							>
								<Icon name="x-mark" size={12} strokeWidth={2.4} />
							</button>
						</div>
					{/if}

					{#if catalogStore.selectedSupplierStatusFilter !== 'all'}
						<div class="filter-pill">
							<span>Status: <strong>{catalogStore.selectedSupplierStatusFilter === 'active' ? 'Supplier Aktif' : 'Nonaktif'}</strong></span>
							<button
								type="button"
								class="filter-pill-remove"
								onclick={() => (catalogStore.selectedSupplierStatusFilter = 'all')}
								title="Hapus filter status supplier"
								aria-label="Hapus filter status supplier"
							>
								<Icon name="x-mark" size={12} strokeWidth={2.4} />
							</button>
						</div>
					{/if}

					<button
						type="button"
						class="filter-reset-all-btn"
						onclick={resetAllFilters}
						aria-label="Reset semua filter supplier"
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
					title="Gagal Memuat Daftar Supplier"
					message={catalogStore.error}
					onretry={() => catalogStore.loadAll()}
				/>
			</div>
		{:else if catalogStore.filteredSuppliers.length === 0}
			<EmptyState
				title="Tidak Ada Supplier Ditemukan"
				description="Cobalah ubah filter pencarian atau daftarkan supplier baru."
			/>
		{:else}
			<!-- Tabel Direktori Supplier -->
			<div class="data-table-container">
				<table class="data-table">
					<thead>
						<tr>
							<th>Kode</th>
							<th>Nama Supplier</th>
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
								<td>
									<CodeBadge code={sup.code} />
								</td>
								<td>
									<div class="flex flex-col gap-0.5">
										<strong class="text-[var(--text-main)]">{sup.name}</strong>
										{#if sup.has_transactions}
											<span class="text-[11px] text-[var(--text-subtle)]">Ada riwayat transaksi</span>
										{/if}
									</div>
								</td>
								<td>
									{#if sup.type === 'hq_warehouse'}
										<Badge variant="info" text="Gudang Pusat HQ" />
									{:else}
										<Badge variant="success" text="Vendor Luar" />
									{/if}
								</td>
								<td>
									<div class="flex flex-col gap-0.5 text-xs">
										<span class="text-[var(--text-main)] font-medium">{sup.contact_person || '-'}</span>
										<span class="text-[var(--text-subtle)] font-mono">{sup.phone || '-'}</span>
									</div>
								</td>
								<td class="text-xs">{sup.city || '-'}</td>
								<td>
									<span class="text-xs font-semibold text-emerald-400 font-mono">
										{sup.payment_terms_days === 0 ? 'COD' : `Net ${sup.payment_terms_days}h`}
									</span>
								</td>
								<td>
									<StatusBadge status={sup.status === 'active' ? 'active' : 'inactive'} />
								</td>
								<td class="text-right">
									<ActionMenu
										align="right"
										items={[
											{
												label: 'Lihat Detail Profil',
												icon: 'eye',
												onclick: () => catalogStore.openSupplierDetail(sup)
											},
											...(canManageCatalog
												? [
														{
															label: 'Ubah Data Supplier',
															icon: 'pencil-square',
															onclick: () => catalogStore.openEditSupplier(sup)
														},
														{
															label: 'Hapus Supplier',
															icon: 'trash',
															variant: 'danger' as const,
															disabled: sup.has_transactions,
															onclick: () => {
																if (confirm(`Yakin ingin menghapus supplier "${sup.name}"?`)) {
																	catalogStore.deleteSupplier(sup);
																}
															}
														}
													]
												: [])
										]}
									/>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<!-- MODAL DIALOGS SUPPLIER -->
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

<!-- DRAWER FILTER SUPPLIER -->
<Drawer
	open={isFilterDrawerOpen}
	title="Filter Supplier"
	subtitle="Penyaringan direktori supplier dan rekanan logistik"
	width="420px"
	onclose={() => (isFilterDrawerOpen = false)}
>
	<div class="filter-drawer-form space-y-5">
		<div class="filter-drawer-field">
			<label for="drawer-filter-sup-type" class="filter-drawer-label mb-1 block">Tipe Supplier</label>
			<p class="filter-drawer-desc mb-2 text-xs text-[var(--text-muted)]">Gudang internal pusat vs vendor pihak ketiga</p>
			<Select
				id="drawer-filter-sup-type"
				options={supplierTypeOptions}
				bind:value={catalogStore.selectedSupplierTypeFilter}
				placeholder="Pilih Tipe Supplier"
			/>
		</div>

		<div class="filter-drawer-field">
			<label for="drawer-filter-sup-status" class="filter-drawer-label mb-1 block">Status Hubungan Bisnis</label>
			<p class="filter-drawer-desc mb-2 text-xs text-[var(--text-muted)]">Supplier aktif untuk order vs nonaktif</p>
			<Select
				id="drawer-filter-sup-status"
				options={supplierStatusOptions}
				bind:value={catalogStore.selectedSupplierStatusFilter}
				placeholder="Pilih Status Supplier"
			/>
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
