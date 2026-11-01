<script lang="ts">
	/**
	 * Subkomponen Tab 6: Penetapan Harga per Channel & Aturan Pembulatan
	 * Referensi: PRD §6, MILESTONE.md §MS-04, AC-04.1
	 */
	import { menuStore } from '../../stores/menu.svelte.js';
	import { formatRupiah } from '../../../../utils/format.js';
	import { calculateChannelPrice } from '../../../../domain/pricing.js';
	import type { MenuItem, MenuVariant } from '../../../../api/contract/types.js';

	import Icon from '../../../../components/data/Icon.svelte';
	import CodeBadge from '../../../../components/data/CodeBadge.svelte';
	import Pagination from '../../../../components/data/Pagination.svelte';

	interface PricingRow {
		item: MenuItem;
		variant: MenuVariant;
	}

	interface CalculatedPricingRow {
		item: MenuItem;
		variant: MenuVariant;
		posPrice: string;
		appPrice: string;
		mktPrice: string;
	}

	const allPricingRows = $derived.by<PricingRow[]>(() => {
		const rows: PricingRow[] = [];
		for (const m of menuStore.menuItems) {
			for (const v of m.variants) {
				rows.push({ item: m, variant: v });
			}
		}
		return rows;
	});

	// Memoized kalkulasi harga channel (POS, App, Marketplace) ke derived list
	const calculatedPricingRows = $derived.by<CalculatedPricingRow[]>(() => {
		return allPricingRows.map(({ item, variant }) => {
			const posPrice = calculateChannelPrice({
				basePrice: variant.base_price,
				markupPct: 0
			}).finalPrice;

			const appPrice = calculateChannelPrice({
				basePrice: variant.base_price,
				markupPct: 5,
				roundingMode: 'nearest',
				roundingStep: 500
			}).finalPrice;

			const mktPrice = calculateChannelPrice({
				basePrice: variant.base_price,
				markupPct: 20,
				roundingMode: 'nearest',
				roundingStep: 1000
			}).finalPrice;

			return {
				item,
				variant,
				posPrice,
				appPrice,
				mktPrice
			};
		});
	});

	// Pagination Matriks Harga Channel
	let pricingPage = $state(1);
	let pricingPerPage = $state(10);
	const totalPricingRows = $derived(calculatedPricingRows.length);
	const paginatedPricingRows = $derived.by(() => {
		const start = (pricingPage - 1) * pricingPerPage;
		return calculatedPricingRows.slice(start, start + pricingPerPage);
	});
</script>

