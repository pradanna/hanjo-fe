<script lang="ts">
	import { formatRupiah } from '#lib/api/client';

	let activeReportType = $state<'PL' | 'STOCK' | 'TAX'>('PL');
	let selectedPeriod = $state('Oktober 2026');

	// Report 1: Laba Kotor per Outlet (PRD 8.3)
	const plReportData = [
		{
			outlet: 'Senopati Flagship (Milik Sendiri)',
			omzet: 124500000,
			cogsProvisional: 38595000,
			trueUpAdjustment: -450000, // Selisih nota aktual lebih murah
			cogsFinal: 38145000,
			grossProfit: 86355000,
			marginPct: 69.4,
			status: 'TRUE_UP_PARTIAL',
			pendingInvoices: 1
		},
		{
			outlet: 'Cabang BSD GOP 9 (Milik Sendiri)',
			omzet: 68200000,
			cogsProvisional: 21824000,
			trueUpAdjustment: 0,
			cogsFinal: 21824000,
			grossProfit: 46376000,
			marginPct: 68.0,
			status: 'TRUE_UP_FINAL',
			pendingInvoices: 0
		},
		{
			outlet: 'Cabang Kemang (Mitra Franchise)',
			omzet: 34100000,
			cogsProvisional: 11253000,
			trueUpAdjustment: 0,
			cogsFinal: 11253000,
			grossProfit: 22847000,
			marginPct: 67.0,
			status: 'TRUE_UP_FINAL',
			pendingInvoices: 0
		}
	];

	// Report 2: Tax Recap (PRD 6.11)
	const taxRecapData = [
		{
			taxCode: 'PBJT-1',
			taxName: 'Pajak Barang & Jasa Tertentu (Makanan & Minuman 10%)',
			baseDpp: 226800000,
			taxRate: '10%',
			taxAmount: 22680000,
			category: 'Pajak Keluaran (Penjualan POS)'
		},
		{
			taxCode: 'PPN-IN',
			taxName: 'PPN Masukan Supplier Bahan Baku (Faktur Pajak)',
			baseDpp: 64500000,
			taxRate: '11%',
			taxAmount: 7095000,
			category: 'Pajak Masukan (Pembelian)'
		}
	];

	function handleExport(format: string) {
		alert(`Mengunduh laporan dalam format ${format.toUpperCase()}...`);
	}
</script>

<svelte:head>
	<title>Laporan Keuangan & Stok Eksekutif | HANJO ERP</title>
</svelte:head>

