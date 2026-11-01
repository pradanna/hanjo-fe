<script lang="ts">
	/**
	 * Subkomponen: Drawer Filter Bahan Baku
	 * Bagian dari modul Master Bahan (MS-03)
	 */
	import Drawer from '#lib/components/feedback/Drawer.svelte';
	import Select, { type SelectOption } from '#lib/components/forms/Select.svelte';
	import { catalogStore } from '#lib/features/catalog/stores/catalog.svelte.js';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open = $bindable(false), onclose }: Props = $props();

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

	const drawerCategoryOptions = $derived<SelectOption[]>([
		{ value: 'all', label: `Semua Kategori (${catalogStore.categories.length})` },
		...catalogStore.categories.map((c) => ({ value: c.id, label: c.name }))
	]);

	const drawerProducibleOptions: SelectOption[] = [
		{ value: 'all', label: 'Semua Tipe Bahan' },
		{ value: 'true', label: 'Bahan Olahan Gerai (Produksi Internal)' },
		{ value: 'false', label: 'Bahan Baku Siap Pakai (Direct Raw)' }
	];

	const drawerExternalOptions: SelectOption[] = [
		{ value: 'all', label: 'Semua Izin Beli' },
		{ value: 'true', label: 'Boleh Beli Luar (PO Langsung)' },
		{ value: 'false', label: 'Hanya Melalui Gudang HQ' }
	];

	const drawerStatusOptions: SelectOption[] = [
		{ value: 'active', label: 'Bahan Aktif (Operasional)' },
		{ value: 'archived', label: 'Diarsipkan (Nonaktif)' },
		{ value: 'all', label: 'Semua Status' }
	];

	const drawerStockLevelOptions: SelectOption[] = [
		{ value: 'all', label: 'Semua Kondisi Stok' },
		{ value: 'low_stock', label: 'Stok Menipis (Hampir Habis)' },
		{ value: 'out_of_stock', label: 'Stok Habis (0)' }
	];
</script>

<Drawer
	{open}
	title="Filter Bahan Baku"
	subtitle="Penyaringan katalog inventaris bahan baku"
	width="420px"
	{onclose}
>
	<div class="filter-drawer-form">
		<div class="filter-drawer-field">
			<label for="drawer-filter-cat" class="filter-drawer-label">Kategori Bahan</label>
			<p class="filter-drawer-desc">Saring berdasarkan grup klasifikasi bahan</p>
			<Select
				id="drawer-filter-cat"
				bind:value={catalogStore.selectedCategoryFilter}
				options={drawerCategoryOptions}
				searchable
			/>
		</div>

		<div class="filter-drawer-field">
			<label for="drawer-filter-producible" class="filter-drawer-label">Tipe Pengolahan Bahan</label>
			<p class="filter-drawer-desc">Bahan mentah siap pakai vs bahan olahan internal dapur</p>
			<Select
				id="drawer-filter-producible"
				bind:value={catalogStore.selectedProducibleFilter}
				options={drawerProducibleOptions}
			/>
		</div>

		<div class="filter-drawer-field">
			<label for="drawer-filter-external" class="filter-drawer-label">Izin Pembelian Langsung (PO Luar)</label>
			<p class="filter-drawer-desc">Hak gerai membeli langsung dari supplier lokal</p>
			<Select
				id="drawer-filter-external"
				bind:value={catalogStore.selectedExternalFilter}
				options={drawerExternalOptions}
			/>
		</div>

		<div class="filter-drawer-field">
			<label for="drawer-filter-status" class="filter-drawer-label">Status Bahan Baku</label>
			<p class="filter-drawer-desc">Tampilkan bahan baku yang aktif digunakan atau diarsipkan</p>
			<Select
				id="drawer-filter-status"
				bind:value={catalogStore.selectedStatusFilter}
				options={drawerStatusOptions}
			/>
		</div>

		<div class="filter-drawer-field">
			<label for="drawer-filter-stock-level" class="filter-drawer-label">Kondisi Stok</label>
			<p class="filter-drawer-desc">Saring bahan yang stoknya hampir habis atau habis</p>
			<Select
				id="drawer-filter-stock-level"
				bind:value={catalogStore.selectedStockLevelFilter}
				options={drawerStockLevelOptions}
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
				onclick={onclose}
			>
				Terapkan Filter {#if activeFiltersCount > 0}({activeFiltersCount}){/if}
			</button>
		</div>
	{/snippet}
</Drawer>
