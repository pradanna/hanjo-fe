import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
	evaluatePettyCashTier,
	evaluateApprovalRules,
	canUserApproveRequest,
	evaluateApprovalCompletion,
	validateRejectReason,
	validateDocumentVersionMatch,
	getRuleSpecificity
} from '../../domain/approval.js';
import { approvalService } from '../../services/approval.service.js';
import { navService } from '../../services/nav.service.js';
import {
	mockApprovalRules,
	mockApprovalRequests,
	mockSourceDocumentVersions
} from '../../api/drivers/mock/handlers/approval.js';
import { setCurrentMockUser } from '../../api/drivers/mock/handlers/auth.js';
import { eventBus } from '../../api/drivers/mock/engine/events.js';
import type { User, ApprovalRequest } from '../../api/contract/types.js';

describe('MS-05: Mesin Persetujuan Multi-Tier, Evaluasi Aturan & Inbox', () => {
	// =========================================================================
	// AC-05.1: Panel Uji Aturan & Vektor Skenario Tabel §6.8
	// =========================================================================
	describe('Uji 1: AC-05.1 Vektor Uji Kas Kecil Bertingkat (§6.8)', () => {
		it('Skenario 1: Rp 80.000 -> Tingkat 1: langsung tercatat tanpa persetujuan', () => {
			const res = evaluatePettyCashTier(80000, 80000);
			assert.equal(res.tier, 1);
			assert.equal(res.requires_approval, false);
			assert.deepEqual(res.approver_roles, []);
		});

		it('Skenario 2: Rp 80.000 lalu Rp 150.000 -> Tingkat 2 (melewati batas per transaksi Rp 100.000)', () => {
			const res = evaluatePettyCashTier(150000, 230000);
			assert.equal(res.tier, 2);
			assert.equal(res.requires_approval, true);
			assert.deepEqual(res.approver_roles, ['finance', 'owner']);
			assert.equal(res.mode, 'any_of');
			assert.equal(res.require_step_up, false);
		});

		it('Skenario 3: 90.000 x 3 lalu 50.000 -> total 320.000 > 300.000 -> Tingkat 2 meski per transaksi 50.000', () => {
			// Transaksi ke-4 nominalnya 50.000 (di bawah 100.000), tapi kumulatif harian menjadi 320.000 > 300.000
			const res = evaluatePettyCashTier(50000, 320000);
			assert.equal(res.tier, 2);
			assert.equal(res.requires_approval, true);
			assert.deepEqual(res.approver_roles, ['finance', 'owner']);
		});

		it('Skenario 4: Rp 1.200.000 -> Tingkat 3: Pimpinan / Owner dengan Step-Up Auth', () => {
			const res = evaluatePettyCashTier(1200000, 1200000);
			assert.equal(res.tier, 3);
			assert.equal(res.requires_approval, true);
			assert.deepEqual(res.approver_roles, ['owner']);
			assert.equal(res.require_step_up, true);
		});

		it('Evaluasi Endpoint Service API: POST /approval-rules/evaluate mereproduksi tabel 6.8', async () => {
			const eval1 = await approvalService.evaluateRules({
				document_type: 'petty_cash_expense',
				amount: 80000,
				daily_cumulative: 80000
			});
			assert.equal(eval1.tier, 1);
			assert.equal(eval1.requires_approval, false);

			const eval2 = await approvalService.evaluateRules({
				document_type: 'petty_cash_expense',
				amount: 150000,
				daily_cumulative: 230000
			});
			assert.equal(eval2.tier, 2);
			assert.equal(eval2.requires_approval, true);
			assert.ok(eval2.approver_roles.includes('finance'));

			const eval4 = await approvalService.evaluateRules({
				document_type: 'petty_cash_expense',
				amount: 1200000,
				daily_cumulative: 1200000
			});
			assert.equal(eval4.tier, 3);
			assert.equal(eval4.require_step_up, true);
			assert.deepEqual(eval4.approver_roles, ['owner']);
		});
	});

	// =========================================================================
	// AC-05.2: Invarian Pencegahan Self-Approval & Kewenangan Role
	// =========================================================================
	describe('Uji 2: AC-05.2 Invarian Self-Approval & Otorisasi Penyetuju', () => {
		const budiUser: User = {
			id: 'usr-budi',
			name: 'Budi (Store Manager)',
			email: 'budi@seduhanjodi.id',
			role: 'store_manager',
			organization_id: 'org-jodi',
			outlet_ids: ['out-jkt-01']
		};

		const rinaUser: User = {
			id: 'usr-rina',
			name: 'Rina (Owner)',
			email: 'rina@seduhanjodi.id',
			role: 'owner',
			organization_id: 'org-jodi',
			outlet_ids: ['out-jkt-01', 'out-bdg-01', 'out-sub-01']
		};

		const sampleReq: ApprovalRequest = {
			id: 'req-test-self',
			document_type: 'petty_cash_expense',
			document_id: 'pc-test-01',
			document_version: 1,
			document_title: 'Pembelian Seal Bar',
			document_ref: 'PC-TEST-01',
			organization_id: 'org-jodi',
			outlet_id: 'out-jkt-01',
			amount: '350000.00',
			submitted_by: {
				id: 'usr-budi',
				name: 'Budi (Store Manager)',
				role: 'store_manager'
			},
			status: 'pending',
			tier: 2,
			rule_id: 'rule-pc-tier2',
			approver_roles: ['finance', 'owner'],
			mode: 'any_of',
			require_step_up: false,
			approvals: [],
			rejection: null,
			details: {},
			timeline: [],
			created_at: '2026-10-13T06:00:00.000Z',
			updated_at: '2026-10-13T06:00:00.000Z',
			version: 1
		};

		it('Domain: Budi DILARANG menyetujui dokumen yang dibuatnya sendiri (self_approval)', () => {
			const check = canUserApproveRequest(budiUser, sampleReq);
			assert.equal(check.allowed, false);
			assert.equal(check.code, 'self_approval');
		});

		it('Domain: Rina (Owner) DIIZINKAN menyetujui dokumen yang dibuat Budi', () => {
			const check = canUserApproveRequest(rinaUser, sampleReq);
			assert.equal(check.allowed, true);
		});

		it('Service API: Budi mencoba menyetujui permintaannya sendiri ditolak 403 (code: self_approval)', async () => {
			setCurrentMockUser(budiUser);

			await assert.rejects(
				async () => {
					await approvalService.approve('req-01', { note: 'Saya setujui sendiri' });
				},
				(err: any) => {
					assert.equal(err.status, 403);
					assert.equal(err.code || err.body?.error?.code, 'self_approval');
					return true;
				}
			);
		});
	});

	// =========================================================================
	// AC-05.3: Mode any_of vs all_of
	// =========================================================================
	describe('Uji 3: AC-05.3 Mode any_of vs all_of', () => {
		it('Mode any_of: 1 persetujuan dari Maya (Finance) menyelesaikan permohonan tanpa memerlukan Rina (Owner)', () => {
			const roles = ['finance', 'owner'];
			const decisions = [{ role: 'finance' }];
			const result = evaluateApprovalCompletion('any_of', roles, decisions);

			assert.equal(result.isComplete, true);
			assert.deepEqual(result.remainingRoles, []);
		});

		it('Mode all_of: 1 persetujuan belum selesai sampai seluruh peran memberikan persetujuan', () => {
			const roles = ['finance', 'owner'];
			const decisions = [{ role: 'finance' }];
			const result = evaluateApprovalCompletion('all_of', roles, decisions);

			assert.equal(result.isComplete, false);
			assert.deepEqual(result.remainingRoles, ['owner']);

			// Saat owner juga menyetujui
			decisions.push({ role: 'owner' });
			const result2 = evaluateApprovalCompletion('all_of', roles, decisions);
			assert.equal(result2.isComplete, true);
			assert.deepEqual(result2.remainingRoles, []);
		});

		it('Service API: Persetujuan req-02 (mode any_of) oleh Maya (Finance) langsung mengubah status menjadi approved', async () => {
			setCurrentMockUser({
				id: 'usr-maya',
				name: 'Maya (Finance)',
				email: 'maya@seduhanjodi.id',
				role: 'finance',
				organization_id: 'org-jodi',
				outlet_ids: ['out-jkt-01']
			});

			const updated = await approvalService.approve('req-02', { note: 'Disetujui finance' });
			assert.equal(updated.status, 'approved');
			assert.equal(updated.approvals.length, 1);
			assert.equal(updated.approvals[0].role, 'finance');
		});
	});

	// =========================================================================
	// AC-05.4: Validasi Alasan Penolakan Wajib Diisi
	// =========================================================================
	describe('Uji 4: AC-05.4 Penolakan Wajib Beralasan', () => {
		it('Domain: Menolak tanpa alasan atau whitespace string ditolak', () => {
			assert.equal(validateRejectReason('').valid, false);
			assert.equal(validateRejectReason('   ').valid, false);
			assert.equal(validateRejectReason(undefined).valid, false);
		});

		it('Domain: Alasan penolakan valid diterima', () => {
			assert.equal(validateRejectReason('Anggaran kas kecil gerai telah melewati kuota bulan ini').valid, true);
		});

		it('Service API: Menolak permohonan tanpa mengisi alasan ditolak validasi 422', async () => {
			setCurrentMockUser({
				id: 'usr-rina',
				name: 'Rina (Owner)',
				email: 'rina@seduhanjodi.id',
				role: 'owner',
				organization_id: 'org-jodi',
				outlet_ids: ['out-jkt-01']
			});

			await assert.rejects(
				async () => {
					await approvalService.reject('req-01', { reason: '' });
				},
				(err: any) => {
					assert.equal(err.status, 422);
					return true;
				}
			);
		});
	});

	// =========================================================================
	// AC-05.5: Optimistic Locking Versi Dokumen (409 Conflict)
	// =========================================================================
	describe('Uji 5: AC-05.5 Optimistic Concurrency Locking', () => {
		it('Domain: Versi dokumen berbeda menghasilkan match: false', () => {
			const res = validateDocumentVersionMatch(1, 2);
			assert.equal(res.match, false);
			assert.ok(res.error?.includes('v1'));
			assert.ok(res.error?.includes('v2'));
		});

		it('Service API: Menyetujui dokumen yang versinya telah berubah menghasilkan 409 conflict', async () => {
			setCurrentMockUser({
				id: 'usr-rina',
				name: 'Rina (Owner)',
				email: 'rina@seduhanjodi.id',
				role: 'owner',
				organization_id: 'org-jodi',
				outlet_ids: ['out-jkt-01']
			});

			// Ubah versi dokumen sumber di mock engine
			mockSourceDocumentVersions['po-ext-001'] = 2; // Dokumen sumber telah diupdate pihak lain ke v2

			await assert.rejects(
				async () => {
					// req-01 masih memegang document_version: 1
					await approvalService.approve('req-01', { note: 'Coba setujui' });
				},
				(err: any) => {
					assert.equal(err.status, 409);
					return true;
				}
			);

			// Kembalikan ke v1 untuk pengujian berikutnya
			mockSourceDocumentVersions['po-ext-001'] = 1;
		});
	});

	// =========================================================================
	// AC-05.6: Lencana Menu Sinkron dengan Tab Menunggu Saya
	// =========================================================================
	describe('Uji 6: AC-05.6 Sinkronisasi Lencana Persetujuan', () => {
		it('Angka lencana approvals.pending_for_me selalu sama persis dengan jumlah di tab Menunggu Saya', async () => {
			// Set user sebagai Maya (Finance)
			setCurrentMockUser({
				id: 'usr-maya',
				name: 'Maya (Finance)',
				email: 'maya@seduhanjodi.id',
				role: 'finance',
				organization_id: 'org-jodi',
				outlet_ids: ['out-jkt-01']
			});

			const badges = await navService.getBadges('finance');
			const pendingRequests = await approvalService.getRequests({ tab: 'pending_for_me' });

			assert.equal(badges['approvals.pending_for_me'], pendingRequests.length);
		});

		it('Store Manager (Budi) tidak memiliki item di tab Menunggu Saya (hanya Diajukan Saya)', async () => {
			setCurrentMockUser({
				id: 'usr-budi',
				name: 'Budi (Store Manager)',
				email: 'budi@seduhanjodi.id',
				role: 'store_manager',
				organization_id: 'org-jodi',
				outlet_ids: ['out-jkt-01']
			});

			const pendingForMe = await approvalService.getRequests({ tab: 'pending_for_me' });
			assert.equal(pendingForMe.length, 0);

			const submittedByMe = await approvalService.getRequests({ tab: 'submitted_by_me' });
			assert.ok(submittedByMe.length > 0);
		});
	});

	// =========================================================================
	// AC-05.7: Event ApprovalDecided Memperbarui Status Dokumen Sumber
	// =========================================================================
	describe('Uji 7: AC-05.7 Event Bus ApprovalDecided', () => {
		it('Menyetujui dokumen memancarkan event ApprovalDecided dengan parameter sah', async () => {
			let capturedEvent: any = null;
			const unsubscribe = eventBus.on('ApprovalDecided', (ev) => {
				capturedEvent = ev;
			});

			setCurrentMockUser({
				id: 'usr-rina',
				name: 'Rina (Owner)',
				email: 'rina@seduhanjodi.id',
				role: 'owner',
				organization_id: 'org-jodi',
				outlet_ids: ['out-jkt-01']
			});

			await approvalService.approve('req-01', { note: 'Disetujui penuh oleh Owner' });

			assert.ok(capturedEvent);
			assert.equal(capturedEvent.payload.decision, 'approved');
			assert.equal(capturedEvent.payload.document_id, 'po-ext-001');

			unsubscribe();
		});
	});

	// =========================================================================
	// AC-05.8: Validasi Step-Up Password Dialog
	// =========================================================================
	describe('Uji 8: AC-05.8 Integrasi Step-Up Auth', () => {
		it('Aksi yang membutuhkan Step-Up DITOLAK 403 step_up_required tanpa token sah', async () => {
			setCurrentMockUser({
				id: 'usr-rina',
				name: 'Rina (Owner)',
				email: 'rina@seduhanjodi.id',
				role: 'owner',
				organization_id: 'org-jodi',
				outlet_ids: ['out-jkt-01']
			});

			// req-03 adalah kas kecil Rp 1.200.000 (Tingkat 3, require_step_up: true)
			await assert.rejects(
				async () => {
					await approvalService.approve('req-03', { note: 'Coba approve tanpa step-up' });
				},
				(err: any) => {
					assert.equal(err.status, 403);
					assert.equal(err.code || err.body?.error?.code, 'step_up_required');
					return true;
				}
			);
		});

		it('Dengan kata sandi benar ("demo" atau "123456"), Step-Up berhasil dan persetujuan dieksekusi', async () => {
			setCurrentMockUser({
				id: 'usr-rina',
				name: 'Rina (Owner)',
				email: 'rina@seduhanjodi.id',
				role: 'owner',
				organization_id: 'org-jodi',
				outlet_ids: ['out-jkt-01']
			});

			// 1. Eksekusi step-up auth
			const stepUpRes = await approvalService.verifyStepUp('demo');
			assert.ok(stepUpRes.step_up_token);
			assert.ok(stepUpRes.step_up_token.startsWith('stepup_'));

			// 2. Gunakan token untuk menyetujui req-03
			const approvedReq = await approvalService.approve('req-03', {
				note: 'Pengadaan pompa air darurat disetujui Owner',
				step_up_token: stepUpRes.step_up_token
			});

			assert.equal(approvedReq.status, 'approved');
			assert.equal(approvedReq.tier, 3);
		});
	});
});
