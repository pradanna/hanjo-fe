<script lang="ts">
	import { formatRupiah } from '#lib/api/client';
	import {
		INITIAL_SUPPLIER_BILLS,
		INITIAL_JOURNAL_ENTRIES,
		INITIAL_PETTY_CASH,
		INITIAL_AGING_PAYABLES,
		type SupplierBill,
		type JournalEntry,
		type PettyCashTransaction
	} from '#lib/api/erp';

	// Active tab state
	let activeTab = $state<'trueup' | 'journal' | 'pettycash' | 'reports'>('trueup');

	// Reactive Mock State
	let bills = $state<SupplierBill[]>(JSON.parse(JSON.stringify(INITIAL_SUPPLIER_BILLS)));
	let journals = $state<JournalEntry[]>(JSON.parse(JSON.stringify(INITIAL_JOURNAL_ENTRIES)));
	let pettyCashList = $state<PettyCashTransaction[]>(JSON.parse(JSON.stringify(INITIAL_PETTY_CASH)));
	let agingList = $state(INITIAL_AGING_PAYABLES);

	// Modal: Input Nota Supplier & True-Up
	let showInvoiceModal = $state(false);
	let selectedBill = $state<SupplierBill | null>(null);
	let inputActualPrice = $state<number>(0);
	let inputInvoiceNo = $state('');
	let toastMessage = $state('');

	// Modal: Tambah Kas Kecil
	let showPettyModal = $state(false);
	let newPettyCategory = $state<'Bahan Darurat' | 'Operasional' | 'Kebersihan' | 'Maintenance'>('Bahan Darurat');
	let newPettyAmount = $state<number>(50000);
	let newPettyReason = $state('');
	let newPettyOutlet = $state('Outlet Pusat (Senopati Flagship)');

	function openInvoiceModal(bill: SupplierBill) {
		selectedBill = bill;
		inputInvoiceNo = bill.billNumber;
		inputActualPrice = bill.items[0]?.actualUnitPrice || bill.items[0]?.estimatedUnitPrice || 0;
		showInvoiceModal = true;
	}

	function submitInvoiceTrueUp() {
		if (!selectedBill) return;

		const target = bills.find((b) => b.id === selectedBill!.id);
		if (target && target.items[0]) {
			const item = target.items[0];
			const oldEstimated = item.estimatedUnitPrice;
			const newActual = Number(inputActualPrice);
			const diffPerUnit = newActual - oldEstimated;
			const totalDiff = diffPerUnit * item.receivedQty;

			item.actualUnitPrice = newActual;
			item.variancePerUnit = diffPerUnit;
			item.totalVariance = totalDiff;

			target.totalAmount = item.receivedQty * newActual;
			target.totalVariance = totalDiff;
			target.status = 'RECONCILED';
			target.billNumber = inputInvoiceNo || target.billNumber;

			// Generate Otomatis Jurnal Penyesuaian True-Up
			if (totalDiff !== 0) {
				const newJrn: JournalEntry = {
					id: `jrn-${Date.now()}`,
					entryNumber: `JRN-TRUEUP-${Date.now().toString().slice(-4)}`,
					date: new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
					sourceType: 'TRUE_UP',
					sourceId: target.billNumber,
					outletName: target.outletName,
					description: `Koreksi HPP Otomatis (True-Up): ${item.itemName} (${diffPerUnit > 0 ? 'Harga Naik' : 'Harga Turun'})`,
					totalDebit: Math.abs(totalDiff),
					totalCredit: Math.abs(totalDiff),
					lines: [
						{
							accountCode: '5101-99',
							accountName: 'Penyesuaian HPP True-Up (Selisih Harga)',
							debit: diffPerUnit > 0 ? totalDiff : 0,
							credit: diffPerUnit < 0 ? Math.abs(totalDiff) : 0
						},
						{
							accountCode: '2101-01',
							accountName: `Hutang Supplier (${target.supplierName})`,
							debit: diffPerUnit < 0 ? Math.abs(totalDiff) : 0,
							credit: diffPerUnit > 0 ? totalDiff : 0
						}
					]
				};
				journals.unshift(newJrn);
			}

			triggerToast(`✅ Nota ${target.billNumber} berhasil diinput. HPP True-Up terkoreksi ${diffPerUnit >= 0 ? '+' : ''}${formatRupiah(totalDiff)}!`);
			showInvoiceModal = false;
		}
	}

	function approvePettyCash(id: string) {
		const target = pettyCashList.find((p) => p.id === id);
		if (target) {
			target.status = 'DISBURSED';
			target.approvedBy = 'Owner (Budi Pratama)';

			// Buat Jurnal Kas Kecil
			const newJrn: JournalEntry = {
				id: `jrn-${Date.now()}`,
				entryNumber: `JRN-PC-${Date.now().toString().slice(-4)}`,
				date: new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
				sourceType: 'PETTY_CASH',
				sourceId: target.trxNumber,
				outletName: target.outletName,
				description: `Pengeluaran Kas Kecil: ${target.reason}`,
				totalDebit: target.amount,
				totalCredit: target.amount,
				lines: [
					{ accountCode: '6101-08', accountName: `Beban ${target.category} Outlet`, debit: target.amount, credit: 0 },
					{ accountCode: '1101-02', accountName: 'Kas Kecil (Petty Cash Outlet)', debit: 0, credit: target.amount }
				]
			};
			journals.unshift(newJrn);
			triggerToast(`✅ Pengeluaran Kas Kecil ${target.trxNumber} senilai ${formatRupiah(target.amount)} telah disetujui & dijurnal!`);
		}
	}

	function rejectPettyCash(id: string) {
		const target = pettyCashList.find((p) => p.id === id);
		if (target) {
			target.status = 'REJECTED';
			triggerToast(`❌ Pengajuan Kas Kecil ${target.trxNumber} telah ditolak.`);
		}
	}

	function submitNewPettyCash() {
		const isHigh = newPettyAmount > 150000;
		const newTrx: PettyCashTransaction = {
			id: `pc-${Date.now()}`,
			trxNumber: `PC-${Date.now().toString().slice(-5)}`,
			outletId: 'out-1',
			outletName: newPettyOutlet,
			requester: 'Budi Pratama (Manager)',
			category: newPettyCategory,
			amount: Number(newPettyAmount),
			reason: newPettyReason || 'Kebutuhan operasional darurat',
			requiresLeaderApproval: isHigh,
			status: isHigh ? 'PENDING' : 'DISBURSED',
			approvedBy: isHigh ? undefined : 'Sistem (Di bawah ambang batas)',
			createdAt: 'Baru saja'
		};

		pettyCashList.unshift(newTrx);
		triggerToast(`Pengeluaran kas kecil dicatat! ${isHigh ? 'Perlu persetujuan Owner (> Rp 150k)' : 'Langsung dicairkan'}`);
		showPettyModal = false;
	}

	function triggerToast(msg: string) {
		toastMessage = msg;
		setTimeout(() => {
			toastMessage = '';
		}, 3500);
	}
