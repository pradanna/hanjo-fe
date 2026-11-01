/**
 * State Controller: Mesin Persetujuan Multi-Tier & Unified Inbox (MS-05)
 * Menggunakan Svelte 5 Runes ($state, $derived)
 * Mengikuti Golden Rule 2: Pemisahan Logika dari Tampilan Svelte.
 */

import { approvalService } from '../../../services/approval.service.js';
import { navBadges } from '../../nav/stores/badges.svelte.js';
import { session } from '../../../auth/session.svelte.js';
import {
	canUserApproveRequest,
	validateRejectReason,
	evaluatePettyCashTier
} from '../../../domain/approval.js';
import { toast } from '../../../components/feedback/toast.svelte.js';
import type {
	ApprovalRequest,
	ApprovalRule,
	ApprovalDocumentType,
	EvaluateApprovalResult
} from '../../../api/contract/types.js';

export class ApprovalsStore {
	// State Data Utama
	requests = $state<ApprovalRequest[]>([]);
	rules = $state<ApprovalRule[]>([]);
	selectedRequest = $state<ApprovalRequest | null>(null);

	// Tab & Filter State
	activeTab = $state<'pending_for_me' | 'submitted_by_me' | 'history' | 'rules'>('pending_for_me');
	typeFilter = $state<string>('all');
	outletFilter = $state<string>('all');
	statusFilter = $state<string>('all');
	searchQuery = $state<string>('');

	// Loading & Error States
	isLoading = $state<boolean>(false);
	error = $state<string | null>(null);
	actionLoading = $state<boolean>(false);

	// Reject Modal State
	isRejectModalOpen = $state<boolean>(false);
	rejectReason = $state<string>('');
	rejectError = $state<string>('');

	// Step-Up Modal State
	isStepUpModalOpen = $state<boolean>(false);
	pendingApprovalNote = $state<string>('');

	// Rule Tester State (AC-05.1)
	testerDocType = $state<ApprovalDocumentType>('petty_cash_expense');
	testerOutletId = $state<string>('out-jkt-01');
	testerAmount = $state<string>('150000.00');
	testerDailyCumulative = $state<string>('230000.00');
	testerVariancePct = $state<number>(0);
	testerResult = $state<EvaluateApprovalResult | null>(null);
	testerLoading = $state<boolean>(false);

	// Rule Editor Modal State
	isRuleModalOpen = $state<boolean>(false);
	editingRule = $state<Partial<ApprovalRule> | null>(null);

	// Derived States
	currentUser = $derived(session.user);

	pendingForMeCount = $derived.by(() => {
		const user = this.currentUser;
		if (!user || user.role === 'store_manager' || user.role === 'cashier') return 0;
		return this.requests.filter((r) => {
			if (r.status !== 'pending') return false;
			if (r.submitted_by.id === user.id) return false;
			if (user.role === 'owner') return true;
			return r.approver_roles.includes(user.role);
		}).length;
	});

	submittedByMeCount = $derived.by(() => {
		const user = this.currentUser;
		if (!user) return 0;
		return this.requests.filter((r) => r.submitted_by.id === user.id).length;
	});

	historyCount = $derived.by(() => {
		return this.requests.filter((r) => r.status !== 'pending').length;
	});

	rulesCount = $derived.by(() => {
		return this.rules.filter((r) => r.is_active).length;
	});

	filteredRequests = $derived.by(() => {
		let list = this.requests;
		const user = this.currentUser;

		// Saring berdasarkan tab aktif
		if (this.activeTab === 'pending_for_me') {
			if (!user || user.role === 'store_manager' || user.role === 'cashier') {
				list = [];
			} else {
				list = list.filter((r) => {
					if (r.status !== 'pending') return false;
					if (r.submitted_by.id === user.id) return false;
					if (user.role === 'owner') return true;
					return r.approver_roles.includes(user.role);
				});
			}
		} else if (this.activeTab === 'submitted_by_me') {
			if (user) {
				list = list.filter((r) => r.submitted_by.id === user.id);
			}
		} else if (this.activeTab === 'history') {
			list = list.filter((r) => r.status !== 'pending');
		}

		// Saring jenis dokumen
		if (this.typeFilter && this.typeFilter !== 'all') {
			list = list.filter((r) => r.document_type === this.typeFilter);
		}

		// Saring outlet
		if (this.outletFilter && this.outletFilter !== 'all') {
			list = list.filter((r) => r.outlet_id === this.outletFilter);
		}

		// Saring status (khusus tab history atau all)
		if (this.statusFilter && this.statusFilter !== 'all') {
			list = list.filter((r) => r.status === this.statusFilter);
		}

		// Saring teks pencarian
		if (this.searchQuery.trim()) {
			const q = this.searchQuery.toLowerCase();
			list = list.filter(
				(r) =>
					r.document_ref.toLowerCase().includes(q) ||
					r.document_title.toLowerCase().includes(q) ||
					r.submitted_by.name.toLowerCase().includes(q) ||
					(r.outlet_name && r.outlet_name.toLowerCase().includes(q))
			);
		}

		return list;
	});

