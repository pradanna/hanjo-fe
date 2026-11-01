<script lang="ts">
	/**
	 * Modal Detail Persetujuan & Tindakan (PG-apr-detail)
	 * Mengimplementasikan Progressive Disclosure:
	 * Menampilkan ringkasan dokumen sumber, aturan aktif & tingkat,
	 * linimasa persetujuan, dan tombol aksi (Setujui, Tolak, Tarik Kembali).
	 */

	import Modal from '../../../components/feedback/Modal.svelte';
	import Button from '../../../components/forms/Button.svelte';
	import StatusBadge from '../../../components/data/StatusBadge.svelte';
	import ApprovalDocPreview from './ApprovalDocPreview.svelte';
	import { approvalsStore } from '../stores/approvals.svelte.js';
	import { formatRupiah, formatDate } from '../../../utils/format.js';

	let approvalNote = $state('');

	function handleClose() {
		approvalNote = '';
		approvalsStore.closeDetail();
	}

	function handleApprove() {
		if (approvalsStore.selectedRequest) {
			approvalsStore.approveRequest(approvalsStore.selectedRequest, approvalNote);
		}
	}

	function handleOpenReject() {
		if (approvalsStore.selectedRequest) {
			approvalsStore.openRejectModal(approvalsStore.selectedRequest);
		}
	}

	function handleCancel() {
		if (approvalsStore.selectedRequest) {
			approvalsStore.cancelRequest(approvalsStore.selectedRequest);
		}
	}
</script>

<Modal
	open={approvalsStore.selectedRequest !== null}
	title="Rincian Permohonan Persetujuan"
	maxWidth="760px"
	onclose={handleClose}
>
	{#if approvalsStore.selectedRequest}
		{@const req = approvalsStore.selectedRequest}
		<div class="detail-modal-body">
			<!-- Header Ringkasan Permohonan -->
			<div class="doc-summary-card">
				<div class="summary-header-row">
					<div class="flex flex-col gap-1">
						<span class="text-xs font-mono font-bold text-muted uppercase tracking-wider">
							{req.document_ref} · {req.outlet_name || 'Gerai'}
						</span>
						<h2 class="text-lg font-bold text-main">{req.document_title}</h2>
					</div>
					<StatusBadge status={req.status} size="md" />
				</div>

				<div class="summary-header-row items-end mt-2">
					<div class="flex flex-col gap-1">
						<span class="text-xs text-muted">Diajukan oleh</span>
						<span class="text-sm font-bold text-main">{req.submitted_by.name}</span>
						<span class="text-xs text-subtle font-mono">{formatDate(req.created_at, true)}</span>
					</div>

					{#if req.amount}
						<div class="flex flex-col items-end gap-1">
							<span class="text-xs text-muted">Total Nilai Dokumen</span>
							<span class="summary-nominal-large text-emerald-600">
								{formatRupiah(Number(req.amount))}
							</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Callout Aturan & Tingkat Persetujuan (AC-05.1 & AC-05.3) -->
			<div class="rule-callout-card">
				<div class="rule-callout-header">
					<div class="flex items-center gap-2">
						<span class="tier-pill tier-{req.tier}">
							Tingkat {req.tier}
						</span>
						<span class="rule-callout-title">{req.rule_name || 'Aturan Persetujuan'}</span>
					</div>

					<div class="flex items-center gap-2">
						<span class="text-xs font-semibold text-muted">
							Mode: {req.mode === 'any_of' ? 'Salah Satu (Any-Of)' : 'Semua Penyetuju (All-Of)'}
						</span>
						{#if req.require_step_up}
							<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
								Butuh Step-Up PIN
							</span>
						{/if}
					</div>
				</div>

				<p class="rule-callout-desc">
					Dokumen ini memerlukan persetujuan dari peran: <strong>{req.approver_roles.join(', ')}</strong>.
					{#if req.mode === 'any_of'}
						Cukup satu penyetuju yang berwenang untuk menyelesaikan permohonan.
					{:else}
						Seluruh peran di atas wajib memberikan persetujuan sebelum dokumen resmi disetujui.
					{/if}
				</p>
			</div>

			<!-- Invarian Segregasi Tugas: Peringatan jika Pembuat adalah Pengguna Saat Ini (AC-05.2) -->
			{#if approvalsStore.currentUser && req.submitted_by.id === approvalsStore.currentUser.id && req.status === 'pending'}
				<div class="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-md flex items-center gap-3 text-xs text-amber-600">
					<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<line x1="12" x2="12" y1="8" y2="12" />
						<line x1="12" x2="12.01" y1="16" y2="16" />
					</svg>
					<div>
						<strong>Segregasi Tugas (Segregation of Duties):</strong> Anda adalah pembuat dokumen ini. Anda tidak dapat menyetujui permohonan yang Anda buat sendiri.
					</div>
				</div>
			{/if}

			<!-- Viewer Dokumen Sumber Spesifik -->
			<ApprovalDocPreview request={req} />

			<!-- Informasi Penolakan Jika Dokumen Ditolak -->
			{#if req.status === 'rejected' && req.rejection}
				<div class="p-4 bg-red-500/10 border border-red-500/25 rounded-md flex flex-col gap-2">
					<div class="flex items-center justify-between text-xs font-bold text-red-600">
						<span>Ditolak oleh {req.rejection.rejected_by_name} ({req.rejection.role})</span>
						<span class="font-mono">{formatDate(req.rejection.decided_at, true)}</span>
					</div>
					<div class="text-sm text-red-700 italic">
						"{req.rejection.reason}"
					</div>
				</div>
			{/if}

			<!-- Linimasa Persetujuan (Audit Trail) -->
			<div class="flex flex-col gap-3">
				<h3 class="text-sm font-bold text-main">Linimasa & Riwayat Tindakan</h3>
				<div class="approval-timeline-list">
					{#each req.timeline as node}
						<div class="timeline-node-item">
							<div
								class="timeline-node-dot"
								class:dot-active={node.action === 'approved'}
								class:dot-danger={node.action === 'rejected'}
							></div>
							<div class="timeline-node-content">
								<div class="timeline-node-title">
									{node.actor_name}
									<span class="text-xs font-normal text-muted">({node.actor_role})</span>
								</div>
								<div class="timeline-node-meta">
									{formatDate(node.timestamp, true)} · Aksi: <strong>{node.action}</strong>
								</div>
								{#if node.note}
									<div class="timeline-node-note">
										{node.note}
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	{#snippet footer()}
		<div class="flex items-center justify-between w-full">
			<div>
				{#if approvalsStore.canCancelSelected}
					<Button
						variant="secondary"
						size="md"
						disabled={approvalsStore.actionLoading}
						onclick={handleCancel}
					>
						Tarik Kembali Permohonan
					</Button>
				{/if}
			</div>

			<div class="flex items-center gap-3">
				<Button
					variant="secondary"
					size="md"
					disabled={approvalsStore.actionLoading}
					onclick={handleClose}
				>
					Tutup
				</Button>

				{#if approvalsStore.canApproveSelected}
					<Button
						variant="danger"
						size="md"
						disabled={approvalsStore.actionLoading}
						onclick={handleOpenReject}
					>
						Tolak
					</Button>

					<Button
						variant="primary"
						size="md"
						loading={approvalsStore.actionLoading}
						onclick={handleApprove}
					>
						Setujui Dokumen
					</Button>
				{/if}
			</div>
		</div>
	{/snippet}
</Modal>
