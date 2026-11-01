<script lang="ts">
	/**
	 * Komponen Modal Editor Resep Berversi & Override Outlet (PG-cat-recipe-editor, T-04.7)
	 */
	import { menuStore } from '../stores/menu.svelte.js';
	import { formatRupiah } from '../../../utils/format.js';
	import Icon from '../../../components/data/Icon.svelte';
	import Button from '../../../components/forms/Button.svelte';
	import Modal from '../../../components/feedback/Modal.svelte';
	import Select, { type SelectOption } from '../../../components/forms/Select.svelte';
	import type { RecipeIngredient } from '../../../api/contract/types.js';

	let variantId = $state('');
	let scopeType = $state<'standard' | 'outlet_override'>('standard');
	let outletId = $state('out-sub-01');
	let effectiveFrom = $state('2026-11-01');
	let effectiveUntil = $state('');
	let notes = $state('');
	let ingredients = $state<Array<{
		stock_item_id: string;
		stock_item_name: string;
		stock_item_code: string;
		quantity: string;
		serving_unit: string;
		waste_pct: string;
	}>>([]);

	let isSubmitting = $state(false);

	const variantOptions = $derived<SelectOption[]>(
		menuStore.menuItems.flatMap((m) =>
			m.variants.map((v) => ({
				value: v.id,
				label: `${m.name} - ${v.name}`
			}))
		)
	);

	const scopeOptions: SelectOption[] = [
		{ value: 'standard', label: 'Standar (Semua Gerai)' },
		{ value: 'outlet_override', label: 'Override Khusus Gerai (Lokal)' }
	];

	const outletOptions: SelectOption[] = [
		{ value: 'out-sub-01', label: 'Jodi Gubeng (Surabaya)' },
		{ value: 'out-bdg-01', label: 'Jodi Dago (Bandung)' },
		{ value: 'out-jkt-01', label: 'Jodi Senopati (Jakarta)' },
		{ value: 'out-ubud-01', label: 'Kaveloka Ubud' }
	];

	const stockItemOptions = $derived<SelectOption[]>(
		menuStore.stockItems.map((st) => ({
			value: st.id,
			label: `${st.name} (${st.code})`
		}))
	);

	$effect(() => {
		if (menuStore.editingRecipe) {
			const r = menuStore.editingRecipe;
			variantId = r.variant_id || menuStore.menuItems[0]?.variants?.[0]?.id || '';
			scopeType = r.scope_type || 'standard';
			outletId = r.outlet_id || 'out-sub-01';
			effectiveFrom = r.effective_from ? r.effective_from.split('T')[0] : '2026-11-01';
			effectiveUntil = r.effective_until ? r.effective_until.split('T')[0] : '';
			notes = r.notes || '';
			ingredients = (r.ingredients || []).map((i) => ({
				stock_item_id: i.stock_item_id,
				stock_item_name: i.stock_item_name,
				stock_item_code: i.stock_item_code || '',
				quantity: i.quantity,
				serving_unit: i.serving_unit,
				waste_pct: i.waste_pct
			}));
		} else {
			variantId = menuStore.menuItems[0]?.variants?.[0]?.id || '';
			scopeType = 'standard';
			outletId = 'out-sub-01';
			effectiveFrom = '2026-11-01';
			effectiveUntil = '';
			notes = '';
			ingredients = [
				{
					stock_item_id: 'item-kop-01',
					stock_item_name: 'Espresso Blend House Arabica-Robusta',
					stock_item_code: 'KOP-ESP-01',
					quantity: '18.0000',
					serving_unit: 'g',
					waste_pct: '0.00'
				},
				{
					stock_item_id: 'item-sus-01',
					stock_item_name: 'Susu Fresh Milk Greenfields Barista',
					stock_item_code: 'SUS-GRN-01',
					quantity: '150.0000',
					serving_unit: 'ml',
					waste_pct: '0.00'
				}
			];
		}
	});

	function addIngredientRow() {
		const firstStock = menuStore.stockItems[0];
		ingredients = [
			...ingredients,
			{
				stock_item_id: firstStock?.id || 'item-kop-01',
				stock_item_name: firstStock?.name || 'Bahan Baku',
				stock_item_code: firstStock?.code || '',
				quantity: '10.0000',
				serving_unit: firstStock?.base_unit_symbol || 'g',
				waste_pct: '0.00'
			}
		];
	}

	function removeIngredientRow(index: number) {
		ingredients = ingredients.filter((_, i) => i !== index);
	}

	function handleStockItemSelect(index: number, itemId: string) {
		const found = menuStore.stockItems.find((s) => s.id === itemId);
		if (found) {
			ingredients[index].stock_item_id = found.id;
			ingredients[index].stock_item_name = found.name;
			ingredients[index].stock_item_code = found.code;
			ingredients[index].serving_unit = found.base_unit_symbol;
		}
	}

	async function handleSubmit() {
		if (!variantId || !effectiveFrom || ingredients.length === 0) {
			return;
		}

		isSubmitting = true;
		try {
			await menuStore.saveRecipe({
				variant_id: variantId,
				scope_type: scopeType,
				outlet_id: scopeType === 'outlet_override' ? outletId : undefined,
				effective_from: `${effectiveFrom}T00:00:00.000Z`,
				effective_until: effectiveUntil ? `${effectiveUntil}T23:59:59.000Z` : undefined,
				notes: notes.trim(),
				ingredients: ingredients.map((ing, idx) => ({
					id: `ing-${Date.now()}-${idx}`,
					stock_item_id: ing.stock_item_id,
					stock_item_name: ing.stock_item_name,
					stock_item_code: ing.stock_item_code,
					quantity: ing.quantity,
					serving_unit: ing.serving_unit,
					waste_pct: ing.waste_pct
				}))
			});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Modal
	open={menuStore.isRecipeModalOpen}
	title="Rilis Versi Resep Baru / Override Outlet"
	maxWidth="1180px"
	onclose={() => (menuStore.isRecipeModalOpen = false)}
>
	<div class="recipe-modal-container">
		<!-- Peringatan Invariant Immutabilitas Resep Berversi -->
		<div class="formula-callout !border-indigo-500/30">
			<Icon name="clock" size={20} class="text-indigo-400 shrink-0 mt-0.5" />
			<div>
				<span class="font-semibold block mb-0.5 text-sm">Invarian Resep Berversi:</span>
				<p class="text-xs text-[var(--text-muted)] leading-relaxed m-0">
					Resep aktif tidak dapat diedit secara langsung demi menjaga integritas data transaksi historis. Menyimpan resep baru akan membuat versi baru berikutnya dengan tanggal berlaku efektif. Dua resep aktif tidak boleh tumpang tindih untuk varian dan outlet yang sama.
				</p>
			</div>
		</div>

		<form id="recipe-editor-form" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
			<!-- Layout 2 Kolom: Kiri Parameter Resep, Kanan Komposisi Bahan Resep -->
			<div class="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
				<!-- KOLOM KIRI: Identitas & Cakupan Resep (5 cols) -->
				<div class="lg:col-span-5 flex flex-col gap-5">
					<!-- Pilihan Varian -->
					<div class="form-group">
						<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2" for="recipe-variant">
							Varian Menu Sasaran <span class="text-rose-400">*</span>
						</label>
						<Select
							id="recipe-variant"
							bind:value={variantId}
							options={variantOptions}
							searchable
							placeholder="Pilih varian menu..."
						/>
					</div>

					<!-- Scope Resep: Standar vs Outlet Override -->
					<div class="form-group">
						<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2" for="recipe-scope">
							Cakupan Resep <span class="text-rose-400">*</span>
						</label>
						<Select
							id="recipe-scope"
							bind:value={scopeType}
							options={scopeOptions}
						/>
					</div>

					<!-- Outlet Khusus jika Override -->
					{#if scopeType === 'outlet_override'}
						<div class="form-group">
							<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2" for="recipe-outlet">
								Gerai Sasaran Override <span class="text-rose-400">*</span>
							</label>
							<Select
								id="recipe-outlet"
								bind:value={outletId}
								options={outletOptions}
							/>
						</div>
					{/if}

					<!-- Rentang Waktu Berlaku Efektif -->
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div class="form-group">
							<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2" for="recipe-eff-from">
								Berlaku Mulai <span class="text-rose-400">*</span>
							</label>
							<input
								type="date"
								class="form-input-lg w-full !min-h-[42px] px-3 text-xs"
								bind:value={effectiveFrom}
								required
								id="recipe-eff-from"
							/>
						</div>

						<div class="form-group">
							<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2" for="recipe-eff-until">
								Berlaku Sampai (Opsional)
							</label>
							<input
								type="date"
								class="form-input-lg w-full !min-h-[42px] px-3 text-xs"
								bind:value={effectiveUntil}
								id="recipe-eff-until"
							/>
						</div>
					</div>

					<!-- Catatan Perubahan Formula -->
					<div class="form-group">
						<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2" for="recipe-notes">
							Catatan Rilis &amp; Justifikasi Perubahan
						</label>
						<textarea
							class="form-input-lg w-full !min-h-[90px] p-3 text-xs leading-relaxed resize-none"
							rows="3"
							placeholder="Contoh: Takaran gula aren disesuaikan menjadi 25ml untuk selera pasar Jawa Timur"
							bind:value={notes}
							id="recipe-notes"
						></textarea>
					</div>
				</div>

				<!-- KOLOM KANAN: Komposisi Bahan Resep dalam Satuan Saji (7 cols) -->
				<div class="lg:col-span-7 flex flex-col gap-4">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="block text-xs font-semibold text-[var(--text-main)] uppercase tracking-wider">
								Komposisi Bahan Resep
							</span>
							<span class="text-[0.7rem] px-3 py-1 rounded-full bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-mono whitespace-nowrap">
								{ingredients.length} Bahan
							</span>
						</div>
						<Button
							type="button"
							variant="secondary"
							size="sm"
							onclick={addIngredientRow}
						>
							<Icon name="plus" size={14} />
							<span>Tambah Baris Bahan</span>
						</Button>
					</div>

					<div class="bom-table-wrapper rounded-xl border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-panel-sub)]">
						<div class="overflow-x-auto max-h-[460px] overflow-y-auto">
							<table class="recipe-table !text-xs w-full">
								<thead>
									<tr>
										<th style="min-width: 220px;">Pilih Bahan Baku</th>
										<th style="width: 140px;">Takaran Pakai</th>
										<th style="width: 100px;">Waste %</th>
										<th style="width: 44px; text-align: center;">Aksi</th>
									</tr>
								</thead>
								<tbody>
									{#each ingredients as ing, idx}
										<tr>
											<td>
												<Select
													options={stockItemOptions}
													value={ing.stock_item_id}
													onchange={(val) => handleStockItemSelect(idx, val)}
													searchable
													placeholder="Pilih Bahan Baku..."
												/>
											</td>
											<td>
												<div class="flex items-center gap-1.5">
													<input
														type="text"
														class="form-input-lg !min-h-[40px] px-2.5 text-xs font-mono w-full"
														bind:value={ing.quantity}
														placeholder="18.0000"
													/>
													<span class="text-[var(--text-muted)] font-mono text-xs shrink-0 min-w-[20px]">{ing.serving_unit}</span>
												</div>
											</td>
											<td>
												<div class="flex items-center gap-1">
													<input
														type="text"
														class="form-input-lg !min-h-[40px] px-2 text-xs w-full"
														bind:value={ing.waste_pct}
														placeholder="0.00"
													/>
													<span class="text-[var(--text-muted)] text-xs shrink-0">%</span>
												</div>
											</td>
											<td class="text-center">
												{#if ingredients.length > 1}
													<button
														type="button"
														class="p-2 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors inline-flex items-center justify-center"
														onclick={() => removeIngredientRow(idx)}
														title="Hapus baris"
													>
														<Icon name="trash" size={15} />
													</button>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</form>
	</div>

	{#snippet footer()}
		<div class="flex items-center justify-end gap-3 w-full">
			<Button
				variant="secondary"
				type="button"
				onclick={() => (menuStore.isRecipeModalOpen = false)}
			>
				Batal
			</Button>

			<Button
				variant="primary"
				type="button"
				onclick={handleSubmit}
				loading={isSubmitting}
			>
				Rilis Versi Resep Baru
			</Button>
		</div>
	{/snippet}
</Modal>

<style>
	.recipe-modal-container {
		display: flex;
		flex-direction: column;
		gap: 22px;
	}

	.bom-table-wrapper {
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
	}

	.bom-table-wrapper table th {
		position: sticky;
		top: 0;
		z-index: 10;
		background: var(--bg-panel, #0f172a);
	}
</style>