	canApproveSelected = $derived.by(() => {
		if (!this.selectedRequest || !this.currentUser) return false;
		return canUserApproveRequest(this.currentUser, this.selectedRequest).allowed;
	});

	canCancelSelected = $derived.by(() => {
		if (!this.selectedRequest || !this.currentUser) return false;
		return (
			this.selectedRequest.status === 'pending' &&
			(this.selectedRequest.submitted_by.id === this.currentUser.id || this.currentUser.role === 'owner')
		);
	});

	// =========================================================================
	// AKSI DATA
	// =========================================================================

	async loadRequests() {
		this.isLoading = true;
		this.error = null;

		try {
			// Muat seluruh daftar untuk kalkulasi tab counts secara terpadu
			const data = await approvalService.getRequests({ tab: undefined });
			this.requests = data;
			await navBadges.refresh();
		} catch (err: any) {
			this.error = err.message || 'Gagal memuat daftar persetujuan.';
		} finally {
			this.isLoading = false;
		}
	}

	async loadRules() {
		try {
			const data = await approvalService.getRules();
			this.rules = data;
		} catch (err: any) {
			console.error('Gagal memuat aturan persetujuan:', err);
		}
	}

	selectRequest(req: ApprovalRequest | null) {
		this.selectedRequest = req;
	}

	closeDetail() {
		this.selectedRequest = null;
	}

	// ---------------------------------------------------------------------------
	// Menyetujui Permohonan (AC-05.2, AC-05.3, AC-05.8)
	// ---------------------------------------------------------------------------
	async approveRequest(req: ApprovalRequest, note?: string) {
		if (!this.currentUser) return;

		// Jika membutuhkan Step-Up Auth dan belum diverifikasi, buka dialog Step-Up
		if (req.require_step_up) {
			this.selectedRequest = req;
			this.pendingApprovalNote = note || '';
			this.isStepUpModalOpen = true;
			return;
		}

		await this.executeApprove(req, note);
	}

	async executeApprove(req: ApprovalRequest, note?: string, stepUpToken?: string) {
		this.actionLoading = true;
		try {
			const updated = await approvalService.approve(
				req.id,
				{
					note,
					step_up_token: stepUpToken
				},
				req.version
			);

			// Perbarui item di list lokal
			const idx = this.requests.findIndex((r) => r.id === req.id);
			if (idx !== -1) {
				this.requests[idx] = updated;
			}
			if (this.selectedRequest?.id === req.id) {
				this.selectedRequest = updated;
			}

			toast.success(
				'Dokumen Berhasil Disetujui',
				`Permohonan ${updated.document_ref} telah disetujui.`
			);

			await navBadges.refresh();
		} catch (err: any) {
			toast.error('Persetujuan Gagal', err.message || 'Terjadi kesalahan saat menyetujui dokumen.');
		} finally {
			this.actionLoading = false;
		}
	}

	handleStepUpVerified(token: string) {
		this.isStepUpModalOpen = false;
		if (this.selectedRequest) {
			this.executeApprove(this.selectedRequest, this.pendingApprovalNote, token);
		}
	}

	// ---------------------------------------------------------------------------
	// Menolak Permohonan (AC-05.4)
	// ---------------------------------------------------------------------------
	openRejectModal(req: ApprovalRequest) {
		this.selectedRequest = req;
		this.rejectReason = '';
		this.rejectError = '';
		this.isRejectModalOpen = true;
	}

	closeRejectModal() {
		this.isRejectModalOpen = false;
		this.rejectReason = '';
		this.rejectError = '';
	}

	async submitReject() {
		if (!this.selectedRequest) return;

		const validation = validateRejectReason(this.rejectReason);
		if (!validation.valid) {
			this.rejectError = validation.error!;
			return;
		}

		this.actionLoading = true;
		this.rejectError = '';

		try {
			const updated = await approvalService.reject(
				this.selectedRequest.id,
				{
					reason: this.rejectReason.trim()
				},
				this.selectedRequest.version
			);

			const idx = this.requests.findIndex((r) => r.id === this.selectedRequest!.id);
			if (idx !== -1) {
				this.requests[idx] = updated;
			}
			this.selectedRequest = updated;

			this.closeRejectModal();
			toast.info('Permohonan Ditolak', `Permohonan ${updated.document_ref} telah ditolak dengan alasan tercatat.`);

			await navBadges.refresh();
		} catch (err: any) {
			this.rejectError = err.message || 'Gagal menolak permohonan.';
		} finally {
			this.actionLoading = false;
		}
	}