<div class="reports-page">
	<!-- Page Header -->
	<div class="page-head-row">
		<div>
			<h1 class="page-title">Pusat Laporan & Analitik (Reports)</h1>
			<p class="page-subtitle">
				Laporan laba kotor per outlet dengan status True-Up, audit mutasi stok, dan rekapitulasi perpajakan (PRD 8.3).
			</p>
		</div>

		<div class="export-btn-group">
			<button class="btn btn-secondary btn-sm" onclick={() => handleExport('csv')}>Ekspor CSV</button>
			<button class="btn btn-secondary btn-sm" onclick={() => handleExport('xlsx')}>Ekspor Excel (XLSX)</button>
			<button class="btn btn-primary btn-sm" onclick={() => handleExport('pdf')}>Cetak PDF Resmi</button>
		</div>
	</div>

	<!-- Report Type Selector -->
	<div class="panel-card type-selector-card">
		<div class="selector-pills">
			<button class="selector-pill" class:active={activeReportType === 'PL'} onclick={() => (activeReportType = 'PL')}>
				Laba Kotor & Margin Outlet (True-Up P&L)
			</button>
			<button class="selector-pill" class:active={activeReportType === 'TAX'} onclick={() => (activeReportType = 'TAX')}>
				Rekapitulasi Pajak (PPN, PPh, PBJT)
			</button>
		</div>

		<div class="period-select-col">
			<span class="text-subtle text-xs">Periode:</span>
			<select class="period-select" bind:value={selectedPeriod}>
				<option value="Oktober 2026">Oktober 2026 (Periode Berjalan)</option>
				<option value="September 2026">September 2026 (Periode Tertutup)</option>
			</select>
		</div>
	</div>

	<!-- Report Content: P&L per Outlet -->
	{#if activeReportType === 'PL'}
		<div class="panel-card report-box">
			<div class="report-box-head">
				<div>
					<h3 class="box-title">Laporan Laba Kotor Multi-Outlet ({selectedPeriod})</h3>
					<span class="box-sub">
						HPP bahan mencerminkan True-Up HPP otomatis setelah nota resmi pemasok diverifikasi Finance.
					</span>
				</div>
			</div>

			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>Outlet</th>
							<th class="text-right">Omzet Penjualan</th>
							<th class="text-right">HPP Sementara</th>
							<th class="text-right">Koreksi True-Up</th>
							<th class="text-right">HPP Bahan Final</th>
							<th class="text-right">Laba Kotor</th>
							<th class="text-right">Margin %</th>
							<th>Status Audit</th>
						</tr>
					</thead>
					<tbody>
						{#each plReportData as row}
							<tr>
								<td class="font-bold">{row.outlet}</td>
								<td class="text-right font-mono font-bold">{formatRupiah(row.omzet)}</td>
								<td class="text-right font-mono text-muted">{formatRupiah(row.cogsProvisional)}</td>
								<td class="text-right font-mono" class:text-success={row.trueUpAdjustment < 0}>
									{row.trueUpAdjustment < 0 ? formatRupiah(row.trueUpAdjustment) : '-'}
								</td>
								<td class="text-right font-mono font-bold">{formatRupiah(row.cogsFinal)}</td>
								<td class="text-right font-mono font-bold text-success">{formatRupiah(row.grossProfit)}</td>
								<td class="text-right font-bold">{row.marginPct}%</td>
								<td>
									{#if row.status === 'TRUE_UP_PARTIAL'}
										<span class="pill-badge pill-warning">Estimasi · {row.pendingInvoices} Nota Tertunda</span>
									{:else}
										<span class="pill-badge pill-success">True-Up Final</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- Report Content: Tax Recap -->
	{#if activeReportType === 'TAX'}
		<div class="panel-card report-box">
			<div class="report-box-head">
				<div>
					<h3 class="box-title">Rekapitulasi Pajak & Bukti Potong ({selectedPeriod})</h3>
					<span class="box-sub">
						Dasar Pengenaan Pajak (DPP) dan perhitungan pajak atas penjualan POS serta nota pembelian pemasok (PRD 6.11).
					</span>
				</div>
			</div>

			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>Kode Pajak</th>
							<th>Nama Jenis Pajak</th>
							<th>Kategori</th>
							<th class="text-right">Dasar Pengenaan (DPP)</th>
							<th>Tarif</th>
							<th class="text-right">Nilai Pajak (IDR)</th>
						</tr>
					</thead>
					<tbody>
						{#each taxRecapData as tax}
							<tr>
								<td class="font-mono font-bold">{tax.taxCode}</td>
								<td>{tax.taxName}</td>
								<td>
									<span class="category-pill">{tax.category}</span>
								</td>
								<td class="text-right font-mono font-bold">{formatRupiah(tax.baseDpp)}</td>
								<td class="font-bold">{tax.taxRate}</td>
								<td class="text-right font-mono font-bold text-primary">{formatRupiah(tax.taxAmount)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<style>
	.reports-page {
		display: flex;
		flex-direction: column;
		gap: 20px;
		width: 100%;
	}

	.page-head-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 16px;
	}

	.page-title {
		font-size: 22px;
		font-weight: 800;
		color: var(--text-main);
	}

	.page-subtitle {
		font-size: 13px;
		color: var(--text-muted);
		margin-top: 4px;
	}

	.export-btn-group {
		display: flex;
		gap: 8px;
	}

	/* Type Selector */
	.type-selector-card {
		padding: 10px 16px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px;
	}

	.selector-pills {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.selector-pill {
		padding: 8px 16px;
		border-radius: var(--radius-sm);
		font-size: 12.5px;
		font-weight: 600;
		color: var(--text-muted);
		border: 1px solid transparent;
		transition: all 0.15s;
	}

	.selector-pill.active {
		background: var(--pill-success-bg, rgba(16, 185, 129, 0.14));
		color: var(--pill-success-text, #34d399);
		border: 1px solid var(--pill-success-border, rgba(16, 185, 129, 0.35));
		box-shadow: 0 2px 10px rgba(16, 185, 129, 0.15);
	}

	.period-select-col {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.period-select {
		padding: 6px 12px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-panel);
		font-size: 12px;
		background: var(--bg-panel-sub);
		outline: none;
	}

	/* Report Box */
	.report-box {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.report-box-head {
		border-bottom: 1px solid var(--border-panel);
		padding-bottom: 12px;
	}

	.box-title {
		font-size: 16px;
		font-weight: 700;
	}

	.box-sub {
		font-size: 12px;
		color: var(--text-muted);
	}

	/* Table */
	.table-wrap {
		overflow-x: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12.5px;
	}

	.data-table th {
		text-align: left;
		padding: 11px 14px;
		font-weight: 600;
		color: var(--text-subtle);
		background: var(--bg-panel-sub);
		border-bottom: 1px solid var(--border-panel);
		font-size: 11.5px;
	}

	.data-table td {
		padding: 12px 14px;
		border-bottom: 1px solid var(--border-panel);
		color: var(--text-main);
	}

	.category-pill {
		font-size: 11.5px;
		background: var(--bg-panel-sub);
		padding: 2px 8px;
		border-radius: 4px;
	}

	.text-right {
		text-align: right;
	}

	.font-bold {
		font-weight: 700;
	}

	.font-mono {
		font-family: monospace;
	}

	.text-muted {
		color: var(--text-muted);
	}

	.text-subtle {
		color: var(--text-subtle);
	}

	.text-success {
		color: var(--brand-primary);
	}

	.text-primary {
		color: var(--brand-primary);
	}

	.text-xs {
		font-size: 11px;
	}

	.btn-sm {
		padding: 6px 12px;
		font-size: 12px;
	}
</style>
