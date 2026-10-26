<script lang="ts">
	import { formatRupiah } from '#lib/api/client';

	let activeTab = $state<'EXPENSES' | 'TOPUP' | 'RULES'>('EXPENSES');
	let showNewExpenseModal = $state(false);

	// Form State
	let formOutlet = $state('Senopati Flagship');
	let formCategory = $state('Perlengkapan Kebersihan');
	let formAmount = $state<number>(85000);
	let formDescription = $state('');
	let formReceiptAttached = $state(true);

	let expenseList = $state([
		{
			id: 'pc-1',
			trxNo: 'PC-SEN-20261013-001',
			outletName: 'Senopati Flagship',
			businessDate: '2026-10-13',
			category: 'Kebutuhan Operasional Non-Stok',
			amount: 65000,
			description: 'Isi ulang 3 galon air minum kru & sabun cuci food-grade',
			receiptUrl: 'nota-galon-01.jpg',
			tier: 'Tingkat 1 (Bebas Otorisasi)',
			status: 'POSTED_VERIFIED',
			requester: 'Budi Pratama (Manager)',
			verifiedBy: 'Finance Pusat (Sari)'
		},
		{
			id: 'pc-2',
			trxNo: 'PC-SEN-20261012-002',
			outletName: 'Senopati Flagship',
			businessDate: '2026-10-12',
			category: 'Maintenance & Perbaikan',
			amount: 350000, // > Rp 150.000
			description: 'Penggantian Seal Karet Steam Wand Mesin Espresso Sanremo',
			receiptUrl: 'nota-sanremo-seal.jpg',
			tier: 'Tingkat 2 (Perlu Persetujuan)',
			status: 'PENDING_APPROVAL',
			requester: 'Budi Pratama (Manager)',
			verifiedBy: '-'
		},
		{
			id: 'pc-3',
			trxNo: 'PC-BSD-20261012-001',
			outletName: 'Cabang BSD (GOP 9)',
			businessDate: '2026-10-12',
			category: 'Perlengkapan Kasir & ATK',
			amount: 95000,
			description: 'Pembelian 10 roll thermal paper struk kasir & spidol label cup',
			receiptUrl: 'nota-thermal-paper.jpg',
			tier: 'Tingkat 1 (Bebas Otorisasi)',
			status: 'POSTED_VERIFIED',
			requester: 'Siti Aminah (Supervisor)',
			verifiedBy: 'Finance Pusat (Sari)'
		}
	]);

	function submitExpense() {
		if (formAmount > 0 && formDescription.trim()) {
			const tier =
				formAmount <= 150000
					? 'Tingkat 1 (Bebas Otorisasi)'
					: formAmount <= 500000
						? 'Tingkat 2 (Perlu Persetujuan)'
						: 'Tingkat 3 (Otorisasi Owner)';
			const status = formAmount <= 150000 ? 'POSTED_VERIFIED' : 'PENDING_APPROVAL';

			expenseList.unshift({
				id: `pc-${Date.now()}`,
				trxNo: `PC-SEN-${Date.now().toString().slice(-6)}`,
				outletName: formOutlet,
				businessDate: '2026-10-13',
				category: formCategory,
				amount: formAmount,
				description: formDescription,
				receiptUrl: 'foto-nota-terlampir.jpg',
				tier,
				status,
				requester: 'Budi Pratama (Manager)',
				verifiedBy: '-'
			});

			showNewExpenseModal = false;
			formDescription = '';
		}
	}
</script>

<svelte:head>
	<title>Biaya & Kas Kecil Bertingkat | HANJO ERP</title>
</svelte:head>

