<script lang="ts">
	/**
	 * PartnerOwnersSection.svelte (T-02.6, PG-org-owners, Flag: partner_ownership)
	 * Daftar profil investor mitra pemilik gerai
	 */
	import Icon from '../../../components/data/Icon.svelte';
	import Badge from '../../../components/data/Badge.svelte';
	import EmptyState from '../../../components/feedback/EmptyState.svelte';

	interface Props {
		owners: { name: string; email?: string; phone?: string; outlet_count: number }[];
	}

	let { owners }: Props = $props();
</script>

<div class="flex flex-col gap-5">
	<div class="flex items-center justify-between flex-wrap gap-4">
		<div>
			<h3 class="font-bold text-base text-[var(--text-main)] m-0">Daftar Mitra &amp; Investor Pemilik Gerai</h3>
			<p class="text-xs text-[var(--text-muted)] m-0 mt-0.5">Ringkasan investor dan pemegang saham kemitraan di seluruh cabang terdaftar.</p>
		</div>
	</div>

	{#if owners.length === 0}
		<EmptyState
			title="Belum Ada Investor Terdaftar"
			description="Data investor mitra akan tampil di sini saat gerai dengan model kemitraan ditambahkan struktur kepemilikan sahamnya."
		/>
	{:else}
		<div class="outlets-grid">
			{#each owners as own}
				<div class="outlet-item-card">
					<div class="outlet-card-top">
						<div class="outlet-name-block">
							<span class="inline-flex items-center text-xs px-3 py-1 rounded-full font-bold bg-[var(--pill-success-bg)] text-[var(--pill-success-text)] border border-[var(--pill-success-border)] whitespace-nowrap self-start">
								MITRA INVESTOR
							</span>
							<h4 class="outlet-title">{own.name}</h4>
						</div>
						<Badge variant="success" size="sm">
							{own.outlet_count} Portofolio Gerai
						</Badge>
					</div>

					<div class="outlet-info-grid">
						<div class="info-item">
							<span class="info-label">Email Kontak</span>
							<span class="info-val truncate">{own.email || '-'}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Telepon / WhatsApp</span>
							<span class="info-val">{own.phone || '-'}</span>
						</div>
					</div>

					<div class="rounded-xl text-xs text-[var(--text-muted)] flex items-center gap-2.5 p-3.5 bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)]">
						<Icon name="check-circle" size={16} class="text-[var(--brand-primary)] shrink-0" />
						<span class="leading-relaxed">Kemitraan tervalidasi dengan hak bagi hasil laba bersih gerai.</span>
					</div>

					<!-- Progressive Disclosure Card Footer -->
					<div class="outlet-card-footer">
						<span class="text-xs text-[var(--text-muted)] font-medium">
							Portofolio: <strong class="text-[var(--text-main)] font-mono">{own.outlet_count} Cabang</strong>
						</span>
						<span class="text-xs font-semibold text-[var(--brand-primary)]">
							Investor Terverifikasi
						</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
