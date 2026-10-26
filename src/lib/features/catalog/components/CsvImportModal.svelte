<script lang="ts">
	/**
	 * Wizard Modal: Impor CSV Master Bahan Baku (T-03.7 & AC-03.4)
	 * Mengikuti alur: Upload -> Mapping -> Validasi/Pratinjau -> Unduh Galat -> Komit Atomik
	 * Mengikuti Golden Rule 10 (Tokens), Golden Rule 14 (Padding Proporsional & Anti-Sesak).
	 */
	import Modal from '#lib/components/feedback/Modal.svelte';
	import Icon from '#lib/components/data/Icon.svelte';
	import Button from '#lib/components/forms/Button.svelte';
	import type { CsvImportPreview, CsvImportCommitResult } from '#lib/api/contract/types.js';

	interface Props {
		open: boolean;
		step: 'upload' | 'mapping' | 'preview' | 'success';
		preview: CsvImportPreview | null;
		commitResult: CsvImportCommitResult | null;
		isLoading: boolean;
		onclose: () => void;
		onrunpreview: () => Promise<void>;
		onruncommit: () => Promise<void>;
		ondownloaderrors: () => void;
	}

	let {
		open,
		step = 'upload',
		preview,
		commitResult,
		isLoading,
		onclose,
		onrunpreview,
		onruncommit,
		ondownloaderrors
	}: Props = $props();

	let fileName = $state('katalog_bahan_baku_2026.csv');
</script>

<Modal
	{open}
	title="Wizard Impor CSV Master Bahan Baku"
	subtitle="Impor massal bahan baku dengan pemetaan kolom dan validasi ketat (AC-03.4)"
	maxWidth="820px"
	{onclose}
