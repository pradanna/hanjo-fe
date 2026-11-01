<script lang="ts">
	import { page } from '$app/state';
	import ComingSoon from '#lib/components/feedback/ComingSoon.svelte';
</script>

<div class="error-page-wrapper">
	{#if page.status === 404}
		<ComingSoon
			title="Modul Segera Hadir"
			milestone="Tahap Milestone Lanjutan"
			targetModule={page.url.pathname.replace(/^\//, '') || 'Fitur ERP'}
			description="Halaman atau fitur ini sedang dalam persiapan pengembangan pada siklus milestone berikutnya. Konteks filter Anda tetap tersimpan."
			backUrl="/"
		/>
	{:else}
		<div class="error-card">
			<div class="status-code">{page.status || 500}</div>
			<h1 class="error-title">
				Terjadi Kesalahan pada Sistem
			</h1>
			<p class="error-desc">
				{#if page.error?.message}
					{page.error.message}
				{:else}
					Terjadi gangguan internal saat memproses permintaan Anda. Silakan coba beberapa saat lagi.
				{/if}
			</p>

			<div class="actions">
				<a href="/" class="btn-home">
					Kembali ke Beranda
				</a>
			</div>
		</div>
	{/if}
</div>

<style>
	.error-page-wrapper {
		min-height: 80vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}

	.error-card {
		max-width: 480px;
		background: var(--bg-panel, #ffffff);
		border: 1px solid var(--border-panel, #e2e8f0);
		border-radius: var(--radius-xl, 12px);
		padding: 40px 32px;
		text-align: center;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}

	.status-code {
		font-size: 72px;
		font-weight: 900;
		color: var(--brand-primary, #059669);
		line-height: 1;
		font-family: var(--font-heading, sans-serif);
	}

	.error-title {
		font-size: 20px;
		font-weight: 700;
		color: var(--text-main, #0f172a);
		margin: 0;
	}

	.error-desc {
		font-size: 13.5px;
		color: var(--text-muted, #475569);
		line-height: 1.5;
		margin: 0;
	}

	.actions {
		margin-top: 8px;
		width: 100%;
	}

	.btn-home {
		display: inline-block;
		padding: 10px 24px;
		background: var(--brand-primary, #059669);
		color: #ffffff;
		border-radius: var(--radius-md, 8px);
		font-weight: 600;
		font-size: 13.5px;
		text-decoration: none;
		transition: background-color 0.15s;
	}

	.btn-home:hover {
		background-color: var(--brand-primary-hover, #047857);
	}
</style>
