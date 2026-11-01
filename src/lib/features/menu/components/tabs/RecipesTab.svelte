<script lang="ts">
	/**
	 * Subkomponen Tab 3: Resep Berversi (BOM) & HPP
	 * Referensi: PRD §6, MILESTONE.md §MS-04
	 */
	import { menuStore } from '../../stores/menu.svelte.js';
	import { catalogStore } from '../../../catalog/stores/catalog.svelte.js';
	import { session } from '../../../../auth/session.svelte.js';
	import { can } from '../../../../auth/can.js';
	import { isRecipeActive } from '../../../../domain/recipe.js';
	import { DEMO_OUTLETS } from '../../../../auth/scope.js';
	import type { Recipe } from '../../../../api/contract/types.js';

	import Icon from '../../../../components/data/Icon.svelte';
	import CodeBadge from '../../../../components/data/CodeBadge.svelte';
	import Pagination from '../../../../components/data/Pagination.svelte';
	import ActionMenu from '../../../../components/feedback/ActionMenu.svelte';
	import Select, { type SelectOption } from '../../../../components/forms/Select.svelte';

	const canManageCatalog = $derived(can(session.user, 'catalog:manage'));

	const recipeIngredientOptions = $derived<SelectOption[]>([
		{ value: 'all', label: 'Semua Bahan Baku' },
		...(catalogStore.items.length > 0 ? catalogStore.items : menuStore.stockItems).map((itm) => ({
			value: itm.id,
			label: `${itm.name} (${itm.code})`
		}))
	]);

	const recipeScopeOptions: SelectOption[] = [
		{ value: 'all', label: 'Semua Cakupan' },
		{ value: 'standard', label: 'Standar' },
		{ value: 'outlet_override', label: 'Override Gerai' }
	];

	// Pagination Resep Berversi
	let recipePage = $state(1);
	let recipePerPage = $state(10);
	const totalFilteredRecipes = $derived(menuStore.filteredRecipes.length);
	const paginatedRecipes = $derived.by(() => {
		const start = (recipePage - 1) * recipePerPage;
		return menuStore.filteredRecipes.slice(start, start + recipePerPage);
	});

	$effect(() => {
		const _ = `${menuStore.recipeSearchQuery}|${menuStore.recipeIngredientFilter}|${menuStore.recipeScopeFilter}`;
		recipePage = 1;
	});

	function openRecipeDetail(r: Recipe) {
		const menuItem = menuStore.menuItems.find(
			(m) => m.id === r.menu_item_id || m.variants?.some((v) => v.id === r.variant_id)
		);
		if (menuItem) {
			menuStore.openDetailDrawer(menuItem, 'recipe');
		} else {
			menuStore.editingRecipe = { ...r };
			menuStore.isRecipeModalOpen = true;
		}
	}

	function openHppSimulation(r: Recipe) {
		const menuItem = menuStore.menuItems.find(
			(m) => m.id === r.menu_item_id || m.variants?.some((v) => v.id === r.variant_id)
		);
		if (menuItem) {
			menuStore.simVariantId = r.variant_id;
			if (r.outlet_id) menuStore.simOutletId = r.outlet_id;
			menuStore.refreshHppSimulation();
			menuStore.openDetailDrawer(menuItem, 'hpp');
		}
	}
</script>