>
	<div class="wizard-container">
		<!-- Step Wizard Bar -->
		<div class="wizard-stepper">
			<div class="step-item {step === 'upload' ? 'active' : (step === 'preview' || step === 'success') ? 'completed' : ''}">
				<div class="step-badge">
					{#if step === 'preview' || step === 'success'}
						<Icon name="check" size={14} />
					{:else}
						1
					{/if}
				</div>
				<div class="step-label-group">
					<span class="step-number-sub">Langkah 1</span>
					<span class="step-title">Unggah CSV</span>
				</div>
			</div>

			<div class="step-connector {step === 'preview' || step === 'success' ? 'active' : ''}"></div>

			<div class="step-item {step === 'preview' ? 'active' : step === 'success' ? 'completed' : ''}">
				<div class="step-badge">
					{#if step === 'success'}
						<Icon name="check" size={14} />
					{:else}
						2
					{/if}
				</div>
				<div class="step-label-group">
					<span class="step-number-sub">Langkah 2</span>
					<span class="step-title">Validasi &amp; Pratinjau</span>
				</div>
			</div>

			<div class="step-connector {step === 'success' ? 'active' : ''}"></div>

			<div class="step-item {step === 'success' ? 'active' : ''}">
				<div class="step-badge">3</div>
				<div class="step-label-group">
					<span class="step-number-sub">Langkah 3</span>
					<span class="step-title">Selesai</span>
				</div>
			</div>
		</div>

		<!-- STEP 1: UNGGAH FILE & PEMETAAN -->
		{#if step === 'upload'}
			<div class="step-content-stack">
				<div class="dropzone-box">
					<div class="dropzone-icon-box">
						<Icon name="document-arrow-up" size={28} />
					</div>
					<div class="dropzone-text-group">
						<h4 class="dropzone-title">Pilih atau Tarik Berkas CSV ke Sini</h4>
						<p class="dropzone-sub">
							Format susunan kolom standar yang didukung untuk master bahan baku:
						</p>
						<div class="supported-columns-pills">
							<span class="col-pill">Nama</span>
							<span class="col-pill">SKU/Kode</span>
							<span class="col-pill">Kategori</span>
							<span class="col-pill">Satuan</span>
							<span class="col-pill">Harga_Referensi</span>
						</div>
					</div>

					<div class="loaded-file-chip">
						<div class="file-chip-left">
							<div class="file-icon-box">
								<Icon name="document-text" size={18} />
							</div>
							<div class="file-chip-info">
								<span class="file-chip-name">{fileName}</span>
								<span class="file-chip-meta">CSV Spreadsheet &bull; Siap divalidasi</span>
							</div>
						</div>
						<span class="file-chip-badge">
							<Icon name="check-circle" size={13} />
							<span>200 Baris Data</span>
						</span>
					</div>
				</div>

				<!-- Demo Data Callout Card -->
				<div class="demo-data-card">
					<div class="demo-card-content">
						<div class="demo-icon-box">
							<Icon name="sparkles" size={18} />
						</div>
						<div class="demo-text-group">
							<span class="demo-title">Simulasi Data Pengujian (Demo)</span>
							<p class="demo-desc">
								Ingin mencoba validasi berkas contoh dengan <strong>200 baris bahan</strong> dan <strong>5 skenario galat uji</strong>?
							</p>
						</div>
					</div>
					<Button
						variant="secondary"
						size="sm"
						onclick={onrunpreview}
						disabled={isLoading}
					>
						<Icon name="arrow-path" size={14} />
						<span>Muat Demo Data</span>
					</Button>
				</div>
			</div>

		<!-- STEP 2: PRATINJAU & VALIDASI (AC-03.4) -->
		{:else if step === 'preview' && preview}
			<div class="step-content-stack">
				<!-- KPI Ringkasan Validasi -->
				<div class="kpi-grid-three">
					<div class="kpi-card">
						<div class="kpi-card-header">
							<span class="kpi-card-label">Total Baris CSV</span>
							<Icon name="document-text" size={16} class="text-[var(--text-subtle)]" />
						</div>
						<strong class="kpi-card-value font-mono">{preview.total_rows}</strong>
						<span class="kpi-card-sub">Baris terdeteksi</span>
					</div>

					<div class="kpi-card valid">
						<div class="kpi-card-header">
							<span class="kpi-card-label">Baris Valid</span>
							<Icon name="check-circle" size={16} class="text-emerald-400" />
						</div>
						<strong class="kpi-card-value font-mono text-emerald-400">{preview.valid_rows}</strong>
						<span class="kpi-card-sub text-emerald-300/80">Siap dikomit ke katalog</span>
					</div>

					<div class="kpi-card error">
						<div class="kpi-card-header">
							<span class="kpi-card-label">Baris Galat</span>
							<Icon name="exclamation-circle" size={16} class="text-rose-400" />
						</div>
						<strong class="kpi-card-value font-mono text-rose-400">{preview.error_rows}</strong>
						<span class="kpi-card-sub text-rose-300/80">Wajib diperbaiki / dilewati</span>
					</div>
				</div>

				<!-- Daftar Galat & Tombol Unduh Galat (AC-03.4) -->
				{#if preview.errors.length > 0}
					<div class="errors-panel">
						<div class="errors-panel-header">
							<h4 class="errors-panel-title">
								<Icon name="exclamation-circle" size={16} />
								<span>Daftar {preview.errors.length} Baris Galat Terdeteksi:</span>
							</h4>
							<Button
								variant="secondary"
								size="sm"
								onclick={ondownloaderrors}
							>
								<Icon name="arrow-down-tray" size={14} />
								<span>Unduh Baris Galat (.csv)</span>
							</Button>
						</div>

						<div class="data-table-container error-table-wrap">
							<table class="data-table">
								<thead>
									<tr>
										<th>Baris</th>
										<th>Kolom</th>
										<th>Pesan Galat</th>
										<th>Data Input Mentah</th>
									</tr>
								</thead>
								<tbody>
									{#each preview.errors as err}
										<tr>
											<td class="font-mono font-bold text-rose-400">#{err.row_number}</td>
											<td class="font-mono text-xs">{err.field}</td>
											<td class="text-xs text-rose-300">{err.message}</td>
											<td class="font-mono text-[11px] text-[var(--text-subtle)]">
												{JSON.stringify(err.raw_data)}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}

				<!-- Callout Komit Atomik -->
				<div class="atomic-notice-card">
					<div class="notice-icon">
						<Icon name="information-circle" size={20} />
					</div>
					<div class="notice-text">
						<span class="notice-title">Prinsip Komit Atomik (AC-03.4)</span>
						<p class="notice-desc">
							Hanya <strong>{preview.valid_rows} baris valid</strong> yang akan disimpan ke katalog master. Sebanyak <strong>{preview.error_rows} baris galat</strong> akan dilewati secara aman dan dapat Anda unduh untuk diperbaiki.
						</p>
					</div>
				</div>
			</div>

		<!-- STEP 3: SUKSES KOMIT -->
		{:else if step === 'success' && commitResult}
			<div class="success-panel">
				<div class="success-icon-box">
					<Icon name="check-circle" size={36} />
				</div>
				<h3 class="success-title">Impor Bahan Berhasil Dikomit!</h3>
				<p class="success-desc">
					{commitResult.message}
				</p>
				<div class="success-stats-grid">
					<div class="stat-card">
						<span class="stat-label">Dibuat Baru</span>
						<strong class="stat-value text-emerald-400">{commitResult.created_count}</strong>
					</div>
					<div class="stat-card">
						<span class="stat-label">Diperbarui</span>
						<strong class="stat-value text-blue-400">{commitResult.updated_count}</strong>
					</div>
					<div class="stat-card">
						<span class="stat-label">Dilewati / Galat</span>
						<strong class="stat-value text-amber-400">{commitResult.skipped_count}</strong>
					</div>
				</div>
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<div class="wizard-footer-bar">
			<div>
				{#if step === 'preview' && preview && preview.errors.length > 0}
					<Button
						variant="secondary"
						size="sm"
						onclick={ondownloaderrors}
					>
						<Icon name="arrow-down-tray" size={14} />
						<span>Unduh Baris Galat (.csv)</span>
					</Button>
				{/if}
			</div>

			<div class="flex items-center gap-3">
				<Button
					variant="secondary"
					onclick={onclose}
					disabled={isLoading}
				>
					{step === 'success' ? 'Tutup' : 'Batal'}
				</Button>

				{#if step === 'upload'}
					<Button
						variant="primary"
						onclick={onrunpreview}
						loading={isLoading}
					>
						<Icon name="arrow-right" size={16} />
						<span>Validasi &amp; Pratinjau</span>
					</Button>
				{:else if step === 'preview'}
					<Button
						variant="primary"
						onclick={onruncommit}
						loading={isLoading}
					>
						<Icon name="check" size={16} />
						<span>Komit {preview?.valid_rows || 0} Baris Valid</span>
					</Button>
				{:else if step === 'success'}
					<Button
						variant="primary"
						onclick={onclose}
					>
						<span>Selesai &amp; Buka Katalog</span>
					</Button>
				{/if}
			</div>
		</div>
	{/snippet}
</Modal>

<style>
	.wizard-container {
		display: flex;
		flex-direction: column;
		gap: 22px;
	}

	/* STEPPER BAR */
	.wizard-stepper {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 4px 6px 20px;
		border-bottom: 1px solid var(--border-panel, rgba(255, 255, 255, 0.08));
	}

	.step-item {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.step-badge {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 13px;
		font-weight: 700;
		flex-shrink: 0;
		background: var(--bg-panel-sub, #0f172a);
		border: 1.5px solid var(--border-panel, rgba(255, 255, 255, 0.12));
		color: var(--text-subtle, #64748b);
		transition: all 0.2s ease;
	}

	.step-item.active .step-badge {
		background: var(--color-primary, #10b981);
		color: #ffffff;
		border-color: var(--color-primary, #10b981);
		box-shadow: 0 0 16px rgba(16, 185, 129, 0.35);
	}

	.step-item.completed .step-badge {
		background: rgba(16, 185, 129, 0.15);
		color: #34d399;
		border-color: rgba(16, 185, 129, 0.4);
	}

	.step-label-group {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.step-number-sub {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		font-weight: 600;
		color: var(--text-subtle, #64748b);
	}

	.step-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-muted, #94a3b8);
		transition: color 0.15s ease;
	}

	.step-item.active .step-title {
		color: var(--text-main, #f8fafc);
		font-weight: 700;
	}

	.step-item.completed .step-title {
		color: var(--text-main, #f8fafc);
	}

	.step-connector {
		flex: 1;
		height: 2px;
		background: var(--border-panel, rgba(255, 255, 255, 0.08));
		margin: 0 8px;
		border-radius: 1px;
		transition: background 0.3s ease;
	}

	.step-connector.active {
		background: rgba(16, 185, 129, 0.45);
	}

	/* CONTENT STACK */
	.step-content-stack {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	/* DROPZONE BOX */
	.dropzone-box {
		border: 2px dashed rgba(255, 255, 255, 0.14);
		background: var(--bg-panel-sub, #0f172a);
		border-radius: var(--radius-xl, 14px);
		padding: 34px 28px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 18px;
		transition: border-color 0.2s ease, background 0.2s ease;
	}

	.dropzone-box:hover {
		border-color: rgba(16, 185, 129, 0.45);
		background: rgba(15, 23, 42, 0.85);
	}

	.dropzone-icon-box {
		width: 60px;
		height: 60px;
		border-radius: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(16, 185, 129, 0.05));
		border: 1px solid rgba(16, 185, 129, 0.25);
		color: #34d399;
	}

	.dropzone-text-group {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}

	.dropzone-title {
		font-size: 15px;
		font-weight: 700;
		color: var(--text-main, #f8fafc);
		margin: 0;
	}

	.dropzone-sub {
		font-size: 12px;
		color: var(--text-muted, #94a3b8);
		margin: 0;
	}

	.supported-columns-pills {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 4px;
	}

	.col-pill {
		font-family: monospace;
		font-size: 11px;
		padding: 4px 10px;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: var(--text-muted, #cbd5e1);
	}

	.loaded-file-chip {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 12px 18px;
		border-radius: 12px;
		background: var(--bg-panel, #1e293b);
		border: 1px solid var(--border-panel, rgba(255, 255, 255, 0.1));
		width: 100%;
		max-width: 480px;
		margin-top: 4px;
	}

	.file-chip-left {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
	}

	.file-icon-box {
		width: 34px;
		height: 34px;
		border-radius: 8px;
		background: rgba(16, 185, 129, 0.12);
		color: #34d399;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.file-chip-info {
		display: flex;
		flex-direction: column;
		text-align: left;
		gap: 1px;
		min-width: 0;
	}

	.file-chip-name {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--text-main, #f8fafc);
		font-family: monospace;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.file-chip-meta {
		font-size: 11px;
		color: var(--text-subtle, #64748b);
	}

	.file-chip-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 12px;
		border-radius: 9999px;
		background: rgba(16, 185, 129, 0.12);
		border: 1px solid rgba(16, 185, 129, 0.25);
		color: #34d399;
		font-size: 11px;
		font-weight: 600;
		font-family: monospace;
		white-space: nowrap;
	}

	/* DEMO DATA CARD */
	.demo-data-card {
		padding: 16px 20px;
		border-radius: var(--radius-lg, 12px);
		background: rgba(15, 23, 42, 0.65);
		border: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
	}

	.demo-card-content {
		display: flex;
		align-items: center;
		gap: 14px;
		min-width: 0;
	}

	.demo-icon-box {
		width: 38px;
		height: 38px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(56, 189, 248, 0.12);
		border: 1px solid rgba(56, 189, 248, 0.25);
		color: #38bdf8;
		flex-shrink: 0;
	}

	.demo-text-group {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.demo-title {
		font-size: 13px;
		font-weight: 700;
		color: var(--text-main, #f8fafc);
	}

	.demo-desc {
		font-size: 12px;
		color: var(--text-muted, #94a3b8);
		margin: 0;
		line-height: 1.4;
	}

	/* STEP 2: KPI GRID */
	.kpi-grid-three {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	.kpi-card {
		padding: 16px 20px;
		border-radius: 12px;
		background: var(--bg-panel-sub, #0f172a);
		border: 1px solid var(--border-panel, rgba(255, 255, 255, 0.08));
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.kpi-card.valid {
		background: rgba(16, 185, 129, 0.08);
		border-color: rgba(16, 185, 129, 0.25);
	}

	.kpi-card.error {
		background: rgba(244, 63, 94, 0.08);
		border-color: rgba(244, 63, 94, 0.25);
	}

	.kpi-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.kpi-card-label {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		font-weight: 600;
		color: var(--text-subtle, #64748b);
	}

	.kpi-card-value {
		font-size: 24px;
		font-weight: 700;
		color: var(--text-main, #f8fafc);
		margin-top: 2px;
	}

	.kpi-card-sub {
		font-size: 11px;
		color: var(--text-subtle, #64748b);
	}

	/* STEP 2: ERRORS PANEL */
	.errors-panel {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.errors-panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.errors-panel-title {
		font-size: 13px;
		font-weight: 700;
		color: #f43f5e;
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
	}

	.error-table-wrap {
		max-height: 220px;
		overflow-y: auto;
		border: 1px solid var(--border-panel, rgba(255, 255, 255, 0.08));
		border-radius: 10px;
	}

	/* STEP 2: ATOMIC NOTICE CARD */
	.atomic-notice-card {
		padding: 16px 20px;
		border-radius: 12px;
		background: rgba(56, 189, 248, 0.08);
		border: 1px solid rgba(56, 189, 248, 0.2);
		display: flex;
		align-items: flex-start;
		gap: 14px;
	}

	.notice-icon {
		color: #38bdf8;
		margin-top: 1px;
		flex-shrink: 0;
	}

	.notice-text {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.notice-title {
		font-size: 12.5px;
		font-weight: 700;
		color: var(--text-main, #f8fafc);
	}

	.notice-desc {
		font-size: 12px;
		color: var(--text-muted, #94a3b8);
		margin: 0;
		line-height: 1.5;
	}

	/* STEP 3: SUCCESS PANEL */
	.success-panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 36px 20px;
		gap: 14px;
	}

	.success-icon-box {
		width: 68px;
		height: 68px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(16, 185, 129, 0.15);
		border: 1.5px solid rgba(16, 185, 129, 0.4);
		color: #34d399;
		box-shadow: 0 0 24px rgba(16, 185, 129, 0.25);
	}

	.success-title {
		font-size: 18px;
		font-weight: 700;
		color: var(--text-main, #f8fafc);
		margin: 0;
	}

	.success-desc {
		font-size: 12.5px;
		color: var(--text-muted, #94a3b8);
		max-width: 480px;
		margin: 0;
		line-height: 1.5;
	}

	.success-stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
		width: 100%;
		max-width: 520px;
		margin-top: 12px;
	}

	.stat-card {
		padding: 14px 16px;
		border-radius: 12px;
		background: var(--bg-panel-sub, #0f172a);
		border: 1px solid var(--border-panel, rgba(255, 255, 255, 0.08));
		display: flex;
		flex-direction: column;
		gap: 3px;
		text-align: center;
	}

	.stat-label {
		font-size: 11px;
		color: var(--text-subtle, #64748b);
	}

	.stat-value {
		font-size: 18px;
		font-weight: 700;
		font-family: monospace;
	}

	/* FOOTER BAR */
	.wizard-footer-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}
</style>
