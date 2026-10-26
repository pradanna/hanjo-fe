<script lang="ts">
	import { formatRupiah } from '#lib/api/client';

	interface ApprovalItem {
		id: string;
		docType: string;
		docTypeName: string;
		refNumber: string;
		outletName: string;
		requesterName: string;
		submittedAt: string;
		status: string;
		nominal: number;
		details: string;
		approverRole: string;
		reasonRequired?: boolean;
		decidedAt?: string;
		decidedBy?: string;
		rejectNote?: string;
	}

	let activeFilter = $state<'PENDING' | 'HISTORY'>('PENDING');
	let selectedRequest = $state<ApprovalItem | null>(null);
	let rejectReason = $state('');
	let showRejectModal = $state(false);

	let approvalList = $state<ApprovalItem[]>([
		{
			id: 'app-01',
			docType: 'external_purchase_order',
			docTypeName: 'PO Pembelian Pemasok Luar',
			refNumber: 'PO-EXT-202610-001',
			outletName: 'Cabang BSD (GOP 9)',
			requesterName: 'Siti Aminah (Store Manager)',
			submittedAt: '13 Okt 2026 11:20 WIB',
			status: 'PENDING',
			nominal: 1250000,
			details: 'Pembelian 25kg Es Batu Kristal Higienis langsung dari distributor lokal karena pengiriman pusat tertunda.',
			approverRole: 'Owner / Pimpinan',
			reasonRequired: true
		},
		{
			id: 'app-02',
			docType: 'petty_cash_expense',
			docTypeName: 'Pengeluaran Kas Kecil Bertingkat',
			refNumber: 'PC-SEN-202610-012',
			outletName: 'Senopati Flagship',
			requesterName: 'Budi Pratama (Store Manager)',
			submittedAt: '12 Okt 2026 13:40 WIB',
			status: 'PENDING',
			nominal: 350000, // > Rp 150.000 batas bebas
			details: 'Penggantian Seal Karet Steam Wand Mesin Espresso Sanremo (Mendesak untuk operasional akhir pekan).',
			approverRole: 'Owner / Finance',
			reasonRequired: false
		},
		{
			id: 'app-03',
			docType: 'menu_proposal',
			docTypeName: 'Usulan Menu Lokal Outlet',
			refNumber: 'PROP-202610-004',
			outletName: 'Cabang BSD (GOP 9)',
			requesterName: 'Siti Aminah (Store Manager)',
			submittedAt: '11 Okt 2026 16:30 WIB',
			status: 'APPROVED',
			nominal: 34000,
			details: 'Usulan menu "Pandan Cold Brew Latte" (Estimasi HPP: Rp 9.800, Margin Target: 71.2%).',
			approverRole: 'Admin Pusat',
			decidedAt: '12 Okt 2026 09:15 WIB',
			decidedBy: 'Admin Pusat (Hendro)'
		}
	]);

	function handleApprove(req: any) {
		req.status = 'APPROVED';
		req.decidedAt = 'Hari Ini 14:00 WIB';
		req.decidedBy = 'Budi Pratama (Owner)';
	}

	function handleRejectSubmit() {
		if (selectedRequest && rejectReason.trim()) {
			selectedRequest.status = 'REJECTED';
			selectedRequest.rejectNote = rejectReason;
			selectedRequest.decidedAt = 'Hari Ini 14:00 WIB';
			selectedRequest.decidedBy = 'Budi Pratama (Owner)';
			showRejectModal = false;
			rejectReason = '';
			selectedRequest = null;
		}
	}
</script>

<svelte:head>
	<title>Mesin Aturan Persetujuan | HANJO ERP</title>
</svelte:head>

