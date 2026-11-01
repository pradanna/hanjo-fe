<script lang="ts">
	import { formatRupiah } from '#lib/api/client';
	import Icon from '#lib/components/data/Icon.svelte';

	let filterOutlet = $state('Semua Outlet');
	let filterChannel = $state('Semua Channel');
	let searchQuery = $state('');
	let selectedSaleDetail = $state<any>(null);

	// Mock Stream Data POS Sales Ingest (PRD Section 7.1)
	const posSalesStream = [
		{
			id: 'pos-1',
			localTxnNo: 'TRX-SEN-20261013-0042',
			idempotencyKey: 'SEN-TRX-20261013-0042',
			outletName: 'Senopati Flagship',
			occurredAt: '13 Okt 2026 14:28 WIB',
			businessDate: '2026-10-13',
			channelCode: 'pos',
			channelName: 'Kasir Dine-In',
			cashierName: 'Budi Pratama (ID: C-01)',
			status: 'COMPLETED',
			totalAmount: 73500,
			paymentMethod: 'QRIS Midtrans',
			paymentRef: 'MID-Q-991204128',
			items: [
				{
					name: 'Hanjo Aren Latte (Iced)',
					variant: 'Regular (16oz)',
					qty: 2,
					basePrice: 28000,
					markupPct: 0,
					finalPrice: 28000,
					modifiers: [{ name: 'Gula Aren Normal', delta: 0 }]
				},
				{
					name: 'Fresh Butter Croissant',
					variant: 'Standard',
					qty: 1,
					basePrice: 17500,
					markupPct: 0,
					finalPrice: 17500,
					modifiers: []
				}
			],
			cogsEstimated: 23200,
			taxes: [{ code: 'PBJT-1', name: 'PBJT 10%', rate: 0.1, amount: 6681 }],
			discounts: []
		},
		{
			id: 'pos-2',
			localTxnNo: 'TRX-BSD-20261013-0028',
			idempotencyKey: 'BSD-TRX-20261013-0028',
			outletName: 'Cabang BSD (GOP 9)',
			occurredAt: '13 Okt 2026 14:15 WIB',
			businessDate: '2026-10-13',
			channelCode: 'app_order',
			channelName: 'Aplikasi Pelanggan (Takeaway)',
			cashierName: 'Self-Order Online',
			status: 'COMPLETED',
			totalAmount: 33600,
			paymentMethod: 'GoPay / QRIS',
			paymentRef: 'MID-Q-991204122',
			items: [
				{
					name: 'Americano Double Shot',
					variant: 'Large (20oz)',
					qty: 1,
					basePrice: 26000,
					markupPct: 5, // Channel markup 5% per PRD 6.4
					finalPrice: 28000,
					modifiers: [{ name: 'Extra Shot Espresso', delta: 4000 }]
				}
			],
			cogsEstimated: 8500,
			taxes: [],
			discounts: []
		},
		{
			id: 'pos-3',
			localTxnNo: 'TRX-SEN-20261013-0040',
			idempotencyKey: 'SEN-TRX-20261013-0040',
			outletName: 'Senopati Flagship',
			occurredAt: '13 Okt 2026 13:50 WIB',
			businessDate: '2026-10-13',
			channelCode: 'pos',
			channelName: 'Kasir Dine-In',
			cashierName: 'Ahmad Faisal (ID: C-02)',
			status: 'VOID', // Void transaksi (PRD 7.1)
			totalAmount: 28000,
			paymentMethod: 'Tunai (Cash)',
			paymentRef: '-',
			items: [
				{
					name: 'Hanjo Aren Latte (Iced)',
					variant: 'Regular (16oz)',
					qty: 1,
					basePrice: 28000,
					markupPct: 0,
					finalPrice: 28000,
					modifiers: []
				}
			],
			cogsEstimated: 0,
			taxes: [],
			discounts: []
		}
	];

	const filteredSales = $derived(
		posSalesStream.filter((sale) => {
			const matchOutlet = filterOutlet === 'Semua Outlet' || sale.outletName.includes(filterOutlet);
			const matchChannel = filterChannel === 'Semua Channel' || sale.channelCode === filterChannel;
			const matchSearch =
				!searchQuery.trim() ||
				sale.localTxnNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
				sale.paymentRef.toLowerCase().includes(searchQuery.toLowerCase());
			return matchOutlet && matchChannel && matchSearch;
		})
	);
</script>

<svelte:head>
	<title>Penjualan POS (Hanya-Baca) | HANJO ERP</title>
</svelte:head>