<div class="flex flex-col gap-6">
	<div class="catalog-toolbar">
		<div class="toolbar-left">
			<div class="flex flex-col gap-0.5">
				<h3 class="text-sm font-bold text-[var(--text-main)]">Penetapan Harga per Channel &amp; Aturan Pembulatan</h3>
				<span class="text-xs text-[var(--text-subtle)]">
					Perhitungan otomatis harga jual per channel berdasarkan persentase markup dan aturan pembulatan kasir.
				</span>
			</div>
		</div>

		<div class="toolbar-right">
			<button
				type="button"
				class="btn btn-primary"
				onclick={() => (menuStore.isPricingCalculatorOpen = true)}
				id="btn-buka-kalkulator-harga"
			>
				<Icon name="calculator" size={16} />
				<span>Buka Simulator Harga Channel</span>
			</button>
		</div>
	</div>

	<!-- Strip Konfigurasi Channel Penjualan -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<div class="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex flex-col gap-2">
			<div class="flex items-center justify-between">
				<span class="font-bold text-[var(--text-main)] flex items-center gap-2">
					<Icon name="building-storefront" size={18} class="text-emerald-400" />
					<span>Kasir Langsung (POS)</span>
				</span>
				<span class="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-mono font-bold whitespace-nowrap">
					Markup 0%
				</span>
			</div>
			<p class="text-xs text-[var(--text-muted)]">
				Sesuai harga dasar master tanpa penyesuaian markup aplikasi.
			</p>
			<span class="text-[11px] text-[var(--text-subtle)] font-mono">
				Pembulatan: Tidak ada pembulatan
			</span>
		</div>

		<div class="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex flex-col gap-2">
			<div class="flex items-center justify-between">
				<span class="font-bold text-[var(--text-main)] flex items-center gap-2">
					<Icon name="device-tablet" size={18} class="text-sky-400" />
					<span>Aplikasi Online (App)</span>
				</span>
				<span class="text-xs px-3 py-1 rounded-full bg-sky-500/15 text-sky-300 font-mono font-bold whitespace-nowrap">
					Markup +5%
				</span>
			</div>
			<p class="text-xs text-[var(--text-muted)]">
				Dikenakan biaya platform digital in-house dengan pembulatan kelipatan 500 terdekat.
			</p>
			<span class="text-[11px] text-[var(--text-subtle)] font-mono">
				Pembulatan: Nearest 500
			</span>
		</div>

		<div class="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex flex-col gap-2">
			<div class="flex items-center justify-between">
				<span class="font-bold text-[var(--text-main)] flex items-center gap-2">
					<Icon name="shopping-cart" size={18} class="text-amber-400" />
					<span>Marketplace (GoFood/Grab/Shopee)</span>
				</span>
				<span class="text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 font-mono font-bold whitespace-nowrap">
					Markup +20%
				</span>
			</div>
			<p class="text-xs text-[var(--text-muted)]">
				Kompensasi komisi merchant agregator dengan pembulatan kelipatan 1.000 terdekat.
			</p>
			<span class="text-[11px] text-[var(--text-subtle)] font-mono">
				Pembulatan: Nearest 1000
			</span>
		</div>
	</div>

	<!-- Matriks Perbandingan Harga Jual Lintas Channel -->
	<div class="data-table-container">
		<table class="data-table">
			<thead>
				<tr>
					<th>Menu &amp; Varian</th>
					<th>SKU</th>
					<th class="text-right">Harga Dasar</th>
					<th class="text-right">POS Kasir (0%)</th>
					<th class="text-right">Aplikasi (+5%, Rnd 500)</th>
					<th class="text-right">Marketplace (+20%, Rnd 1k)</th>
					<th class="text-right w-28">Simulasi</th>
				</tr>
			</thead>
			<tbody>
				{#each paginatedPricingRows as row}
					<tr>
						<td>
							<div class="flex flex-col">
								<strong class="text-[var(--text-main)]">{row.item.name}</strong>
								<span class="text-xs text-[var(--text-muted)]">{row.variant.name}</span>
							</div>
						</td>
						<td><CodeBadge code={row.variant.sku} /></td>
						<td class="text-right font-mono font-bold text-[var(--text-muted)]">
							{formatRupiah(row.variant.base_price)}
						</td>
						<td class="text-right font-mono font-bold text-emerald-400">
							{formatRupiah(row.posPrice)}
						</td>
						<td class="text-right font-mono font-bold text-sky-400">
							{formatRupiah(row.appPrice)}
						</td>
						<td class="text-right font-mono font-bold text-amber-400">
							{formatRupiah(row.mktPrice)}
						</td>
						<td class="text-right">
							<button
								type="button"
								class="btn btn-secondary text-xs"
								style="min-height: 32px; padding: 4px 14px;"
								onclick={() => {
									menuStore.calcVariantId = row.variant.id;
									menuStore.isPricingCalculatorOpen = true;
								}}
							>
								Kalkulator
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Pagination Matriks Harga Channel di Footer Panel -->
	{#if allPricingRows.length > 0}
		<div class="catalog-panel-footer">
			<Pagination
				page={pricingPage}
				perPage={pricingPerPage}
				total={totalPricingRows}
				perPageOptions={[10, 25, 50]}
				hrefBuilder={(p, pp) => `?tab=pricing&page=${p}&per_page=${pp}`}
				onpagechange={(newPage) => (pricingPage = newPage)}
				onperpagechange={(newSize) => {
					pricingPerPage = newSize;
					pricingPage = 1;
				}}
			/>
		</div>
	{/if}
</div>
