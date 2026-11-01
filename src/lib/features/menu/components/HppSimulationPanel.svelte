<script lang="ts">
	/**
	 * Komponen Panel Simulasi HPP Dinamis Varian per Outlet (§6.4, T-04.7, AC-04.2, AC-04.9)
	 */
	import { menuStore } from '../stores/menu.svelte.js';
	import { formatRupiah } from '../../../utils/format.js';
	import Icon from '../../../components/data/Icon.svelte';
	import Button from '../../../components/forms/Button.svelte';
	import Select from '../../../components/forms/Select.svelte';
	import Skeleton from '../../../components/feedback/Skeleton.svelte';

	interface Props {
		variantId?: string;
		variantName?: string;
	}

	let { variantId = menuStore.simVariantId || 'var-aren-iced', variantName = 'Varian Menu' }: Props = $props();

	const outletOptions = [
		{ value: 'out-jkt-01', label: 'Jodi Senopati (Jakarta)' },
		{ value: 'out-bdg-01', label: 'Jodi Dago (Bandung)' },
		{ value: 'out-sub-01', label: 'Jodi Gubeng (Surabaya - Resep Override)' },
		{ value: 'out-ubud-01', label: 'Kaveloka Ubud (Bali)' },
		{ value: 'out-plg-01', label: 'Plaga Farm Bistro' }
	];

	// Perbarui variantId di store bila prop berubah
	$effect(() => {
		if (variantId && menuStore.simVariantId !== variantId) {
			menuStore.simVariantId = variantId;
			menuStore.refreshHppSimulation();
		}
	});

	function toggleOption(optId: string) {
		if (menuStore.simSelectedOptionIds.includes(optId)) {
			menuStore.simSelectedOptionIds = menuStore.simSelectedOptionIds.filter((id) => id !== optId);
		} else {
			menuStore.simSelectedOptionIds = [...menuStore.simSelectedOptionIds, optId];
		}
		menuStore.refreshHppSimulation();
	}

	function isOptionSelected(optId: string): boolean {
		return menuStore.simSelectedOptionIds.includes(optId);
	}
</script>

