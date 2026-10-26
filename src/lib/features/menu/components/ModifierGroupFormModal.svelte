<script lang="ts">
	/**
	 * Komponen Modal Editor Grup Modifier & Efek Resep (PG-cat-modifiers, T-04.6, AC-04.4)
	 */
	import { menuStore } from '../stores/menu.svelte.js';
	import { formatRupiah } from '../../../utils/format.js';
	import Icon from '../../../components/data/Icon.svelte';
	import Button from '../../../components/forms/Button.svelte';
	import Modal from '../../../components/feedback/Modal.svelte';
	import type { ModifierOption, RecipeEffect } from '../../../api/contract/types.js';

	let name = $state('');
	let code = $state('');
	let description = $state('');
	let minSelect = $state(0);
	let maxSelect = $state(1);

	let options = $state<Array<{
		id: string;
		name: string;
		code: string;
		price_delta: string;
		is_default: boolean;
		effects: RecipeEffect[];
	}>>([]);

	let isSubmitting = $state(false);

	$effect(() => {
		if (menuStore.editingModifierGroup) {
			const g = menuStore.editingModifierGroup;
			name = g.name || '';
			code = g.code || '';
			description = g.description || '';
			minSelect = g.min_select ?? 0;
			maxSelect = g.max_select ?? 1;
			options = (g.options || []).map((o) => ({
				id: o.id,
				name: o.name,
				code: o.code,
				price_delta: o.price_delta,
				is_default: o.is_default,
				effects: o.recipe_effects || []
			}));
		} else {
			name = '';
			code = `GRP-${Date.now().toString().slice(-4)}`;
			description = '';
			minSelect = 0;
			maxSelect = 1;
			options = [
				{
					id: `opt-${Date.now()}-1`,
					name: 'Standard Option',
					code: 'OPT-STD',
					price_delta: '0.00',
					is_default: true,
					effects: []
				}
			];
		}
	});

	function addOptionRow() {
		options = [
			...options,
			{
				id: `opt-${Date.now()}-${options.length + 1}`,
				name: 'Opsi Baru',
				code: `OPT-${options.length + 1}`,
				price_delta: '0.00',
				is_default: false,
				effects: []
			}
		];
	}

	function removeOptionRow(index: number) {
		options = options.filter((_, i) => i !== index);
	}

	function addEffectToOption(optIndex: number) {
		const firstStock = menuStore.stockItems[0];
		options[optIndex].effects = [
			...options[optIndex].effects,
			{
				type: 'add',
				target_stock_item_id: firstStock?.id || 'item-kop-01',
				target_stock_item_name: firstStock?.name || 'Bahan Baku',
				added_quantity: '10.0000',
				serving_unit: firstStock?.base_unit_symbol || 'g'
			}
		];
	}

	function removeEffectFromOption(optIndex: number, effectIndex: number) {
		options[optIndex].effects = options[optIndex].effects.filter((_, i) => i !== effectIndex);
	}

	async function handleSubmit() {
		if (!name.trim() || !code.trim() || options.length === 0) {
			return;
		}

		isSubmitting = true;
		try {
			await menuStore.saveModifierGroup({
				name: name.trim(),
				code: code.trim().toUpperCase(),
				description: description.trim(),
				min_select: Number(minSelect),
				max_select: Number(maxSelect),
				options: options.map((o, idx) => ({
					id: o.id || `opt-${Date.now()}-${idx}`,
					group_id: menuStore.editingModifierGroup?.id || '',
					name: o.name.trim(),
					code: o.code.trim().toUpperCase(),
					price_delta: o.price_delta,
					is_default: o.is_default,
					sort_order: idx + 1,
					recipe_effects: o.effects
				}))
			});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Modal
	open={menuStore.isModifierModalOpen}
	title={menuStore.editingModifierGroup?.id ? 'Edit Grup Modifier' : 'Tambah Grup Modifier Baru'}
	maxWidth="800px"
	onclose={() => (menuStore.isModifierModalOpen = false)}
>
	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="form-field-stack">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5" for="mod-name">
					Nama Grup Modifier <span class="text-rose-400">*</span>
				</label>
				<input
					type="text"
					class="form-input-lg"
					placeholder="Contoh: Pilihan Jenis Susu"
					bind:value={name}
					required
					id="mod-name"
				/>
			</div>

			<div>
				<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5" for="mod-code">
					Kode Grup <span class="text-rose-400">*</span>
				</label>
				<input
					type="text"
					class="form-input-lg font-mono uppercase"
					placeholder="Contoh: GRP-MILK"
					bind:value={code}
					required
					id="mod-code"
				/>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div>
				<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5" for="mod-min">
					Min. Pilihan (min_select) <span class="text-rose-400">*</span>
				</label>
				<input
					type="number"
					class="form-input-lg"
					min="0"
					bind:value={minSelect}
					required
					id="mod-min"
				/>
				<span class="text-[0.7rem] text-[var(--text-muted)] block mt-1">
					0 = Opsional, 1 = Wajib Pilih
				</span>
			</div>

			<div>
				<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5" for="mod-max">
					Maks. Pilihan (max_select) <span class="text-rose-400">*</span>
				</label>
				<input
					type="number"
					class="form-input-lg"
					min="1"
					bind:value={maxSelect}
					required
					id="mod-max"
				/>
				<span class="text-[0.7rem] text-[var(--text-muted)] block mt-1">
					1 = Single Choice, &gt; 1 = Multi Select
				</span>
			</div>

			<div>
				<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5" for="mod-desc">
					Deskripsi Singkat
				</label>
				<input
					type="text"
					class="form-input-lg"
					placeholder="Keterangan untuk kasir / pelanggan"
					bind:value={description}
					id="mod-desc"
				/>
			</div>
		</div>

		<!-- Daftar Opsi & Efek Resep -->
		<div class="space-y-4 pt-2">
			<div class="flex items-center justify-between">
				<span class="block text-xs font-semibold text-[var(--text-main)] uppercase">
					Opsi Pilihan &amp; Efek Resep BOM (§6.3):
				</span>
				<Button
					type="button"
					variant="secondary"
					size="sm"
					onclick={addOptionRow}
				>
					<Icon name="plus" size={14} />
					<span>Tambah Opsi Pilihan</span>
				</Button>
			</div>

			<div class="space-y-3">
				{#each options as opt, optIdx}
					<div class="p-4 rounded-xl bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] space-y-3">
						<div class="flex flex-wrap items-center gap-3">
							<div class="flex-1 min-w-[160px]">
								<span class="text-[0.7rem] text-[var(--text-muted)] block mb-1">Nama Opsi:</span>
								<input
									type="text"
									class="form-input-lg !min-h-[36px] !py-1 text-xs"
									bind:value={opt.name}
									placeholder="Contoh: Oat Milk Barista"
									required
								/>
							</div>

							<div class="w-28">
								<span class="text-[0.7rem] text-[var(--text-muted)] block mb-1">Kode Opsi:</span>
								<input
									type="text"
									class="form-input-lg !min-h-[36px] !py-1 text-xs font-mono uppercase"
									bind:value={opt.code}
									placeholder="OAT_MILK"
									required
								/>
							</div>

							<div class="w-32">
								<span class="text-[0.7rem] text-[var(--text-muted)] block mb-1">&Delta; Harga (+Rp):</span>
								<input
									type="text"
									class="form-input-lg !min-h-[36px] !py-1 text-xs font-mono"
									bind:value={opt.price_delta}
									placeholder="6000.00"
									required
								/>
							</div>

							<div class="pt-5 flex items-center gap-2">
								<label class="flex items-center gap-1.5 text-xs cursor-pointer">
									<input type="checkbox" bind:checked={opt.is_default} />
									<span>Default</span>
								</label>

								{#if options.length > 1}
									<button
										type="button"
										class="p-1.5 rounded hover:bg-rose-500/10 text-rose-400"
										onclick={() => removeOptionRow(optIdx)}
										title="Hapus opsi"
									>
										<Icon name="trash" size={16} />
									</button>
								{/if}
							</div>
						</div>

						<!-- Efek Opsi ke Formula Resep (§6.3: replace -> add -> multiply) -->
						<div class="pt-2 border-t border-[var(--border-subtle)] space-y-2">
							<div class="flex items-center justify-between">
								<span class="text-[0.725rem] font-semibold text-indigo-400 flex items-center gap-1.5">
									<Icon name="sparkles" size={14} />
									<span>Efek ke Bahan Resep (§6.3):</span>
								</span>
								<button
									type="button"
									class="text-[0.725rem] text-[var(--brand-primary)] hover:underline"
									onclick={() => addEffectToOption(optIdx)}
								>
									+ Tambah Efek Resep
								</button>
							</div>

							{#if opt.effects.length === 0}
								<span class="text-[0.725rem] text-[var(--text-muted)] italic block">
									Tidak ada modifikasi ke bahan resep (hanya tambahan harga penjualan).
								</span>
							{:else}
								<div class="space-y-2">
									{#each opt.effects as eff, effIdx}
										<div class="flex flex-wrap items-center gap-2 p-2 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-xs">
											<select
												class="form-input-lg !min-h-[32px] !py-0.5 text-xs w-28"
												bind:value={eff.type}
											>
												<option value="replace">REPLACE (Ganti)</option>
												<option value="add">ADD (Tambah)</option>
												<option value="multiply">MULTIPLY (Kali)</option>
											</select>

											<!-- Target Bahan -->
											<select
												class="form-input-lg !min-h-[32px] !py-0.5 text-xs flex-1 min-w-[150px]"
												bind:value={eff.target_stock_item_id}
											>
												{#each menuStore.stockItems as st}
													<option value={st.id}>{st.name}</option>
												{/each}
											</select>

											{#if eff.type === 'replace'}
												<span class="text-[var(--text-muted)]">ganti ke</span>
												<select
													class="form-input-lg !min-h-[32px] !py-0.5 text-xs flex-1 min-w-[150px]"
													bind:value={eff.replacement_stock_item_id}
												>
													{#each menuStore.stockItems as st}
														<option value={st.id}>{st.name}</option>
													{/each}
												</select>
											{:else if eff.type === 'add'}
												<span class="text-[var(--text-muted)]">+</span>
												<input
													type="text"
													class="form-input-lg !min-h-[32px] !py-0.5 text-xs font-mono w-24"
													bind:value={eff.added_quantity}
													placeholder="18.0000"
												/>
											{:else if eff.type === 'multiply'}
												<span class="text-[var(--text-muted)]">&times;</span>
												<input
													type="text"
													class="form-input-lg !min-h-[32px] !py-0.5 text-xs font-mono w-20"
													bind:value={eff.multiplier}
													placeholder="0.5000"
												/>
											{/if}

											<button
												type="button"
												class="p-1 text-rose-400 hover:text-rose-300"
												onclick={() => removeEffectFromOption(optIdx, effIdx)}
												title="Hapus efek"
											>
												<Icon name="x-mark" size={14} />
											</button>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
			<Button
				variant="secondary"
				type="button"
				onclick={() => (menuStore.isModifierModalOpen = false)}
			>
				Batal
			</Button>

			<Button
				variant="primary"
				type="submit"
				loading={isSubmitting}
			>
				Simpan Grup Modifier
			</Button>
		</div>
	</form>
</Modal>
