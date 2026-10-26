<script lang="ts">
	/**
	 * Komponen Drawer Detail Menu Bertab (PG-cat-menu-detail)
	 * Menerapkan Progressive Disclosure & Generous Padding
	 */
	import { menuStore } from '../stores/menu.svelte.js';
	import { formatRupiah } from '../../../utils/format.js';
	import { session } from '../../../auth/session.svelte.js';
	import Icon from '../../../components/data/Icon.svelte';
	import Button from '../../../components/forms/Button.svelte';
	import Modal from '../../../components/feedback/Modal.svelte';
	import HppSimulationPanel from './HppSimulationPanel.svelte';

	const userRole = $derived(session.user?.role || 'owner');
	const canEdit = $derived(userRole === 'hq_admin' || userRole === 'owner');

	const currentItem = $derived(menuStore.selectedMenuItem);

	const itemRecipes = $derived.by(() => {
		if (!currentItem) return [];
		const variantIds = currentItem.variants.map((v) => v.id);
		return menuStore.recipes.filter((r) => variantIds.includes(r.variant_id));
	});

	const itemAvailability = $derived.by(() => {
		if (!currentItem) return [];
		return menuStore.availability.filter((a) => a.menu_item_id === currentItem.id);
	});
</script>

<Modal
	open={menuStore.isDetailDrawerOpen}
	title={currentItem?.name || 'Detail Menu Siap Jual'}
	maxWidth="clamp(980px, 80vw, 1440px)"
	onclose={() => menuStore.closeDetailDrawer()}