<div class="petty-cash-page">
	<!-- Page Header -->
	<div class="page-head-row">
		<div>
			<h1 class="page-title">Biaya Outlet & Kas Kecil Bertingkat</h1>
			<p class="page-subtitle">
				Pengelolaan dana kas kecil per outlet untuk belanja kebutuhan non-stok dengan kontrol batas harian dan approval berjenjang (PRD 6.9).
			</p>
		</div>

		<div class="head-actions">
			<button class="btn btn-primary" onclick={() => (showNewExpenseModal = true)}>
				<span>+ Catat Pengeluaran Kas Kecil</span>
			</button>
		</div>
	</div>

	<!-- Outlet Balance KPI Cards -->
	<div class="balance-cards-grid">
		<div class="panel-card balance-card">
			<div class="balance-top">
				<span class="text-subtle text-xs">Saldo Kas Kecil Senopati Flagship</span>
				<span class="pill-badge pill-success">Normal</span>
			</div>
			<div class="balance-val font-mono">Rp 850.000</div>
			<div class="balance-sub">
				<span>Pagu (Float): Rp 1.500.000</span>
				<span>•</span>
				<span>Terpakai Hari Ini: Rp 65.000</span>
			</div>
		</div>

		<div class="panel-card balance-card">
			<div class="balance-top">
				<span class="text-subtle text-xs">Saldo Kas Kecil Cabang BSD (GOP 9)</span>
				<span class="pill-badge pill-success">Normal</span>
			</div>
			<div class="balance-val font-mono">Rp 635.000</div>
			<div class="balance-sub">
				<span>Pagu (Float): Rp 1.000.000</span>
				<span>•</span>
				<span>Terpakai Hari Ini: Rp 0</span>
			</div>
		</div>

		<div class="panel-card balance-card">
			<div class="balance-top">
				<span class="text-subtle text-xs">Batas Aturan Persetujuan (Thresholds)</span>
				<span class="pill-badge pill-info">Konfigurasi DB</span>
			</div>
			<div class="thresholds-mini">
				<div>Batas Bebas: <strong>≤ Rp 150.000</strong></div>
				<div>Batas Besar: <strong>> Rp 500.000</strong> (Wajib Owner)</div>
				<div>Akumulasi Harian: <strong>Maks Rp 1.000.000 / hari</strong></div>
			</div>
		</div>
	</div>

	<!-- Warning Alert Note -->
	<div class="panel-card info-callout">
		<span class="callout-icon">ℹ️</span>
		<div class="callout-text">
			<strong>Aturan Bisnis Penting (PRD 6.9):</strong>
			<p>
				Bahan baku (biji kopi, susu, sirup) dan kemasan (cup, sedotan) <strong>DILARANG KERAS</strong> dibelanjakan lewat kas kecil. Seluruh stok bahan wajib melalui modul Pembelian & PO tanpa harga.
			</p>
		</div>
	</div>

	<!-- Tabs Nav -->
	<div class="panel-card tabs-card">
		<div class="tabs-nav">
			<button class="tab-btn" class:active={activeTab === 'EXPENSES'} onclick={() => (activeTab = 'EXPENSES')}>
				Daftar Pengeluaran Kas Kecil
			</button>
			<button class="tab-btn" class:active={activeTab === 'TOPUP'} onclick={() => (activeTab = 'TOPUP')}>
				Pengisian Saldo (Top-Up Dua Tahap)
			</button>
			<button class="tab-btn" class:active={activeTab === 'RULES'} onclick={() => (activeTab = 'RULES')}>
				Aturan Ambang Persetujuan
			</button>
		</div>
	</div>

	<!-- Tab 1: Expense List -->
	{#if activeTab === 'EXPENSES'}
		<div class="panel-card table-card">
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>No. Transaksi</th>
							<th>Outlet</th>
							<th>Tanggal</th>
							<th>Kategori Non-Stok</th>
							<th>Keterangan</th>
							<th class="text-right">Nominal</th>
							<th>Tingkat Otorisasi</th>
							<th>Status</th>
							<th>Verifikasi</th>
						</tr>
					</thead>
					<tbody>
						{#each expenseList as exp}
							<tr>
								<td class="font-mono font-bold">{exp.trxNo}</td>
								<td>{exp.outletName}</td>
								<td class="text-muted">{exp.businessDate}</td>
								<td>
									<span class="category-pill">{exp.category}</span>
								</td>
								<td class="desc-cell">{exp.description}</td>
								<td class="text-right font-mono font-bold">{formatRupiah(exp.amount)}</td>
								<td>
									<span class="tier-pill">{exp.tier}</span>
								</td>
								<td>
									{#if exp.status === 'POSTED_VERIFIED'}
										<span class="pill-badge pill-success">Terverifikasi</span>
									{:else if exp.status === 'PENDING_APPROVAL'}
										<span class="pill-badge pill-warning">Menunggu Approval</span>
									{:else}
										<span class="pill-badge pill-danger">Ditolak</span>
									{/if}
								</td>
								<td class="text-subtle text-xs">{exp.verifiedBy}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- Tab 2: Top-Up 2-Stage -->
	{#if activeTab === 'TOPUP'}
		<div class="panel-card tab-content-box">
			<h3 class="box-title">Alur Pengisian Saldo Kas Kecil (Top-Up 2 Tahap)</h3>
			<p class="box-sub">
				Finance mencatat transfer pengisian kas kecil (Tahap 1: Recorded), kemudian diverifikasi setelah dana mutasi bank terkonfirmasi masuk ke brankas/rekening outlet (Tahap 2: Verified).
			</p>

			<div class="topup-history-table">
				<table class="data-table">
					<thead>
						<tr>
							<th>No. Top-Up</th>
							<th>Outlet</th>
							<th>Tanggal</th>
							<th class="text-right">Nominal Top-Up</th>
							<th>Bank Sumber</th>
							<th>Status Verifikasi</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td class="font-mono font-bold">TOP-SEN-20261010-01</td>
							<td>Senopati Flagship</td>
							<td>10 Okt 2026</td>
							<td class="text-right font-mono font-bold">Rp 1.000.000</td>
							<td>BCA Rekening Operasional Pusat</td>
							<td>
								<span class="pill-badge pill-success">Terverifikasi (Mutasi Klir)</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- Modal New Expense -->
	{#if showNewExpenseModal}
		<div
			class="modal-backdrop"
			role="button"
			tabindex="0"
			aria-label="Tutup Form Pengeluaran"
			onclick={(e) => {
				if (e.target === e.currentTarget) showNewExpenseModal = false;
			}}
			onkeydown={(e) => e.key === 'Escape' && (showNewExpenseModal = false)}
		>
			<div
				class="modal-box panel-card"
				role="region"
				aria-label="Form Catat Pengeluaran Kas Kecil"
			>
				<h3 class="modal-title">Catat Pengeluaran Kas Kecil Baru</h3>
				<p class="modal-sub">
					Pastikan bukan bahan baku resep atau packaging. Lampiran foto nota fisik wajib disertakan.
				</p>

				<div class="form-grid">
					<div class="form-group">
						<label for="exp-outlet" class="input-label">Pilih Outlet</label>
						<select id="exp-outlet" class="form-input" bind:value={formOutlet}>
							<option value="Senopati Flagship">Senopati Flagship</option>
							<option value="Cabang BSD (GOP 9)">Cabang BSD (GOP 9)</option>
						</select>
					</div>

					<div class="form-group">
						<label for="exp-cat" class="input-label">Kategori Biaya Non-Stok</label>
						<select id="exp-cat" class="form-input" bind:value={formCategory}>
							<option value="Perlengkapan Kebersihan">Perlengkapan Kebersihan & Sabun</option>
							<option value="Kebutuhan Operasional Non-Stok">Galon Air & Konsumsi Kru</option>
							<option value="Maintenance & Perbaikan">Perbaikan Ringan Mesin / Listrik</option>
							<option value="Perlengkapan Kasir & ATK">Roll Kertas Struk & ATK</option>
						</select>
					</div>

					<div class="form-group">
						<label for="exp-amt" class="input-label">Nominal Pengeluaran (Rp)</label>
						<input id="exp-amt" type="number" class="form-input font-mono" bind:value={formAmount} step="5000" />
						{#if formAmount > 150000}
							<small class="text-warning">⚠️ Melebihi batas bebas Rp 150.000. Akan otomatis diajukan ke Inbox Persetujuan.</small>
						{/if}
					</div>

					<div class="form-group">
						<label for="exp-desc" class="input-label">Keterangan / Rincian Belanja</label>
						<textarea id="exp-desc" class="form-input" rows="2" placeholder="Sebutkan rincian barang yang dibeli..." bind:value={formDescription}></textarea>
					</div>

					<div class="form-group">
						<label for="exp-file" class="input-label">Lampiran Foto Nota / Struk Fisik (Wajib PRD 6.9)</label>
						<input id="exp-file" type="file" class="form-input-file" />
					</div>
				</div>

				<div class="modal-footer">
					<button class="btn btn-secondary" onclick={() => (showNewExpenseModal = false)}>Batal</button>
					<button class="btn btn-primary" onclick={submitExpense}>Posting Pengeluaran</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.petty-cash-page {
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

	/* Balance Cards */
	.balance-cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 16px;
	}

	.balance-card {
		padding: 18px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.balance-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.balance-val {
		font-size: 22px;
		font-weight: 800;
		color: var(--text-main);
	}

	.balance-sub {
		font-size: 11.5px;
		color: var(--text-muted);
		display: flex;
		gap: 8px;
	}

	.thresholds-mini {
		font-size: 11.5px;
		color: var(--text-muted);
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	/* Info Callout */
	.info-callout {
		display: flex;
		gap: 14px;
		padding: 14px 18px;
		background: #eff6ff;
		border-color: #bfdbfe;
		align-items: flex-start;
	}

	.callout-icon {
		font-size: 20px;
	}

	.callout-text strong {
		color: #1d4ed8;
		font-size: 13px;
		display: block;
		margin-bottom: 2px;
	}

	.callout-text p {
		font-size: 12.5px;
		color: #334155;
		margin: 0;
	}

	/* Tabs */
	.tabs-card {
		padding: 6px;
	}

	.tabs-nav {
		display: flex;
		gap: 8px;
	}

	.tab-btn {
		padding: 8px 16px;
		border-radius: var(--radius-sm);
		font-size: 12.5px;
		font-weight: 600;
		color: var(--text-muted);
		border: 1px solid transparent;
		transition: all 0.2s ease;
	}

	.tab-btn.active {
		background: var(--pill-success-bg, rgba(16, 185, 129, 0.14));
		color: var(--pill-success-text, #34d399);
		border: 1px solid var(--pill-success-border, rgba(16, 185, 129, 0.35));
		box-shadow: 0 2px 10px rgba(16, 185, 129, 0.15);
	}

	/* Tables */
	.table-card {
		padding: 0;
		overflow: hidden;
	}

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

	.tier-pill {
		font-size: 11px;
		color: var(--text-muted);
	}

	.desc-cell {
		max-width: 280px;
	}

	.text-right {
		text-align: right;
	}

	.font-mono {
		font-family: monospace;
	}

	.font-bold {
		font-weight: 700;
	}

	.text-muted {
		color: var(--text-muted);
	}

	.text-subtle {
		color: var(--text-subtle);
	}

	.text-xs {
		font-size: 11px;
	}

	.text-warning {
		color: #b45309;
		font-size: 11px;
	}

	.tab-content-box {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.box-title {
		font-size: 16px;
		font-weight: 700;
	}

	.box-sub {
		font-size: 12.5px;
		color: var(--text-muted);
	}

	/* Modal */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(2px);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.modal-box {
		width: 100%;
		max-width: 520px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.modal-title {
		font-size: 17px;
		font-weight: 800;
	}

	.modal-sub {
		font-size: 12px;
		color: var(--text-subtle);
	}

	.form-grid {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.input-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-main);
	}

	.form-input {
		padding: 8px 12px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-panel);
		font-size: 12.5px;
		outline: none;
		background: var(--bg-panel-sub);
	}

	.form-input:focus {
		border-color: var(--brand-primary);
		background: var(--bg-input);
	}

	.form-input-file {
		font-size: 12px;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 24px;
		padding-top: 20px;
		border-top: 1px solid var(--border-panel);
	}
</style>
