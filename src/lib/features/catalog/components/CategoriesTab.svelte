<script lang="ts">
	/**
	 * Subkomponen: Tab Master Kategori Bahan (CategoriesTab)
	 * Bagian dari modul Master Bahan (MS-03)
	 * Mengikuti Golden Rule 2 (Thin Svelte)
	 */
	import Icon from '#lib/components/data/Icon.svelte';
	import CodeBadge from '#lib/components/data/CodeBadge.svelte';
	import ActionMenu from '#lib/components/feedback/ActionMenu.svelte';
	import Select, { type SelectOption } from '#lib/components/forms/Select.svelte';
	import { catalogStore } from '#lib/features/catalog/stores/catalog.svelte.js';

	interface Props {
		canManageCatalog: boolean;
		onselectcategory: (catId: string) => void;
	}

	let { canManageCatalog, onselectcategory }: Props = $props();

	let categorySearch = $state('');
	let categoryUsageFilter = $state<'all' | 'has_items' | 'empty'>('all');

	const filteredMaterialCategories = $derived.by(() => {
		let list = catalogStore.categories;
		const q = categorySearch.toLowerCase().trim();
		if (q) {
			list = list.filter((c) =>
				c.name.toLowerCase().includes(q) ||
				c.code.toLowerCase().includes(q) ||
				(c.description || '').toLowerCase().includes(q)
			);
		}
		if (categoryUsageFilter === 'has_items') {
			list = list.filter((c) => (c.item_count || 0) > 0);
		} else if (categoryUsageFilter === 'empty') {
			list = list.filter((c) => (c.item_count || 0) === 0);
		}
		return list;
	});

	const categoryUsageOptions = $derived<SelectOption[]>([
		{ value: 'all', label: `Semua Kategori (${catalogStore.categories.length})` },
		{ value: 'has_items', label: 'Memiliki Bahan Terdaftar' },
		{ value: 'empty', label: 'Belum Ada Bahan (0)' }
	]);
</script>

<div class="catalog-toolbar">
	<div class="toolbar-left">
		<!-- Pencarian Kategori Bahan -->
		<div class="toolbar-search">
			<Icon name="magnifying-glass" size={15} class="toolbar-search-icon" />
			<input
				type="text"
				class="toolbar-search-input"
				placeholder="Cari nama, kode, deskripsi kategori..."
				bind:value={categorySearch}
				id="input-search-mat-categories"
			/>
			{#if categorySearch}
				<button
					type="button"
					class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[var(--text-subtle)] hover:text-[var(--text-main)]"
					onclick={() => (categorySearch = '')}
					title="Hapus pencarian"
				>
					<Icon name="x-mark" size={14} />
				</button>
			{/if}
		</div>

		<!-- Filter Penggunaan Bahan -->
		<div class="w-64">
			<Select
				id="filter-mat-cat-usage"
				bind:value={categoryUsageFilter}
				options={categoryUsageOptions}
				placeholder="Pilih Kategori..."
			/>
		</div>

		{#if categorySearch || categoryUsageFilter !== 'all'}
			<button
				type="button"
				class="btn btn-secondary text-xs"
				style="min-height: 36px; padding: 4px 12px;"
				onclick={() => {
					categorySearch = '';
					categoryUsageFilter = 'all';
				}}
			>
				<Icon name="x-mark" size={13} />
				<span>Reset</span>
			</button>
		{/if}
	</div>
	<div class="toolbar-right">
		{#if canManageCatalog}
			<button
				type="button"
				class="btn btn-secondary"
				onclick={() => catalogStore.openCategoryCsvModal()}
				id="btn-import-csv-kategori"
			>
				<Icon name="arrow-up-tray" size={16} />
				<span>Impor CSV</span>
			</button>

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
					<th class="w-16 text-right">Aksi</th>
				{/if}
			</tr>
		</thead>
		<tbody>
			{#if filteredMaterialCategories.length === 0}
				<tr>
					<td colspan={canManageCatalog ? 5 : 4} class="text-center py-10">
						<div class="flex flex-col items-center justify-center gap-2">
							<Icon name="information-circle" size={24} />
							<span class="text-sm font-semibold text-[var(--text-main)]">Tidak Ada Kategori Ditemukan</span>
							<span class="text-xs text-[var(--text-muted)]">Tidak ada kategori bahan baku yang sesuai dengan kriteria filter saat ini.</span>
							{#if categorySearch || categoryUsageFilter !== 'all'}
								<button
									type="button"
									class="btn btn-secondary text-xs mt-2"
									onclick={() => {
										categorySearch = '';
										categoryUsageFilter = 'all';
									}}
								>
									Reset Filter
								</button>
							{/if}
						</div>
					</td>
				</tr>
			{:else}
				{#each filteredMaterialCategories as cat}
					<tr>
						<td><CodeBadge code={cat.code} /></td>
						<td><strong class="text-[var(--text-main)]">{cat.name}</strong></td>
						<td class="text-xs text-[var(--text-muted)]">{cat.description || '-'}</td>
						<td>
							<button
								type="button"
								class="category-count-badge {(cat.item_count || 0) === 0 ? 'empty' : ''}"
								onclick={() => onselectcategory(cat.id)}
								title={`Klik untuk melihat daftar bahan dalam kategori ${cat.name}`}
							>
								<span>{cat.item_count || 0} bahan</span>
								<Icon name="arrow-top-right-on-square" size={11} />
							</button>
						</td>
						{#if canManageCatalog}
							<td class="text-right">
								<div class="flex items-center justify-end">
									<ActionMenu
										items={[
											{
												label: 'Ubah Kategori',
												icon: 'pencil-square',
												onclick: () => catalogStore.openEditCategory(cat)
											}
										]}
									/>
								</div>
							</td>
						{/if}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
