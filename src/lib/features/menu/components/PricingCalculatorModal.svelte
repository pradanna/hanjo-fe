<script lang="ts">
	/**
	 * Komponen Modal Simulasi Harga Channel & Pembulatan (§6.1, T-04.8, AC-04.1)
	 */
	import { menuStore } from '../stores/menu.svelte.js';
	import { formatRupiah } from '../../../utils/format.js';
	import Icon from '../../../components/data/Icon.svelte';
	import Button from '../../../components/forms/Button.svelte';
	import Select from '../../../components/forms/Select.svelte';
	import Modal from '../../../components/feedback/Modal.svelte';

	const variantOptions = $derived(
		menuStore.menuItems.flatMap((m) =>
			m.variants.map((v) => ({
				value: v.id,
				label: `${m.name} - ${v.name}`,
				subtitle: formatRupiah(v.base_price)
			}))
		)
	);

	const outletOptions = [
		{ value: 'out-jkt-01', label: 'Jodi Senopati (Jakarta)' },
		{ value: 'out-bdg-01', label: 'Jodi Dago (Bandung)' },
		{ value: 'out-sub-01', label: 'Jodi Gubeng (Surabaya - Ada Override)' },
		{ value: 'out-ubud-01', label: 'Kaveloka Ubud' },
		{ value: 'out-plg-01', label: 'Plaga Farm Bistro' }
	];

	const channelOptions = $derived(
		menuStore.channels.map((chn) => ({
			value: chn.code,
			label: chn.name,
			subtitle: `+${parseFloat(chn.default_markup_pct)}% (${chn.rounding_mode} ${chn.rounding_step})`
		}))
	);

	function toggleCalcOption(optId: string) {
		if (menuStore.calcOptionIds.includes(optId)) {
			menuStore.calcOptionIds = menuStore.calcOptionIds.filter((id) => id !== optId);
		} else {
			menuStore.calcOptionIds = [...menuStore.calcOptionIds, optId];
		}
		menuStore.refreshPricingCalculation();
	}
</script>

<Modal
	open={menuStore.isPricingCalculatorOpen}
	title="Kalkulator Harga Jual Channel &amp; Pembulatan"
	maxWidth="min(1440px, 95vw)"
	onclose={() => (menuStore.isPricingCalculatorOpen = false)}
