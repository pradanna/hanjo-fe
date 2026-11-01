<script lang="ts">
	/**
	 * Komponen Drawer Detail Menu Bertab (PG-cat-menu-detail)
	 * Menerapkan Progressive Disclosure & Generous Padding
	 */
	import { menuStore } from '../stores/menu.svelte.js';
	import { formatRupiah } from '../../../utils/format.js';
	import { session } from '../../../auth/session.svelte.js';
	import { toast } from '../../../components/feedback/toast.svelte.js';
	import Icon from '../../../components/data/Icon.svelte';
	import CodeBadge from '../../../components/data/CodeBadge.svelte';
	import StatusBadge from '../../../components/data/StatusBadge.svelte';
	import Button from '../../../components/forms/Button.svelte';
	import Modal from '../../../components/feedback/Modal.svelte';
	import HppSimulationPanel from './HppSimulationPanel.svelte';
	import { isRecipeActive, sortRecipesByActiveStatus } from '../../../domain/recipe.js';
	import { can } from '../../../auth/can.js';
	import type { MenuVariant } from '../../../api/contract/types.js';

	const canEdit = $derived(can(session.user, 'catalog:manage'));

	const currentItem = $derived(menuStore.selectedMenuItem);

	let isAddVariantModalOpen = $state(false);
	let newVariantName = $state('');
	let newVariantSku = $state('');
	let newVariantPrice = $state('25000.00');
	let isSavingVariant = $state(false);
	let editingVariantId = $state<string | null>(null);

	function openAddVariantModal(v?: MenuVariant) {
		if (v) {
			editingVariantId = v.id;
			newVariantName = v.name;
			newVariantSku = v.sku || v.code;
			newVariantPrice = v.base_price;
		} else {
			editingVariantId = null;
			const baseCode = currentItem?.code || 'MNU';
			const nextNum = (currentItem?.variants?.length || 0) + 1;
			const suggestedName = nextNum === 2 ? 'Iced' : nextNum === 3 ? 'Hot' : `Varian ${nextNum}`;
			newVariantName = suggestedName;
			newVariantSku = `${baseCode}-${suggestedName.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`;
			newVariantPrice = currentItem?.variants?.[0]?.base_price || '25000.00';
		}
		isAddVariantModalOpen = true;
	}

	function handleNewVariantNameChange() {
		if (editingVariantId) return;
		const baseCode = currentItem?.code || 'MNU';
		const suffix = newVariantName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-');
		if (suffix) {
			newVariantSku = `${baseCode}-${suffix}`;
		}
	}

	async function saveVariant() {
		if (!currentItem || !newVariantName.trim() || !newVariantSku.trim()) return;
		isSavingVariant = true;
		try {
			let updatedVariants: MenuVariant[];
			if (editingVariantId) {
				updatedVariants = currentItem.variants.map((v) =>
					v.id === editingVariantId
						? {
								...v,
								name: newVariantName.trim(),
								code: newVariantSku.trim().toUpperCase(),
								sku: newVariantSku.trim().toUpperCase(),
								base_price: newVariantPrice.trim() || '0.00'
						  }
						: v
				);
			} else {
				const newVar: MenuVariant = {
					id: `var-${currentItem.variants.length + 1}`,
					menu_item_id: currentItem.id,
					name: newVariantName.trim(),
					code: newVariantSku.trim().toUpperCase(),
					sku: newVariantSku.trim().toUpperCase(),
					is_active: true,
					base_price: newVariantPrice.trim() || '0.00',
					sort_order: currentItem.variants.length + 1,
					created_at: '',
					updated_at: ''
				};
				updatedVariants = [...currentItem.variants, newVar];
			}

			await menuStore.saveMenuItem({
				...currentItem,
				variants: updatedVariants
			});

			isAddVariantModalOpen = false;
		} finally {
			isSavingVariant = false;
		}
	}

	async function deleteVariant(variantId: string) {
		if (!currentItem || currentItem.variants.length <= 1) {
			toast.error('Menu harus memiliki minimal 1 varian aktif.');
			return;
		}
		if (!confirm('Apakah Anda yakin ingin menghapus varian ini?')) return;

		const updatedVariants = currentItem.variants.filter((v) => v.id !== variantId);
		await menuStore.saveMenuItem({
			...currentItem,
			variants: updatedVariants
		});
	}

	const outletNameMap: Record<string, string> = {
		'out-jkt-01': 'Jodi Senopati',
		'out-bdg-01': 'Jodi Dago',
		'out-sub-01': 'Jodi Gubeng',
		'out-ubud-01': 'Kaveloka Ubud',
		'out-plg-01': 'Plaga Bistro'
	};

	const itemRecipes = $derived.by(() => {
		if (!currentItem) return [];
		const variantIds = currentItem.variants.map((v) => v.id);
		const matched = menuStore.recipes.filter((r) => variantIds.includes(r.variant_id));
		return sortRecipesByActiveStatus(matched);
	});

	let recipeVariantFilter = $state<string>('all');

	// Reset filter varian resep jika menu yang dibuka berganti
	$effect(() => {
		if (currentItem?.id) {
			recipeVariantFilter = 'all';
		}
	});

	function getVariantName(vId: string): string {
		const found = currentItem?.variants.find((v) => v.id === vId);
		return found ? found.name : vId;
	}

	const filteredItemRecipes = $derived.by(() => {
		if (recipeVariantFilter === 'all') return itemRecipes;
		return itemRecipes.filter((r) => r.variant_id === recipeVariantFilter);
	});

	const itemAvailability = $derived.by(() => {
		if (!currentItem) return [];
		return menuStore.availability.filter((a) => a.menu_item_id === currentItem.id);
	});

	const activeModifierGroups = $derived.by(() => {
		if (!currentItem || !currentItem.modifier_group_ids) return [];
		return menuStore.modifierGroups.filter((g) => currentItem.modifier_group_ids.includes(g.id));
	});

	const activePresetNotes = $derived.by(() => {
		if (!currentItem) return [];
		const ids = currentItem.preset_note_ids || [];
		if (ids.length > 0) {
			return menuStore.notePresets.filter((np) => ids.includes(np.id));
		}
		const isDrink = (currentItem.category_name || '').toLowerCase().includes('kopi') ||
			(currentItem.category_name || '').toLowerCase().includes('tea') ||
			(currentItem.category_name || '').toLowerCase().includes('beverage');
		return menuStore.notePresets.filter((np) => isDrink ? (np.category === 'beverage' || np.category === 'general') : (np.category === 'food' || np.category === 'general'));
	});