<div class="hpp-simulation-layout">
	<!-- 1. Header Toolbar dengan Garis Pemisah & Jarak Lega -->
	<div class="hpp-header-toolbar">
		<div class="flex flex-col gap-2.5">
			<h3 class="text-base font-bold text-[var(--text-main)] flex items-center gap-2.5 m-0 leading-snug">
				<Icon name="calculator" size={19} class="text-[var(--brand-primary)]" />
				<span>Simulasi HPP Dinamis &amp; Margin Laba Kotor</span>
			</h3>
			<p class="text-xs text-[var(--text-muted)] m-0 leading-relaxed max-w-2xl">
				Kalkulasi biaya bahan baku riil berdasarkan rata-rata bergerak outlet dan dampak opsi modifier.
			</p>
		</div>

		<!-- Pemilih Outlet Simulasi -->
		<div class="flex items-center gap-3.5 shrink-0">
			<span class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Outlet Acuan:</span>
			<div class="w-64">
				<Select
					id="select-sim-outlet"
					options={outletOptions}
					bind:value={menuStore.simOutletId}
					onchange={() => menuStore.refreshHppSimulation()}
					placeholder="Pilih Outlet Acuan"
				/>
			</div>
		</div>
	</div>

	<!-- 2. Pemilih Modifier Opsional untuk Uji Dampak Resep (§6.3) -->
	<div class="hpp-modifier-tester">
		<div class="hpp-section-header">
			<Icon name="adjustments-horizontal" size={16} />
			<span>Uji Opsi Modifier Tambahan</span>
		</div>
		<div class="flex flex-wrap gap-3 pt-1">
			{#each menuStore.modifierGroups as grp}
				{#each grp.options as opt}
					{#if opt.recipe_effects && opt.recipe_effects.length > 0}
						<button
							type="button"
							class="modifier-chip {isOptionSelected(opt.id) ? 'selected' : ''}"
							onclick={() => toggleOption(opt.id)}
						>
							<span class="w-2.5 h-2.5 rounded-full {isOptionSelected(opt.id) ? 'bg-[var(--brand-primary)]' : 'bg-slate-500'}"></span>
							<span class="font-medium">{opt.name}</span>
							<span class="ml-1 text-[0.725rem] text-[var(--text-muted)] font-mono">
								{parseFloat(opt.price_delta) > 0 ? `(+${formatRupiah(opt.price_delta)})` : '(Rp0)'}
							</span>
						</button>
					{/if}
				{/each}
			{/each}
		</div>
	</div>

	{#if menuStore.isHppLoading}
		<div class="space-y-5 py-4">
			<Skeleton width="100%" height="90px" />
			<Skeleton width="100%" height="200px" />
		</div>
	{:else if menuStore.simHppResult}
		<!-- 3. Hero KPI Metric Cards dengan Jarak Vertikal Bertingkat & Lega -->
		<div class="hpp-kpi-grid">
			<div class="hpp-kpi-card">
				<span class="hpp-kpi-label">HPP Total Varian</span>
				<span class="hpp-kpi-val text-amber-400">
					{formatRupiah(menuStore.simHppResult.total_hpp)}
				</span>
				<div class="hpp-kpi-sub">
					<span>Versi Resep: v{menuStore.simHppResult.recipe_version_number}</span>
					{#if menuStore.simHppResult.recipe_scope === 'outlet_override'}
						<span class="badge-override ml-1">Override Outlet</span>
					{/if}
				</div>
			</div>

			<div class="hpp-kpi-card">
				<span class="hpp-kpi-label">
					{parseFloat(menuStore.simHppResult.modifier_delta || '0') > 0 ? 'Harga Jual Efektif' : 'Harga Jual Dasar'}
				</span>
				<span class="hpp-kpi-val text-sky-400">
					{formatRupiah(menuStore.simHppResult.selling_price)}
				</span>
				<div class="hpp-kpi-sub">
					{#if parseFloat(menuStore.simHppResult.modifier_delta || '0') > 0}
						<span>Dasar {formatRupiah(menuStore.simHppResult.base_price || '28000')} (+{formatRupiah(menuStore.simHppResult.modifier_delta || '0')}) · Laba: <strong class="text-[var(--text-main)]">{formatRupiah(menuStore.simHppResult.gross_margin_amount)}</strong></span>
					{:else}
						<span>Laba Kotor: <strong class="text-[var(--text-main)]">{formatRupiah(menuStore.simHppResult.gross_margin_amount)}</strong></span>
					{/if}
				</div>
			</div>

			<div class="hpp-kpi-card">
				<span class="hpp-kpi-label">Margin Laba Kotor</span>
				<span class="hpp-kpi-val text-emerald-400">
					{menuStore.simHppResult.gross_margin_pct}%
				</span>
				<div class="hpp-kpi-sub">
					<span>Target Sehat F&amp;B: &ge; 65.0%</span>
				</div>
			</div>
		</div>

		<!-- Warning Pill jika Bahan Belum Ada Biaya -->
		{#if !menuStore.simHppResult.is_complete}
			<div class="formula-callout !bg-amber-950/20 !border-amber-500/40 text-amber-300">
				<Icon name="exclamation-triangle" size={18} class="text-amber-400 shrink-0 mt-0.5" />
				<div class="flex flex-col gap-1.5">
					<span class="font-semibold block">Lencana: HPP Tidak Lengkap</span>
					<p class="text-xs leading-relaxed m-0 text-amber-200/90">
						Bahan baku <strong>{menuStore.simHppResult.missing_cost_items.join(', ')}</strong> belum memiliki catatan biaya rata-rata di outlet ini. Segera verifikasi penerimaan barang atau atur harga beli awal.
					</p>
				</div>
			</div>
		{/if}

		<!-- 4. Tabel Rincian Breakdown Biaya Per Bahan -->
		<div class="hpp-table-section">
			<div class="hpp-section-header">
				<Icon name="table-cells" size={16} />
				<span>Rincian Biaya per Bahan Baku (Breakdown HPP)</span>
			</div>

			<div class="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
				<table class="modern-drawer-table">
					<thead>
						<tr>
							<th>Bahan Baku</th>
							<th>Takaran Pakai</th>
							<th>Waste %</th>
							<th>Kuantitas Kotor</th>
							<th>Biaya Satuan</th>
							<th>Subtotal Biaya</th>
							<th>Sumber Biaya</th>
						</tr>
					</thead>
					<tbody>
						{#each menuStore.simHppResult.breakdown as row}
							<tr>
								<td>
									<div class="font-semibold text-[var(--text-main)]">{row.stock_item_name}</div>
									{#if row.effect_note}
										<div class="text-[0.725rem] text-indigo-400 mt-1.5 flex items-center gap-1 font-medium">
											<Icon name="bolt" size={13} class="text-indigo-400" />
											<span>{row.effect_note}</span>
										</div>
									{/if}
								</td>
								<td class="font-mono text-xs">{parseFloat(row.quantity)} {row.serving_unit}</td>
								<td class="text-xs text-[var(--text-muted)]">{parseFloat(row.waste_pct)}%</td>
								<td class="font-mono text-xs text-[var(--text-muted)]">
									{parseFloat(row.gross_quantity).toFixed(2)} {row.serving_unit}
								</td>
								<td class="font-mono text-xs">
									{#if row.is_cost_missing}
										<span class="badge-hpp-incomplete">Belum ada biaya</span>
									{:else}
										{formatRupiah(row.unit_cost)}/{row.serving_unit}
									{/if}
								</td>
								<td class="font-mono text-xs font-bold text-emerald-400">
									{formatRupiah(row.subtotal_cost)}
								</td>
								<td>
									<span class="inline-flex items-center text-xs px-3 py-1 rounded-full bg-[var(--bg-panel-sub)] text-[var(--text-muted)] border border-[var(--border-subtle)] whitespace-nowrap font-medium">
										{row.cost_source === 'outlet_avg_cost' ? 'Moving Avg Gerai' : row.cost_source === 'last_purchase_price' ? 'Ref HQ' : 'Tidak Ada'}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<style>
	.hpp-simulation-layout {
		display: flex;
		flex-direction: column;
		gap: 28px;
	}

	.hpp-header-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		flex-wrap: wrap;
		padding-bottom: 22px;
		border-bottom: 1px solid var(--border-panel);
	}

	.hpp-modifier-tester {
		padding: 24px 26px;
		border-radius: var(--radius-xl, 16px);
		background: var(--bg-panel);
		border: 1px solid var(--border-panel);
		display: flex;
		flex-direction: column;
		gap: 18px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	}

	.hpp-section-header {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 13px;
		font-weight: 700;
		color: var(--text-main);
		padding-bottom: 14px;
		border-bottom: 1px solid var(--border-panel);
	}

	.hpp-kpi-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 24px;
	}

	@media (max-width: 840px) {
		.hpp-kpi-grid {
			grid-template-columns: 1fr;
		}
	}

	.hpp-kpi-card {
		background: var(--bg-panel);
		border: 1px solid var(--border-panel);
		border-radius: var(--radius-xl, 16px);
		padding: 24px 26px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 14px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	}

	.hpp-kpi-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		line-height: 1.4;
	}

	.hpp-kpi-val {
		font-size: 1.75rem;
		font-weight: 700;
		font-family: var(--font-mono, monospace);
		line-height: 1.25;
		margin: 4px 0;
	}

	.hpp-kpi-sub {
		font-size: 0.8125rem;
		color: var(--text-subtle);
		display: flex;
		align-items: center;
		gap: 8px;
		padding-top: 14px;
		border-top: 1px dashed var(--border-panel);
		line-height: 1.4;
	}

	.hpp-table-section {
		display: flex;
		flex-direction: column;
		gap: 18px;
		margin-top: 8px;
	}

	/* Modifier Options Badges */
	.modifier-chip {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		padding: 9px 18px;
		min-height: 40px;
		border-radius: var(--radius-lg, 10px);
		font-size: 0.825rem;
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-panel);
		color: var(--text-main);
		cursor: pointer;
		transition: all 0.15s ease;
		line-height: 1.4;
	}

	.modifier-chip:hover {
		border-color: var(--brand-primary);
		background: var(--bg-panel-hover);
	}

	.modifier-chip.selected {
		background: var(--pill-success-bg);
		border-color: var(--brand-primary);
		color: var(--pill-success-text);
	}

	/* Modern Table */
	.modern-drawer-table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		font-size: 0.85rem;
	}

	.modern-drawer-table th {
		padding: 16px 20px;
		background: var(--bg-panel);
		color: var(--text-muted);
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		text-align: left;
		border-bottom: 1px solid var(--border-panel);
	}

	.modern-drawer-table td {
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-subtle);
		color: var(--text-main);
		vertical-align: middle;
		line-height: 1.5;
	}

	.modern-drawer-table tr:last-child td {
		border-bottom: none;
	}

	.modern-drawer-table tr:hover td {
		background: var(--bg-panel-hover);
	}

	.badge-hpp-incomplete {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 12px;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		background: rgba(245, 158, 11, 0.15);
		border: 1px solid rgba(245, 158, 11, 0.35);
		color: #f59e0b;
		white-space: nowrap;
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