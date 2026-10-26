<script lang="ts">
	/**
	 * Komponen Modal Editor Resep Berversi & Override Outlet (PG-cat-recipe-editor, T-04.7)
	 */
	import { menuStore } from '../stores/menu.svelte.js';
	import { formatRupiah } from '../../../utils/format.js';
	import Icon from '../../../components/data/Icon.svelte';
	import Button from '../../../components/forms/Button.svelte';
	import Modal from '../../../components/feedback/Modal.svelte';
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
	title="Rilis Versi Resep Baru / Override Outlet (PG-cat-recipe-editor)"
	maxWidth="880px"
	onclose={() => (menuStore.isRecipeModalOpen = false)}
>
	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="form-field-stack">
		<!-- Peringatan Invariant Immutabilitas Resep Berversi -->
		<div class="formula-callout !border-indigo-500/30">
			<Icon name="clock" size={20} class="text-indigo-400 shrink-0 mt-0.5" />
			<div>
				<span class="font-semibold block mb-0.5">Invarian Resep Berversi (AC-04.3, AC-04.5):</span>
				<p class="text-xs">
					Resep aktif tidak dapat diedit secara langsung demi menjaga integritas data transaksi historis. Menyimpan resep baru akan membuat versi baru berikutnya dengan tanggal berlaku efektif. Dua resep aktif tidak boleh tumpang tindih untuk varian dan outlet yang sama.
				</p>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<!-- Pilihan Varian -->
			<div>
				<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5" for="recipe-variant">
					Varian Menu Sasaran <span class="text-rose-400">*</span>
				</label>
				<select class="form-input-lg" bind:value={variantId} required id="recipe-variant">
					{#each menuStore.menuItems as m}
						<optgroup label={m.name}>
							{#each m.variants as v}
								<option value={v.id}>{m.name} - {v.name}</option>
							{/each}
						</optgroup>
					{/each}
				</select>
			</div>

			<!-- Scope Resep: Standar vs Outlet Override -->
			<div>
				<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5" for="recipe-scope">
					Cakupan Resep <span class="text-rose-400">*</span>
				</label>
				<select class="form-input-lg" bind:value={scopeType} required id="recipe-scope">
					<option value="standard">Standar Nasional (Semua Gerai)</option>
					<option value="outlet_override">Override Khusus Gerai (Lokal)</option>
				</select>
			</div>

			<!-- Outlet Khusus jika Override -->
			{#if scopeType === 'outlet_override'}
				<div>
					<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5" for="recipe-outlet">
						Gerai Sasaran Override <span class="text-rose-400">*</span>
					</label>
					<select class="form-input-lg" bind:value={outletId} required id="recipe-outlet">
						<option value="out-sub-01">Jodi Gubeng (Surabaya)</option>
						<option value="out-bdg-01">Jodi Dago (Bandung)</option>
						<option value="out-jkt-01">Jodi Senopati (Jakarta)</option>
						<option value="out-ubud-01">Kaveloka Ubud</option>
					</select>
				</div>
			{/if}
		</div>

		<!-- Rentang Waktu Berlaku Efektif -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5" for="recipe-eff-from">
					Berlaku Efektif Mulai (effective_from) <span class="text-rose-400">*</span>
				</label>
				<input
					type="date"
					class="form-input-lg"
					bind:value={effectiveFrom}
					required
					id="recipe-eff-from"
				/>
			</div>

			<div>
				<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5" for="recipe-eff-until">
					Berlaku Sampai (Opsional)
				</label>
				<input
					type="date"
					class="form-input-lg"
					bind:value={effectiveUntil}
					id="recipe-eff-until"
				/>
			</div>
		</div>

		<!-- Catatan Perubahan Formula -->
		<div>
			<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5" for="recipe-notes">
				Catatan Rilis &amp; Justifikasi Perubahan
			</label>
			<input
				type="text"
				class="form-input-lg"
				placeholder="Contoh: Takaran gula aren disesuaikan menjadi 25ml untuk selera pasar Jawa Timur"
				bind:value={notes}
				id="recipe-notes"
			/>
		</div>

		<!-- Daftar Komposisi Bahan Baku (BOM Rows) -->
		<div class="space-y-3 pt-2">
			<div class="flex items-center justify-between">
				<span class="block text-xs font-semibold text-[var(--text-main)] uppercase">
					Komposisi Bahan Baku dalam Satuan Saji (BOM):
				</span>
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

			<div class="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
				<table class="recipe-table !text-xs">
					<thead>
						<tr>
							<th style="width: 45%;">Pilih Bahan Baku</th>
							<th style="width: 25%;">Takaran Pakai</th>
							<th style="width: 15%;">Waste %</th>
							<th style="width: 15%; text-align: center;">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each ingredients as ing, idx}
							<tr>
								<td>
									<select
										class="form-input-lg !min-h-[36px] !py-1 text-xs"
										value={ing.stock_item_id}
										onchange={(e) => handleStockItemSelect(idx, (e.target as HTMLSelectElement).value)}
									>
										{#each menuStore.stockItems as st}
											<option value={st.id}>{st.name} ({st.code})</option>
										{/each}
									</select>
								</td>
								<td>
									<div class="flex items-center gap-1.5">
										<input
											type="text"
											class="form-input-lg !min-h-[36px] !py-1 text-xs font-mono"
											bind:value={ing.quantity}
											placeholder="18.0000"
										/>
										<span class="text-[var(--text-muted)] font-mono">{ing.serving_unit}</span>
									</div>
								</td>
								<td>
									<div class="flex items-center gap-1">
										<input
											type="text"
											class="form-input-lg !min-h-[36px] !py-1 text-xs"
											bind:value={ing.waste_pct}
											placeholder="0.00"
										/>
										<span class="text-[var(--text-muted)]">%</span>
									</div>
								</td>
								<td class="text-center">
									{#if ingredients.length > 1}
										<button
											type="button"
											class="p-1.5 rounded hover:bg-rose-500/10 text-rose-400"
											onclick={() => removeIngredientRow(idx)}
											title="Hapus baris"
										>
											<Icon name="trash" size={16} />
										</button>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div class="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
			<Button
				variant="secondary"
				type="button"
				onclick={() => (menuStore.isRecipeModalOpen = false)}
			>
				Batal
			</Button>

			<Button
				variant="primary"
				type="submit"
				loading={isSubmitting}
			>
				Rilis Versi Resep Baru
			</Button>
		</div>
	</form>
</Modal>
