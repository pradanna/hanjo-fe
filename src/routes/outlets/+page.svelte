<script lang="ts">
	/**
	 * Outlets & Master Organisasi Page (MS-02)
	 * Referensi: PRD 8.1, MILESTONE.md §MS-02
	 *
	 * Mengelola Hierarki Organisasi Induk, Multi-Outlet, Grup Wilayah,
	 * Penugasan Store Manager, dan Kepemilikan Mitra / Investor.
	 */
	import { onMount } from 'svelte';
	import { outletsStore } from '#lib/features/outlets/stores/outlets.svelte.js';
	import { session } from '#lib/auth/session.svelte.js';
	import '#lib/features/outlets/outlets.css';

	import Icon from '#lib/components/data/Icon.svelte';
	import StatusBadge from '#lib/components/data/StatusBadge.svelte';
	import CodeBadge from '#lib/components/data/CodeBadge.svelte';
	import Skeleton from '#lib/components/feedback/Skeleton.svelte';
	import ActionMenu from '#lib/components/feedback/ActionMenu.svelte';
	import Drawer from '#lib/components/feedback/Drawer.svelte';
	import EmptyState from '#lib/components/feedback/EmptyState.svelte';
	import ErrorState from '#lib/components/feedback/ErrorState.svelte';
	import Select from '#lib/components/forms/Select.svelte';

	import OrganizationListCard from '#lib/features/outlets/components/OrganizationListCard.svelte';
	import OrganizationModal from '#lib/features/outlets/components/OrganizationModal.svelte';
	import OutletFormModal from '#lib/features/outlets/components/OutletFormModal.svelte';
	import OutletDetailDrawer from '#lib/features/outlets/components/OutletDetailDrawer.svelte';
	import DeactivationConflictModal from '#lib/features/outlets/components/DeactivationConflictModal.svelte';
	import OutletGroupsSection from '#lib/features/outlets/components/OutletGroupsSection.svelte';
	import PartnerOwnersSection from '#lib/features/outlets/components/PartnerOwnersSection.svelte';

	import type { Organization, Outlet } from '#lib/api/contract/types.js';

	// Permission checks (AC-02.6: Finance hanya baca, Owner & Admin kelola)
	const canManage = $derived(session.can('org:manage'));
	const canRead = $derived(session.can('org:read'));

	// Modal states
	let showOrgModal = $state(false);
	let editingOrg = $state<Organization | null>(null);

	let showOutletModal = $state(false);
	let editingOutlet = $state<Outlet | null>(null);

	let showDetailDrawer = $state(false);
	let detailedOutlet = $state<Outlet | null>(null);

	let isFilterDrawerOpen = $state(false);

	let conflictTargetName = $state('Entitas');

	const activeFiltersCount = $derived(
		(outletsStore.selectedOrgFilter !== '*' ? 1 : 0) +
		(outletsStore.selectedOwnerTypeFilter !== 'all' ? 1 : 0) +
		(outletsStore.selectedStatusFilter !== 'all' ? 1 : 0) +
		(outletsStore.selectedGroupFilter !== 'all' ? 1 : 0)
	);

	function resetAllFilters() {
		outletsStore.selectedOrgFilter = '*';
		outletsStore.selectedOwnerTypeFilter = 'all';
		outletsStore.selectedStatusFilter = 'all';
		outletsStore.selectedGroupFilter = 'all';
	}

	const orgFilterOptions = $derived([
		{ value: '*', label: 'Semua Organisasi Induk' },
		...outletsStore.organizations.map((org) => ({
			value: org.id,
			label: org.name,
			subtitle: `Kode: ${org.code}`
		}))
	]);

	const ownerTypeFilterOptions = [
		{ value: 'all', label: 'Semua Jenis Kepemilikan' },
		{ value: 'own_company', label: 'Milik Sendiri (Internal)' },
		{ value: 'partner', label: 'Kemitraan Investor' }
	];

	const statusFilterOptions = [
		{ value: 'all', label: 'Semua Status' },
		{ value: 'active', label: 'Gerai Aktif' },
		{ value: 'inactive', label: 'Nonaktif' }
	];

	const groupFilterOptions = $derived([
		{ value: 'all', label: 'Semua Grup Wilayah' },
		...outletsStore.groups.map((grp) => ({
			value: grp.id,
			label: grp.name,
			subtitle: grp.description || undefined
		}))
	]);

	onMount(() => {
		outletsStore.loadAll();
	});

	// Aksi Organisasi
	function handleOpenCreateOrg() {
		editingOrg = null;
		showOrgModal = true;
	}

	function handleEditOrg(org: Organization) {
		editingOrg = org;
		showOrgModal = true;
	}

	async function handleSaveOrg(data: Partial<Organization>) {
		if (editingOrg) {
			await outletsStore.updateOrganization(editingOrg.id, data);
		} else {
			await outletsStore.createOrganization(data);
		}
	}

	async function handleToggleOrgStatus(org: Organization) {
		if (org.active !== false) {
			conflictTargetName = `Organisasi ${org.name}`;
			await outletsStore.deactivateOrganization(org.id);
		} else {
			await outletsStore.activateOrganization(org.id);
		}
	}

	// Aksi Outlet
	function handleOpenCreateOutlet() {
		editingOutlet = null;
		showOutletModal = true;
	}

	function handleEditOutlet(out: Outlet) {
		editingOutlet = out;
		showOutletModal = true;
	}

	async function handleSaveOutlet(data: Partial<Outlet>) {
		if (editingOutlet) {
			await outletsStore.updateOutlet(editingOutlet.id, data);
		} else {
			await outletsStore.createOutlet(data);
		}
	}

	async function handleToggleOutletStatus(out: Outlet) {
		if (out.active !== false) {
			conflictTargetName = `Outlet ${out.name}`;
			await outletsStore.deactivateOutlet(out.id);
		} else {
			await outletsStore.activateOutlet(out.id);
		}
	}

	async function handleOpenDetail(out: Outlet) {
		detailedOutlet = out;
		await outletsStore.loadOutletOwnerships(out.id);
		showDetailDrawer = true;
	}
