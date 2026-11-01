<script lang="ts">
	/**
	 * Komponen Drawer Filter Menu & Varian
	 * Referensi: PRD §6, MILESTONE.md §MS-04
	 */
	import { menuStore } from '../stores/menu.svelte.js';
	import Drawer from '../../../components/feedback/Drawer.svelte';
	import Select, { type SelectOption } from '../../../components/forms/Select.svelte';

	let {
		open = $bindable(false)
	}: {
		open: boolean;
	} = $props();

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

	const drawerMenuCategoryOptions = $derived<SelectOption[]>([
		{ value: 'all', label: `Semua Kategori Menu (${menuStore.categories.length})` },
		...menuStore.categories.map((c) => ({ value: c.id, label: c.name }))
	]);

	const drawerMenuScopeOptions: SelectOption[] = [
		{ value: 'all', label: 'Semua Cakupan' },
		{ value: 'all_outlets', label: 'Semua Gerai' },
		{ value: 'outlet_set', label: 'Khusus Gerai Tertentu' }
	];

	const drawerMenuStatusOptions: SelectOption[] = [
		{ value: 'active', label: 'Menu Aktif (Siap Jual)' },
		{ value: 'archived', label: 'Diarsipkan (Nonaktif)' },
		{ value: 'all', label: 'Semua Status' }
	];
</script>

<Drawer
	{open}
	title="Filter Menu &amp; Varian"
	subtitle="Penyaringan katalog menu dan varian jual"
	width="420px"
	onclose={() => (open = false)}
>
	<div class="filter-drawer-form">
		<div class="filter-drawer-field">
			<label for="drawer-filter-menu-cat" class="filter-drawer-label">Kategori Menu</label>
			<p class="filter-drawer-desc">Saring berdasarkan kelompok menu</p>
			<Select
				id="drawer-filter-menu-cat"
				bind:value={menuStore.selectedCategoryFilter}
				options={drawerMenuCategoryOptions}
				searchable
			/>
		</div>

		<div class="filter-drawer-field">
			<label for="drawer-filter-menu-scope" class="filter-drawer-label">Cakupan Distribusi Gerai</label>
			<p class="filter-drawer-desc">Menu semua gerai vs menu eksklusif gerai tertentu</p>
			<Select
				id="drawer-filter-menu-scope"
				bind:value={menuStore.selectedScopeFilter}
				options={drawerMenuScopeOptions}
			/>
		</div>

		<div class="filter-drawer-field">
			<label for="drawer-filter-menu-status" class="filter-drawer-label">Status Penjualan Menu</label>
			<p class="filter-drawer-desc">Menu aktif siap order vs menu yang diarsipkan</p>
			<Select
				id="drawer-filter-menu-status"
				bind:value={menuStore.selectedStatusFilter}
				options={drawerMenuStatusOptions}
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
				onclick={() => (open = false)}
			>
				Terapkan Filter {#if activeFiltersCount > 0}({activeFiltersCount}){/if}
			</button>
		</div>
	{/snippet}
</Drawer>
