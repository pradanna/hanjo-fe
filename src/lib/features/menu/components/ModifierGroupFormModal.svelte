<script lang="ts">
	/**
	 * Komponen Modal Editor Grup Modifier & Efek Resep (PG-cat-modifiers, T-04.6, AC-04.4)
	 * Desain responsif, lega (anti-sesak), informatif, dan progressive disclosure.
	 */
	import { menuStore } from '../stores/menu.svelte.js';
	import Icon from '../../../components/data/Icon.svelte';
	import Button from '../../../components/forms/Button.svelte';
	import Select from '../../../components/forms/Select.svelte';
	import Modal from '../../../components/feedback/Modal.svelte';
	import type { RecipeEffect } from '../../../api/contract/types.js';

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

	const effectTypeOptions = [
		{ value: 'replace', label: 'Substitusi (Ganti Bahan)' },
		{ value: 'add', label: 'Penambahan (+ Kuantitas)' },
		{ value: 'multiply', label: 'Pengali Takaran (Skala Porsi)' }
	];

	const stockItemOptions = $derived(
		menuStore.stockItems.map((st) => ({
			value: st.id,
			label: `${st.name} (${st.code || st.id})`
		}))
	);

	const selectionRuleSummary = $derived.by(() => {
		const min = Number(minSelect) || 0;
		const max = Number(maxSelect) || 1;
		if (min === 0 && max === 1) {
			return {
				type: 'optional_single',
				label: 'Opsional — Kasir atau pelanggan dapat memilih maksimal 1 opsi (Radio Button / Pilihan Tunggal)',
				badge: 'Opsional (Maks. 1)',
				colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20'
			};
		}
		if (min >= 1 && max === 1) {
			return {
				type: 'required_single',
				label: 'Wajib — Pelanggan harus memilih tepat 1 opsi sebelum pesanan diproses (Single Choice Wajib)',
				badge: 'Wajib Pilih 1',
				colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
			};
		}
		if (min === 0 && max > 1) {
			return {
				type: 'optional_multi',
				label: `Opsional Multi-Select — Pelanggan bebas memilih mulai dari 0 hingga maksimal ${max} opsi (Checkbox)`,
				badge: `Opsional (Maks. ${max})`,
				colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
			};
		}
		if (min >= 1 && max > 1) {
			return {
				type: 'required_multi',
				label: `Wajib Multi-Select — Pelanggan wajib memilih minimal ${min} opsi dan maksimal ${max} opsi`,
				badge: `Wajib Min ${min} (Maks. ${max})`,
				colorClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
			};
		}
		return {
			type: 'custom',
			label: `Aturan kustom: Min. ${min} opsi, Maks. ${max} opsi`,
			badge: `Min ${min} / Maks ${max}`,
			colorClass: 'text-[var(--text-muted)] bg-[var(--bg-panel-sub)] border-[var(--border-subtle)]'
		};
	});

	function getTargetStockUnit(stockId: string): string {
		const item = menuStore.stockItems.find((s) => s.id === stockId);
		return item?.base_unit_symbol || '';
	}

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
			code = `GRP-${(menuStore.modifierGroups.length + 1).toString().padStart(3, '0')}`;
			description = '';
			minSelect = 0;
			maxSelect = 1;
			options = [
				{
					id: 'opt-1',
					name: 'Standard Option',
					code: 'OPT-STD',
					price_delta: '0.00',
					is_default: true,
					effects: []
				}
			];
		}
	});

	function handleDefaultChange(index: number, checked: boolean) {
		if (checked && Number(maxSelect) <= 1) {
			options.forEach((o, i) => {
				o.is_default = i === index;
			});
		} else {
			options[index].is_default = checked;
		}
	}

	function addOptionRow() {
		options = [
			...options,
			{
				id: `opt-${options.length + 1}`,
				name: '',
				code: `OPT-${(options.length + 1).toString().padStart(2, '0')}`,
				price_delta: '0.00',
				is_default: false,
				effects: []
			}
		];
	}

	function removeOptionRow(index: number) {
		if (options.length <= 1) return;
		options = options.filter((_, i) => i !== index);
	}

	function addEffectToOption(optIndex: number) {
		const firstStock = menuStore.stockItems[0];
		options[optIndex].effects = [
			...options[optIndex].effects,
			{
				type: 'add',
				target_stock_item_id: firstStock?.id || '',
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
					id: o.id || `opt-${idx + 1}`,
					group_id: menuStore.editingModifierGroup?.id || '',
					name: o.name.trim(),
					code: o.code.trim().toUpperCase(),
					price_delta: o.price_delta || '0.00',
					is_default: o.is_default,
					sort_order: idx + 1,
					recipe_effects: o.effects.map((eff) => {
						const target = menuStore.stockItems.find((s) => s.id === eff.target_stock_item_id);
						const replacement = eff.replacement_stock_item_id
							? menuStore.stockItems.find((s) => s.id === eff.replacement_stock_item_id)
							: undefined;
						return {
							...eff,
							target_stock_item_name: target?.name || eff.target_stock_item_name,
							replacement_stock_item_name: replacement?.name || eff.replacement_stock_item_name,
							serving_unit: eff.serving_unit || target?.base_unit_symbol || 'pcs'
						};
					})
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
	subtitle="Atur parameter pemilihan, daftar opsi kustomisasi, delta harga, dan keterkaitan ke efek bahan resep."
	maxWidth="min(1280px, 96vw)"
	onclose={() => (menuStore.isModifierModalOpen = false)}
>
	<form
		id="modifier-group-form"
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
		class="form-two-column-layout"
	>
		<!-- LAYOUT 2 KOLOM (Kiri: Parameter & Aturan Pemilihan, Kanan: Opsi & Efek Resep) -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
			<!-- =======================================================================
			     KOLOM KIRI (5 Kolom): Identitas & Kebijakan Pemilihan Grup Modifier
			     ======================================================================= -->
			<div class="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-0">
				<div class="panel-section-card">
					<!-- Header Bagian Kiri -->
					<div class="section-card-header">
						<div class="flex items-center gap-2.5">
							<div class="section-icon-badge">
								<Icon name="adjustments-horizontal" size={17} class="text-[var(--brand-primary)]" />
							</div>
							<div>
								<h4 class="text-xs font-bold uppercase tracking-wider text-[var(--text-main)] m-0">
									Parameter & Aturan
								</h4>
								<p class="text-[0.72rem] text-[var(--text-muted)] m-0 mt-0.5">
									Aturan pemilihan kasir & identitas grup
								</p>
							</div>
						</div>
						<span class="status-rule-pill {selectionRuleSummary.colorClass}">
							{selectionRuleSummary.badge}
						</span>
					</div>

					<!-- Field Input Kolom Kiri -->
					<div class="section-fields-stack">
						<!-- Nama Grup Modifier -->
						<div>
							<label class="field-label" for="mod-name">
								Nama Grup Modifier <span class="text-rose-400">*</span>
							</label>
							<input
								type="text"
								class="form-input-lg w-full !min-h-[44px] px-4 text-sm"
								placeholder="Contoh: Pilihan Jenis Susu, Level Gula"
								bind:value={name}
								required
								id="mod-name"
							/>
						</div>

						<!-- Kode Grup -->
						<div>
							<label class="field-label" for="mod-code">
								Kode Grup <span class="text-rose-400">*</span>
							</label>
							<input
								type="text"
								class="form-input-lg w-full !min-h-[44px] px-4 text-sm font-mono uppercase"
								placeholder="Contoh: GRP-MILK"
								bind:value={code}
								required
								id="mod-code"
							/>
						</div>

						<!-- Grid 2 Kolom untuk Min & Max Selection -->
						<div class="grid grid-cols-2 gap-4 items-start">
							<div>
								<label class="field-label" for="mod-min">
									Min. Pilihan <span class="text-rose-400">*</span>
								</label>
								<input
									type="number"
									class="form-input-lg w-full !min-h-[44px] px-4 text-sm font-mono"
									min="0"
									bind:value={minSelect}
									required
									id="mod-min"
								/>
								<span class="field-helper-text">
									0 = Bebas, &ge; 1 = Wajib
								</span>
							</div>

							<div>
								<label class="field-label" for="mod-max">
									Maks. Pilihan <span class="text-rose-400">*</span>
								</label>
								<input
									type="number"
									class="form-input-lg w-full !min-h-[44px] px-4 text-sm font-mono"
									min="1"
									bind:value={maxSelect}
									required
									id="mod-max"
								/>
								<span class="field-helper-text">
									1 = Radio, &gt; 1 = Checkbox
								</span>
							</div>
						</div>

						<!-- Deskripsi Singkat -->
						<div>
							<label class="field-label" for="mod-desc">
								Deskripsi Singkat (Petunjuk Kasir / Pelanggan)
							</label>
							<input
								type="text"
								class="form-input-lg w-full !min-h-[44px] px-4 text-sm"
								placeholder="Petunjuk pemilihan untuk kasir / pelanggan"
								bind:value={description}
								id="mod-desc"
							/>
							<span class="field-helper-text">
								Tampil pada POS dan menu pemesanan pelanggan.
							</span>
						</div>

						<!-- Banner Penjelasan Logika POS -->
						<div class="pos-rule-banner {selectionRuleSummary.colorClass}">
							<Icon name="information-circle" size={18} class="shrink-0 mt-0.5" />
							<div class="text-xs leading-relaxed">
								<span class="font-bold uppercase tracking-wider block mb-0.5 opacity-90">Perilaku Kasir POS:</span>
								<span>{selectionRuleSummary.label}</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- =======================================================================
			     KOLOM KANAN (7 Kolom): Daftar Opsi & Efek Resep BOM
			     ======================================================================= -->
			<div class="lg:col-span-7 flex flex-col gap-5">
				<!-- Header Kolom Kanan -->
				<div class="flex flex-wrap items-center justify-between gap-3 pb-1">
					<div>
						<div class="flex items-center gap-2.5">
							<h4 class="text-xs font-bold uppercase tracking-wider text-[var(--text-main)] m-0">
								Opsi Pilihan &amp; Efek Bahan Resep
							</h4>
							<span class="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">
								{options.length} Opsi
							</span>
						</div>
						<p class="text-[0.75rem] text-[var(--text-muted)] mt-1 mb-0">
							Konfigurasi variasi, tambahan harga, dan resep bahan baku
						</p>
					</div>

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

				<!-- List Kartu Opsi Modifier -->
				<div class="options-list-stack">
					{#each options as opt, optIdx}
						<div class="option-card">
							<!-- Baris Atas Opsi: Nomor Opsi, Nama Preview, Status Default, & Tombol Hapus -->
							<div class="option-card-topbar">
								<div class="flex items-center gap-2.5 flex-wrap">
									<span class="option-index-badge">
										#{optIdx + 1}
									</span>
									<span class="text-xs font-bold text-[var(--text-main)] tracking-wide">
										{opt.name.trim() || `Opsi #${optIdx + 1}`}
									</span>
									{#if opt.is_default}
										<span class="default-active-badge">
											<Icon name="check" size={13} />
											<span>Pilihan Default</span>
										</span>
									{/if}
								</div>

								<div class="flex items-center gap-3">
									<label class="default-toggle-label">
										<input
											type="checkbox"
											checked={opt.is_default}
											onchange={(e) => handleDefaultChange(optIdx, e.currentTarget.checked)}
											class="rounded accent-[var(--brand-primary)] cursor-pointer"
										/>
										<span class="text-xs text-[var(--text-muted)] font-medium">Default</span>
									</label>

									{#if options.length > 1}
										<button
											type="button"
											class="delete-option-btn"
											onclick={() => removeOptionRow(optIdx)}
											title="Hapus opsi ini"
											aria-label="Hapus opsi"
										>
											<Icon name="trash" size={16} />
										</button>
									{/if}
								</div>
							</div>

							<!-- Form Input Opsi: Nama Opsi, Kode Opsi, Delta Harga -->
							<div class="grid grid-cols-1 md:grid-cols-12 gap-x-5 gap-y-4 items-start">
								<div class="md:col-span-5">
									<label class="field-label" for="opt-name-{optIdx}">
										Nama Opsi <span class="text-rose-400">*</span>
									</label>
									<input
										type="text"
										id="opt-name-{optIdx}"
										class="form-input-lg w-full !min-h-[42px] px-3.5 text-xs"
										bind:value={opt.name}
										placeholder="Contoh: Oat Milk Barista"
										required
									/>
								</div>

								<div class="md:col-span-3">
									<label class="field-label" for="opt-code-{optIdx}">
										Kode Opsi <span class="text-rose-400">*</span>
									</label>
									<input
										type="text"
										id="opt-code-{optIdx}"
										class="form-input-lg w-full !min-h-[42px] px-3.5 text-xs font-mono uppercase"
										bind:value={opt.code}
										placeholder="OPT-01"
										required
									/>
								</div>

								<div class="md:col-span-4">
									<label class="field-label" for="opt-price-{optIdx}">
										&Delta; Harga (+Rp) <span class="text-rose-400">*</span>
									</label>
									<!-- Input Group dengan Addon terpisah (Bebas Glitch / Tabrakan Teks) -->
									<div class="currency-input-group">
										<span class="currency-addon">Rp</span>
										<input
											type="text"
											id="opt-price-{optIdx}"
											class="currency-input font-mono text-xs"
											bind:value={opt.price_delta}
											placeholder="0.00"
											required
										/>
									</div>
								</div>
							</div>

							<!-- Efek Opsi ke Formula Resep (§6.3: replace -> add -> multiply) -->
							<div class="recipe-effects-section">
								<!-- Header Efek Resep -->
								<div class="flex items-center justify-between gap-3 mb-3.5">
									<span class="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
										<Icon name="sparkles" size={14} />
										<span>Efek Bahan Resep:</span>
										{#if opt.effects.length > 0}
											<span class="px-3 py-1 rounded-full text-[0.68rem] bg-indigo-500/15 text-indigo-400 font-semibold border border-indigo-500/25 whitespace-nowrap">
												{opt.effects.length} Efek
											</span>
										{/if}
									</span>
									<button
										type="button"
										class="text-xs font-medium text-[var(--brand-primary)] hover:underline flex items-center gap-1 transition-colors py-1 px-2 rounded-lg hover:bg-[var(--brand-primary)]/10"
										onclick={() => addEffectToOption(optIdx)}
									>
										<Icon name="plus" size={13} />
										<span>Tambah Efek</span>
									</button>
								</div>

								<!-- Konten Efek Resep -->
								{#if opt.effects.length === 0}
									<div class="empty-effect-note">
										<Icon name="information-circle" size={16} class="shrink-0 text-[var(--text-muted)]" />
										<span class="leading-relaxed">
											Tidak ada modifikasi ke bahan resep (hanya tambahan harga jual).
										</span>
									</div>
								{:else}
									<div class="effects-list-stack">
										{#each opt.effects as eff, effIdx}
											<div class="effect-row-card">
												<!-- Kolom 1: Tipe Efek -->
												<div class="w-full sm:w-44 shrink-0">
													<span class="effect-column-label">
														Tipe Aksi
													</span>
													<Select
														options={effectTypeOptions}
														bind:value={eff.type}
														placeholder="Tipe Efek"
													/>
												</div>

												<!-- Kolom 2: Target Bahan -->
												<div class="flex-1 min-w-[180px]">
													<span class="effect-column-label">
														Bahan Sasaran
													</span>
													<Select
														options={stockItemOptions}
														bind:value={eff.target_stock_item_id}
														placeholder="Pilih Bahan Target"
														searchable
													/>
												</div>

												<!-- Kolom 3: Konfigurasi Spesifik Tipe -->
												{#if eff.type === 'replace'}
													<div class="flex-1 min-w-[180px]">
														<span class="effect-column-label">
															Bahan Pengganti
														</span>
														<Select
															options={stockItemOptions}
															bind:value={eff.replacement_stock_item_id}
															placeholder="Pilih Pengganti"
															searchable
														/>
													</div>
												{:else if eff.type === 'add'}
													<div class="w-36 shrink-0">
														<span class="effect-column-label">
															Tambah (+Qty)
														</span>
														<div class="flex items-center gap-1.5">
															<input
																type="text"
																class="form-input-lg !min-h-[40px] px-3 text-xs font-mono w-full"
																bind:value={eff.added_quantity}
																placeholder="10.0000"
															/>
															<span class="text-xs text-[var(--text-muted)] font-semibold shrink-0 px-1 py-0.5 rounded bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)]">
																{getTargetStockUnit(eff.target_stock_item_id) || eff.serving_unit || 'g'}
															</span>
														</div>
													</div>
												{:else if eff.type === 'multiply'}
													<div class="w-32 shrink-0">
														<span class="effect-column-label">
															Pengali (&times; Skala)
														</span>
														<div class="flex items-center gap-1.5">
															<input
																type="text"
																class="form-input-lg !min-h-[40px] px-3 text-xs font-mono w-full"
																bind:value={eff.multiplier}
																placeholder="1.5000"
															/>
															<span class="text-xs text-[var(--text-muted)] font-semibold shrink-0 px-1.5 py-0.5 rounded bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)]">
																kali
															</span>
														</div>
													</div>
												{/if}

												<!-- Tombol Hapus Efek -->
												<div class="self-end pb-1 sm:self-center sm:pb-0 sm:pt-4 ml-auto shrink-0">
													<button
														type="button"
														class="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
														onclick={() => removeEffectFromOption(optIdx, effIdx)}
														title="Hapus efek ini"
														aria-label="Hapus efek"
													>
														<Icon name="x-mark" size={16} />
													</button>
												</div>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</form>

	<!-- Dedicated Sticky Footer Slot (§7: Anti-Sesak & Selalu Terlihat Saat Scroll) -->
	{#snippet footer()}
		<div class="flex items-center justify-between w-full">
			<div class="text-xs text-[var(--text-muted)] flex items-center gap-2">
				<span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
				<span><strong>{options.length}</strong> Opsi Modifier Terkonfigurasi</span>
			</div>

			<div class="flex items-center gap-3">
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
					form="modifier-group-form"
					loading={isSubmitting}
				>
					Simpan Grup Modifier
				</Button>
			</div>
		</div>
	{/snippet}
</Modal>

<style>
	/* Container Form dengan Layout 2 Kolom Lega (Anti-Sesak & Minimal Scroll) */
	.form-two-column-layout {
		width: 100%;
		padding-bottom: 8px;
	}

	/* Card Bagian 1: Identitas & Aturan Pemilihan */
	.panel-section-card {
		padding: 24px 26px;
		border-radius: var(--radius-xl, 18px);
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		gap: 22px;
	}

	.section-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--border-subtle);
	}

	.section-icon-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: 10px;
		background: rgba(99, 102, 241, 0.12);
		border: 1px solid rgba(99, 102, 241, 0.2);
		flex-shrink: 0;
	}

	.status-rule-pill {
		display: inline-flex;
		align-items: center;
		font-size: 0.72rem;
		font-weight: 600;
		padding: 5px 14px;
		border-radius: 9999px;
		white-space: nowrap;
		border: 1px solid transparent;
	}

	.section-fields-stack {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.field-label {
		display: block;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 10px;
	}

	.field-helper-text {
		display: block;
		font-size: 0.72rem;
		color: var(--text-muted);
		margin-top: 8px;
		line-height: 1.4;
	}

	.pos-rule-banner {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 16px 20px;
		border-radius: 14px;
		border: 1px solid;
		margin-top: 6px;
	}

	/* Bagian 2: Daftar Opsi & Efek Resep */
	.options-master-section {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.options-list-stack {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.option-card {
		padding: 24px 26px;
		border-radius: var(--radius-xl, 18px);
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		gap: 22px;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.option-card:hover {
		border-color: var(--border-panel);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
	}

	.option-card-topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--border-subtle);
	}

	.option-index-badge {
		display: inline-flex;
		align-items: center;
		padding: 3px 10px;
		border-radius: 8px;
		font-size: 0.75rem;
		font-weight: 700;
		font-family: monospace;
		background: var(--bg-panel);
		border: 1px solid var(--border-subtle);
		color: var(--text-main);
	}

	.default-active-badge {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 4px 12px;
		border-radius: 9999px;
		font-size: 0.72rem;
		font-weight: 600;
		background: rgba(16, 185, 129, 0.15);
		color: #34d399;
		border: 1px solid rgba(16, 185, 129, 0.3);
		white-space: nowrap;
	}

	.default-toggle-label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		user-select: none;
		padding: 6px 12px;
		border-radius: 8px;
		transition: background 0.15s ease;
	}

	.default-toggle-label:hover {
		background: var(--bg-panel);
	}

	.delete-option-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px;
		border-radius: 8px;
		color: #f87171;
		background: transparent;
		border: none;
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease;
	}

	.delete-option-btn:hover {
		color: #fca5a5;
		background: rgba(244, 63, 94, 0.12);
	}

	/* Input Group Khusus Delta Harga (Bebas Glitch / Tabrakan Teks) */
	.currency-input-group {
		display: flex;
		align-items: stretch;
		width: 100%;
		border-radius: var(--radius-md, 8px);
		background: var(--bg-panel);
		border: 1px solid var(--border-subtle);
		overflow: hidden;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.currency-input-group:focus-within {
		border-color: var(--brand-primary);
		box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
	}

	.currency-addon {
		display: inline-flex;
		align-items: center;
		padding: 0 14px;
		background: var(--bg-panel-sub);
		border-right: 1px solid var(--border-subtle);
		color: var(--text-muted);
		font-size: 0.8rem;
		font-weight: 600;
		user-select: none;
		letter-spacing: 0.02em;
	}

	.currency-input {
		flex: 1;
		min-height: 44px;
		padding: 8px 14px;
		background: transparent;
		border: none;
		outline: none;
		color: var(--text-main);
		font-size: 0.875rem;
		width: 100%;
	}

	/* Bagian Efek Resep BOM */
	.recipe-effects-section {
		margin-top: 6px;
		padding-top: 22px;
		border-top: 1px solid var(--border-subtle);
	}

	.empty-effect-note {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 16px 20px;
		border-radius: 14px;
		background: var(--bg-panel-sub);
		border: 1px dashed var(--border-subtle);
		font-size: 0.78rem;
		color: var(--text-muted);
	}

	.effects-list-stack {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.effect-row-card {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 16px;
		padding: 16px 20px;
		border-radius: 14px;
		background: var(--bg-panel);
		border: 1px solid var(--border-subtle);
	}

	.effect-column-label {
		display: block;
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--text-muted);
		margin-bottom: 6px;
	}
</style>
