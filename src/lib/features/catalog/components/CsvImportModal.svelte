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

	function downloadTemplateCsv() {
		const headers = ['Nama', 'SKU', 'Kategori', 'Satuan', 'Harga_Referensi', 'Suhu_Penyimpanan', 'Boleh_Beli_Luar', 'Bahan_Olahan'];
		const sampleRows = [
			['"Biji Kopi House Blend 1kg"', 'KOP-HBL-01', 'cat-coffee', 'kg', '185000', 'room_temp', 'TRUE', 'FALSE'],
			['"Susu UHT Fresh Full Cream 1L"', 'SSU-UHT-01', 'cat-milk', 'l', '21000', 'chilled', 'TRUE', 'FALSE'],
			['"Sirup Vanilla Gourmet 750ml"', 'SRP-VAN-01', 'cat-syrup', 'ml', '145000', 'room_temp', 'TRUE', 'FALSE'],
			['"Bubuk Matcha Ceremonial 500g"', 'BBK-MTC-01', 'cat-powder', 'g', '275000', 'room_temp', 'TRUE', 'FALSE'],
			['"Daun Teh Earl Grey Premium"', 'TEH-EGY-01', 'cat-tea', 'g', '95000', 'room_temp', 'TRUE', 'FALSE'],
			['"Grass Jelly Grass Grass 1kg"', 'TPG-GRL-01', 'cat-topping', 'kg', '38000', 'chilled', 'TRUE', 'FALSE'],
			['"Paper Cup Hot 8oz Kraft"', 'KMS-CUP-08', 'cat-packaging', 'pcs', '850', 'room_temp', 'FALSE', 'FALSE'],
			['"Espresso Base Olahan 2L"', 'OLH-ESP-2L', 'cat-coffee', 'l', '90000', 'chilled', 'FALSE', 'TRUE']
		];
		const csvContent = [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'template_master_bahan_baku.csv';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}
</script>

<Modal
	{open}
	title="Wizard Impor CSV Master Bahan Baku"
	subtitle="Impor massal bahan baku dengan pemetaan kolom dan validasi ketat"
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
						<div class="mt-3 flex items-center justify-center">
							<button
								type="button"
								class="btn btn-secondary text-xs"
								style="min-height: 34px; padding: 6px 14px; gap: 8px;"
								onclick={downloadTemplateCsv}
								id="btn-download-csv-template"
							>
								<Icon name="arrow-down-tray" size={14} />
								<span>Unduh Template CSV (.csv)</span>
							</button>
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
						<span class="notice-title">Prinsip Komit Atomik</span>
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
