<script lang="ts">
	import { formatRupiah } from '#lib/api/client';
	import {
		INITIAL_REQUISITIONS,
		type StockRequisition
	} from '#lib/api/erp';

	let activeSubTab = $state<'requisition' | 'receiving' | 'direct_purchase'>('requisition');
	let requisitions = $state<StockRequisition[]>(JSON.parse(JSON.stringify(INITIAL_REQUISITIONS)));
	let toastMsg = $state('');

	// Form: Buat Permintaan Barang Baru (Blind Requisition)
	let showNewReqModal = $state(false);
	let selectedOutlet = $state('Outlet Pusat (Senopati Flagship)');
	let reqNotes = $state('');
	let reqItems = $state<{ itemId: string; itemName: string; unit: string; requestedQty: number }[]>([
		{ itemId: 'ing-1', itemName: 'Fresh Milk Greenfield 1L', unit: 'Liter', requestedQty: 30 }
	]);

	const availableMaterials = [
		{ id: 'ing-1', name: 'Fresh Milk Greenfield 1L', unit: 'Liter' },
		{ id: 'ing-2', name: 'Pure Uji Matcha Powder', unit: 'Gram' },
		{ id: 'ing-3', name: 'House Blend Espresso Beans', unit: 'Kg' },
		{ id: 'ing-4', name: 'Gula Aren Organik Cair (Jerrycan 5L)', unit: 'Jerrycan' },
		{ id: 'pack-1', name: 'Paper Cup Hot 8oz Hanjo Logo', unit: 'Pcs' },
		{ id: 'pack-2', name: 'Cup Sealer Roll Plastic', unit: 'Roll' }
	];

	function addItemRow() {
		reqItems.push({ itemId: 'ing-2', itemName: 'Pure Uji Matcha Powder', unit: 'Gram', requestedQty: 100 });
	}

	function removeItemRow(index: number) {
		if (reqItems.length > 1) {
			reqItems.splice(index, 1);
		}
	}

	function submitRequisition() {
		const newReq: StockRequisition = {
			id: `req-${Date.now()}`,
			reqNumber: `REQ-${Date.now().toString().slice(-5)}`,
			outletId: 'out-1',
			outletName: selectedOutlet,
			requesterName: 'Budi Pratama (Manager)',
			notes: reqNotes || 'Permintaan stok reguler',
			status: 'SUBMITTED',
			createdAt: 'Baru saja',
			items: reqItems.map((i) => ({ ...i }))
		};

		requisitions.unshift(newReq);
		showNewReqModal = false;
		triggerToast(`✅ Permintaan barang ${newReq.reqNumber} berhasil dikirim ke Gudang Pusat!`);
	}

	function confirmGoodsReceipt(reqId: string) {
		const target = requisitions.find((r) => r.id === reqId);
		if (target) {
			target.status = 'RECEIVED';
			triggerToast(`📦 Konfirmasi penerimaan fisik berhasil! Barang masuk ke stok outlet & status beralih ke 'Menunggu Nota Supplier' di Finance.`);
		}
	}

	function triggerToast(m: string) {
		toastMsg = m;
		setTimeout(() => {
			toastMsg = '';
		}, 3500);
	}
</script>

<svelte:head>
	<title>Pengadaan & Penerimaan Stok | HANJO ERP</title>
</svelte:head>

