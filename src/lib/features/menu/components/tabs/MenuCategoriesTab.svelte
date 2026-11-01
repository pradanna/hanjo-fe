<script lang="ts">
	/**
	 * Subkomponen Tab 2: Kategori Menu Siap Jual
	 * Referensi: PRD §6, MILESTONE.md §MS-04
	 */
	import { menuStore } from '../../stores/menu.svelte.js';
	import { session } from '../../../../auth/session.svelte.js';
	import { can } from '../../../../auth/can.js';

	import Icon from '../../../../components/data/Icon.svelte';
	import StatusBadge from '../../../../components/data/StatusBadge.svelte';
	import CodeBadge from '../../../../components/data/CodeBadge.svelte';
	import Pagination from '../../../../components/data/Pagination.svelte';
	import ActionMenu from '../../../../components/feedback/ActionMenu.svelte';
	import Select, { type SelectOption } from '../../../../components/forms/Select.svelte';

	let {
		onsetTab
	}: {
		onsetTab?: (tab: 'menus') => void;
	} = $props();

	const canManageCatalog = $derived(can(session.user, 'catalog:manage'));

	// Filter Kategori Menu
	let menuCategorySearch = $state('');
	let menuCategoryStatusFilter = $state<'all' | 'active' | 'inactive'>('all');

	const filteredMenuCategories = $derived.by(() => {
		let list = menuStore.categories;
		const q = menuCategorySearch.toLowerCase().trim();
		if (q) {
			list = list.filter((c) =>
				c.name.toLowerCase().includes(q) ||
				c.code.toLowerCase().includes(q)
			);
		}
		if (menuCategoryStatusFilter === 'active') {
			list = list.filter((c) => c.is_active);
		} else if (menuCategoryStatusFilter === 'inactive') {
			list = list.filter((c) => !c.is_active);
		}
		return list;
	});

	const menuCatStatusOptions = $derived<SelectOption[]>([
		{ value: 'all', label: `Semua Status (${menuStore.categories.length})` },
		{ value: 'active', label: 'Hanya Aktif' },
		{ value: 'inactive', label: 'Hanya Nonaktif' }
	]);

	// Pagination Kategori Menu
	let categoryPage = $state(1);
	let categoryPerPage = $state(10);
	const totalFilteredCategories = $derived(filteredMenuCategories.length);
	const paginatedCategories = $derived.by(() => {
		const start = (categoryPage - 1) * categoryPerPage;
		return filteredMenuCategories.slice(start, start + categoryPerPage);
	});

	$effect(() => {
		const _ = `${menuCategorySearch}|${menuCategoryStatusFilter}`;
		categoryPage = 1;
	});

	function viewMenusByCategory(catId: string) {
		menuStore.selectedCategoryFilter = catId;
		onsetTab?.('menus');
	}
</script>

<div class="catalog-toolbar">
	<div class="toolbar-left">
		<!-- Pencarian Kategori Menu -->
		<div class="toolbar-search">
			<Icon name="magnifying-glass" size={15} class="toolbar-search-icon" />
			<input
				type="text"
				class="toolbar-search-input"
				placeholder="Cari nama atau kode kategori menu..."
				bind:value={menuCategorySearch}
				id="input-search-menu-categories"
			/>
			{#if menuCategorySearch}
				<button
					type="button"
					class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[var(--text-subtle)] hover:text-[var(--text-main)]"
					onclick={() => (menuCategorySearch = '')}
					title="Hapus pencarian"
				>
					<Icon name="x-mark" size={14} />
				</button>
			{/if}
		</div>

		<!-- Filter Status Kategori -->
		<div class="w-56">
			<Select
				id="filter-menu-cat-status"
				bind:value={menuCategoryStatusFilter}
				options={menuCatStatusOptions}
				placeholder="Filter Status..."
			/>
		</div>

		{#if menuCategorySearch || menuCategoryStatusFilter !== 'all'}
			<button
				type="button"
				class="btn btn-secondary text-xs"
				style="min-height: 36px; padding: 4px 12px;"
				onclick={() => {
					menuCategorySearch = '';
					menuCategoryStatusFilter = 'all';
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
					<th class="w-16 text-right">Aksi</th>
				{/if}
			</tr>
		</thead>
		<tbody>
			{#if filteredMenuCategories.length === 0}
				<tr>
					<td colspan={canManageCatalog ? 6 : 5} class="text-center py-10">
						<div class="flex flex-col items-center justify-center gap-2">
							<Icon name="information-circle" size={24} />
							<span class="text-sm font-semibold text-[var(--text-main)]">Tidak Ada Kategori Menu Ditemukan</span>
							<span class="text-xs text-[var(--text-muted)]">Tidak ada kategori menu yang sesuai dengan kriteria pencarian atau status filter.</span>
							{#if menuCategorySearch || menuCategoryStatusFilter !== 'all'}
								<button
									type="button"
									class="btn btn-secondary text-xs mt-2"
									onclick={() => {
										menuCategorySearch = '';
										menuCategoryStatusFilter = 'all';
									}}
								>
									Reset Filter
								</button>
							{/if}
						</div>
					</td>
				</tr>
			{:else}
				{#each paginatedCategories as cat}
					<tr>
						<td class="text-center font-mono font-semibold text-[var(--text-muted)]">
							#{cat.sort_order}
						</td>
						<td>
							<CodeBadge code={cat.code} />
						</td>
						<td>
							<strong class="text-[var(--text-main)]">{cat.name}</strong>
						</td>
						<td class="text-center">
							<button
								type="button"
								class="category-count-badge {(cat.item_count || 0) === 0 ? 'empty' : ''}"
								onclick={() => viewMenusByCategory(cat.id)}
								title={`Klik untuk melihat daftar menu dalam kategori ${cat.name}`}
							>
								<span>{cat.item_count || 0} menu</span>
								<Icon name="arrow-top-right-on-square" size={11} />
							</button>
						</td>
						<td class="text-center">
							<StatusBadge status={cat.is_active ? 'active' : 'inactive'} />
						</td>
						{#if canManageCatalog}
							<td class="text-right">
								<div class="flex items-center justify-end">
									<ActionMenu
										items={[
											{
												label: 'Ubah Kategori',
												icon: 'pencil-square',
												onclick: () => menuStore.openEditCategory(cat)
											},
											{
												label: 'Hapus Kategori',
												icon: 'trash',
												variant: 'danger',
												disabled: (cat.item_count || 0) > 0,
												onclick: () => menuStore.deleteCategory(cat)
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

<!-- Pagination Kategori Menu di Footer Panel -->
{#if filteredMenuCategories.length > 0}
	<div class="catalog-panel-footer">
		<Pagination
			page={categoryPage}
			perPage={categoryPerPage}
			total={totalFilteredCategories}
			perPageOptions={[10, 25, 50]}
			hrefBuilder={(p, pp) => `?tab=categories&page=${p}&per_page=${pp}`}
			onpagechange={(newPage) => (categoryPage = newPage)}
			onperpagechange={(newSize) => {
				categoryPerPage = newSize;
				categoryPage = 1;
			}}
		/>
	</div>
{/if}