<div class="flex flex-col gap-6">
	<div class="catalog-toolbar">
		<div class="toolbar-left">
			<div class="flex flex-col gap-0.5">
				<h3 class="text-sm font-bold text-[var(--text-main)]">Master Formula Resep Berversi &amp; Penentuan HPP</h3>
				<span class="text-xs text-[var(--text-subtle)]">
					Mendukung resep berversi, audit riwayat versi, dan penimpaan (override) khusus gerai tertentu.
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
					<span>Rilis Resep Baru</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- Toolbar Filter & Pencarian Resep -->
	<div class="catalog-toolbar">
		<div class="toolbar-left">
			<div class="toolbar-search">
				<Icon name="magnifying-glass" size={15} class="toolbar-search-icon" />
				<input
					type="text"
					placeholder="Cari formula varian menu atau bahan baku..."
					class="toolbar-search-input"
					bind:value={menuStore.recipeSearchQuery}
				/>
				{#if menuStore.recipeSearchQuery}
					<button
						type="button"
						class="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-subtle)] hover:text-[var(--text-main)]"
						onclick={() => (menuStore.recipeSearchQuery = '')}
						title="Hapus pencarian"
					>
						<Icon name="x-mark" size={14} />
					</button>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				<span class="text-xs text-[var(--text-muted)] whitespace-nowrap font-medium">
					Bahan:
				</span>
				<div class="w-64">
					<Select
						id="filter-recipe-ingredient"
						bind:value={menuStore.recipeIngredientFilter}
						options={recipeIngredientOptions}
						searchable
					/>
				</div>
			</div>

			<div class="flex items-center gap-2">
				<span class="text-xs text-[var(--text-muted)] whitespace-nowrap font-medium">
					Cakupan:
				</span>
				<div class="w-48">
					<Select
						id="filter-recipe-scope"
						bind:value={menuStore.recipeScopeFilter}
						options={recipeScopeOptions}
					/>
				</div>
			</div>

			{#if menuStore.recipeIngredientFilter !== 'all' || menuStore.recipeSearchQuery || menuStore.recipeScopeFilter !== 'all'}
				<button
					type="button"
					class="btn btn-secondary text-xs"
					style="min-height: 36px; padding: 4px 14px;"
					onclick={() => menuStore.clearRecipeFilter()}
				>
					<Icon name="x-mark" size={13} />
					<span>Reset Filter</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- Banner Bahan Aktif Terfilter -->
	{#if menuStore.recipeIngredientFilter !== 'all'}
		{@const activeIngItem = catalogStore.items.find((i) => i.id === menuStore.recipeIngredientFilter) || menuStore.stockItems.find((i) => i.id === menuStore.recipeIngredientFilter)}
		<div class="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs gap-4">
			<div class="flex items-center gap-2.5 flex-wrap">
				<Icon name="funnel" size={16} />
				<span class="text-[var(--text-muted)]">Menampilkan resep yang menggunakan bahan:</span>
				<strong class="text-emerald-300 font-bold text-[13px]">
					{activeIngItem?.name || menuStore.recipeIngredientFilter}
				</strong>
				{#if activeIngItem?.code}
					<CodeBadge code={activeIngItem.code} />
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
					<th>Catatan Rilis</th>
					<th>Status</th>
					<th class="w-16 text-right">Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#each paginatedRecipes as r}
					<tr>
						<td>
							<div class="flex flex-col gap-1 items-start">
								<button
									type="button"
									class="text-left font-bold text-[var(--text-main)] hover:text-emerald-400 transition cursor-pointer"
									onclick={() => openRecipeDetail(r)}
									title="Klik untuk melihat rincian komposisi bahan & formula resep"
								>
									{r.variant_name || r.variant_id}
								</button>
								<CodeBadge code={r.variant_id} variant="muted" />
							</div>
						</td>
						<td>
							<CodeBadge code={'v' + r.version_number} variant="indigo" />
						</td>
						<td>
							{#if r.scope_type === 'standard'}
								<span class="pill-badge pill-info">Standar</span>
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
						<td class="text-xs text-[var(--text-muted)] max-w-xs truncate">
							{r.notes || '-'}
						</td>
						<td>
							{#if isRecipeActive(r)}
								<span class="pill-badge pill-success">Aktif</span>
							{:else}
								<span class="pill-badge pill-neutral">Historis</span>
							{/if}
						</td>
						<td class="text-right">
							<div class="flex items-center justify-end">
								<ActionMenu
									items={[
										{
											label: 'Lihat Detail Formula Resep',
											icon: 'clipboard-document-list',
											onclick: () => openRecipeDetail(r)
										},
										{
											label: 'Simulasi HPP',
											icon: 'calculator',
											onclick: () => openHppSimulation(r)
										},
										...(canManageCatalog
											? [
													{
														label: 'Revisi & Rilis Versi Baru',
														icon: 'arrow-path',
														onclick: () => {
															menuStore.editingRecipe = {
																variant_id: r.variant_id,
																scope_type: r.scope_type,
																outlet_id: r.outlet_id,
																ingredients: [...r.ingredients],
																notes: `Turunan dari v${r.version_number}`
															};
															menuStore.isRecipeModalOpen = true;
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
				{#if menuStore.filteredRecipes.length === 0}
					<tr>
						<td colspan="7" class="text-center py-10">
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

	<!-- Pagination Resep di Footer Panel -->
	{#if menuStore.filteredRecipes.length > 0}
		<div class="catalog-panel-footer">
			<Pagination
				page={recipePage}
				perPage={recipePerPage}
				total={totalFilteredRecipes}
				perPageOptions={[10, 25, 50]}
				hrefBuilder={(p, pp) => `?tab=recipes&page=${p}&per_page=${pp}`}
				onpagechange={(newPage) => (recipePage = newPage)}
				onperpagechange={(newSize) => {
					recipePerPage = newSize;
					recipePage = 1;
				}}
			/>
		</div>
	{/if}
</div>
