<script lang="ts">
	/**
	 * Halaman Utama: Pusat Persetujuan & Unified Inbox (MS-05)
	 * Mengikuti Golden Rule 1: UI Buta Sumber Data
	 * Mengikuti Golden Rule 2: Pemisahan Logika dari Tampilan Svelte
	 * Mengikuti Golden Rule 8: 4 Keadaan Layar Wajib
	 */

	import { onMount } from 'svelte';
	import { approvalsStore } from '../../lib/features/approvals/stores/approvals.svelte.js';
	import ApprovalInboxTable from '../../lib/features/approvals/components/ApprovalInboxTable.svelte';
	import ApprovalRulesSection from '../../lib/features/approvals/components/ApprovalRulesSection.svelte';
	import ApprovalDetailModal from '../../lib/features/approvals/components/ApprovalDetailModal.svelte';
	import ApprovalRejectModal from '../../lib/features/approvals/components/ApprovalRejectModal.svelte';
	import StepUpDialog from '../../lib/components/feedback/StepUpDialog.svelte';
	import Button from '../../lib/components/forms/Button.svelte';
	import { session } from '../../lib/auth/session.svelte.js';
	import '../../lib/features/approvals/approvals.css';

	let hasAccess = $derived(session.can('approvals:read'));

	onMount(() => {
		if (hasAccess) {
			approvalsStore.loadRequests();
			approvalsStore.loadRules();
		}
	});

	function handleStepUpVerified(token: string) {
		approvalsStore.handleStepUpVerified(token);
	}

	function handleStepUpCancel() {
		approvalsStore.isStepUpModalOpen = false;
	}
</script>

<svelte:head>
	<title>Pusat Persetujuan | HANJO ERP</title>
</svelte:head>

<div class="approvals-container">
	{#if !hasAccess}
		<!-- 4 Layar Wajib: Tidak Berhak (403 Forbidden) -->
		<div class="approvals-table-card p-12 text-center flex flex-col items-center justify-center gap-4">
			<div class="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
				<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
			</div>
			<div class="flex flex-col gap-1">
				<h2 class="text-lg font-bold text-main">Akses Ditolak (403 Forbidden)</h2>
				<p class="text-sm text-muted max-w-md">
					Peran akun Anda saat ini tidak memiliki wewenang untuk membuka modul Pusat Persetujuan.
				</p>
			</div>
		</div>
	{:else}
		<!-- Page Header -->
		<div class="approvals-header">
			<div class="approvals-title-group">
				<h1 class="approvals-main-title">Pusat Persetujuan (Approval Center)</h1>
				<p class="approvals-subtitle">
					Kotak masuk terpadu untuk evaluasi pengadaan luar, kas kecil bertingkat, selisih opname, dan usulan menu.
				</p>
			</div>

			<div class="flex items-center gap-3">
				<Button
					variant="secondary"
					size="sm"
					onclick={() => {
						approvalsStore.loadRequests();
						approvalsStore.loadRules();
					}}
				>
					<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
					</svg>
					<span>Segarkan Data</span>
				</Button>
			</div>
		</div>

		<!-- Tampilan Konten Sesuai Tab Aktif -->
		{#if approvalsStore.activeTab === 'rules'}
			<ApprovalRulesSection />
		{:else}
			<ApprovalInboxTable />
		{/if}

		<!-- Modal-Modal Pendukung Tindakan -->
		<ApprovalDetailModal />
		<ApprovalRejectModal />

		<!-- Dialog Step-Up Password/PIN untuk Tingkat Sensitif (AC-05.8) -->
		<StepUpDialog
			open={approvalsStore.isStepUpModalOpen}
			title="Verifikasi Step-Up Keamanan (Pimpinan)"
			description="Persetujuan tingkat 3 (nominal besar atau tindakan kritis) mewajibkan verifikasi kata sandi akun Anda (demo: 'demo' atau '123456')."
			onverified={handleStepUpVerified}
			oncancel={handleStepUpCancel}
		/>
	{/if}
</div>