</script>

<svelte:head>
	<title>Master Organisasi &amp; Outlet | HANJO ERP</title>
</svelte:head>

<div class="outlets-page-container">
	<!-- 1. Header & Quick Metrics -->
	<header class="outlets-page-header">
		<div class="page-header-lead">
			<div class="page-header-icon" aria-hidden="true">
				<Icon name="building-office" size={24} />
			</div>
			<div class="page-header-text">
				<h1 class="page-title">Master Organisasi, Gerai &amp; Mitra</h1>
				<p class="page-subtitle">Pengelolaan hierarki multi-organisasi, jaringan outlet gerai, dan kepemilikan investor.</p>
			</div>
		</div>
	</header>

	<!-- Stat Counters Strip (4-Tier Responsive) -->
	<div class="outlets-header-stats">
		<div class="stat-box">
			<span class="stat-box-title">Organisasi Induk</span>
			<span class="stat-box-value">{outletsStore.organizations.length}</span>
			<span class="stat-box-sub">Entitas bisnis terdaftar</span>
		</div>
		<div class="stat-box">
			<span class="stat-box-title">Total Gerai Aktif</span>
			<span class="stat-box-value text-[var(--brand-primary)]">
				{outletsStore.outlets.filter((o) => o.active !== false).length}
			</span>
			<span class="stat-box-sub">Dari {outletsStore.outlets.length} total cabang</span>
		</div>
		<div class="stat-box">
			<span class="stat-box-title">Gerai Mandiri vs Mitra</span>
			<span class="stat-box-value">
				{outletsStore.outlets.filter((o) => o.owner_type !== 'partner').length} / {outletsStore.outlets.filter((o) => o.owner_type === 'partner').length}
			</span>
			<span class="stat-box-sub">Internal vs Investor Mitra</span>
		</div>
		<div class="stat-box">
			<span class="stat-box-title">Grup Wilayah Operasional</span>
			<span class="stat-box-value">{outletsStore.groups.length}</span>
			<span class="stat-box-sub">Regional &amp; Area Manager</span>
		</div>
	</div>

	<!-- 2. Navigasi Tab Utama (PG-org-outlets, PG-org-list, PG-org-groups, PG-org-owners) -->
	<nav class="outlets-tabs-nav" aria-label="Tab Menu Organisasi">
		<button
			type="button"
			class="outlets-tab-btn {outletsStore.activeTab === 'outlets' ? 'active' : ''}"
			onclick={() => (outletsStore.activeTab = 'outlets')}
		>
			<Icon name="building-storefront" size={16} />
			<span>Daftar Gerai / Outlet ({outletsStore.outlets.length})</span>
		</button>

		<button
			type="button"
			class="outlets-tab-btn {outletsStore.activeTab === 'organizations' ? 'active' : ''}"
			onclick={() => (outletsStore.activeTab = 'organizations')}
		>
			<Icon name="building-office" size={16} />
			<span>Organisasi Induk ({outletsStore.organizations.length})</span>
		</button>

		<button
			type="button"
			class="outlets-tab-btn {outletsStore.activeTab === 'groups' ? 'active' : ''}"
			onclick={() => (outletsStore.activeTab = 'groups')}
		>
			<Icon name="map-pin" size={16} />
			<span>Grup Wilayah ({outletsStore.groups.length})</span>
		</button>

		{#if outletsStore.isPartnerOwnershipEnabled}
			<button
				type="button"
				class="outlets-tab-btn {outletsStore.activeTab === 'owners' ? 'active' : ''}"
				onclick={() => (outletsStore.activeTab = 'owners')}
			>
				<Icon name="users" size={16} />
				<span>Mitra &amp; Investor ({outletsStore.owners.length})</span>
			</button>
		{/if}
	</nav>

	<!-- 4 Keadaan Layar Wajib: Otorisasi 403 Forbidden -->
	{#if !canRead}
		<ErrorState
			title="Akses Ditolak (403 Forbidden)"
			message="Peran aktif Anda ({session.currentRole.toUpperCase()}) tidak memiliki izin untuk melihat modul master organisasi dan gerai."
			code="403_FORBIDDEN"
		/>
	<!-- 4 Keadaan Layar Wajib: Error State -->
	{:else if outletsStore.error}
		<ErrorState
			title="Gagal Memuat Master Organisasi &amp; Gerai"
			message={outletsStore.error}
			onretry={() => outletsStore.loadAll()}
		/>
	<!-- TAB 1: DAFTAR OUTLET / GERAI (PG-org-outlets) -->
	{:else if outletsStore.activeTab === 'outlets'}
		<!-- Toolbar Filter Outlet & Aksi Kontekstual di Bawah Tab (Golden Rule 15) -->
		<div class="outlets-toolbar">
			<div class="toolbar-left">
				<!-- Pencarian -->
				<div class="toolbar-search">
					<Icon name="magnifying-glass" size={15} class="toolbar-search-icon" />
					<input
						type="text"
						class="toolbar-search-input"
						placeholder="Cari nama gerai, kode, atau kota..."
						bind:value={outletsStore.searchQuery}
					/>
				</div>

				<!-- Tombol Filter Drawer -->
				<button
					type="button"
					class="btn btn-secondary flex items-center gap-2 {activeFiltersCount > 0 ? '!border-[var(--brand-primary)] !text-[var(--brand-primary)]' : ''}"
					onclick={() => (isFilterDrawerOpen = true)}
					aria-label="Buka filter gerai"
				>
					<Icon name="funnel" size={16} />
					<span>Filter</span>
					{#if activeFiltersCount > 0}
						<span class="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-[var(--brand-primary)] text-slate-950">
							{activeFiltersCount}
						</span>
					{/if}
				</button>
			</div>

			<div class="toolbar-right">
				{#if canManage}
					<button
						type="button"
						class="btn btn-primary"
						onclick={handleOpenCreateOutlet}
						id="btn-tambah-outlet"
					>
						<Icon name="plus" size={16} />
						<span>Tambah Outlet Baru</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- Active Filters Pills Bar -->
		{#if activeFiltersCount > 0}
			<div class="flex items-center gap-2.5 flex-wrap p-3.5 rounded-xl bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-xs">
				<span class="font-semibold text-[var(--text-muted)] uppercase tracking-wide text-[0.7rem]">Filter Aktif:</span>
				{#if outletsStore.selectedOrgFilter !== '*'}
					{@const selOrg = outletsStore.organizations.find((o) => o.id === outletsStore.selectedOrgFilter)}
					<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-main)]">
						<span>Organisasi: <strong>{selOrg?.name || outletsStore.selectedOrgFilter}</strong></span>
						<button type="button" class="text-[var(--text-muted)] hover:text-[var(--pill-danger-text)] cursor-pointer bg-transparent border-0" onclick={() => (outletsStore.selectedOrgFilter = '*')}>
							<Icon name="x-mark" size={12} />
						</button>
					</span>
				{/if}

				{#if outletsStore.selectedOwnerTypeFilter !== 'all'}
					<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-main)]">
						<span>Model: <strong>{outletsStore.selectedOwnerTypeFilter === 'partner' ? 'Kemitraan Investor' : 'Milik Sendiri'}</strong></span>
						<button type="button" class="text-[var(--text-muted)] hover:text-[var(--pill-danger-text)] cursor-pointer bg-transparent border-0" onclick={() => (outletsStore.selectedOwnerTypeFilter = 'all')}>
							<Icon name="x-mark" size={12} />
						</button>
					</span>
				{/if}

				{#if outletsStore.selectedStatusFilter !== 'all'}
					<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-main)]">
						<span>Status: <strong>{outletsStore.selectedStatusFilter === 'active' ? 'Gerai Aktif' : 'Nonaktif'}</strong></span>
						<button type="button" class="text-[var(--text-muted)] hover:text-[var(--pill-danger-text)] cursor-pointer bg-transparent border-0" onclick={() => (outletsStore.selectedStatusFilter = 'all')}>
							<Icon name="x-mark" size={12} />
						</button>
					</span>
				{/if}

				{#if outletsStore.selectedGroupFilter !== 'all'}
					{@const selGrp = outletsStore.groups.find((g) => g.id === outletsStore.selectedGroupFilter)}
					<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-main)]">
						<span>Wilayah: <strong>{selGrp?.name || outletsStore.selectedGroupFilter}</strong></span>
						<button type="button" class="text-[var(--text-muted)] hover:text-[var(--pill-danger-text)] cursor-pointer bg-transparent border-0" onclick={() => (outletsStore.selectedGroupFilter = 'all')}>
							<Icon name="x-mark" size={12} />
						</button>
					</span>
				{/if}

				<button
					type="button"
					class="text-xs text-[var(--brand-primary)] hover:underline font-medium ml-1 cursor-pointer bg-transparent border-0"
					onclick={resetAllFilters}
				>
					Reset Semua
				</button>
			</div>
		{/if}

		<!-- Grid Daftar Outlet (Loading Skeleton vs Data) -->
		{#if outletsStore.isLoading}
			<div class="py-8">
				<Skeleton count={4} variant="card" />
			</div>
		{:else if outletsStore.filteredOutlets.length === 0}
			<EmptyState
				title="Tidak Ada Gerai Ditemukan"
				description="Tidak ada gerai / outlet yang sesuai dengan parameter pencarian atau filter yang aktif."
			>
				{#snippet action()}
					{#if activeFiltersCount > 0}
						<button type="button" class="btn btn-secondary" onclick={resetAllFilters}>
							Reset Filter
						</button>
					{:else if canManage}
						<button type="button" class="btn btn-primary" onclick={handleOpenCreateOutlet}>
							<Icon name="plus" size={16} />
							<span>Tambah Outlet Baru</span>
						</button>
					{/if}
				{/snippet}
			</EmptyState>
		{:else}
			<div class="outlets-grid">
				{#each outletsStore.filteredOutlets as out}
					{@const parent = outletsStore.organizations.find((o) => o.id === out.organization_id)}
					<div class="outlet-item-card" id="outlet-card-{out.id}">
						<div class="outlet-card-top">
							<div class="outlet-name-block">
								<CodeBadge code={out.code} />
								<h3 class="outlet-title">{out.name}</h3>
								<span class="outlet-org-subtitle">
									<Icon name="building-office" size={13} />
									<span>{parent?.name || 'Organisasi Terdaftar'}</span>
								</span>
							</div>

							<div class="outlet-card-top-right">
								<StatusBadge
									status={out.active !== false ? 'active' : 'inactive'}
								/>
								<ActionMenu
									items={[
										{
											label: 'Detail & Pemilik',
											icon: 'eye',
											onclick: () => handleOpenDetail(out)
										},
										...(canManage
											? [
													{
														label: 'Ubah Data Gerai',
														icon: 'pencil-square',
														onclick: () => handleEditOutlet(out)
													},
													{
														divider: true,
														label: out.active !== false ? 'Nonaktifkan Gerai' : 'Aktifkan Gerai',
														icon: out.active !== false ? 'lock-closed' : 'check-circle',
														variant: (out.active !== false ? 'danger' : 'success') as 'danger' | 'success',
														onclick: () => handleToggleOutletStatus(out)
													}
												]
											: [])
									]}
								/>
							</div>
						</div>

						<div class="outlet-info-grid">
							<div class="info-item">
								<span class="info-label">Kota / Lokasi</span>
								<span class="info-val">{out.city}</span>
							</div>
							<div class="info-item">
								<span class="info-label">Model Gerai</span>
								<span class="info-val">
									{out.owner_type === 'partner' ? 'Kemitraan Mitra' : 'Milik Sendiri'}
								</span>
							</div>
							<div class="info-item">
								<span class="info-label">Pajak PBJT</span>
								<span class="info-val">{Math.round((out.tax_rate || 0.1) * 100)}%</span>
							</div>
							<div class="info-item">
								<span class="info-label">Batas Kas Kecil</span>
								<span class="info-val font-mono">{out.petty_cash_limit || 'Rp 300.000'}</span>
							</div>
						</div>

						<!-- Card Action Footer (Progressive Disclosure - Golden Rule 13) -->
						<div class="outlet-card-footer">
							<button
								type="button"
								class="btn-view-direct"
								onclick={() => handleOpenDetail(out)}
								id="btn-view-outlet-{out.id}"
							>
								<Icon name="eye" size={14} />
								<span>Lihat Detail</span>
							</button>

							{#if canManage}
								<button
									type="button"
									class="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--brand-primary)] flex items-center gap-1.5 transition-colors bg-transparent border-0 cursor-pointer p-1"
									onclick={() => handleEditOutlet(out)}
									title="Ubah Data Gerai"
								>
									<Icon name="pencil-square" size={13} />
									<span>Ubah</span>
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

	<!-- TAB 2: ORGANISASI INDUK (PG-org-list, T-02.0) -->
	{:else if outletsStore.activeTab === 'organizations'}
		<OrganizationListCard
			organizations={outletsStore.organizations}
			canManage={canManage}
			onEdit={handleEditOrg}
			onAdd={canManage ? handleOpenCreateOrg : undefined}
			onToggleStatus={handleToggleOrgStatus}
			onSelectOrgFilter={(orgId) => {
				outletsStore.selectedOrgFilter = orgId;
				outletsStore.activeTab = 'outlets';
			}}
		/>

	<!-- TAB 3: GRUP WILAYAH (PG-org-groups, T-02.8) -->
	{:else if outletsStore.activeTab === 'groups'}
		<OutletGroupsSection
			groups={outletsStore.groups}
			outlets={outletsStore.outlets}
			canManage={canManage}
			onCreateGroup={async (data) => {
				await outletsStore.createGroup(data);
			}}
		/>

	<!-- TAB 4: MITRA & INVESTOR (PG-org-owners, T-02.6, Flag: partner_ownership) -->
	{:else if outletsStore.activeTab === 'owners'}
		<PartnerOwnersSection owners={outletsStore.owners} />
	{/if}
</div>

<!-- MODAL: Form Tambah/Ubah Organisasi Induk -->
<OrganizationModal
	open={showOrgModal}
	organization={editingOrg}
	onClose={() => (showOrgModal = false)}
	onSave={handleSaveOrg}
/>

<!-- MODAL: Form Tambah/Ubah Outlet -->
<OutletFormModal
	open={showOutletModal}
	outlet={editingOutlet}
	organizations={outletsStore.organizations}
	groups={outletsStore.groups}
	defaultOrgId={outletsStore.selectedOrgFilter}
	onClose={() => (showOutletModal = false)}
	onSave={handleSaveOutlet}
/>

<!-- MODAL / DRAWER: Detail Outlet Bertab & Editor Kepemilikan -->
<OutletDetailDrawer
	open={showDetailDrawer}
	outlet={detailedOutlet}
	organizations={outletsStore.organizations}
	ownerships={outletsStore.outletOwnerships}
	isPartnerEnabled={outletsStore.isPartnerOwnershipEnabled}
	canManage={canManage}
	onClose={() => (showDetailDrawer = false)}
	onSaveOwnerships={async (ownerships) => {
		if (detailedOutlet) {
			await outletsStore.saveOwnerships(detailedOutlet.id, ownerships);
		}
	}}
/>

<!-- MODAL: Konflik Deaktivasi (AC-02.2) -->
<DeactivationConflictModal
	open={outletsStore.blockingConflict !== null}
	conflict={outletsStore.blockingConflict}
	targetName={conflictTargetName}
	onClose={() => (outletsStore.blockingConflict = null)}
/>

<!-- DRAWER: Filter Gerai / Outlet -->
<Drawer
	open={isFilterDrawerOpen}
	title="Filter Gerai / Outlet"
	subtitle="Saring daftar gerai berdasarkan organisasi brand, model bisnis, dan wilayah"
	width="420px"
	onclose={() => (isFilterDrawerOpen = false)}
>
	<div class="form-field-stack">
		<div>
			<label for="filter-drawer-org" class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">
				Organisasi Induk (Brand)
			</label>
			<Select
				id="filter-drawer-org"
				options={orgFilterOptions}
				bind:value={outletsStore.selectedOrgFilter}
				placeholder="Pilih Organisasi Induk"
			/>
		</div>

		<div>
			<label for="filter-drawer-owner" class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">
				Model Kepemilikan Gerai
			</label>
			<Select
				id="filter-drawer-owner"
				options={ownerTypeFilterOptions}
				bind:value={outletsStore.selectedOwnerTypeFilter}
				placeholder="Pilih Model Kepemilikan"
			/>
		</div>

		<div>
			<label for="filter-drawer-status" class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">
				Status Operasional
			</label>
			<Select
				id="filter-drawer-status"
				options={statusFilterOptions}
				bind:value={outletsStore.selectedStatusFilter}
				placeholder="Pilih Status"
			/>
		</div>

		<div>
			<label for="filter-drawer-group" class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">
				Grup Wilayah Operasional
			</label>
			<Select
				id="filter-drawer-group"
				options={groupFilterOptions}
				bind:value={outletsStore.selectedGroupFilter}
				placeholder="Pilih Grup Wilayah"
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
