<script lang="ts">
	/**
	 * BrandQuickLinksBar.svelte
	 * Baris 4: Aksi Cepat & Alat Kendali Brand Manager
	 */
	import Icon from '../../../components/data/Icon.svelte';

	let isDownloadingPdf = $state(false);
	let pdfToast = $state<string | null>(null);

	function handleDownloadReport() {
		isDownloadingPdf = true;
		setTimeout(() => {
			isDownloadingPdf = false;
			pdfToast = 'Laporan Brand Seduhan Kopi Jodi (13 Okt 2026) berhasil diunduh.';
			setTimeout(() => {
				pdfToast = null;
			}, 3500);
		}, 1200);
	}
</script>

<div class="col-12 flex flex-col gap-2 mt-1">
	{#if pdfToast}
		<div class="dash-banner dash-banner-success flex items-center justify-between p-2.5 animate-fadeIn">
			<div class="flex items-center gap-2 text-xs">
				<Icon name="check-circle" size={15} />
				<span class="font-semibold">{pdfToast}</span>
			</div>
			<button type="button" class="text-xs text-muted hover:text-main" onclick={() => (pdfToast = null)}>✕</button>
		</div>
	{/if}

	<div
		class="flex items-center justify-between p-3.5 rounded-xl border flex-wrap gap-3"
		style="background: var(--bg-panel); border-color: var(--border-panel); box-shadow: var(--shadow-card);"
	>
		<div class="flex items-center gap-2">
			<div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold" style="background: var(--pill-info-bg); color: var(--pill-info-text);">
				<Icon name="bolt" size={16} />
			</div>
			<div>
				<div class="text-xs font-bold" style="color: var(--text-main);">Kendali Cepat Brand Manager</div>
				<div class="text-[11px]" style="color: var(--text-muted);">Aksi cepat operasional &amp; koordinasi multi-outlet</div>
			</div>
		</div>

		<div class="flex items-center gap-2 flex-wrap">
			<a
				href="/inventory#transfer"
				class="btn-approve-direct text-xs py-2 px-3 font-semibold"
				style="background: var(--brand-primary); border-color: var(--brand-primary);"
			>
				<Icon name="arrow-right-arrow-left" size={14} />
				<span>Transfer Stok Gerai</span>
			</a>

			<a
				href="/menu#recipes"
				class="btn-approve-direct text-xs py-2 px-3 font-semibold"
				style="background: var(--brand-primary); border-color: var(--brand-primary);"
			>
				<Icon name="pencil-square" size={14} />
				<span>Kurasi Menu Lokal</span>
			</a>

			<a
				href="/petty-cash"
				class="dash-tab-btn text-xs py-2 px-3 font-semibold flex items-center gap-1.5"
			>
				<Icon name="banknotes" size={14} />
				<span>Audit Kas Gerai</span>
			</a>

			<button
				type="button"
				class="btn-approve-direct text-xs py-2 px-3 font-semibold"
				style="background: var(--bg-panel-sub); border: 1px solid var(--border-panel); color: var(--text-main);"
				onclick={handleDownloadReport}
				disabled={isDownloadingPdf}
			>
				<Icon name="arrow-down-tray" size={14} />
				<span>{isDownloadingPdf ? 'Menyiapkan...' : 'Unduh Ringkasan (PDF)'}</span>
			</button>
		</div>
	</div>
</div>