	// ---------------------------------------------------------------------------
	// Membatalkan / Menarik Kembali Permohonan oleh Pemohon
	// ---------------------------------------------------------------------------
	async cancelRequest(req: ApprovalRequest, note?: string) {
		this.actionLoading = true;
		try {
			const updated = await approvalService.cancel(req.id, { note }, req.version);

			const idx = this.requests.findIndex((r) => r.id === req.id);
			if (idx !== -1) {
				this.requests[idx] = updated;
			}
			if (this.selectedRequest?.id === req.id) {
				this.selectedRequest = updated;
			}

			toast.info('Permohonan Ditarik', `Permohonan ${updated.document_ref} telah ditarik kembali.`);
			await navBadges.refresh();
		} catch (err: any) {
			toast.error('Gagal Menarik Permohonan', err.message || 'Terjadi kesalahan saat membatalkan permohonan.');
		} finally {
			this.actionLoading = false;
		}
	}

	// ---------------------------------------------------------------------------
	// Panel Uji Aturan Interaktif (AC-05.1 & PG-set-approval-rules)
	// ---------------------------------------------------------------------------
	async evaluateTester() {
		this.testerLoading = true;
		try {
			const result = await approvalService.evaluateRules({
				document_type: this.testerDocType,
				outlet_id: this.testerOutletId,
				amount: this.testerAmount,
				daily_cumulative: this.testerDailyCumulative,
				variance_pct: this.testerVariancePct
			});
			this.testerResult = result;
		} catch (err: any) {
			console.error('Gagal mengevaluasi aturan:', err);
		} finally {
			this.testerLoading = false;
		}
	}

	/**
	 * Menjalankan Skenario Cepat Uji Kas Kecil Bertingkat (§6.8)
	 */
	applyQuickScenario(scenarioIndex: 1 | 2 | 3 | 4) {
		this.testerDocType = 'petty_cash_expense';

		if (scenarioIndex === 1) {
			// Skenario 1: 80.000 -> Tingkat 1
			this.testerAmount = '80000.00';
			this.testerDailyCumulative = '80000.00';
		} else if (scenarioIndex === 2) {
			// Skenario 2: 150.000 (melewati batas per transaksi) -> Tingkat 2
			this.testerAmount = '150000.00';
			this.testerDailyCumulative = '230000.00';
		} else if (scenarioIndex === 3) {
			// Skenario 3: 50.000 (total harian 320.000 > 300.000) -> Tingkat 2
			this.testerAmount = '50000.00';
			this.testerDailyCumulative = '320000.00';
		} else if (scenarioIndex === 4) {
			// Skenario 4: 1.200.000 -> Tingkat 3 Pimpinan / Owner + Step-Up
			this.testerAmount = '1200000.00';
			this.testerDailyCumulative = '1200000.00';
		}

		this.evaluateTester();
	}

	// ---------------------------------------------------------------------------
	// Editor Konfigurasi Aturan
	// ---------------------------------------------------------------------------
	openRuleEditor(rule?: ApprovalRule) {
		this.editingRule = rule
			? structuredClone(rule)
			: {
					name: '',
					document_type: 'external_purchase_order',
					tier: 2,
					approver_roles: ['owner'],
					mode: 'any_of',
					require_step_up: false,
					is_active: true,
					priority: 10
				};
		this.isRuleModalOpen = true;
	}

	closeRuleEditor() {
		this.isRuleModalOpen = false;
		this.editingRule = null;
	}

	async saveRule() {
		if (!this.editingRule) return;

		this.actionLoading = true;
		try {
			if (this.editingRule.id) {
				const updated = await approvalService.updateRule(
					this.editingRule.id,
					this.editingRule,
					this.editingRule.version
				);
				const idx = this.rules.findIndex((r) => r.id === updated.id);
				if (idx !== -1) this.rules[idx] = updated;
				toast.success('Aturan Diperbarui', `Aturan "${updated.name}" berhasil disimpan.`);
			} else {
				const created = await approvalService.createRule(this.editingRule);
				this.rules.unshift(created);
				toast.success('Aturan Ditambahkan', `Aturan baru "${created.name}" berhasil dibuat.`);
			}
			this.closeRuleEditor();
			// Evaluasi ulang tester jika sedang terbuka
			this.evaluateTester();
		} catch (err: any) {
			toast.error('Gagal Menyimpan Aturan', err.message || 'Terjadi kesalahan.');
		} finally {
			this.actionLoading = false;
		}
	}
}

export const approvalsStore = new ApprovalsStore();