<div class="procurement-page">
	{#if toastMsg}
		<div class="toast-notification panel-card">
			<span>{toastMsg}</span>
		</div>
	{/if}

	<!-- Header Banner -->
	<header class="page-header">
		<div class="header-left">
			<span class="header-tag">ERP PENGADAAN & LOGISTIK</span>
			<h1 class="page-title">Pengadaan & Penerimaan Barang Outlet</h1>
			<p class="page-sub">
				Store Manager dapat memesan bahan baku ke Gudang Pusat tanpa melihat harga rahasia perusahaan (Blind Requisition) dan mencatat penerimaan fisik barang.
			</p>
		</div>

		<div class="header-actions">
			<button class="btn btn-primary" onclick={() => (showNewReqModal = true)}>
				<span>➕ Buat Permintaan Barang (PO)</span>
			</button>
			<a href="/finance" class="btn btn-secondary">
				<span>💰 Buka Finance & True-Up</span>
			</a>
		</div>
	</header>

	<!-- Sub Tabs -->
	<div class="tabs-nav panel-card">
		<button
			class="tab-btn"
			class:active={activeSubTab === 'requisition'}
			onclick={() => (activeSubTab === 'requisition')}
		>
			<span class="tab-icon">📋</span>
			<span>Permintaan Barang ke Pusat (Blind PO)</span>
		</button>
		<button
			class="tab-btn"
			class:active={activeSubTab === 'receiving'}
			onclick={() => (activeSubTab === 'receiving')}
		>
			<span class="tab-icon">📥</span>
			<span>Penerimaan Fisik (Goods Receipt)</span>
		</button>
		<button
			class="tab-btn"
			class:active={activeSubTab === 'direct_purchase'}
			onclick={() => (activeSubTab === 'direct_purchase')}
		>
			<span class="tab-icon">⚡</span>
			<span>Pengajuan Pembelian Darurat Luar Gudang</span>
		</button>
	</div>

	<!-- TAB 1 & 2: Requisitions & Goods Receiving -->
	{#if activeSubTab === 'requisition' || activeSubTab === 'receiving'}
		<div class="table-container panel-card">
			<div class="table-head-row">
				<div>
					<h2 class="table-title">Daftar Permintaan Stok (Requisition Orders)</h2>
					<span class="table-sub">Status alur logistik dari gudang pusat ke outlet</span>
				</div>
			</div>

			<div class="table-scroll">
				<table class="data-table">
					<thead>
						<tr>
							<th>No. Permintaan</th>
							<th>Outlet Pemesan</th>
							<th>Daftar Bahan / Kemasan Diminta</th>
							<th>Catatan Store Manager</th>
							<th>Waktu Dibuat</th>
							<th>Status Logistik</th>
							<th>Aksi Outlet</th>
						</tr>
					</thead>
					<tbody>
						{#each requisitions as req}
							<tr class="table-row">
								<td class="code-col">
									<strong>{req.reqNumber}</strong>
									<small>{req.requesterName}</small>
								</td>
								<td>
									<strong>{req.outletName}</strong>
								</td>
								<td>
									<div class="items-chip-list">
										{#each req.items as it}
											<span class="item-tag-chip">
												{it.itemName}: <strong>{it.requestedQty} {it.unit}</strong>
											</span>
										{/each}
									</div>
								</td>
								<td>
									<span class="text-muted text-xs">{req.notes}</span>
								</td>
								<td>
									<span class="text-subtle text-xs">{req.createdAt}</span>
								</td>
								<td>
									{#if req.status === 'SUBMITTED'}
										<span class="pill-badge pill-warning">Menunggu Kirim Pusat</span>
									{:else if req.status === 'DISPATCHED'}
										<span class="pill-badge pill-live">Dalam Pengiriman 🚚</span>
									{:else if req.status === 'RECEIVED'}
										<span class="pill-badge pill-success">Barang Diterima Outlet</span>
									{:else}
										<span class="pill-badge">{req.status}</span>
									{/if}
								</td>
								<td>
									{#if req.status === 'DISPATCHED'}
										<button class="btn btn-primary btn-sm" onclick={() => confirmGoodsReceipt(req.id)}>
											<span>📥 Konfirmasi Terima</span>
										</button>
									{:else if req.status === 'RECEIVED'}
										<span class="text-gain text-xs font-bold">✓ Stok Bertambah</span>
									{:else}
										<span class="text-subtle text-xs">Menunggu Proses</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- TAB 3: Direct Purchase Emergency Request -->
	{#if activeSubTab === 'direct_purchase'}
		<div class="table-container panel-card">
			<div class="info-callout panel-card">
				<div class="callout-icon">🚨</div>
				<div class="callout-text">
					<strong>Pengajuan Pembelian di Luar Gudang Pusat (Direct Purchase)</strong>
					<p>
						Jika bahan baku habis total di tengah operasional sibuk dan pengiriman gudang pusat butuh waktu, Store Manager dapat mengajukan pembelian darurat di supermarket/supplier lokal terdekat. Memerlukan persetujuan Owner sebelum dibelanjakan.
					</p>
				</div>
			</div>

			<div class="direct-cards-grid">
				<div class="direct-card panel-subcard">
					<div class="card-head">
						<h3>Beli Es Batu Kristal 10 Pack (Indomaret / Alfamidi)</h3>
						<span class="pill-badge pill-success">Disetujui Owner</span>
					</div>
					<p class="text-muted text-xs">Supplier es batu langganan mogok saat cuaca panas terik di Senopati.</p>
					<div class="card-meta">
						<span>Estimasi Biaya: <strong>Rp 120.000</strong></span>
						<span>Diajukan: <strong>12 Okt 2026</strong></span>
					</div>
				</div>

				<div class="direct-card panel-subcard">
					<div class="card-head">
						<h3>Beli Gula Pasir Rose Brand 5 Kg</h3>
						<span class="pill-badge pill-success">Disetujui</span>
					</div>
					<p class="text-muted text-xs">Kebutuhan pembuatan simple syrup darurat untuk menu Mocktail.</p>
					<div class="card-meta">
						<span>Estimasi Biaya: <strong>Rp 87.500</strong></span>
						<span>Diajukan: <strong>11 Okt 2026</strong></span>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Modal: Buat Permintaan Barang Baru -->
{#if showNewReqModal}
	<div
		class="modal-backdrop"
		role="button"
		tabindex="0"
		aria-label="Tutup Modal"
		onclick={() => (showNewReqModal = false)}
		onkeydown={(e) => e.key === 'Escape' && (showNewReqModal = false)}
	>
		<div
			class="modal-box panel-card"
			role="dialog"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && (showNewReqModal = false)}
		>
			<div class="modal-head">
				<div>
					<span class="pill-badge pill-live">BLIND STOCK REQUISITION</span>
					<h3 class="modal-title">Formulir Permintaan Stok ke Gudang Pusat</h3>
				</div>
				<button class="close-btn" onclick={() => (showNewReqModal = false)}>✕</button>
			</div>

			<div class="modal-body">
				<form class="req-form" onsubmit={(e) => { e.preventDefault(); submitRequisition(); }}>
					<div class="form-group">
						<label for="outlet-sel">Outlet Pemohon</label>
						<select id="outlet-sel" bind:value={selectedOutlet} class="form-input">
							<option>Outlet Pusat (Senopati Flagship)</option>
							<option>Cabang BSD (GOP 9)</option>
						</select>
					</div>

					<div class="form-group">
						<label for="req-notes-input">Catatan Tambahan untuk Gudang Pusat</label>
						<input id="req-notes-input" type="text" bind:value={reqNotes} placeholder="Misal: Kirim sebelum jam 11 siang..." class="form-input" />
					</div>

					<!-- Items List Selection -->
					<div class="items-builder">
						<div class="builder-head">
							<span class="builder-label">Daftar Bahan & Kemasan Diminta:</span>
							<button type="button" class="btn btn-secondary btn-sm" onclick={addItemRow}>
								+ Tambah Baris
							</button>
						</div>

						{#each reqItems as item, idx}
							<div class="builder-row panel-subcard">
								<select
									class="form-input row-select"
									bind:value={item.itemId}
									onchange={(e) => {
										const sel = availableMaterials.find((m) => m.id === (e.target as HTMLSelectElement).value);
										if (sel) {
											item.itemName = sel.name;
											item.unit = sel.unit;
										}
									}}
								>
									{#each availableMaterials as mat}
										<option value={mat.id}>{mat.name} ({mat.unit})</option>
									{/each}
								</select>

								<input
									type="number"
									class="form-input row-qty"
									bind:value={item.requestedQty}
									min="1"
									step="1"
									required
								/>

								<span class="unit-label">{item.unit}</span>

								{#if reqItems.length > 1}
									<button type="button" class="del-row-btn" onclick={() => removeItemRow(idx)}>✕</button>
								{/if}
							</div>
						{/each}
					</div>

					<div class="modal-actions">
						<button type="button" class="btn btn-secondary" onclick={() => (showNewReqModal = false)}>Batal</button>
						<button type="submit" class="btn btn-primary">
							<span>Kirim Permintaan ke Gudang</span>
							<span>→</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<style>
	.procurement-page {
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

	.items-chip-list {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.item-tag-chip {
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-panel);
		padding: 3px 8px;
		border-radius: var(--radius-sm);
		font-size: 11.5px;
		color: var(--text-muted);
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

	.text-gain {
		color: #10b981;
	}

	/* Direct Cards */
	.direct-cards-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.direct-card {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.card-head h3 {
		font-size: 14.5px;
		font-weight: 700;
	}

	.card-meta {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
		color: var(--brand-primary);
		padding-top: 8px;
		border-top: 1px solid var(--border-panel);
	}

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

	/* Modal */
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
		max-width: 580px;
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

	.req-form {
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

	.items-builder {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 12px;
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-panel);
		border-radius: var(--radius-md);
	}

	.builder-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.builder-label {
		font-size: 12px;
		font-weight: 700;
		color: var(--brand-primary);
	}

	.builder-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px;
	}

	.row-select {
		flex: 1;
	}

	.row-qty {
		width: 80px;
	}

	.unit-label {
		font-size: 11.5px;
		color: var(--text-subtle);
		width: 50px;
	}

	.del-row-btn {
		color: #fb7185;
		font-size: 14px;
		padding: 4px 6px;
	}

	.modal-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 24px;
		padding-top: 20px;
		border-top: 1px solid var(--border-panel);
	}
</style>