>
	{#if currentItem}
		<div class="space-y-6">
			<!-- Header Badge & Sub-info -->
			<div class="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)]">
				<div class="flex items-center gap-3">
					<div class="w-12 h-12 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--brand-primary)]">
						<Icon name="book-open" size={24} />
					</div>
					<div>
						<div class="flex items-center gap-2">
							<span class="font-mono text-xs px-2.5 py-1 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-main)] font-semibold">
								{currentItem.code}
							</span>
							<span class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
								{currentItem.status.toUpperCase()}
							</span>
						</div>
						<h2 class="text-base font-semibold text-[var(--text-main)] mt-1">
							{currentItem.name}
						</h2>
					</div>
				</div>

				<div class="text-right">
					<span class="text-xs text-[var(--text-muted)] block">Kategori</span>
					<span class="text-sm font-semibold text-sky-400">{currentItem.category_name}</span>
				</div>
			</div>

			<!-- Tab Navigation di dalam Drawer -->
			<div class="flex border-b border-[var(--border-subtle)] gap-2 overflow-x-auto">
				<button
					type="button"
					class="px-4 py-2.5 text-xs font-semibold border-b-2 transition-all {menuStore.detailDrawerTab === 'info' ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}"
					onclick={() => (menuStore.detailDrawerTab = 'info')}
				>
					Ringkasan Info
				</button>

				<button
					type="button"
					class="px-4 py-2.5 text-xs font-semibold border-b-2 transition-all {menuStore.detailDrawerTab === 'variants' ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}"
					onclick={() => (menuStore.detailDrawerTab = 'variants')}
				>
					Varian ({currentItem.variants.length})
				</button>

				<button
					type="button"
					class="px-4 py-2.5 text-xs font-semibold border-b-2 transition-all {menuStore.detailDrawerTab === 'recipe' ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}"
					onclick={() => (menuStore.detailDrawerTab = 'recipe')}
				>
					Resep Berversi ({itemRecipes.length})
				</button>

				<button
					type="button"
					class="px-4 py-2.5 text-xs font-semibold border-b-2 transition-all {menuStore.detailDrawerTab === 'hpp' ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}"
					onclick={() => (menuStore.detailDrawerTab = 'hpp')}
				>
					Simulasi HPP
				</button>

				<button
					type="button"
					class="px-4 py-2.5 text-xs font-semibold border-b-2 transition-all {menuStore.detailDrawerTab === 'availability' ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}"
					onclick={() => (menuStore.detailDrawerTab = 'availability')}
				>
					Ketersediaan Gerai
				</button>
			</div>

			<!-- TAB CONTENT 1: INFO -->
			{#if menuStore.detailDrawerTab === 'info'}
				<div class="space-y-4 text-sm">
					<div class="p-4 rounded-xl bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] space-y-3">
						<div>
							<span class="text-xs text-[var(--text-muted)] block mb-1">Deskripsi Menu:</span>
							<p class="text-[var(--text-main)] leading-relaxed">
								{currentItem.description || 'Tidak ada deskripsi rinci untuk menu ini.'}
							</p>
						</div>

						<div class="grid grid-cols-2 gap-4 pt-3 border-t border-[var(--border-subtle)]">
							<div>
								<span class="text-xs text-[var(--text-muted)] block">Cakupan Gerai:</span>
								<span class="font-medium text-[var(--text-main)]">
									{#if currentItem.scope_type === 'all_outlets'}
										Berlaku di Semua Gerai (Global)
									{:else}
										Khusus Gerai ({currentItem.target_outlet_ids?.join(', ')})
									{/if}
								</span>
							</div>

							<div>
								<span class="text-xs text-[var(--text-muted)] block">Sifat Penjualan:</span>
								<span class="font-medium text-[var(--text-main)]">
									{#if currentItem.is_time_limited}
										Menu Musiman ({currentItem.available_from} s/d {currentItem.available_until})
									{:else}
										Menu Reguler Tetap
									{/if}
								</span>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- TAB CONTENT 2: VARIAN -->
			{#if menuStore.detailDrawerTab === 'variants'}
				<div class="space-y-4">
					<div class="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
						<table class="recipe-table">
							<thead>
								<tr>
									<th>Nama Varian</th>
									<th>Kode SKU</th>
									<th>Harga Dasar</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody>
								{#each currentItem.variants as v}
									<tr>
										<td class="font-semibold text-[var(--text-main)]">{v.name}</td>
										<td class="font-mono text-xs">{v.sku}</td>
										<td class="font-mono font-semibold text-sky-400">{formatRupiah(v.base_price)}</td>
										<td>
											<span class="text-[0.725rem] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
												AKTIF
											</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}

			<!-- TAB CONTENT 3: RESEP BERVERSI -->
			{#if menuStore.detailDrawerTab === 'recipe'}
				<div class="space-y-5">
					<div class="flex items-center justify-between">
						<div>
							<h4 class="font-semibold text-[var(--text-main)] text-sm">Daftar Versi Resep &amp; BOM</h4>
							<p class="text-xs text-[var(--text-muted)]">Resep aktif bersifat kekal; pembaruan formula akan merilis versi baru (AC-04.3).</p>
						</div>

						{#if canEdit}
							<Button
								variant="primary"
								size="sm"
								onclick={() => {
									menuStore.editingRecipe = {
										variant_id: currentItem.variants[0]?.id || '',
										menu_item_id: currentItem.id,
										scope_type: 'standard',
										effective_from: '2026-11-01T00:00:00Z',
										ingredients: []
									};
									menuStore.isRecipeModalOpen = true;
								}}
							>
								<Icon name="plus" size={14} />
								<span>Rilis Versi Resep Baru</span>
							</Button>
						{/if}
					</div>

					{#each itemRecipes as rcp}
						<div class="p-4 rounded-xl bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] space-y-3">
							<div class="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
								<div class="flex items-center gap-2">
									<span class="font-bold text-sm text-[var(--brand-primary)]">
										Versi {rcp.version_number}
									</span>
									{#if rcp.scope_type === 'outlet_override'}
										<span class="badge-override">Override: {rcp.outlet_name || rcp.outlet_id}</span>
									{:else}
										<span class="text-[0.725rem] px-2 py-0.5 rounded bg-[var(--bg-panel)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
											Standar Nasional
										</span>
									{/if}
									{#if rcp.is_active && !rcp.effective_until}
										<span class="text-[0.725rem] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
											AKTIF BERJALAN
										</span>
									{:else}
										<span class="text-[0.725rem] px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/30">
											HISTORIS
										</span>
									{/if}
								</div>

								<span class="text-xs text-[var(--text-muted)] font-mono">
									Berlaku: {rcp.effective_from.split('T')[0]} s/d {rcp.effective_until ? rcp.effective_until.split('T')[0] : 'Seterusnya'}
								</span>
							</div>

							{#if rcp.notes}
								<p class="text-xs text-[var(--text-muted)] italic">
									"{rcp.notes}"
								</p>
							{/if}

							<!-- Komposisi Bahan -->
							<div class="overflow-x-auto rounded border border-[var(--border-subtle)]">
								<table class="recipe-table !text-xs">
									<thead>
										<tr>
											<th>Bahan Baku</th>
											<th>Kuantitas Saji</th>
											<th>Waste %</th>
										</tr>
									</thead>
									<tbody>
										{#each rcp.ingredients as ing}
											<tr>
												<td class="font-medium text-[var(--text-main)]">{ing.stock_item_name}</td>
												<td class="font-mono">{parseFloat(ing.quantity)} {ing.serving_unit}</td>
												<td>{parseFloat(ing.waste_pct)}%</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- TAB CONTENT 4: SIMULASI HPP -->
			{#if menuStore.detailDrawerTab === 'hpp'}
				<div>
					<HppSimulationPanel variantId={currentItem.variants[0]?.id || ''} variantName={currentItem.name} />
				</div>
			{/if}

			<!-- TAB CONTENT 5: KETERSEDIAAN -->
			{#if menuStore.detailDrawerTab === 'availability'}
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<div>
							<h4 class="font-semibold text-[var(--text-main)] text-sm">Status Ketersediaan per Gerai &amp; Channel</h4>
							<p class="text-xs text-[var(--text-muted)]">Store Manager dapat menandai habis untuk gerai tugasnya sendiri (AC-04.11).</p>
						</div>
					</div>

					<div class="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
						<table class="recipe-table">
							<thead>
								<tr>
									<th>Gerai Outlet</th>
									<th>Channel Penjualan</th>
									<th>Status Ketersediaan</th>
									<th>Catatan</th>
									<th>Aksi</th>
								</tr>
							</thead>
							<tbody>
								{#each itemAvailability as av}
									<tr>
										<td class="font-semibold text-[var(--text-main)]">{av.outlet_id}</td>
										<td>
											<span class="font-mono text-xs uppercase px-2 py-0.5 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)]">
												{av.channel_code}
											</span>
										</td>
										<td>
											{#if av.is_available}
												<span class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
													TERSEDIA
												</span>
											{:else}
												<span class="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
													HABIS (SOLD OUT)
												</span>
											{/if}
										</td>
										<td class="text-xs text-[var(--text-muted)]">
											{av.sold_out_reason || '—'}
										</td>
										<td>
											<Button
												variant={av.is_available ? 'danger' : 'secondary'}
												size="sm"
												onclick={() => menuStore.toggleMenuAvailability(av, 'Habis terjual di gerai')}
											>
												{av.is_available ? 'Tandai Habis' : 'Pulihkan'}
											</Button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	{#snippet footer()}
		<div class="flex items-center justify-between w-full">
			<Button
				variant="secondary"
				onclick={() => {
					if (currentItem?.variants?.[0]) {
						menuStore.calcVariantId = currentItem.variants[0].id;
						menuStore.refreshPricingCalculation();
					}
					menuStore.isPricingCalculatorOpen = true;
				}}
			>
				<Icon name="calculator" size={14} />
				<span>Buka Kalkulator Channel</span>
			</Button>

			<Button variant="secondary" onclick={() => menuStore.closeDetailDrawer()}>
				Tutup
			</Button>
		</div>
	{/snippet}
</Modal>