</script>

<svelte:head>
	<title>ERP Backoffice & Finance | HANJO Multi-Outlet</title>
</svelte:head>

<div class="finance-page">
	<!-- Toast Alert -->
	{#if toastMessage}
		<div class="toast-notification panel-card">
			<span>{toastMessage}</span>
		</div>
	{/if}

	<!-- Header Banner -->
	<header class="page-header">
		<div class="header-left">
			<span class="header-tag">ERP BACKOFFICE & KEUANGAN</span>
			<h1 class="page-title">Finance, HPP True-Up & Akuntansi</h1>
			<p class="page-sub">
				Otomasi alur pengadaan: Terima Barang (Stok Masuk) ➔ Input Nota Supplier ➔ Koreksi HPP Otomatis ➔ Jurnal Double-Entry Real-Time.
			</p>
		</div>

		<div class="header-actions">
			<button class="btn btn-secondary" onclick={() => (showPettyModal = true)}>
				<span>🪙 Catat Kas Kecil</span>
			</button>
			<a href="/procurement" class="btn btn-primary">
				<span>📦 Buka Pengadaan Stok</span>
				<span>→</span>
			</a>
		</div>
	</header>

	<!-- Tab Navigation -->
	<div class="tabs-nav panel-card">
		<button
			class="tab-btn"
			class:active={activeTab === 'trueup'}
			onclick={() => (activeTab = 'trueup')}
		>
			<span class="tab-icon">💰</span>
			<span>Input Nota & HPP True-Up</span>
			<span class="pill-badge pill-live">CORE</span>
		</button>

		<button
			class="tab-btn"
			class:active={activeTab === 'journal'}
			onclick={() => (activeTab = 'journal')}
		>
			<span class="tab-icon">📑</span>
			<span>Jurnal Otomatis & Buku Besar</span>
		</button>

		<button
			class="tab-btn"
			class:active={activeTab === 'pettycash'}
			onclick={() => (activeTab = 'pettycash')}
		>
			<span class="tab-icon">🪙</span>
			<span>Kas Kecil & Approval Center</span>
			{#if pettyCashList.filter((p) => p.status === 'PENDING').length > 0}
				<span class="pill-badge pill-danger">
					{pettyCashList.filter((p) => p.status === 'PENDING').length} APPROVAL
				</span>
			{/if}
		</button>

		<button
			class="tab-btn"
			class:active={activeTab === 'reports'}
			onclick={() => (activeTab = 'reports')}
		>
			<span class="tab-icon">📊</span>
			<span>Laporan Laba Rugi & Hutang</span>
		</button>
	</div>

	<!-- TAB 1: Input Nota & HPP True-Up Engine -->
	{#if activeTab === 'trueup'}
		<section class="tab-content">
			<!-- Explanation Banner -->
			<div class="info-callout panel-card">
				<div class="callout-icon">💡</div>
				<div class="callout-text">
					<strong>Bagaimana True-Up HPP Bekerja?</strong>
					<p>
						Saat barang tiba di outlet, kasir/manager menerima barang fisik dengan modal sementara harga terakhir (LPP). Begitu Finance menginput nota resmi supplier di sini, sistem secara matematis menghitung selisih harga (*Variance*) dan mengoreksi HPP produk yang terjual tanpa perlu rekap manual!
					</p>
				</div>
			</div>

			<!-- Bills Table List -->
			<div class="table-container panel-card">
				<div class="table-head-row">
					<div>
						<h2 class="table-title">Daftar Penerimaan Barang & Nota Tagihan Supplier</h2>
						<span class="table-sub">Pantau tagihan yang telah disesuaikan dan yang masih menunggu nota fisik</span>
					</div>
				</div>

				<div class="table-scroll">
					<table class="data-table">
						<thead>
							<tr>
								<th>No. Tagihan / Ref</th>
								<th>Supplier & Outlet</th>
								<th>Item Diterima</th>
								<th>Qty</th>
								<th>Harga Estimasi (LPP)</th>
								<th>Harga Nota Aktual</th>
								<th>Selisih (Variance)</th>
								<th>Status</th>
								<th>Aksi Finance</th>
							</tr>
						</thead>
						<tbody>
							{#each bills as bill}
								<tr class="table-row">
									<td class="code-col">
										<strong>{bill.billNumber}</strong>
										<small>{bill.receiptId}</small>
									</td>
									<td>
										<div class="vendor-col">
											<strong>{bill.supplierName}</strong>
											<span class="outlet-subtag">🏢 {bill.outletName}</span>
										</div>
									</td>
									<td>
										<span class="item-name-str">{bill.items[0]?.itemName}</span>
									</td>
									<td>
										<strong>{bill.items[0]?.receivedQty} {bill.items[0]?.unit}</strong>
									</td>
									<td>
										<span class="est-price">{formatRupiah(bill.items[0]?.estimatedUnitPrice)}</span>
									</td>
									<td>
										{#if bill.status === 'WAITING_INVOICE'}
											<span class="waiting-text">Menunggu Input Nota</span>
										{:else}
											<strong class="act-price">{formatRupiah(bill.items[0]?.actualUnitPrice)}</strong>
										{/if}
									</td>
									<td>
										{#if bill.status === 'WAITING_INVOICE'}
											<span class="text-subtle">-</span>
										{:else if bill.totalVariance > 0}
											<span class="variance-pill badge-loss">
												+{formatRupiah(bill.totalVariance)} (Biaya Naik)
											</span>
										{:else if bill.totalVariance < 0}
											<span class="variance-pill badge-gain">
												{formatRupiah(bill.totalVariance)} (Hemat Modal)
											</span>
										{:else}
											<span class="variance-pill badge-exact">Sesuai Estimasi (Rp 0)</span>
										{/if}
									</td>
									<td>
										{#if bill.status === 'WAITING_INVOICE'}
											<span class="pill-badge pill-warning">Menunggu Nota</span>
										{:else if bill.status === 'RECONCILED'}
											<span class="pill-badge pill-success">True-Up Selesai</span>
										{:else}
											<span class="pill-badge pill-live">{bill.status}</span>
										{/if}
									</td>
									<td>
										{#if bill.status === 'WAITING_INVOICE'}
											<button class="btn btn-primary btn-sm" onclick={() => openInvoiceModal(bill)}>
												<span>✏️ Input Nota</span>
											</button>
										{:else}
											<button class="btn btn-secondary btn-sm" onclick={() => openInvoiceModal(bill)}>
												<span>Koreksi Ulang</span>
											</button>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</section>
	{/if}

	<!-- TAB 2: Jurnal Otomatis & Buku Besar -->
	{#if activeTab === 'journal'}
		<section class="tab-content">
			<div class="table-container panel-card">
				<div class="table-head-row">
					<div>
						<h2 class="table-title">Buku Jurnal Umum Otomatis (Double-Entry Ledger)</h2>
						<span class="table-sub">Setiap transaksi POS, penerimaan tagihan, kas kecil, dan penyesuaian True-Up langsung terjurnal otomatis</span>
					</div>
					<div class="journal-stats">
						<span class="pill-badge pill-success">Total {journals.length} Jurnal Aktif</span>
					</div>
				</div>

				<div class="table-scroll">
					<table class="data-table">
						<thead>
							<tr>
								<th>No. Jurnal & Waktu</th>
								<th>Tipe Sumber</th>
								<th>Keterangan Jurnal</th>
								<th>Kode Akun & Nama Akun</th>
								<th>Debit</th>
								<th>Kredit</th>
							</tr>
						</thead>
						<tbody>
							{#each journals as jrn}
								<tr class="table-row">
									<td class="code-col">
										<strong>{jrn.entryNumber}</strong>
										<small>{jrn.date}</small>
									</td>
									<td>
										{#if jrn.sourceType === 'TRUE_UP'}
											<span class="pill-badge pill-warning">HPP TRUE-UP</span>
										{:else if jrn.sourceType === 'POS_SALE'}
											<span class="pill-badge pill-success">POS KASIR</span>
										{:else if jrn.sourceType === 'PETTY_CASH'}
											<span class="pill-badge pill-live">KAS KECIL</span>
										{:else}
											<span class="pill-badge">{jrn.sourceType}</span>
										{/if}
									</td>
									<td>
										<div class="jrn-desc-col">
											<strong>{jrn.description}</strong>
											<small>🏢 {jrn.outletName}</small>
										</div>
									</td>
									<td colspan="3" class="nested-lines-td">
										<div class="lines-list">
											{#each jrn.lines as line}
												<div class="line-row">
													<div class="line-acc">
														<span class="acc-code">{line.accountCode}</span>
														<span class="acc-name">{line.accountName}</span>
													</div>
													<div class="line-debit">
														{line.debit > 0 ? formatRupiah(line.debit) : '-'}
													</div>
													<div class="line-credit">
														{line.credit > 0 ? formatRupiah(line.credit) : '-'}
													</div>
												</div>
											{/each}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</section>
	{/if}

	<!-- TAB 3: Kas Kecil (Petty Cash) & Approval Center -->
	{#if activeTab === 'pettycash'}
		<section class="tab-content">
			<div class="petty-grid">
				<!-- Petty Cash Table -->
				<div class="table-container panel-card">
					<div class="table-head-row">
						<div>
							<h2 class="table-title">Pengeluaran Kas Kecil Outlet (Petty Cash)</h2>
							<span class="table-sub">Pengeluaran di atas ambang batas (Rp 150.000) memerlukan persetujuan Owner</span>
						</div>
					</div>

					<div class="table-scroll">
						<table class="data-table">
							<thead>
								<tr>
									<th>No. Ref</th>
									<th>Outlet & Pemohon</th>
									<th>Kategori</th>
									<th>Nominal</th>
									<th>Keperluan</th>
									<th>Status Approval</th>
									<th>Aksi</th>
								</tr>
							</thead>
							<tbody>
								{#each pettyCashList as pc}
									<tr class="table-row">
										<td class="code-col">
											<strong>{pc.trxNumber}</strong>
											<small>{pc.createdAt}</small>
										</td>
										<td>
											<strong>{pc.outletName}</strong>
											<small class="text-subtle">{pc.requester}</small>
										</td>
										<td>
											<span class="cat-pill-badge">{pc.category}</span>
										</td>
										<td>
											<strong class="petty-amount">{formatRupiah(pc.amount)}</strong>
										</td>
										<td>
											<p class="petty-reason-str">{pc.reason}</p>
										</td>
										<td>
											{#if pc.status === 'PENDING'}
												<span class="pill-badge pill-danger">Menunggu Approval Owner</span>
											{:else if pc.status === 'DISBURSED'}
												<span class="pill-badge pill-success">Tercairkan (Disbursed)</span>
											{:else if pc.status === 'APPROVED'}
												<span class="pill-badge pill-live">Disetujui</span>
											{:else}
												<span class="pill-badge">{pc.status}</span>
											{/if}
										</td>
										<td>
											{#if pc.status === 'PENDING'}
												<div class="approval-btn-group">
													<button class="btn btn-primary btn-sm btn-approve" onclick={() => approvePettyCash(pc.id)}>
														Setujui
													</button>
													<button class="btn btn-secondary btn-sm btn-reject" onclick={() => rejectPettyCash(pc.id)}>
														Tolak
													</button>
												</div>
											{:else}
												<span class="text-subtle text-xs">Selesai</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</section>
	{/if}

	<!-- TAB 4: Laporan Laba/Rugi & Umur Hutang -->
	{#if activeTab === 'reports'}
		<section class="tab-content reports-section">
			<!-- P&L Comparison Card -->
			<div class="panel-card pnl-card">
				<div class="pnl-header">
					<div>
						<h2 class="table-title">Laporan Laba / Rugi Multi-Outlet (Dengan True-Up HPP)</h2>
						<span class="table-sub">Evaluasi margin kotor dan laba bersih dengan data beban modal aktual yang terkalibrasi</span>
					</div>
					<div class="period-badge">
						<span>Periode: Oktober 2026 (M-T-D)</span>
					</div>
				</div>

				<div class="pnl-grid">
					<!-- Outlet 1: Senopati -->
					<div class="pnl-outlet-box panel-subcard">
						<div class="outlet-box-head">
							<h3>🏢 Outlet Pusat (Senopati Flagship)</h3>
							<span class="pill-badge pill-success">Corporate Owned</span>
						</div>

						<div class="pnl-metric-row">
							<span>Total Omset Penjualan (Revenue)</span>
							<strong>Rp 128.540.000</strong>
						</div>
						<div class="pnl-metric-row text-danger">
							<span>HPP Bahan Baku (Setelah True-Up)</span>
							<span>(Rp 41.132.800)</span>
						</div>
						<div class="pnl-metric-row subtotal">
							<span>Laba Kotor (Gross Profit)</span>
							<strong class="text-gain">Rp 87.407.200 (68.0%)</strong>
						</div>
						<div class="pnl-metric-row text-muted">
							<span>Beban Operasional & Kas Kecil</span>
							<span>(Rp 24.600.000)</span>
						</div>
						<div class="pnl-metric-row total-net">
							<strong>Laba Bersih Outlet (Net Profit)</strong>
							<strong class="text-gain-large">Rp 62.807.200</strong>
						</div>
					</div>

					<!-- Outlet 2: BSD -->
					<div class="pnl-outlet-box panel-subcard">
						<div class="outlet-box-head">
							<h3>🌿 Cabang BSD (GOP 9 Eco Hub)</h3>
							<span class="pill-badge pill-warning">Mitra Kerjasama</span>
						</div>

						<div class="pnl-metric-row">
							<span>Total Omset Penjualan (Revenue)</span>
							<strong>Rp 76.220.000</strong>
						</div>
						<div class="pnl-metric-row text-danger">
							<span>HPP Bahan Baku (Setelah True-Up)</span>
							<span>(Rp 24.085.520)</span>
						</div>
						<div class="pnl-metric-row subtotal">
							<span>Laba Kotor (Gross Profit)</span>
							<strong class="text-gain">Rp 52.134.480 (68.4%)</strong>
						</div>
						<div class="pnl-metric-row text-muted">
							<span>Beban Operasional & Bagi Hasil Mitra</span>
							<span>(Rp 18.200.000)</span>
						</div>
						<div class="pnl-metric-row total-net">
							<strong>Laba Bersih Outlet (Net Profit)</strong>
							<strong class="text-gain-large">Rp 33.934.480</strong>
						</div>
					</div>
				</div>
			</div>

			<!-- Aging Payables Table -->
			<div class="panel-card aging-card">
				<div class="table-head-row">
					<div>
						<h2 class="table-title">Umur Hutang Dagang Supplier (Aging Payables)</h2>
						<span class="table-sub">Jadwal jatuh tempo faktur bahan baku ke supplier luar & gudang pusat</span>
					</div>
				</div>

				<div class="table-scroll">
					<table class="data-table">
						<thead>
							<tr>
								<th>Nama Supplier</th>
								<th>Entitas Outlet</th>
								<th>Total Hutang</th>
								<th>0 - 30 Hari (Lancar)</th>
								<th>31 - 60 Hari</th>
								<th>> 60 Hari (Kritis)</th>
								<th>Jatuh Tempo Terdekat</th>
							</tr>
						</thead>
						<tbody>
							{#each agingList as ag}
								<tr class="table-row">
									<td><strong>{ag.supplierName}</strong></td>
									<td><span class="text-muted">{ag.outletName}</span></td>
									<td><strong class="act-price">{formatRupiah(ag.totalDebt)}</strong></td>
									<td><span class="text-gain">{formatRupiah(ag.current0_30)}</span></td>
									<td><span class={ag.bracket31_60 > 0 ? 'text-warning' : 'text-subtle'}>{formatRupiah(ag.bracket31_60)}</span></td>
									<td><span class={ag.bracketOver60 > 0 ? 'text-danger' : 'text-subtle'}>{formatRupiah(ag.bracketOver60)}</span></td>
									<td><span class="pill-badge pill-live">📅 {ag.nextDueDate}</span></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</section>
	{/if}
</div>

<!-- Modal: Input Nota Supplier & Hitung True-Up -->
{#if showInvoiceModal && selectedBill}
	<div
		class="modal-backdrop"
		role="button"
		tabindex="0"
		aria-label="Tutup Modal"
		onclick={() => (showInvoiceModal = false)}
		onkeydown={(e) => e.key === 'Escape' && (showInvoiceModal = false)}
	>
		<div
			class="modal-box panel-card"
			role="dialog"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && (showInvoiceModal = false)}
		>
			<div class="modal-head">
				<div>
					<span class="pill-badge pill-live">ENGINE HPP TRUE-UP</span>
					<h3 class="modal-title">Input Nota Resmi Supplier</h3>
				</div>
				<button class="close-btn" onclick={() => (showInvoiceModal = false)}>✕</button>
			</div>

			<div class="modal-body">
				<div class="receipt-summary-box panel-subcard">
					<div class="box-row">
						<span>Ref Penerimaan Barang:</span>
						<strong>{selectedBill.receiptId}</strong>
					</div>
					<div class="box-row">
						<span>Nama Supplier:</span>
						<strong>{selectedBill.supplierName}</strong>
					</div>
					<div class="box-row">
						<span>Bahan Baku:</span>
						<strong>{selectedBill.items[0]?.itemName}</strong>
					</div>
					<div class="box-row">
						<span>Jumlah Diterima Fisik:</span>
						<strong>{selectedBill.items[0]?.receivedQty} {selectedBill.items[0]?.unit}</strong>
					</div>
					<div class="box-row">
						<span>Harga Estimasi (Modal Awal):</span>
						<strong class="text-warning">{formatRupiah(selectedBill.items[0]?.estimatedUnitPrice)} / {selectedBill.items[0]?.unit}</strong>
					</div>
				</div>

				<form class="invoice-form" onsubmit={(e) => { e.preventDefault(); submitInvoiceTrueUp(); }}>
					<div class="form-group">
						<label for="inv-no">Nomor Faktur / Nota Tagihan</label>
						<input id="inv-no" type="text" bind:value={inputInvoiceNo} required class="form-input" />
					</div>

					<div class="form-group">
						<label for="inv-price">Harga Riil per Satuan di Nota (IDR)</label>
						<input id="inv-price" type="number" bind:value={inputActualPrice} min="100" step="100" required class="form-input" />
					</div>

					<!-- Real-Time Variance Calculation Preview -->
					<div class="variance-preview-box panel-subcard">
						<span class="preview-title">Simulasi Koreksi HPP Otomatis:</span>
						<div class="calc-row">
							<span>Selisih per Unit:</span>
							<strong>
								{formatRupiah(inputActualPrice - (selectedBill.items[0]?.estimatedUnitPrice || 0))}
							</strong>
						</div>
						<div class="calc-row">
							<span>Total Penyesuaian Beban HPP (True-Up):</span>
							<strong class={inputActualPrice >= (selectedBill.items[0]?.estimatedUnitPrice || 0) ? 'text-danger' : 'text-gain'}>
								{formatRupiah((inputActualPrice - (selectedBill.items[0]?.estimatedUnitPrice || 0)) * (selectedBill.items[0]?.receivedQty || 0))}
							</strong>
						</div>
					</div>

					<div class="modal-actions">
						<button type="button" class="btn btn-secondary" onclick={() => (showInvoiceModal = false)}>
							Batal
						</button>
						<button type="submit" class="btn btn-primary">
							<span>Proses & Terapkan True-Up</span>
							<span>✓</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Modal: Catat Kas Kecil Baru -->
{#if showPettyModal}
	<div
		class="modal-backdrop"
		role="button"
		tabindex="0"
		aria-label="Tutup Modal"
		onclick={() => (showPettyModal = false)}
		onkeydown={(e) => e.key === 'Escape' && (showPettyModal = false)}
	>
		<div
			class="modal-box panel-card"
			role="dialog"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && (showPettyModal = false)}
		>
			<div class="modal-head">
				<div>
					<span class="pill-badge pill-warning">KAS KECIL OUTLET</span>
					<h3 class="modal-title">Formulir Pengeluaran Kas Kecil</h3>
				</div>
				<button class="close-btn" onclick={() => (showPettyModal = false)}>✕</button>
			</div>

			<div class="modal-body">
				<form class="invoice-form" onsubmit={(e) => { e.preventDefault(); submitNewPettyCash(); }}>
					<div class="form-group">
						<label for="petty-outlet">Pilih Outlet</label>
						<select id="petty-outlet" bind:value={newPettyOutlet} class="form-input">
							<option>Outlet Pusat (Senopati Flagship)</option>
							<option>Cabang BSD (GOP 9)</option>
						</select>
					</div>

					<div class="form-group">
						<label for="petty-cat">Kategori Pengeluaran</label>
						<select id="petty-cat" bind:value={newPettyCategory} class="form-input">
							<option value="Bahan Darurat">Bahan Darurat (Es Batu, Susu Toko Terdekat)</option>
							<option value="Operasional">Operasional Harian</option>
							<option value="Kebersihan">Kebersihan & Sanitasi</option>
							<option value="Maintenance">Maintenance & Service Alat</option>
						</select>
					</div>

					<div class="form-group">
						<label for="petty-amt">Nominal Pengeluaran (Rp)</label>
						<input id="petty-amt" type="number" bind:value={newPettyAmount} min="5000" step="5000" required class="form-input" />
						{#if newPettyAmount > 150000}
							<small class="text-warning">⚠️ Di atas limit Rp 150.000 — Membutuhkan persetujuan Owner sebelum dana dicairkan.</small>
						{/if}
					</div>

					<div class="form-group">
						<label for="petty-reason">Alasan / Keterangan Kebutuhan</label>
						<textarea id="petty-reason" rows="2" bind:value={newPettyReason} required class="form-input" placeholder="Misal: Beli 2 pack es batu karena supplier terlambat..."></textarea>
					</div>

					<div class="modal-actions">
						<button type="button" class="btn btn-secondary" onclick={() => (showPettyModal = false)}>Batal</button>
						<button type="submit" class="btn btn-primary">
							<span>Ajukan Kas Kecil</span>
							<span>→</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<style>
	.finance-page {
		display: flex;
		flex-direction: column;
		gap: 24px;
		width: 100%;
	}

	.toast-notification {
		position: fixed;
		top: 24px;
		right: 24px;
		background: var(--bg-panel);
		border: 1px solid var(--border-panel);
		color: var(--text-main);
		padding: 14px 20px;
		border-radius: var(--radius-md);
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
		z-index: 2000;
		font-weight: 600;
		font-size: 13.5px;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		flex-wrap: wrap;
	}

	.header-tag {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 1px;
		color: var(--brand-primary);
	}

	.page-title {
		font-size: 26px;
		font-weight: 800;
		color: var(--text-main);
		margin-top: 2px;
	}

	.page-sub {
		font-size: 13px;
		color: var(--text-muted);
		max-width: 780px;
		margin-top: 4px;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	/* Tabs */
	.tabs-nav {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px;
		overflow-x: auto;
	}

	.tab-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 18px;
		border-radius: var(--radius-sm);
		font-size: 13px;
		font-weight: 600;
		color: var(--text-muted);
		border: 1px solid transparent;
		transition: all 0.15s;
		white-space: nowrap;
	}

	.tab-btn:hover {
		color: var(--text-main);
		background: var(--bg-panel-hover);
	}

	.tab-btn.active {
		color: var(--pill-success-text, #34d399);
		background: var(--pill-success-bg, rgba(16, 185, 129, 0.14));
		border: 1px solid var(--pill-success-border, rgba(16, 185, 129, 0.35));
		box-shadow: 0 2px 10px rgba(16, 185, 129, 0.15);
	}

	.tab-icon {
		font-size: 16px;
	}

	.tab-content {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	/* Callout */
	.info-callout {
		display: flex;
		gap: 16px;
		align-items: flex-start;
		padding: 16px 20px;
		background: var(--brand-primary-dim);
		border-color: rgba(16, 185, 129, 0.3);
	}

	.callout-icon {
		font-size: 22px;
		line-height: 1;
	}

	.callout-text strong {
		font-size: 13.5px;
		color: var(--brand-primary);
		display: block;
		margin-bottom: 4px;
	}

	.callout-text p {
		font-size: 12.5px;
		color: var(--text-muted);
		line-height: 1.5;
	}

	/* Tables */
	.table-container {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.table-head-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px;
	}

	.table-title {
		font-size: 17px;
		font-weight: 700;
		color: var(--text-main);
	}

	.table-sub {
		font-size: 12px;
		color: var(--text-subtle);
		display: block;
		margin-top: 2px;
	}

	.table-scroll {
		overflow-x: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12.5px;
		text-align: left;
	}

	.data-table th {
		padding: 10px 12px;
		color: var(--text-subtle);
		font-size: 11px;
		font-weight: 600;
		border-bottom: 1px solid var(--border-panel);
		white-space: nowrap;
	}

	.table-row {
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		transition: background 0.15s;
	}

	.table-row:hover {
		background: var(--bg-panel-hover);
	}

	.table-row td {
		padding: 12px 10px;
		vertical-align: middle;
	}

	.code-col {
		font-family: 'Courier New', Courier, monospace;
		white-space: nowrap;
	}

	.code-col strong {
		color: var(--text-main);
		display: block;
	}

	.code-col small {
		color: var(--text-subtle);
		font-size: 10.5px;
	}

	.vendor-col strong {
		color: var(--text-main);
		display: block;
	}

	.outlet-subtag {
		font-size: 11px;
		color: var(--text-subtle);
	}

	.item-name-str {
		font-weight: 600;
		color: var(--text-main);
	}

	.est-price {
		color: var(--text-muted);
	}

	.act-price {
		color: #f59e0b;
	}

	.waiting-text {
		color: #f59e0b;
		font-style: italic;
		font-size: 11.5px;
	}

	.variance-pill {
		display: inline-block;
		padding: 2px 8px;
		border-radius: var(--radius-full);
		font-size: 11px;
		font-weight: 700;
	}

	.badge-loss {
		background: rgba(244, 63, 94, 0.15);
		color: #fb7185;
		border: 1px solid rgba(244, 63, 94, 0.3);
	}

	.badge-gain {
		background: rgba(16, 185, 129, 0.15);
		color: #34d399;
		border: 1px solid rgba(16, 185, 129, 0.3);
	}

	.badge-exact {
		background: rgba(255, 255, 255, 0.06);
		color: var(--text-muted);
	}

	/* Nested Journal Lines */
	.nested-lines-td {
		padding: 4px 10px !important;
	}

	.lines-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.line-row {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr;
		gap: 12px;
		padding: 4px 0;
		font-size: 11.5px;
	}

	.line-acc {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.acc-code {
		font-family: monospace;
		color: var(--brand-primary);
		font-weight: 700;
	}

	.acc-name {
		color: var(--text-muted);
	}

	.line-debit, .line-credit {
		font-family: monospace;
		text-align: right;
		color: var(--text-main);
	}

	/* Petty Cash Approval */
	.cat-pill-badge {
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-panel);
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		font-size: 11px;
		color: var(--text-muted);
	}

	.petty-amount {
		color: #f59e0b;
	}

	.petty-reason-str {
		max-width: 280px;
		font-size: 12px;
		color: var(--text-muted);
	}

	.approval-btn-group {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.btn-approve {
		padding: 4px 10px;
		font-size: 11px;
	}

	.btn-reject {
		padding: 4px 10px;
		font-size: 11px;
		color: #fb7185;
		border-color: rgba(244, 63, 94, 0.3);
	}

	/* Reports */
	.reports-section {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.pnl-card {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.pnl-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px;
	}

	.period-badge {
		font-size: 12px;
		color: var(--text-muted);
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-panel);
		padding: 6px 14px;
		border-radius: var(--radius-full);
	}

	.pnl-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
	}

	.pnl-outlet-box {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.outlet-box-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--border-panel);
	}

	.outlet-box-head h3 {
		font-size: 16px;
	}

	.pnl-metric-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 13px;
		color: var(--text-muted);
	}

	.pnl-metric-row.subtotal {
		padding: 8px 0;
		border-top: 1px dashed var(--border-panel);
		border-bottom: 1px dashed var(--border-panel);
		margin: 4px 0;
	}

	.pnl-metric-row.total-net {
		padding-top: 10px;
		border-top: 1px solid var(--border-panel);
		margin-top: 4px;
	}

	.text-gain {
		color: #10b981;
	}

	.text-gain-large {
		color: #10b981;
		font-size: 18px;
		font-weight: 800;
	}

	.text-danger {
		color: #f43f5e;
	}

	.text-warning {
		color: #f59e0b;
	}

	.text-subtle {
		color: var(--text-subtle);
	}

	.text-xs {
		font-size: 11px;
	}

	/* Modals */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(6px);
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
		gap: 18px;
	}

	.modal-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.modal-title {
		font-size: 18px;
		font-weight: 700;
		margin-top: 4px;
	}

	.close-btn {
		font-size: 18px;
		color: var(--text-subtle);
	}

	.modal-body {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.receipt-summary-box {
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 12.5px;
	}

	.box-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		color: var(--text-muted);
	}

	.invoice-form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.form-group label {
		font-size: 11.5px;
		font-weight: 600;
		color: var(--text-muted);
	}

	.form-input {
		background: var(--bg-input);
		border: 1px solid var(--border-panel);
		color: var(--text-main);
		padding: 9px 12px;
		border-radius: var(--radius-sm);
		font-size: 13px;
		outline: none;
	}

	.form-input:focus {
		border-color: var(--brand-primary);
	}

	.variance-preview-box {
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 12px;
	}

	.preview-title {
		font-weight: 700;
		color: var(--brand-primary);
	}

	.calc-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		color: var(--text-muted);
	}

	.modal-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 8px;
	}

	@media (max-width: 900px) {
		.pnl-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
