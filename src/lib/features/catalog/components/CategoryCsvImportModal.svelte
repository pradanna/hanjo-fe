<script lang="ts">
	/**
	 * Wizard Modal: Impor CSV Master Kategori Bahan
	 * Mengikuti alur: Upload -> Validasi/Pratinjau -> Unduh Galat -> Komit Atomik
	 * Mengikuti Golden Rule 10 (Tokens), Golden Rule 14 (Padding Proporsional & Anti-Sesak).
	 */
	import Modal from '#lib/components/feedback/Modal.svelte';
	import Icon from '#lib/components/data/Icon.svelte';
	import Button from '#lib/components/forms/Button.svelte';
	import CodeBadge from '#lib/components/data/CodeBadge.svelte';
	import type { CategoryCsvImportPreview, CsvImportCommitResult } from '#lib/api/contract/types.js';

	interface Props {
		open: boolean;
		step: 'upload' | 'preview' | 'success';
		preview: CategoryCsvImportPreview | null;
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

	let fileName = $state('katalog_kategori_bahan_2026.csv');

	function downloadCategoryTemplateCsv() {
		const headers = ['Nama', 'Kode', 'Deskripsi'];
		const sampleRows = [
			['"Kopi & Espresso"', 'CAT-KOP', '"Seluruh varian biji kopi house blend, single origin, dan konsentrat"'],
			['"Susu & Dairy"', 'CAT-SSU', '"Susu murni segar, UHT, evaporated, creamer, dan oat milk"'],
			['"Sirup & Pemanis"', 'CAT-SRP', '"Sirup aneka rasa premium dan gula cair/aren"'],
			['"Teh & Tisane"', 'CAT-TEH', '"Daun teh artisan, teh melati, earl grey, dan teh herbal"'],
			['"Bubuk & Premix"', 'CAT-BBK', '"Bubuk cokelat, matcha, taro, red velvet, dan premix minuman"'],
			['"Topping & Jelly"', 'CAT-TPG', '"Grass jelly, boba, pudding, keju parut, dan whip cream"'],
			['"Kemasan & Cup"', 'CAT-KMS', '"Gelas kertas/plastik, tutup cup, sedotan, dan kantong take away"']
		];
		const csvContent = [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'template_kategori_bahan.csv';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}
</script>

<Modal
	{open}
	title="Wizard Impor CSV Master Kategori"
	subtitle="Impor massal grup klasifikasi bahan baku dengan validasi kode dan format ketat"
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
							Format susunan kolom standar yang didukung untuk master kategori:
						</p>
						<div class="supported-columns-pills">
							<span class="col-pill">Nama</span>
							<span class="col-pill">Kode</span>
							<span class="col-pill">Deskripsi</span>
						</div>
						<div class="mt-3 flex items-center justify-center">
							<button
								type="button"
								class="btn btn-secondary text-xs"
								style="min-height: 34px; padding: 6px 14px; gap: 8px;"
								onclick={downloadCategoryTemplateCsv}
								id="btn-download-cat-csv-template"
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
							<span>10 Baris Data</span>
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
								Ingin mencoba validasi berkas contoh dengan <strong>10 baris kategori</strong> dan <strong>1 skenario galat uji</strong>?
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

		<!-- STEP 2: PRATINJAU & VALIDASI -->
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
						<span class="kpi-card-sub text-emerald-300/80">Siap dikomit ke master</span>
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

				<!-- Daftar Galat & Tombol Unduh Galat -->
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

						<div class="errors-list">
							{#each preview.errors as err}
								<div class="error-item">
									<div class="error-badge">Baris {err.row_number}</div>
									<div class="error-details">
										<span class="error-field font-mono font-semibold">{err.field}:</span>
										<span class="error-msg">{err.message}</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Pratinjau Kategori Baru yang Akan Dibuat -->
				{#if preview.categories_to_create.length > 0}
					<div class="preview-section">
						<h4 class="preview-section-title">
							<span>Kategori Baru yang Akan Dibuat ({preview.categories_to_create.length})</span>
						</h4>
						<div class="data-table-container">
							<table class="data-table">
								<thead>
									<tr>
										<th>Baris</th>
										<th>Kode</th>
										<th>Nama Kategori</th>
										<th>Deskripsi</th>
									</tr>
								</thead>
								<tbody>
									{#each preview.categories_to_create as item}
										<tr>
											<td class="font-mono text-xs">{item.row_number}</td>
											<td><CodeBadge code={item.code} /></td>
											<td><strong class="text-[var(--text-main)]">{item.name}</strong></td>
											<td class="text-xs text-[var(--text-muted)]">{item.description}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}

				<!-- Pratinjau Kategori yang Akan Diperbarui -->
				{#if preview.categories_to_update.length > 0}
					<div class="preview-section">
						<h4 class="preview-section-title">
							<span>Kategori yang Akan Diperbarui ({preview.categories_to_update.length})</span>
						</h4>
						<div class="data-table-container">
							<table class="data-table">
								<thead>
									<tr>
										<th>Baris</th>
										<th>Kode</th>
										<th>Nama Kategori</th>
										<th>Deskripsi</th>
									</tr>
								</thead>
								<tbody>
									{#each preview.categories_to_update as item}
										<tr>
											<td class="font-mono text-xs">{item.row_number}</td>
											<td><CodeBadge code={item.code} /></td>
											<td><strong class="text-[var(--text-main)]">{item.name}</strong></td>
											<td class="text-xs text-[var(--text-muted)]">{item.description}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			</div>

		<!-- STEP 3: SUKSES KOMIT -->
		{:else if step === 'success' && commitResult}
			<div class="success-panel">
				<div class="success-icon-box">
					<Icon name="check-circle" size={36} />
				</div>
				<h3 class="success-title">Impor Kategori Berhasil Dikomit!</h3>
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
						loading={isLoading}
						onclick={onrunpreview}
						id="btn-validate-cat-csv"
					>
						<Icon name="arrow-right" size={16} />
						<span>Validasi &amp; Pratinjau</span>
					</Button>
				{:else if step === 'preview'}
					<Button
						variant="secondary"
						onclick={() => (step = 'upload')}
						disabled={isLoading}
					>
						<span>Kembali</span>
					</Button>
					<Button
						variant="primary"
						loading={isLoading}
						onclick={onruncommit}
						id="btn-commit-cat-csv"
					>
						<Icon name="check" size={16} />
						<span>Komit Data Valid ({preview?.valid_rows || 0})</span>
					</Button>
				{:else if step === 'success'}
					<Button
						variant="primary"
						onclick={onclose}
					>
						<span>Selesai &amp; Buka Kategori</span>
					</Button>
				{/if}
			</div>
		</div>
	{/snippet}
</Modal>