</script>

<Modal
	open={menuStore.isDetailDrawerOpen}
	maxWidth="clamp(980px, 80vw, 1440px)"
	onclose={() => menuStore.closeDetailDrawer()}
>
	{#snippet header()}
		{#if currentItem}
			<div class="drawer-merged-header">
				<div class="header-main-info">
					<div class="header-title-and-badges">
						<h3 class="modal-title">{currentItem.name}</h3>
						<CodeBadge code={currentItem.code} />
						<StatusBadge status={currentItem.status} size="sm" />
						{#if currentItem.is_time_limited}
							<span class="header-sourcing-pill pill-warning">Menu Musiman</span>
						{:else}
							<span class="header-sourcing-pill pill-success">Menu Reguler</span>
						{/if}
					</div>

					<div class="header-metadata-row">
						<span class="meta-tag">
							<Icon name="tag" size={13} />
							<span>{currentItem.category_name || 'Kategori'}</span>
						</span>
						<span class="meta-separator">&bull;</span>
						<span class="meta-unit font-mono">
							<strong>{currentItem.variants.length}</strong> Varian Terdaftar
						</span>
						<span class="meta-separator">&bull;</span>
						<span class="meta-unit">
							<Icon name="building-storefront" size={13} />
							<span>{currentItem.scope_type === 'all_outlets' ? 'Semua Gerai' : 'Khusus Gerai Tertentu'}</span>
						</span>
					</div>
				</div>

				<div class="header-price-card">
					<span class="price-label">Harga Dasar Standard</span>
					<span class="price-value">{formatRupiah(currentItem.variants[0]?.base_price || 0)}</span>
					<span class="price-sub">per porsi ({currentItem.variants[0]?.name || 'Standard'})</span>
				</div>
			</div>
		{/if}
	{/snippet}

	{#if currentItem}
		<div class="detail-container">
			<!-- Unified Tabbed Section: Tabs Header & Tab Body merged into one clean card -->
			<div class="detail-tabbed-container">
				<div class="detail-tabs-header" role="tablist" aria-label="Tab Menu Detail">
					<button
						type="button"
						role="tab"
						aria-selected={menuStore.detailDrawerTab === 'info'}
						class="detail-tab-btn {menuStore.detailDrawerTab === 'info' ? 'active' : ''}"
						onclick={() => (menuStore.detailDrawerTab = 'info')}
					>
						<Icon name="information-circle" size={15} />
						<span>Ringkasan Info</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={menuStore.detailDrawerTab === 'variants'}
						class="detail-tab-btn {menuStore.detailDrawerTab === 'variants' ? 'active' : ''}"
						onclick={() => (menuStore.detailDrawerTab = 'variants')}
					>
						<Icon name="squares-2x2" size={15} />
						<span>Varian</span>
						<span class="tab-count-badge">{currentItem.variants.length}</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={menuStore.detailDrawerTab === 'recipe'}
						class="detail-tab-btn {menuStore.detailDrawerTab === 'recipe' ? 'active' : ''}"
						onclick={() => (menuStore.detailDrawerTab = 'recipe')}
					>
						<Icon name="clipboard-document-list" size={15} />
						<span>Resep Berversi</span>
						<span class="tab-count-badge">{itemRecipes.length}</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={menuStore.detailDrawerTab === 'hpp'}
						class="detail-tab-btn {menuStore.detailDrawerTab === 'hpp' ? 'active' : ''}"
						onclick={() => (menuStore.detailDrawerTab = 'hpp')}
					>
						<Icon name="calculator" size={15} />
						<span>Simulasi HPP</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={menuStore.detailDrawerTab === 'availability'}
						class="detail-tab-btn {menuStore.detailDrawerTab === 'availability' ? 'active' : ''}"
						onclick={() => (menuStore.detailDrawerTab = 'availability')}
					>
						<Icon name="building-storefront" size={15} />
						<span>Ketersediaan Gerai</span>
						{#if itemAvailability.length > 0}
							<span class="tab-count-badge">{itemAvailability.length}</span>
						{/if}
					</button>
				</div>

				<div class="detail-tab-body">
					<!-- TAB CONTENT 1: INFO -->
					{#if menuStore.detailDrawerTab === 'info'}
						<div class="spec-sheet-container">
							<!-- 1. Deskripsi Menu -->
							<div class="spec-section">
								<div class="spec-section-header">
									<Icon name="document-text" size={15} />
									<span>Deskripsi & Karakteristik Menu</span>
								</div>
								<div class="spec-desc-box">
									<p class="spec-desc-text">
										{currentItem.description || 'Tidak ada deskripsi rinci untuk menu ini.'}
									</p>
								</div>
							</div>

							<!-- 2. Parameter Operasional & Penjualan -->
							<div class="spec-section">
								<div class="spec-section-header">
									<Icon name="adjustments-horizontal" size={15} />
									<span>Parameter Operasional & Penjualan</span>
								</div>
								<div class="spec-grid">
									<div class="spec-item">
										<span class="spec-label">Kategori Menu</span>
										<span class="spec-value flex items-center gap-1.5 font-semibold text-sky-400">
											<Icon name="tag" size={14} />
											<span>{currentItem.category_name || 'Umum'}</span>
										</span>
									</div>

									<div class="spec-item">
										<span class="spec-label">Cakupan Gerai Penjualan</span>
										<span class="spec-value">
											{#if currentItem.scope_type === 'all_outlets'}
												<span class="badge-scope-pill pill-all">
													<Icon name="building-office" size={12} />
													<span>Semua Gerai</span>
												</span>
											{:else}
												<span class="badge-scope-pill pill-local">
													<Icon name="map-pin" size={12} />
													<span>
														Khusus ({currentItem.target_outlet_ids?.map((id) => outletNameMap[id] || id).join(', ') || 'Gerai Tertentu'})
													</span>
												</span>
											{/if}
										</span>
									</div>

									<div class="spec-item">
										<span class="spec-label">Sifat Penjualan</span>
										<span class="spec-value">
											{#if currentItem.is_time_limited}
												<span class="badge-scope-pill pill-warning">
													<Icon name="calendar" size={12} />
													<span>Musiman ({currentItem.available_from} s/d {currentItem.available_until})</span>
												</span>
											{:else}
												<span class="badge-scope-pill pill-neutral">
													<Icon name="calendar" size={12} />
													<span>Menu Reguler Tetap</span>
												</span>
											{/if}
										</span>
									</div>

									<div class="spec-item">
										<span class="spec-label">Harga Dasar Standard</span>
										<span class="spec-value font-mono font-bold text-[var(--brand-primary)]">
											{formatRupiah(currentItem.variants[0]?.base_price || 0)}
										</span>
									</div>

									<div class="spec-item">
										<span class="spec-label">Total Varian Aktif</span>
										<span class="spec-value font-semibold">
											{currentItem.variants.length} Varian Standar
										</span>
									</div>

									<div class="spec-item">
										<span class="spec-label">Versi Resep Aktif</span>
										<span class="spec-value font-semibold text-emerald-400">
											{itemRecipes.filter((r) => isRecipeActive(r)).length} Resep Terdaftar
										</span>
									</div>
								</div>
							</div>

							<!-- 3. Grup Add-ons & Ekstra Terhubung (Lapis 2) -->
							<div class="spec-section">
								<div class="spec-section-header">
									<Icon name="sparkles" size={15} />
									<span>Lapis 2: Pilihan Add-ons &amp; Ekstra ({activeModifierGroups.length})</span>
								</div>
								{#if activeModifierGroups.length === 0}
									<p class="text-xs text-[var(--text-muted)] italic">
										Menu ini tidak memiliki add-on tambahan yang terhubung.
									</p>
								{:else}
									<div class="flex flex-wrap gap-2.5">
										{#each activeModifierGroups as grp}
											<div class="modifier-info-pill">
												<span class="font-semibold text-[var(--text-main)]">{grp.name}</span>
												<span class="text-xs text-[var(--brand-primary)] font-medium">({grp.options.length} opsi)</span>
											</div>
										{/each}
									</div>
								{/if}
							</div>

							<!-- 4. Preset Catatan Dapur / Barista (Lapis 3: Rp 0) -->
							<div class="spec-section">
								<div class="spec-section-header">
									<Icon name="chat-bubble-bottom-center-text" size={15} />
									<span>Lapis 3: Preset Catatan Dapur / Barista ({activePresetNotes.length})</span>
								</div>
								{#if activePresetNotes.length === 0}
									<p class="text-xs text-[var(--text-muted)] italic">
										Tidak ada preset catatan yang diaktifkan untuk menu ini.
									</p>
								{:else}
									<div class="flex flex-wrap gap-2">
										{#each activePresetNotes as np}
											<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
												<Icon name="tag" size={11} />
												<span>{np.name}</span>
											</span>
										{/each}
									</div>
								{/if}
							</div>

							<!-- Audit Strip -->
							<div class="spec-audit-strip">
								<div class="audit-item">
									<Icon name="clock" size={13} />
									<span class="audit-label">Dibuat:</span>
									<span class="audit-value font-mono">
										{new Date(currentItem.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
									</span>
								</div>
								<span class="audit-dot">&bull;</span>
								<div class="audit-item">
									<span class="audit-label">Pembaruan:</span>
									<span class="audit-value font-mono">
										{new Date(currentItem.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
									</span>
								</div>
								<span class="audit-dot">&bull;</span>
								<div class="audit-item">
									<span class="audit-label">Versi Data:</span>
									<span class="audit-value font-mono">v{currentItem.version}</span>
								</div>
							</div>
						</div>
					{/if}

					<!-- TAB CONTENT 2: VARIAN -->
					{#if menuStore.detailDrawerTab === 'variants'}
						<div class="recipe-tab-wrapper">
							<div class="recipe-tab-header">
								<div class="flex flex-col gap-1">
									<h4 class="font-bold text-[var(--text-main)] text-sm m-0">Daftar Varian Menu ({currentItem.variants.length})</h4>
									<p class="text-xs text-[var(--text-muted)] m-0">Setiap varian memiliki SKU dan harga dasar spesifik.</p>
								</div>

								{#if canEdit}
									<div class="flex items-center gap-2.5">
										<Button
											variant="primary"
											size="sm"
											onclick={() => openAddVariantModal()}
										>
											<Icon name="plus" size={14} strokeWidth={2.5} />
											<span>Tambah Varian Baru</span>
										</Button>

										<Button
											variant="secondary"
											size="sm"
											onclick={() => {
												menuStore.editingMenuItem = currentItem;
												menuStore.isMenuModalOpen = true;
											}}
										>
											<Icon name="pencil-square" size={14} />
											<span>Editor Lengkap</span>
										</Button>
									</div>
								{/if}
							</div>

							<div class="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
								<table class="modern-drawer-table">
									<thead>
										<tr>
											<th>Nama Varian</th>
											<th>Kode SKU</th>
											<th>Harga Dasar</th>
											<th>Status Operasional</th>
											{#if canEdit}
												<th class="text-right">Aksi</th>
											{/if}
										</tr>
									</thead>
									<tbody>
										{#each currentItem.variants as v}
											<tr>
												<td class="font-semibold text-[var(--text-main)]">{v.name}</td>
												<td class="font-mono text-xs text-[var(--text-muted)]">{v.sku}</td>
												<td class="font-mono font-bold text-sky-400">{formatRupiah(v.base_price)}</td>
												<td>
													<span class="pill-active">
														AKTIF
													</span>
												</td>
												{#if canEdit}
													<td class="text-right">
														<div class="flex items-center justify-end gap-2">
															<button
																type="button"
																class="btn-table-action"
																title="Ubah varian {v.name}"
																onclick={() => openAddVariantModal(v)}
															>
																<Icon name="pencil-square" size={13} />
																<span>Ubah</span>
															</button>
															{#if currentItem.variants.length > 1}
																<button
																	type="button"
																	class="btn-table-action text-rose-400 hover:text-rose-300"
																	title="Hapus varian {v.name}"
																	onclick={() => deleteVariant(v.id)}
																>
																	<Icon name="trash" size={13} />
																	<span>Hapus</span>
																</button>
															{/if}
														</div>
													</td>
												{/if}
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/if}

					<!-- TAB CONTENT 3: RESEP BERVERSI -->
					{#if menuStore.detailDrawerTab === 'recipe'}
						<div class="recipe-tab-wrapper">
							<!-- Toolbar Header dengan Garis Pemisah & Spacing Lega -->
							<div class="recipe-tab-header">
								<div class="flex flex-col gap-1">
									<h4 class="font-bold text-[var(--text-main)] text-sm m-0">Daftar Versi Resep Racikan &amp; Formula</h4>
									<p class="text-xs text-[var(--text-muted)] m-0">Setiap varian menu memiliki resep tersendiri. Resep aktif bersifat kekal; pembaruan formula merilis versi baru.</p>
								</div>

								{#if canEdit}
									<Button
										variant="primary"
										size="sm"
										onclick={() => {
											const targetVariantId = recipeVariantFilter !== 'all' ? recipeVariantFilter : currentItem.variants[0]?.id || '';
											menuStore.editingRecipe = {
												variant_id: targetVariantId,
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

							<!-- Filter Segmented Button per Varian -->
							{#if currentItem.variants.length > 1}
								<div class="flex items-center gap-2 overflow-x-auto p-1.5 rounded-xl bg-[var(--bg-panel-sub)] border border-[var(--border-panel)]">
									<span class="text-xs font-semibold text-[var(--text-muted)] px-2 shrink-0">Filter Varian:</span>
									<button
										type="button"
										class="px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer {recipeVariantFilter === 'all' ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}"
										onclick={() => (recipeVariantFilter = 'all')}
									>
										Semua Varian ({itemRecipes.length})
									</button>
									{#each currentItem.variants as v}
										{@const count = itemRecipes.filter((r) => r.variant_id === v.id).length}
										<button
											type="button"
											class="px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer {recipeVariantFilter === v.id ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}"
											onclick={() => (recipeVariantFilter = v.id)}
										>
											{v.name} ({count})
										</button>
									{/each}
								</div>
							{/if}

							<!-- Empty State jika Belum Ada Resep untuk Varian Terpilih -->
							{#if filteredItemRecipes.length === 0}
								<div class="p-8 text-center rounded-xl border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] flex flex-col items-center justify-center gap-2">
									<Icon name="clipboard-document-list" size={32} class="opacity-40" />
									<p class="text-sm font-semibold text-[var(--text-main)] m-0">Belum Ada Resep Terdaftar untuk Varian Ini</p>
									<p class="text-xs m-0 max-w-md">Formula komposisi bahan diperlukan agar sistem dapat menghitung HPP dinamis dan mengurangi stok inventaris otomatis saat transaksi kasir.</p>
									{#if canEdit}
										<Button
											variant="primary"
											size="sm"
											class="mt-3"
											onclick={() => {
												const targetVariantId = recipeVariantFilter !== 'all' ? recipeVariantFilter : currentItem.variants[0]?.id || '';
												menuStore.editingRecipe = {
													variant_id: targetVariantId,
													menu_item_id: currentItem.id,
													scope_type: 'standard',
													effective_from: '2026-11-01T00:00:00Z',
													ingredients: []
												};
												menuStore.isRecipeModalOpen = true;
											}}
										>
											<Icon name="plus" size={14} />
											<span>Buat Resep Varian Ini</span>
										</Button>
									{/if}
								</div>
							{:else}
								<!-- Daftar Versi Resep -->
								<div class="recipe-cards-list">
									{#each filteredItemRecipes as rcp}
										<div class="recipe-version-card">
											<div class="recipe-version-header">
												<div class="flex items-center gap-2.5 flex-wrap">
													<span class="version-tag">
														Versi {rcp.version_number}
													</span>
													<span class="badge-variant">
														<Icon name="tag" size={12} />
														<span>Varian: {getVariantName(rcp.variant_id)}</span>
													</span>
													{#if rcp.scope_type === 'outlet_override'}
														<span class="badge-override">
															<Icon name="building-storefront" size={12} />
															<span>Override: {outletNameMap[rcp.outlet_id || ''] || rcp.outlet_name || rcp.outlet_id}</span>
														</span>
													{:else}
														<span class="badge-standard">
															<Icon name="building-office" size={12} />
															<span>Standar</span>
														</span>
													{/if}
													{#if isRecipeActive(rcp)}
														<span class="pill-active">
															AKTIF BERJALAN
														</span>
													{:else}
														<span class="pill-history">
															HISTORIS
														</span>
													{/if}
												</div>

												<span class="text-xs text-[var(--text-muted)] font-mono">
													Berlaku: {rcp.effective_from.split('T')[0]} s/d {rcp.effective_until ? rcp.effective_until.split('T')[0] : 'Seterusnya'}
												</span>
											</div>

											{#if rcp.notes}
												<div class="recipe-notes-callout">
													<Icon name="information-circle" size={15} class="text-[var(--text-subtle)] shrink-0 mt-0.5" />
													<p class="recipe-notes-text">
														"{rcp.notes}"
													</p>
												</div>
											{/if}

											<!-- Komposisi Bahan Baku (BOM) -->
											<div class="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
												<table class="modern-drawer-table !text-xs">
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
																<td class="font-mono text-[var(--text-muted)]">{parseFloat(ing.waste_pct)}%</td>
															</tr>
														{/each}
													</tbody>
												</table>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}

					<!-- TAB CONTENT 4: SIMULASI HPP -->
					{#if menuStore.detailDrawerTab === 'hpp'}
						<div class="flex flex-col gap-5">
							{#if currentItem.variants.length > 1}
								<div class="flex items-center gap-2 overflow-x-auto p-2 rounded-xl bg-[var(--bg-panel-sub)] border border-[var(--border-panel)]">
									<span class="text-xs font-semibold text-[var(--text-muted)] px-2 shrink-0">Simulasi Varian:</span>
									{#each currentItem.variants as v}
										{@const isSelected = (menuStore.simVariantId || currentItem.variants[0]?.id) === v.id}
										<button
											type="button"
											class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer {isSelected ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}"
											onclick={() => {
												menuStore.simVariantId = v.id;
												menuStore.refreshHppSimulation();
											}}
										>
											<span>{v.name}</span>
											<span class="font-normal opacity-80 font-mono ml-1.5">({formatRupiah(v.base_price)})</span>
										</button>
									{/each}
								</div>
							{/if}

							<HppSimulationPanel
								variantId={menuStore.simVariantId || currentItem.variants[0]?.id || ''}
								variantName={currentItem.variants.find((v) => v.id === (menuStore.simVariantId || currentItem.variants[0]?.id))?.name || currentItem.name}
							/>
						</div>
					{/if}

					<!-- TAB CONTENT 5: KETERSEDIAAN -->
					{#if menuStore.detailDrawerTab === 'availability'}
						<div class="recipe-tab-wrapper">
							<div class="recipe-tab-header">
								<div class="flex flex-col gap-1">
									<h4 class="font-bold text-[var(--text-main)] text-sm m-0">Status Ketersediaan per Gerai &amp; Channel</h4>
									<p class="text-xs text-[var(--text-muted)] m-0">Store Manager dapat menandai habis untuk gerai tugasnya sendiri.</p>
								</div>
							</div>

							<div class="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
								<table class="modern-drawer-table">
									<thead>
										<tr>
											<th>Gerai Outlet</th>
											<th>Channel Penjualan</th>
											<th>Status Ketersediaan</th>
											<th>Catatan Tambahan</th>
											<th>Aksi Cepat</th>
										</tr>
									</thead>
									<tbody>
										{#each itemAvailability as av}
											<tr>
												<td class="font-semibold text-[var(--text-main)]">
													{outletNameMap[av.outlet_id] || av.outlet_id}
												</td>
												<td>
													<span class="font-mono text-xs uppercase px-2.5 py-1 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)]">
														{av.channel_code}
													</span>
												</td>
												<td>
													{#if av.is_available}
														<span class="pill-active">
															TERSEDIA
														</span>
													{:else}
														<span class="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
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
			</div>
		</div>
	{/if}

	{#snippet footer()}
		<div class="flex items-center justify-between w-full">
			<div class="flex items-center gap-3">
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

				{#if canEdit && currentItem}
					<Button
						variant="secondary"
						onclick={() => {
							menuStore.editingMenuItem = currentItem;
							menuStore.isMenuModalOpen = true;
						}}
					>
						<Icon name="pencil-square" size={14} />
						<span>Ubah Data Menu &amp; Varian</span>
					</Button>
				{/if}
			</div>

			<Button variant="secondary" onclick={() => menuStore.closeDetailDrawer()}>
				Tutup
			</Button>
		</div>
	{/snippet}
</Modal>

<!-- MODAL TAMBAH / UBAH VARIAN LANGSUNG DARI DRAWER -->
<Modal
	open={isAddVariantModalOpen}
	title={editingVariantId ? 'Ubah Varian Menu' : 'Tambah Varian Baru'}
	subtitle={currentItem ? `Menu: ${currentItem.name} (${currentItem.code})` : ''}
	maxWidth="520px"
	onclose={() => (isAddVariantModalOpen = false)}
>
	<form id="drawer-add-variant-form" onsubmit={(e) => { e.preventDefault(); saveVariant(); }} class="flex flex-col gap-5">
		<div>
			<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2" for="drawer-var-name">
				Nama Varian <span class="text-rose-400">*</span>
			</label>
			<input
				id="drawer-var-name"
				type="text"
				class="form-input-lg"
				placeholder="mis. Large, Hot, Iced, Single Shot"
				bind:value={newVariantName}
				oninput={handleNewVariantNameChange}
				required
			/>
		</div>

		<div>
			<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2" for="drawer-var-sku">
				Kode SKU Varian <span class="text-rose-400">*</span>
			</label>
			<input
				id="drawer-var-sku"
				type="text"
				class="form-input-lg font-mono uppercase"
				placeholder="mis. MNU-LAT-AREN-ICED"
				bind:value={newVariantSku}
				required
			/>
		</div>

		<div>
			<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2" for="drawer-var-price">
				Harga Dasar Standard (Rp) <span class="text-rose-400">*</span>
			</label>
			<input
				id="drawer-var-price"
				type="text"
				class="form-input-lg font-mono"
				placeholder="28000.00"
				bind:value={newVariantPrice}
				required
			/>
		</div>
	</form>

	{#snippet footer()}
		<div class="flex items-center justify-end gap-3 w-full">
			<Button
				variant="secondary"
				type="button"
				onclick={() => (isAddVariantModalOpen = false)}
			>
				Batal
			</Button>

			<Button
				variant="primary"
				type="submit"
				form="drawer-add-variant-form"
				loading={isSavingVariant}
			>
				{editingVariantId ? 'Simpan Perubahan' : 'Tambahkan Varian'}
			</Button>
		</div>
	{/snippet}
</Modal>

<style>
	/* Header Merged Layout */
	.drawer-merged-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		width: 100%;
		padding-right: 12px;
	}

	@media (max-width: 768px) {
		.drawer-merged-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 14px;
		}
	}

	.header-main-info {
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
	}

	.header-title-and-badges {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.drawer-merged-header .modal-title {
		font-size: 17px;
		font-weight: 700;
		color: var(--text-main);
		margin: 0;
	}

	.header-sourcing-pill {
		display: inline-flex;
		align-items: center;
		padding: 3px 10px;
		border-radius: 9999px;
		font-size: 11px;
		font-weight: 600;
		white-space: nowrap;
	}

	.header-sourcing-pill.pill-success {
		background: rgba(16, 185, 129, 0.12);
		color: #34d399;
		border: 1px solid rgba(16, 185, 129, 0.25);
	}

	.header-sourcing-pill.pill-warning {
		background: rgba(245, 158, 11, 0.12);
		color: #fbbf24;
		border: 1px solid rgba(245, 158, 11, 0.25);
	}

	.header-metadata-row {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 12.5px;
		color: var(--text-muted);
		flex-wrap: wrap;
	}

	.meta-tag {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	.meta-separator {
		color: var(--text-subtle);
		opacity: 0.6;
	}

	.meta-unit strong {
		color: var(--text-main);
	}

	.header-price-card {
		padding: 8px 16px;
		border-radius: var(--radius-lg, 10px);
		background: var(--bg-panel);
		border: 1px solid var(--border-panel);
		text-align: right;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		flex-shrink: 0;
	}

	.price-label {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-subtle);
		font-weight: 600;
	}

	.price-value {
		font-size: 16.5px;
		font-weight: 700;
		color: var(--brand-primary);
		line-height: 1.25;
		margin-top: 1px;
	}

	.price-sub {
		font-size: 10.5px;
		color: var(--text-muted);
	}

	/* Unified Tabbed Panel */
	.detail-container {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.detail-tabbed-container {
		background: var(--bg-panel-sub, #0f172a);
		border: 1px solid var(--border-panel, rgba(255, 255, 255, 0.08));
		border-radius: var(--radius-xl, 16px);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
	}

	.detail-tabs-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		background: var(--bg-panel-sub);
		border-bottom: 1px solid var(--border-panel, rgba(255, 255, 255, 0.08));
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.detail-tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 18px;
		min-height: 42px;
		border-radius: var(--radius-lg, 10px);
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-muted, #94a3b8);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.18s ease;
		user-select: none;
	}

	.detail-tab-btn:hover {
		color: var(--text-main);
		background: var(--bg-panel-hover);
	}

	.detail-tab-btn.active {
		background: var(--bg-panel);
		color: var(--brand-primary);
		border-color: rgba(16, 185, 129, 0.35);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
		font-weight: 700;
	}

	.tab-count-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 22px;
		height: 22px;
		padding: 0 7px;
		border-radius: 9999px;
		font-size: 11px;
		font-weight: 700;
		background: rgba(16, 185, 129, 0.15);
		color: var(--brand-primary);
	}

	.detail-tab-btn.active .tab-count-badge {
		background: var(--brand-primary);
		color: var(--pill-live-text);
	}

	.detail-tab-body {
		padding: 26px 28px;
		min-height: 280px;
	}

	/* Specification Data Sheet */
	.spec-sheet-container {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.spec-section {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 18px 20px;
		background: var(--bg-panel);
		border: 1px solid var(--border-panel);
		border-radius: var(--radius-lg, 12px);
	}

	.spec-section-header {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12.5px;
		font-weight: 700;
		color: var(--text-main);
		padding-bottom: 10px;
		border-bottom: 1px solid var(--border-panel);
	}

	.spec-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16px 24px;
	}

	@media (min-width: 900px) {
		.spec-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (max-width: 640px) {
		.spec-grid {
			grid-template-columns: 1fr;
		}
	}

	.spec-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.spec-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-subtle);
	}

	.spec-value {
		font-size: 13.5px;
		font-weight: 500;
		color: var(--text-main);
		line-height: 1.45;
	}

	.spec-desc-box {
		padding: 14px 18px;
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-panel);
		border-radius: 8px;
	}

	.spec-desc-text {
		font-size: 13.5px;
		color: var(--text-main);
		line-height: 1.6;
		margin: 0;
	}

	.badge-scope-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 12px;
		border-radius: 9999px;
		font-size: 0.775rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.badge-scope-pill.pill-all {
		background: rgba(16, 185, 129, 0.12);
		color: #34d399;
		border: 1px solid rgba(16, 185, 129, 0.3);
	}

	.badge-scope-pill.pill-local {
		background: rgba(56, 189, 248, 0.12);
		color: #38bdf8;
		border: 1px solid rgba(56, 189, 248, 0.3);
	}

	.badge-scope-pill.pill-warning {
		background: rgba(245, 158, 11, 0.12);
		color: #fbbf24;
		border: 1px solid rgba(245, 158, 11, 0.3);
	}

	.badge-scope-pill.pill-neutral {
		background: var(--bg-panel-sub);
		color: var(--text-main);
		border: 1px solid var(--border-panel);
	}

	.modifier-info-pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 7px 14px;
		border-radius: 9999px;
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-panel);
		font-size: 0.8125rem;
	}

	.spec-audit-strip {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px;
		padding: 12px 18px;
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-panel);
		border-radius: var(--radius-lg, 10px);
		font-size: 11.5px;
		color: var(--text-subtle);
	}

	.audit-item {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.audit-label {
		color: var(--text-subtle);
	}

	.audit-value {
		color: var(--text-muted);
	}

	.audit-dot {
		color: var(--border-panel);
	}

	/* Modern Table */
	.modern-drawer-table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		font-size: 0.85rem;
	}

	.modern-drawer-table th {
		padding: 14px 18px;
		background: var(--bg-panel);
		color: var(--text-muted);
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		text-align: left;
		border-bottom: 1px solid var(--border-panel);
	}

	.modern-drawer-table td {
		padding: 14px 18px;
		border-bottom: 1px solid var(--border-subtle);
		color: var(--text-main);
		vertical-align: middle;
	}

	.modern-drawer-table tr:last-child td {
		border-bottom: none;
	}

	.modern-drawer-table tr:hover td {
		background: var(--bg-panel-hover);
	}

	/* Recipe & Tab Content Layouts */
	.recipe-tab-wrapper {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.recipe-tab-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		padding-bottom: 20px;
		border-bottom: 1px solid var(--border-panel, rgba(255, 255, 255, 0.08));
	}

	.recipe-cards-list {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	/* Recipe Version Cards */
	.recipe-version-card {
		padding: 24px 26px;
		border-radius: var(--radius-xl, 16px);
		background: var(--bg-panel, #111620);
		border: 1px solid var(--border-panel, rgba(255, 255, 255, 0.08));
		display: flex;
		flex-direction: column;
		gap: 20px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
	}

	.recipe-version-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		flex-wrap: wrap;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--border-panel, rgba(255, 255, 255, 0.08));
	}

	.recipe-notes-callout {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 14px 18px;
		border-radius: var(--radius-md, 8px);
		background: var(--bg-panel-sub, #0f172a);
		border: 1px solid var(--border-panel, rgba(255, 255, 255, 0.08));
		line-height: 1.5;
	}

	.recipe-notes-text {
		margin: 0;
		font-size: 13px;
		color: var(--text-muted, #cbd5e1);
		font-style: italic;
	}

	.version-tag {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--brand-primary, #10b981);
	}

	.badge-override {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3px 10px;
		border-radius: 9999px;
		font-size: 0.725rem;
		font-weight: 600;
		background: rgba(245, 158, 11, 0.14);
		color: #fbbf24;
		border: 1px solid rgba(245, 158, 11, 0.3);
	}

	.badge-standard {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3px 10px;
		border-radius: 9999px;
		font-size: 0.725rem;
		font-weight: 600;
		background: var(--bg-panel-sub);
		color: var(--text-muted);
		border: 1px solid var(--border-panel);
	}

	.badge-variant {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3px 10px;
		border-radius: 9999px;
		font-size: 0.725rem;
		font-weight: 600;
		background: rgba(14, 165, 233, 0.12);
		color: #38bdf8;
		border: 1px solid rgba(14, 165, 233, 0.28);
	}

	.pill-active {
		display: inline-flex;
		align-items: center;
		font-size: 0.7rem;
		font-weight: 700;
		padding: 3px 9px;
		border-radius: 9999px;
		background: rgba(16, 185, 129, 0.12);
		color: #34d399;
		border: 1px solid rgba(16, 185, 129, 0.3);
		white-space: nowrap;
	}

	.pill-history {
		display: inline-flex;
		align-items: center;
		font-size: 0.7rem;
		font-weight: 700;
		padding: 3px 9px;
		border-radius: 9999px;
		background: rgba(148, 163, 184, 0.1);
		color: #94a3b8;
		border: 1px solid rgba(148, 163, 184, 0.25);
		white-space: nowrap;
	}

	.btn-table-action {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 5px 10px;
		border-radius: var(--radius-sm, 6px);
		border: 1px solid var(--border-panel);
		background: var(--bg-panel-sub);
		color: var(--text-main);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-table-action:hover {
		background: var(--bg-panel-hover);
		border-color: var(--brand-primary);
	}
</style>