<div class="approvals-page">
	<!-- Page Header -->
	<div class="page-head-row">
		<div>
			<h1 class="page-title">Pusat Persetujuan (Approval Center)</h1>
			<p class="page-subtitle">
				Mesin persetujuan berjenjang untuk otorisasi belanja luar pusat, kas kecil di atas batas, dan usulan menu (PRD 6.13).
			</p>
		</div>

		<div class="tab-pills-nav">
			<button class="pill-btn" class:active={activeFilter === 'PENDING'} onclick={() => (activeFilter = 'PENDING')}>
				<span>Menunggu Keputusan</span>
				<span class="pill-badge pill-info">
					{approvalList.filter((a) => a.status === 'PENDING').length}
				</span>
			</button>
			<button class="pill-btn" class:active={activeFilter === 'HISTORY'} onclick={() => (activeFilter = 'HISTORY')}>
				<span>Riwayat Keputusan</span>
			</button>
		</div>
	</div>

	<!-- Requests List -->
	<div class="requests-grid">
		{#each approvalList.filter((a) => (activeFilter === 'PENDING' ? a.status === 'PENDING' : a.status !== 'PENDING')) as req}
			<div class="panel-card request-card">
				<div class="card-head">
					<div class="doc-type-badge">
						{#if req.docType === 'external_purchase_order'}
							<span class="pill-badge pill-danger">Belanja Luar Pusat</span>
						{:else if req.docType === 'petty_cash_expense'}
							<span class="pill-badge pill-warning">Kas Kecil Bertingkat</span>
						{:else}
							<span class="pill-badge pill-info">Usulan Menu Lokal</span>
						{/if}
						<strong class="font-mono">{req.refNumber}</strong>
					</div>

					<div class="status-col">
						{#if req.status === 'PENDING'}
							<span class="pill-badge pill-warning">Menunggu Otorisasi</span>
						{:else if req.status === 'APPROVED'}
							<span class="pill-badge pill-success">Disetujui</span>
						{:else}
							<span class="pill-badge pill-danger">Ditolak</span>
						{/if}
					</div>
				</div>

				<div class="card-body">
					<div class="meta-row">
						<div>
							<span class="text-subtle">Outlet:</span>
							<strong>{req.outletName}</strong>
						</div>
						<div>
							<span class="text-subtle">Diajukan Oleh:</span>
							<span>{req.requesterName}</span>
						</div>
						<div>
							<span class="text-subtle">Waktu Pengajuan:</span>
							<span class="text-muted">{req.submittedAt}</span>
						</div>
						<div>
							<span class="text-subtle">Nominal / Nilai:</span>
							<strong class="font-mono text-primary font-bold">{formatRupiah(req.nominal)}</strong>
						</div>
					</div>

					<div class="details-box">
						<span class="text-subtle text-xs">Uraian & Alasan Pengajuan:</span>
						<p class="details-p">{req.details}</p>
					</div>

					{#if req.status === 'REJECTED' && req.rejectNote}
						<div class="reject-note-box">
							<strong>Alasan Penolakan:</strong>
							<p>{req.rejectNote}</p>
						</div>
					{/if}
				</div>

				{#if req.status === 'PENDING'}
					<div class="card-actions">
						<span class="approver-role-tag">Hak Otorisasi: {req.approverRole}</span>
						<div class="action-buttons">
							<button
								class="btn btn-secondary btn-reject"
								onclick={() => {
									selectedRequest = req;
									showRejectModal = true;
								}}
							>
								Tolak Pengajuan
							</button>
							<button class="btn btn-primary" onclick={() => handleApprove(req)}>
								✓ Setujui Sekarang
							</button>
						</div>
					</div>
				{:else}
					<div class="card-actions decided">
						<span class="text-subtle">Diputuskan oleh: <strong>{req.decidedBy}</strong> pada {req.decidedAt}</span>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Modal Reject Reason -->
	{#if showRejectModal}
		<div
			class="modal-backdrop"
			role="button"
			tabindex="0"
			aria-label="Tutup Modal Penolakan"
			onclick={(e) => {
				if (e.target === e.currentTarget) showRejectModal = false;
			}}
			onkeydown={(e) => e.key === 'Escape' && (showRejectModal = false)}
		>
			<div
				class="modal-box panel-card"
				role="region"
				aria-label="Modal Alasan Penolakan"
			>
				<h3 class="modal-title">Tolak Pengajuan {selectedRequest?.refNumber}</h3>
				<p class="modal-sub">
					Sesuai aturan PRD 6.13, penolakan transaksi wajib menyertakan alasan tertulis untuk dicatat di audit log.
				</p>

				<div class="form-group">
					<label for="reject-reason" class="input-label">Catatan / Alasan Penolakan:</label>
					<textarea
						id="reject-reason"
						class="text-area"
						placeholder="Contoh: Nominal terlalu tinggi, gunakan supplier rekanan resmi pusat."
						bind:value={rejectReason}
						rows="3"
					></textarea>
				</div>

				<div class="modal-footer">
					<button class="btn btn-secondary" onclick={() => (showRejectModal = false)}>Batal</button>
					<button class="btn btn-danger" onclick={handleRejectSubmit}>Konfirmasi Penolakan</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.approvals-page {
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

	.tab-pills-nav {
		display: flex;
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-panel);
		border-radius: var(--radius-md);
		padding: 3px;
	}

	.pill-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 14px;
		font-size: 12.5px;
		font-weight: 600;
		color: var(--text-muted);
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		transition: all 0.15s;
	}

	.pill-btn.active {
		background: var(--pill-success-bg, rgba(16, 185, 129, 0.14));
		color: var(--pill-success-text, #34d399);
		border: 1px solid var(--pill-success-border, rgba(16, 185, 129, 0.35));
		box-shadow: 0 2px 8px rgba(16, 185, 129, 0.12);
	}

	/* Requests */
	.requests-grid {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.request-card {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.card-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--border-panel);
	}

	.doc-type-badge {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.meta-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 14px;
		font-size: 12.5px;
		background: var(--bg-panel-sub);
		padding: 12px 16px;
		border-radius: var(--radius-md);
	}

	.text-primary {
		color: var(--brand-primary);
	}

	.details-box {
		margin-top: 12px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.details-p {
		font-size: 13px;
		color: var(--text-main);
		line-height: 1.5;
	}

	.reject-note-box {
		margin-top: 10px;
		padding: 10px 14px;
		border-radius: var(--radius-sm);
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		font-size: 12px;
	}

	.card-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 14px;
		border-top: 1px solid var(--border-panel);
		flex-wrap: wrap;
		gap: 12px;
	}

	.card-actions.decided {
		font-size: 12px;
	}

	.approver-role-tag {
		font-size: 11.5px;
		color: var(--text-subtle);
		font-weight: 500;
	}

	.action-buttons {
		display: flex;
		gap: 10px;
	}

	.btn-reject {
		color: #dc2626;
	}

	.btn-reject:hover {
		background: #fef2f2;
		border-color: #fecaca;
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
		max-width: 480px;
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

	.text-area {
		width: 100%;
		padding: 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-panel);
		font-size: 12.5px;
		outline: none;
		font-family: inherit;
	}

	.text-area:focus {
		border-color: var(--brand-primary);
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 24px;
		padding-top: 20px;
		border-top: 1px solid var(--border-panel);
	}

	.text-subtle {
		color: var(--text-subtle);
	}

	.text-xs {
		font-size: 11px;
	}
</style>
