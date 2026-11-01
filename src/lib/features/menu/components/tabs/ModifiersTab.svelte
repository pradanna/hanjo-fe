<script lang="ts">
	/**
	 * Subkomponen Tab 4: Add-ons & Ekstra (Grup Modifier)
	 * Referensi: PRD §6, MILESTONE.md §MS-04
	 */
	import { menuStore } from '../../stores/menu.svelte.js';
	import { session } from '../../../../auth/session.svelte.js';
	import { can } from '../../../../auth/can.js';
	import { formatRupiah } from '../../../../utils/format.js';
	import { formatRecipeEffect } from '../../../../domain/recipe.js';

	import Icon from '../../../../components/data/Icon.svelte';
	import CodeBadge from '../../../../components/data/CodeBadge.svelte';
	import EmptyState from '../../../../components/feedback/EmptyState.svelte';
	import Pagination from '../../../../components/data/Pagination.svelte';
	import ActionMenu from '../../../../components/feedback/ActionMenu.svelte';

	const canManageCatalog = $derived(can(session.user, 'catalog:manage'));

	// Pagination Grup Modifier
	let modifierPage = $state(1);
	let modifierPerPage = $state(6);
	const totalModifiers = $derived(menuStore.modifierGroups.length);
	const paginatedModifiers = $derived.by(() => {
		const start = (modifierPage - 1) * modifierPerPage;
		return menuStore.modifierGroups.slice(start, start + modifierPerPage);
	});
</script>

<div class="flex flex-col gap-6">
	<div class="catalog-toolbar">
		<div class="toolbar-left">
			<div class="flex flex-col gap-0.5">
				<h3 class="text-sm font-bold text-[var(--text-main)]">Grup Modifier &amp; Efek Resep BOM</h3>
				<span class="text-xs text-[var(--text-subtle)]">
					Aturan batasan pilihan (Min/Max) dan efek resep dinamis (substitusi bahan, penambahan porsi, pengali takaran).
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

	{#if paginatedModifiers.length === 0}
		<EmptyState
			title="Tidak Ada Grup Modifier"
			description="Belum ada grup modifier yang terdaftar dalam katalog sistem."
		/>
	{:else}
		<div class="modifier-grid">
			{#each paginatedModifiers as g}
				<div class="modifier-group-card">
					<div>
						<!-- Header: Kode & Aksi -->
						<div class="modifier-card-top">
							<CodeBadge code={g.code} />
							{#if canManageCatalog}
								<ActionMenu
									items={[
										{
											label: 'Ubah Grup Modifier',
											icon: 'pencil-square',
											onclick: () => {
												menuStore.editingModifierGroup = g;
												menuStore.isModifierModalOpen = true;
											}
										}
									]}
								/>
							{/if}
						</div>

						<!-- Nama & Deskripsi -->
						<h4 class="modifier-card-title">{g.name}</h4>
						<p class="modifier-card-desc">{g.description || 'Tidak ada deskripsi tambahan.'}</p>

						<!-- Aturan Min/Max & Wajib/Opsional -->
						<div class="modifier-rules-bar">
							<span class="modifier-rule-badge">
								<Icon name="adjustments-horizontal" size={13} />
								<span>Min: {g.min_select} &bull; Max: {g.max_select}</span>
							</span>
							{#if g.min_select > 0}
								<span class="pill-badge pill-danger">
									<span class="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block mr-1"></span>
									Wajib Pilih
								</span>
							{:else}
								<span class="pill-badge pill-neutral">
									<span class="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block mr-1"></span>
									Opsional
								</span>
							{/if}
						</div>

						<!-- Daftar Pilihan Modifier & Efek Resep -->
						<div class="modifier-options-header">
							<span class="modifier-options-title">
								Pilihan &amp; Efek Resep
							</span>
							<span class="modifier-options-count">
								{g.options.length} opsi
							</span>
						</div>

						<div class="modifier-options-list">
							{#each g.options as opt}
								<div class="modifier-option-card">
									<div class="modifier-option-main">
										<div class="modifier-option-left">
											<span class="modifier-option-name">{opt.name}</span>
											{#if opt.is_default}
												<span class="modifier-default-badge">Default</span>
											{/if}
										</div>
										<div class="shrink-0">
											{#if parseFloat(opt.price_delta) > 0}
												<span class="modifier-price-plus">
													+{formatRupiah(opt.price_delta)}
												</span>
											{:else}
												<span class="modifier-price-zero">Rp 0</span>
											{/if}
										</div>
									</div>

									<!-- Efek Resep BOM -->
									{#if opt.recipe_effects && opt.recipe_effects.length > 0}
										<div class="modifier-effects-container">
											{#each opt.recipe_effects as eff}
												{@const formatted = formatRecipeEffect(eff)}
												<div class="modifier-effect-row {formatted.badgeClass}">
													<span class="effect-badge">{formatted.badgeLabel}</span>
													<span class="effect-desc">{formatted.detailText}</span>
												</div>
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
	{/if}

	<!-- Pagination Modifier di Footer Panel -->
	{#if menuStore.modifierGroups.length > 0}
		<div class="catalog-panel-footer">
			<Pagination
				page={modifierPage}
				perPage={modifierPerPage}
				total={totalModifiers}
				perPageOptions={[6, 12, 24]}
				hrefBuilder={(p, pp) => `?tab=modifiers&page=${p}&per_page=${pp}`}
				onpagechange={(newPage) => (modifierPage = newPage)}
				onperpagechange={(newSize) => {
					modifierPerPage = newSize;
					modifierPage = 1;
				}}
			/>
		</div>
	{/if}
</div>
