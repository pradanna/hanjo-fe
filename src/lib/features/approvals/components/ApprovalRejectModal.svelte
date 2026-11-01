<script lang="ts">
	/**
	 * Modal Penolakan Permohonan Persetujuan (AC-05.4)
	 * Memastikan alasan penolakan wajib diisi untuk transparansi audit.
	 */

	import Modal from '../../../components/feedback/Modal.svelte';
	import Button from '../../../components/forms/Button.svelte';
	import Textarea from '../../../components/forms/Textarea.svelte';
	import { approvalsStore } from '../stores/approvals.svelte.js';

	function handleClose() {
		approvalsStore.closeRejectModal();
	}

	function handleSubmit() {
		approvalsStore.submitReject();
	}
</script>

<Modal
	open={approvalsStore.isRejectModalOpen}
	title="Tolak Permohonan Persetujuan"
	maxWidth="520px"
	onclose={handleClose}
>
	<div class="flex flex-col gap-5">
		{#if approvalsStore.selectedRequest}
			<div class="p-3.5 bg-panel-sub border border-panel rounded-md text-sm">
				<div class="font-bold text-main">{approvalsStore.selectedRequest.document_title}</div>
				<div class="text-xs text-muted font-mono mt-1">
					Ref: {approvalsStore.selectedRequest.document_ref} · {approvalsStore.selectedRequest.outlet_name || 'Gerai'}
				</div>
			</div>
		{/if}

		<div class="flex flex-col gap-2">
			<Textarea
				label="Alasan Penolakan (Wajib Diisi)"
				placeholder="Contoh: Anggaran kas kecil cabang telah melewati kuota operasional bulan berjalan, atau nota pendukung belum dilampirkan..."
				bind:value={approvalsStore.rejectReason}
				error={approvalsStore.rejectError}
				rows={4}
				required
			/>
			<span class="text-xs text-muted">
				Alasan ini akan tercatat permanen pada linimasa riwayat persetujuan dan dapat dibaca oleh pemohon.
			</span>
		</div>
	</div>

	{#snippet footer()}
		<div class="flex items-center justify-end gap-3 w-full">
			<Button
				variant="secondary"
				size="md"
				disabled={approvalsStore.actionLoading}
				onclick={handleClose}
			>
				Batal
			</Button>
			<Button
				variant="danger"
				size="md"
				loading={approvalsStore.actionLoading}
				onclick={handleSubmit}
			>
				Konfirmasi Tolak
			</Button>
		</div>
	{/snippet}
</Modal>
