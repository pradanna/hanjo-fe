<script lang="ts">
	import DashboardCardFrame from './DashboardCardFrame.svelte';
	import { dashboardStore } from '../stores/dashboard.svelte.js';
	import Badge from '../../../components/data/Badge.svelte';
	import Button from '../../../components/forms/Button.svelte';
	import Icon from '../../../components/data/Icon.svelte';
	import type { SmProposalsCardData } from '../../../api/contract/types.js';

	const cardState = $derived(dashboardStore.getCardState<SmProposalsCardData>('sm_proposals'));
	const data = $derived(cardState.data);
	const items = $derived(data?.items || []);
</script>

<DashboardCardFrame
	cardKey="sm_proposals"
	title="Usulan Menu Lokal Gerai"
	icon="light-bulb"
	subtitle="Pelacakan inovasi menu dan resep racikan gerai yang diajukan ke pusat"
	drilldownUrl="/menu#recipes"
	drilldownLabel="Usulan Katalog"
	colSpan="col-12 col-lg-6"
>
	{#if items.length === 0}
		<div class="p-6 text-center text-muted flex flex-col items-center gap-3">
			<p>Belum ada usulan menu lokal yang diajukan.</p>
			<Button variant="secondary" size="sm" href="/menu#recipes">
				<Icon name="plus" size={13} />
				<span>Buat Usulan Resep Baru</span>
			</Button>
		</div>
	{:else}
		<div class="flex flex-col gap-2.5">
			{#each items as item}
				<div class="dash-subbox p-3.5 rounded-xl flex items-center justify-between gap-3">
					<div class="flex flex-col gap-1 min-w-0 flex-1">
						<div class="flex items-center gap-2 flex-wrap">
							<span class="font-bold text-xs truncate" style="color: var(--text-main);">{item.recipe_name}</span>
							<Badge
								variant={item.status === 'approved' ? 'success' : item.status === 'revision_needed' ? 'danger' : 'info'}
								text={item.status === 'approved' ? 'Disetujui Pusat' : item.status === 'submitted' ? 'Menunggu Kurasi HQ' : 'Perlu Revisi'}
								size="sm"
							/>
						</div>
						<span class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
							{item.feedback || 'Resep sedang dianalisis margin & standarisasi bahan oleh HQ Admin.'}
						</span>
					</div>

					<a
						href="/menu#recipes"
						class="btn-view-direct text-xs py-1.5 px-3 font-semibold flex-shrink-0"
					>
						<Icon name="eye" size={13} />
						<span>Lihat</span>
					</a>
				</div>
			{/each}

			<div class="flex items-center justify-between pt-2 border-t text-xs" style="border-color: var(--border-panel);">
				<span class="text-muted text-[11px]">Inovasi menu lokal disetujui dapat dirilis ke POS gerai</span>
				<a
					href="/menu#recipes"
					class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
					style="background: var(--bg-panel-sub); border: 1px solid var(--border-panel); color: var(--text-main);"
				>
					<Icon name="plus" size={13} />
					<span>Ajukan Menu Baru</span>
				</a>
			</div>
		</div>
	{/if}
</DashboardCardFrame>
