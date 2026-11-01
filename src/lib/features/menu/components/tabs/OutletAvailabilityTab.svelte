<script lang="ts">
	/**
	 * Subkomponen Tab 7: Ketersediaan Menu per Gerai & Channel
	 * Referensi: PRD §6, MILESTONE.md §MS-04, AC-04.5
	 */
	import { menuStore } from '../../stores/menu.svelte.js';
	import { DEMO_OUTLETS } from '../../../../auth/scope.js';
	import { formatDate } from '../../../../utils/format.js';

	import Icon from '../../../../components/data/Icon.svelte';
	import CodeBadge from '../../../../components/data/CodeBadge.svelte';
	import Pagination from '../../../../components/data/Pagination.svelte';
	import Select, { type SelectOption } from '../../../../components/forms/Select.svelte';

	const availabilityOutletOptions: SelectOption[] = DEMO_OUTLETS.map((out) => ({
		value: out.id,
		label: `${out.name} (${out.code})`
	}));

	// Pagination Ketersediaan Gerai
	let availabilityPage = $state(1);
	let availabilityPerPage = $state(10);
	const totalAvailability = $derived(menuStore.availability.length);
	const paginatedAvailability = $derived.by(() => {
		const start = (availabilityPage - 1) * availabilityPerPage;
		return menuStore.availability.slice(start, start + availabilityPerPage);
	});

	$effect(() => {
		const _ = menuStore.selectedOutletFilter;
		availabilityPage = 1;
	});
</script>

<div class="flex flex-col gap-6">
	<div class="catalog-toolbar">
		<div class="toolbar-left">
			<div class="flex flex-col gap-0.5">
				<h3 class="text-sm font-bold text-[var(--text-main)]">Matriks Ketersediaan Menu per Gerai &amp; Channel</h3>
				<span class="text-xs text-[var(--text-subtle)]">
					Kontrol menu yang habis (sold-out) tanpa menghapus master data.
				</span>
			</div>

			<div class="w-64 ml-2">
				<Select
					options={availabilityOutletOptions}
					bind:value={menuStore.selectedOutletFilter}
					onchange={() => menuStore.loadAll()}
				/>
			</div>
		</div>

		<div class="toolbar-right">
			<span class="text-xs px-3 py-1.5 rounded-full bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-mono">
				Terpantau: {menuStore.availability.length} Status Gerai
			</span>
		</div>
	</div>

	<div class="data-table-container">
		<table class="data-table">
			<thead>
				<tr>
					<th>Menu &amp; Varian</th>
					<th>Gerai</th>
					<th>Channel Penjualan</th>
					<th>Status Ketersediaan</th>
					<th>Alasan / Keterangan</th>
					<th>Waktu Update</th>
					<th class="w-36 text-right">Aksi Cepat</th>
				</tr>
			</thead>
			<tbody>
				{#each paginatedAvailability as a}
					<tr>
						<td>
							<div class="flex flex-col">
								<strong class="text-[var(--text-main)]">{a.menu_item_name}</strong>
								<span class="text-xs text-[var(--text-muted)] font-mono">{a.variant_id || 'Semua Varian'}</span>
							</div>
						</td>
						<td>
							<span class="font-medium text-xs text-[var(--text-main)]">
								{DEMO_OUTLETS.find((o) => o.id === a.outlet_id)?.name || a.outlet_id}
							</span>
						</td>
						<td>
							<CodeBadge code={a.channel_code} />
						</td>
						<td>
							{#if a.is_available}
								<span class="pill-badge pill-success">Tersedia Siap Jual</span>
							{:else}
								<span class="pill-badge pill-danger">HABIS (Sold Out)</span>
							{/if}
						</td>
						<td class="text-xs text-[var(--text-muted)]">
							{a.sold_out_reason || '-'}
						</td>
						<td class="text-xs text-[var(--text-subtle)] font-mono">
							{a.updated_at ? formatDate(a.updated_at, true) : '-'}
						</td>
						<td class="text-right">
							<button
								type="button"
								class="btn text-xs font-semibold"
								style="min-height: 32px; padding: 4px 14px;"
								class:btn-danger={a.is_available}
								class:btn-primary={!a.is_available}
								onclick={() => menuStore.toggleMenuAvailability(a, 'Stok habis sementara')}
							>
								{a.is_available ? 'Tandai Habis' : 'Pulihkan Tersedia'}
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Pagination Ketersediaan Gerai di Footer Panel -->
	{#if menuStore.availability.length > 0}
		<div class="catalog-panel-footer">
			<Pagination
				page={availabilityPage}
				perPage={availabilityPerPage}
				total={totalAvailability}
				perPageOptions={[10, 25, 50]}
				hrefBuilder={(p, pp) => `?tab=availability&page=${p}&per_page=${pp}`}
				onpagechange={(newPage) => (availabilityPage = newPage)}
				onperpagechange={(newSize) => {
					availabilityPerPage = newSize;
					availabilityPage = 1;
				}}
			/>
		</div>
	{/if}
</div>