>
	<div class="calc-modal-layout">
		<!-- 1. Grid Pengaturan Input Simulasi (3 Kolom Proporsional) -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<!-- 1. Varian Menu -->
			<div class="flex flex-col gap-2">
				<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider" for="calc-select-variant">
					Pilih Varian Menu:
				</label>
				<Select
					id="calc-select-variant"
					options={variantOptions}
					bind:value={menuStore.calcVariantId}
					onchange={() => menuStore.refreshPricingCalculation()}
					placeholder="Pilih Varian Menu"
					searchable
				/>
			</div>

			<!-- 2. Outlet Acuan -->
			<div class="flex flex-col gap-2">
				<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider" for="calc-select-outlet">
					Gerai / Outlet:
				</label>
				<Select
					id="calc-select-outlet"
					options={outletOptions}
					bind:value={menuStore.calcOutletId}
					onchange={() => menuStore.refreshPricingCalculation()}
					placeholder="Pilih Outlet"
				/>
			</div>

			<!-- 3. Sales Channel -->
			<div class="flex flex-col gap-2">
				<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider" for="calc-select-channel">
					Channel Penjualan:
				</label>
				<Select
					id="calc-select-channel"
					options={channelOptions}
					bind:value={menuStore.calcChannelCode}
					onchange={() => menuStore.refreshPricingCalculation()}
					placeholder="Pilih Channel"
				/>
			</div>
		</div>

		<!-- 2. Pilihan Modifier Opsi -->
		<div class="calc-modifier-container">
			<div class="calc-section-header">
				<Icon name="adjustments-horizontal" size={15} />
				<span>Pilih Tambahan Opsi Modifier</span>
			</div>
			<div class="flex flex-wrap gap-2.5 pt-1">
				{#each menuStore.modifierGroups as grp}
					{#each grp.options as opt}
						{#if parseFloat(opt.price_delta) > 0}
							{@const isSelected = menuStore.calcOptionIds.includes(opt.id)}
							<button
								type="button"
								class="calc-modifier-chip {isSelected ? 'selected' : ''}"
								onclick={() => toggleCalcOption(opt.id)}
							>
								<span class="w-2.5 h-2.5 rounded-full {isSelected ? 'bg-[var(--brand-primary)]' : 'bg-slate-500'}"></span>
								<span class="font-medium text-[var(--text-main)]">{opt.name}</span>
								<span class="calc-chip-delta">
									+{formatRupiah(opt.price_delta)}
								</span>
							</button>
						{/if}
					{/each}
				{/each}
			</div>
		</div>

		<!-- 3. Hasil Perhitungan Instan -->
		{#if menuStore.calcPricingResult}
			<div class="calc-result-card">
				<!-- Header Hasil Harga -->
				<div class="calc-result-header">
					<div class="flex flex-col gap-1.5">
						<span class="calc-result-label">Harga Jual Akhir Channel</span>
						<span class="calc-result-price font-mono font-bold text-emerald-400">
							{formatRupiah(menuStore.calcPricingResult.final_price)}
						</span>
					</div>

					<div class="flex flex-col items-end gap-1.5 text-right">
						<span class="calc-channel-badge">
							<Icon name="building-storefront" size={13} />
							<span>Channel: <strong>{menuStore.calcPricingResult.channel_name}</strong></span>
						</span>
						<span class="calc-meta-pill font-mono">
							Markup {parseFloat(menuStore.calcPricingResult.markup_pct)}% | Pembulatan {menuStore.calcPricingResult.rounding_mode} {menuStore.calcPricingResult.rounding_step}
						</span>
					</div>
				</div>

				<!-- Rincian 4 Langkah Formula -->
				<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
					<div class="calc-step-card">
						<span class="step-label">Harga Dasar:</span>
						<span class="step-value font-mono font-bold text-[var(--text-main)]">
							{formatRupiah(menuStore.calcPricingResult.base_price)}
						</span>
						{#if menuStore.calcPricingResult.price_override_applied}
							<span class="badge-override !text-[0.65rem] !py-0.5 !px-2 mt-1">Override Outlet</span>
						{/if}
					</div>

					<div class="calc-step-card">
						<span class="step-label">Tambahan Modifier:</span>
						<span class="step-value font-mono font-bold text-[var(--text-main)]">
							+{formatRupiah(menuStore.calcPricingResult.modifier_price_delta)}
						</span>
					</div>

					<div class="calc-step-card">
						<span class="step-label">Subtotal Dasar:</span>
						<span class="step-value font-mono font-bold text-[var(--text-main)]">
							{formatRupiah(menuStore.calcPricingResult.subtotal_before_markup)}
						</span>
					</div>

					<div class="calc-step-card">
						<span class="step-label">Markup Terhitung:</span>
						<span class="step-value font-mono font-bold text-sky-400">
							+{formatRupiah(menuStore.calcPricingResult.markup_amount)}
						</span>
					</div>
				</div>
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (menuStore.isPricingCalculatorOpen = false)}>
			Tutup
		</Button>
	{/snippet}
</Modal>

<style>
	.calc-modal-layout {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.calc-modifier-container {
		padding: 22px 24px;
		border-radius: var(--radius-xl, 14px);
		background: var(--bg-panel);
		border: 1px solid var(--border-panel);
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.calc-section-header {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		font-weight: 700;
		color: var(--text-main);
		padding-bottom: 12px;
		border-bottom: 1px solid var(--border-panel);
	}

	.calc-modifier-chip {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		min-height: 40px;
		border-radius: var(--radius-lg, 10px);
		font-size: 0.825rem;
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-panel);
		color: var(--text-main);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.calc-modifier-chip:hover {
		border-color: var(--brand-primary);
		background: var(--bg-panel-hover);
	}

	.calc-modifier-chip.selected {
		background: var(--pill-success-bg);
		border-color: var(--brand-primary);
		color: var(--pill-success-text);
	}

	.calc-chip-delta {
		font-family: var(--font-mono, monospace);
		font-size: 0.75rem;
		font-weight: 600;
		color: #38bdf8;
		padding: 2px 7px;
		border-radius: 9999px;
		background: rgba(56, 189, 248, 0.1);
		border: 1px solid rgba(56, 189, 248, 0.2);
	}

	.calc-modifier-chip.selected .calc-chip-delta {
		color: #34d399;
		background: rgba(16, 185, 129, 0.2);
		border-color: rgba(16, 185, 129, 0.3);
	}

	.calc-result-card {
		padding: 24px 26px;
		border-radius: var(--radius-xl, 16px);
		background: var(--bg-panel);
		border: 1px solid var(--border-panel);
		display: flex;
		flex-direction: column;
		gap: 20px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
	}

	.calc-result-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding-bottom: 18px;
		border-bottom: 1px solid var(--border-panel);
		flex-wrap: wrap;
	}

	.calc-result-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	.calc-result-price {
		font-size: 1.75rem;
		line-height: 1.25;
	}

	.calc-channel-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.8125rem;
		color: var(--text-main);
	}

	.calc-meta-pill {
		font-size: 0.75rem;
		padding: 4px 10px;
		border-radius: 9999px;
		background: rgba(99, 102, 241, 0.12);
		color: #a5b4fc;
		border: 1px solid rgba(99, 102, 241, 0.25);
	}

	.calc-step-card {
		padding: 16px 18px;
		border-radius: var(--radius-lg, 12px);
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-panel);
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.step-label {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.step-value {
		font-size: 0.95rem;
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
</style>