<div class="sales-page">
	<!-- Page Header -->
	<div class="page-head-row">
		<div>
			<div class="head-badge-row">
				<h1 class="page-title">Penjualan POS (Riwayat Transaksi)</h1>
				<span class="pill-badge pill-info">Hanya-Baca / Audit POS</span>
			</div>
			<p class="page-subtitle">
				Data transaksi riil yang masuk otomatis dan tersinkronisasi langsung dari seluruh terminal kasir POS.
			</p>
		</div>

		<div class="head-stats-bar">
			<div class="head-stat-item">
				<span class="head-stat-label">Total Omzet Hari Ini</span>
				<strong class="head-stat-val text-success">Rp 8.450.000</strong>
			</div>
			<div class="head-stat-item">
				<span class="head-stat-label">Item Terjual</span>
				<strong class="head-stat-val">412 item</strong>
			</div>
			<div class="head-stat-item">
				<span class="head-stat-label">Status Sinkronisasi</span>
				<strong class="head-stat-val text-success"><span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>3 Outlet Online</strong>
			</div>
		</div>
	</div>

	<!-- Filter Controls -->
	<div class="panel-card filter-card">
		<div class="filter-group">
			<div class="search-wrap">
				<input
					type="text"
					class="filter-input"
					placeholder="Cari nomor struk atau ref pembayaran..."
					bind:value={searchQuery}
				/>
			</div>

			<select class="filter-select" bind:value={filterOutlet}>
				<option value="Semua Outlet">Semua Outlet</option>
				<option value="Senopati">Senopati Flagship</option>
				<option value="BSD">Cabang BSD (GOP 9)</option>
				<option value="Kemang">Cabang Kemang</option>
			</select>

			<select class="filter-select" bind:value={filterChannel}>
				<option value="Semua Channel">Semua Sales Channel</option>
				<option value="pos">Kasir POS (Dine-In/Takeaway)</option>
				<option value="app_order">Aplikasi Pelanggan (App Order)</option>
			</select>
		</div>
	</div>

	<!-- Sales Transaction Table -->
	<div class="panel-card table-card">
		<div class="table-wrap">
			<table class="data-table">
				<thead>
					<tr>
						<th>No. Transaksi POS</th>
						<th>Waktu</th>
						<th>Outlet</th>
						<th>Channel</th>
						<th>Menu & Item</th>
						<th class="text-right">Total Transaksi</th>
						<th>Metode Pembayaran</th>
						<th>Status</th>
						<th class="text-center">Audit Struk</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredSales as sale}
						<tr>
							<td class="font-mono font-bold">{sale.localTxnNo}</td>
							<td class="text-muted">{sale.occurredAt}</td>
							<td>{sale.outletName}</td>
							<td>
								<span class="channel-tag">{sale.channelName}</span>
							</td>
							<td>
								<div class="items-summary-col">
									{#each sale.items as it}
										<span>{it.qty}x {it.name} ({it.variant})</span>
									{/each}
								</div>
							</td>
							<td class="text-right font-mono font-bold">{formatRupiah(sale.totalAmount)}</td>
							<td>
								<span class="payment-method-pill">{sale.paymentMethod}</span>
							</td>
							<td>
								{#if sale.status === 'COMPLETED'}
									<span class="pill-badge pill-success">Selesai</span>
								{:else}
									<span class="pill-badge pill-danger">Void / Dibatalkan</span>
								{/if}
							</td>
							<td class="text-center">
								<button class="btn btn-secondary btn-sm" onclick={() => (selectedSaleDetail = sale)}>
									Lihat Rincian
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Struk Audit Modal -->
	{#if selectedSaleDetail}
		<div
			class="modal-backdrop"
			role="button"
			tabindex="0"
			aria-label="Tutup Detail Struk"
			onclick={(e) => {
				if (e.target === e.currentTarget) selectedSaleDetail = null;
			}}
			onkeydown={(e) => e.key === 'Escape' && (selectedSaleDetail = null)}
		>
			<div
				class="modal-box panel-card"
				role="region"
				aria-label="Rincian Audit Struk"
			>
				<div class="modal-head">
					<div>
						<h3 class="modal-title">Rincian Struk POS & Audit Konsumsi Resep</h3>
						<span class="modal-sub">No. Referensi Transaksi: {selectedSaleDetail.idempotencyKey}</span>
					</div>
					<button class="close-btn" onclick={() => (selectedSaleDetail = null)} aria-label="Tutup rincian struk">
						<Icon name="x-mark" size={16} />
					</button>
				</div>

				<div class="receipt-audit-body">
					<div class="receipt-meta-grid">
						<div>
							<span class="text-subtle">Outlet:</span>
							<strong>{selectedSaleDetail.outletName}</strong>
						</div>
						<div>
							<span class="text-subtle">Waktu Transaksi:</span>
							<strong>{selectedSaleDetail.occurredAt}</strong>
						</div>
						<div>
							<span class="text-subtle">Kasir:</span>
							<strong>{selectedSaleDetail.cashierName}</strong>
						</div>
						<div>
							<span class="text-subtle">Gateway Ref:</span>
							<strong class="font-mono">{selectedSaleDetail.paymentRef}</strong>
						</div>
					</div>

					<div class="audit-items-box">
						<h4 class="items-title">Item Pesanan & Pengurangan Stok Resep</h4>
						{#each selectedSaleDetail.items as it}
							<div class="audit-item-row">
								<div class="item-desc-col">
									<strong>{it.qty}x {it.name}</strong>
									<span class="variant-desc">Varian: {it.variant} • Harga Dasar: {formatRupiah(it.basePrice)}</span>
									{#if it.markupPct > 0}
										<span class="markup-info">Markup Channel: +{it.markupPct}%</span>
									{/if}
									{#each it.modifiers as mod}
										<span class="mod-info">+ {mod.name} ({formatRupiah(mod.delta)})</span>
									{/each}
								</div>
								<div class="item-price-col font-mono font-bold">
									{formatRupiah(it.finalPrice * it.qty)}
								</div>
							</div>
						{/each}
					</div>

					<div class="receipt-summary-footer">
						<div class="summary-line">
							<span>Estimasi HPP Bahan Resep (COGS):</span>
							<strong class="font-mono">{formatRupiah(selectedSaleDetail.cogsEstimated)}</strong>
						</div>
						<div class="summary-line grand-total">
							<span>Total Nilai Transaksi:</span>
							<strong class="font-mono text-success">{formatRupiah(selectedSaleDetail.totalAmount)}</strong>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.sales-page {
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

	.head-badge-row {
		display: flex;
		align-items: center;
		gap: 12px;
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

	.head-stats-bar {
		display: flex;
		gap: 16px;
		background: var(--bg-panel);
		border: 1px solid var(--border-panel);
		border-radius: var(--radius-md);
		padding: 10px 18px;
	}

	.head-stat-item {
		display: flex;
		flex-direction: column;
	}

	.head-stat-label {
		font-size: 11px;
		color: var(--text-subtle);
	}

	.head-stat-val {
		font-size: 14px;
		font-weight: 700;
		color: var(--text-main);
	}

	/* Filter Card */
	.filter-card {
		padding: 14px 18px;
	}

	.filter-group {
		display: flex;
		gap: 12px;
		align-items: center;
		flex-wrap: wrap;
	}

	.search-wrap {
		flex: 1;
		min-width: 240px;
	}

	.filter-input {
		width: 100%;
		padding: 8px 12px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-panel);
		font-size: 12.5px;
		outline: none;
		background: var(--bg-panel-sub);
	}

	.filter-input:focus {
		border-color: var(--brand-primary);
		background: var(--bg-input);
	}

	.filter-select {
		padding: 8px 12px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-panel);
		font-size: 12.5px;
		background: var(--bg-panel-sub);
		outline: none;
		color: var(--text-main);
	}

	/* Table */
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

	.channel-tag {
		font-size: 11.5px;
		color: var(--text-muted);
		background: var(--bg-panel-sub);
		padding: 2px 8px;
		border-radius: 4px;
	}

	.items-summary-col {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 12px;
	}

	.payment-method-pill {
		font-size: 11.5px;
		font-weight: 600;
		color: var(--text-main);
	}

	.text-right {
		text-align: right;
	}

	.text-center {
		text-align: center;
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

	.btn-sm {
		padding: 5px 10px;
		font-size: 11.5px;
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
		max-width: 580px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.modal-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		border-bottom: 1px solid var(--border-panel);
		padding-bottom: 12px;
	}

	.modal-title {
		font-size: 16px;
		font-weight: 800;
	}

	.modal-sub {
		font-size: 11.5px;
		color: var(--text-subtle);
	}

	.close-btn {
		font-size: 16px;
		color: var(--text-subtle);
		cursor: pointer;
	}

	.receipt-meta-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		font-size: 12px;
		background: var(--bg-panel-sub);
		padding: 12px;
		border-radius: var(--radius-sm);
	}

	.audit-items-box {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 14px;
	}

	.items-title {
		font-size: 13px;
		font-weight: 700;
	}

	.audit-item-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--border-panel);
		font-size: 12.5px;
	}

	.item-desc-col {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.variant-desc,
	.mod-info,
	.markup-info {
		font-size: 11px;
		color: var(--text-subtle);
	}

	.markup-info {
		color: var(--brand-primary);
		font-weight: 600;
	}

	.receipt-summary-footer {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding-top: 14px;
		border-top: 1px solid var(--border-panel);
		font-size: 13px;
	}

	.summary-line {
		display: flex;
		justify-content: space-between;
	}

	.grand-total {
		font-size: 15px;
		font-weight: 800;
		padding-top: 6px;
		border-top: 1px dashed var(--border-panel);
	}
</style>
