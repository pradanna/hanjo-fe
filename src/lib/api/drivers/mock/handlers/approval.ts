/**
 * Mock Handler: Mesin Persetujuan Multi-Tier & Inbox (MS-05)
 * Referensi: PRD 8.4, MILESTONE.md §MS-05, §6.7, §6.8, AC-05.1 s/d AC-05.8
 */

import { router } from '../engine/router.js';
import { clock } from '../engine/clock.js';
import { eventBus } from '../engine/events.js';
import { ApiErrors } from '../../../contract/errors.js';
import {
	evaluateApprovalRules,
	canUserApproveRequest,
	evaluateApprovalCompletion,
	validateRejectReason,
	validateDocumentVersionMatch
} from '../../../../domain/approval.js';
import { getCurrentMockUser } from './auth.js';
import type {
	ApprovalRequest,
	ApprovalRule,
	EvaluateApprovalInput,
	ApproveRequestPayload,
	RejectRequestPayload,
	CancelRequestPayload,
	User
} from '../../../contract/types.js';

// =============================================================================
// SEED DATA ATURAN PERSETUJUAN (MS-05 §MS-05 & §6.8)
// =============================================================================

export let mockApprovalRules: ApprovalRule[] = [
	{
		id: 'rule-po-ext',
		name: 'Persetujuan Belanja Supplier Luar',
		document_type: 'external_purchase_order',
		organization_id: null,
		outlet_id: null,
		tier: 2,
		min_amount: null,
		max_amount: null,
		approver_roles: ['owner'],
		mode: 'any_of',
		require_step_up: false,
		effective_from: '2026-01-01',
		effective_to: null,
		is_active: true,
		priority: 10,
		description: 'Seluruh pesanan pembelian (PO) darurat ke supplier luar wajib disetujui oleh Owner.',
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		version: 1
	},
	{
		id: 'rule-pc-tier1',
		name: 'Kas Kecil Bebas (Tingkat 1)',
		document_type: 'petty_cash_expense',
		organization_id: null,
		outlet_id: null,
		tier: 1,
		max_amount: '100000.00',
		daily_cumulative_limit: '300000.00',
		approver_roles: [],
		mode: 'any_of',
		require_step_up: false,
		effective_from: '2026-01-01',
		effective_to: null,
		is_active: true,
		priority: 5,
		description: 'Pengeluaran kas kecil ≤ Rp 100.000 dan akumulasi harian ≤ Rp 300.000 langsung tercatat tanpa persetujuan.',
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		version: 1
	},
	{
		id: 'rule-pc-tier2',
		name: 'Kas Kecil Bertingkat (Tingkat 2)',
		document_type: 'petty_cash_expense',
		organization_id: null,
		outlet_id: null,
		tier: 2,
		min_amount: '100000.01',
		max_amount: '1000000.00',
		daily_cumulative_limit: '300000.00',
		approver_roles: ['finance', 'owner'],
		mode: 'any_of',
		require_step_up: false,
		effective_from: '2026-01-01',
		effective_to: null,
		is_active: true,
		priority: 10,
		description: 'Pengeluaran kas kecil > Rp 100.000 s/d Rp 1.000.000 atau akumulasi harian > Rp 300.000 memerlukan persetujuan Finance atau Owner.',
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		version: 1
	},
	{
		id: 'rule-pc-tier3',
		name: 'Kas Kecil Besar (Tingkat 3)',
		document_type: 'petty_cash_expense',
		organization_id: null,
		outlet_id: null,
		tier: 3,
		min_amount: '1000000.01',
		max_amount: null,
		approver_roles: ['owner'],
		mode: 'any_of',
		require_step_up: true,
		effective_from: '2026-01-01',
		effective_to: null,
		is_active: true,
		priority: 20,
		description: 'Pengeluaran kas kecil luar biasa > Rp 1.000.000 memerlukan persetujuan Owner dengan Step-Up Auth.',
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		version: 1
	},
	{
		id: 'rule-menu-proposal',
		name: 'Kurasi Usulan Menu Lokal',
		document_type: 'menu_proposal',
		organization_id: null,
		outlet_id: null,
		tier: 2,
		approver_roles: ['hq_admin'],
		mode: 'any_of',
		require_step_up: false,
		effective_from: '2026-01-01',
		effective_to: null,
		is_active: true,
		priority: 10,
		description: 'Usulan resep dan menu khas lokal dari gerai wajib dikurasi oleh Admin Pusat (HQ Admin).',
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		version: 1
	},
	{
		id: 'rule-stock-variance',
		name: 'Selisih Hasil Stock Opname Fisik',
		document_type: 'stock_count_variance',
		organization_id: null,
		outlet_id: null,
		tier: 2,
		percentage_variance_threshold: 5,
		variance_amount_threshold: '200000.00',
		approver_roles: ['hq_admin', 'finance'],
		mode: 'any_of',
		require_step_up: false,
		effective_from: '2026-01-01',
		effective_to: null,
		is_active: true,
		priority: 10,
		description: 'Selisih hasil opname fisik melebihi 5% atau selisih nominal > Rp 200.000 memerlukan persetujuan HQ Admin atau Finance.',
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		version: 1
	},
	{
		id: 'rule-payment-verification',
		name: 'Verifikasi Pembayaran Hutang Dagang',
		document_type: 'payment_verification',
		organization_id: null,
		outlet_id: null,
		tier: 2,
		approver_roles: ['finance'],
		mode: 'any_of',
		require_step_up: false,
		effective_from: '2026-01-01',
		effective_to: null,
		is_active: true,
		priority: 10,
		description: 'Pencatatan pembayaran hutang supplier wajib diverifikasi oleh Finance (Pencatat ≠ Pemverifikasi).',
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		version: 1
	},
	{
		id: 'rule-period-reopen',
		name: 'Pembukaan Kembali Periode Buku Fiskal',
		document_type: 'period_reopen',
		organization_id: null,
		outlet_id: null,
		tier: 3,
		approver_roles: ['owner'],
		mode: 'any_of',
		require_step_up: true,
		effective_from: '2026-01-01',
		effective_to: null,
		is_active: true,
		priority: 30,
		description: 'Pembukaan kembali periode fiskal tertutup memerlukan otorisasi Owner dengan Step-Up Auth.',
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		version: 1
	}
];

// =============================================================================
// SEED DATA PERMINTAAN PERSETUJUAN (INBOX SEEDS)
// =============================================================================

export let mockApprovalRequests: ApprovalRequest[] = [
	{
		id: 'req-01',
		document_type: 'external_purchase_order',
		document_id: 'po-ext-001',
		document_version: 1,
		document_title: 'PO Pembelian 25kg Es Batu Kristal Higienis',
		document_ref: 'PO-EXT-202610-001',
		organization_id: 'org-jodi',
		outlet_id: 'out-jkt-01',
		outlet_name: 'Jodi Senopati',
		amount: '1250000.00',
		amount_num: 1250000,
		submitted_by: {
			id: 'usr-budi',
			name: 'Budi (Store Manager)',
			role: 'store_manager'
		},
		status: 'pending',
		tier: 2,
		rule_id: 'rule-po-ext',
		rule_name: 'Persetujuan Belanja Supplier Luar',
		approver_roles: ['owner'],
		mode: 'any_of',
		require_step_up: false,
		approvals: [],
		rejection: null,
		details: {
			supplier_name: 'PT Es Sejuk Sejahtera',
			category: 'Bahan Baku Darurat',
			justification: 'Pengiriman logistik gudang pusat tertunda akibat kendala armada; stok es batu menipis menjelang rush hour makan siang.',
			items_preview: '25 Bag Es Kristal @ Rp 50.000'
		},
		timeline: [
			{
				id: 'tl-101',
				action: 'submitted',
				actor_id: 'usr-budi',
				actor_name: 'Budi (Store Manager)',
				actor_role: 'store_manager',
				timestamp: '2026-10-13T04:20:00.000Z',
				note: 'Pengajuan dibuat oleh Store Manager Senopati'
			}
		],
		created_at: '2026-10-13T04:20:00.000Z',
		updated_at: '2026-10-13T04:20:00.000Z',
		version: 1
	},
	{
		id: 'req-02',
		document_type: 'petty_cash_expense',
		document_id: 'pc-sen-012',
		document_version: 1,
		document_title: 'Penggantian Seal Karet Steam Wand Mesin Espresso',
		document_ref: 'PC-SEN-202610-012',
		organization_id: 'org-jodi',
		outlet_id: 'out-jkt-01',
		outlet_name: 'Jodi Senopati',
		amount: '350000.00',
		amount_num: 350000,
		submitted_by: {
			id: 'usr-budi',
			name: 'Budi (Store Manager)',
			role: 'store_manager'
		},
		status: 'pending',
		tier: 2,
		rule_id: 'rule-pc-tier2',
		rule_name: 'Kas Kecil Bertingkat (Tingkat 2)',
		approver_roles: ['finance', 'owner'],
		mode: 'any_of',
		require_step_up: false,
		approvals: [],
		rejection: null,
		details: {
			category: 'Pemeliharaan Alat & Mesin Bar',
			receipt_number: 'NOTA-SERV-9921',
			justification: 'Steam wand mesin espresso bocor saat steaming susu, mendesak diperbaiki teknisi lokal agar tidak mengganggu kecepatan saji.',
			daily_cumulative: '430000.00'
		},
		timeline: [
			{
				id: 'tl-102',
				action: 'submitted',
				actor_id: 'usr-budi',
				actor_name: 'Budi (Store Manager)',
				actor_role: 'store_manager',
				timestamp: '2026-10-13T06:40:00.000Z',
				note: 'Pengajuan dibuat oleh Store Manager Senopati'
			}
		],
		created_at: '2026-10-13T06:40:00.000Z',
		updated_at: '2026-10-13T06:40:00.000Z',
		version: 1
	},
	{
		id: 'req-03',
		document_type: 'petty_cash_expense',
		document_id: 'pc-bdg-008',
		document_version: 1,
		document_title: 'Pengadaan Pompa Air Cadangan Darurat Gerai Dago',
		document_ref: 'PC-BDG-202610-008',
		organization_id: 'org-jodi',
		outlet_id: 'out-bdg-01',
		outlet_name: 'Jodi Dago',
		amount: '1200000.00',
		amount_num: 1200000,
		submitted_by: {
			id: 'usr-sari',
			name: 'Sari (Store Manager)',
			role: 'store_manager'
		},
		status: 'pending',
		tier: 3,
		rule_id: 'rule-pc-tier3',
		rule_name: 'Kas Kecil Besar (Tingkat 3)',
		approver_roles: ['owner'],
		mode: 'any_of',
		require_step_up: true,
		approvals: [],
		rejection: null,
		details: {
			category: 'Sarana & Prasarana Outlet',
			receipt_number: 'INV-POMPA-88',
			justification: 'Pompa air utama gerai terbakar korsleting, aliran air bersih bar terhenti total. Pembelian mendesak unit submersible.',
			daily_cumulative: '1200000.00'
		},
		timeline: [
			{
				id: 'tl-103',
				action: 'submitted',
				actor_id: 'usr-sari',
				actor_name: 'Sari (Store Manager)',
				actor_role: 'store_manager',
				timestamp: '2026-10-13T07:15:00.000Z',
				note: 'Pengajuan dibuat oleh Store Manager Dago'
			}
		],
		created_at: '2026-10-13T07:15:00.000Z',
		updated_at: '2026-10-13T07:15:00.000Z',
		version: 1
	},
	{
		id: 'req-04',
		document_type: 'menu_proposal',
		document_id: 'prop-202610-004',
		document_version: 1,
		document_title: 'Usulan Menu Lokal: Pandan Cold Brew Latte',
		document_ref: 'PROP-202610-004',
		organization_id: 'org-jodi',
		outlet_id: 'out-bdg-01',
		outlet_name: 'Jodi Dago',
		amount: '34000.00',
		amount_num: 34000,
		submitted_by: {
			id: 'usr-sari',
			name: 'Sari (Store Manager)',
			role: 'store_manager'
		},
		status: 'pending',
		tier: 2,
		rule_id: 'rule-menu-proposal',
		rule_name: 'Kurasi Usulan Menu Lokal',
		approver_roles: ['hq_admin'],
		mode: 'any_of',
		require_step_up: false,
		approvals: [],
		rejection: null,
		details: {
			item_name: 'Pandan Cold Brew Latte',
			suggested_price: '34000.00',
			estimated_hpp: '9800.00',
			target_margin: '71.2%',
			recipe_summary: 'Cold brew concentrate 60ml, Sirup Pandan Olahan 25ml, Fresh Milk 150ml, Es Batu 120g'
		},
		timeline: [
			{
				id: 'tl-104',
				action: 'submitted',
				actor_id: 'usr-sari',
				actor_name: 'Sari (Store Manager)',
				actor_role: 'store_manager',
				timestamp: '2026-10-12T09:30:00.000Z',
				note: 'Pengajuan dibuat oleh Store Manager Dago'
			}
		],
		created_at: '2026-10-12T09:30:00.000Z',
		updated_at: '2026-10-12T09:30:00.000Z',
		version: 1
	},
	{
		id: 'req-05',
		document_type: 'stock_count_variance',
		document_id: 'count-sen-01',
		document_version: 1,
		document_title: 'Selisih Opname Fisik: Susu Fresh Milk Greenfields',
		document_ref: 'OPN-SEN-202610-01',
		organization_id: 'org-jodi',
		outlet_id: 'out-jkt-01',
		outlet_name: 'Jodi Senopati',
		amount: '240000.00',
		amount_num: 240000,
		submitted_by: {
			id: 'usr-budi',
			name: 'Budi (Store Manager)',
			role: 'store_manager'
		},
		status: 'pending',
		tier: 2,
		rule_id: 'rule-stock-variance',
		rule_name: 'Selisih Hasil Stock Opname Fisik',
		approver_roles: ['hq_admin', 'finance'],
		mode: 'any_of',
		require_step_up: false,
		approvals: [],
		rejection: null,
		details: {
			item_name: 'Fresh Milk Greenfields (1000 ml)',
			system_qty: '24 L',
			physical_qty: '14 L',
			variance_qty: '-10 L',
			variance_value: '240000.00',
			variance_pct: -41.6,
			justification: 'Pintu chiller bawah tidak tertutup rapat saat libur akhir pekan, 10 dus susu rusak.'
		},
		timeline: [
			{
				id: 'tl-105',
				action: 'submitted',
				actor_id: 'usr-budi',
				actor_name: 'Budi (Store Manager)',
				actor_role: 'store_manager',
				timestamp: '2026-10-12T15:00:00.000Z',
				note: 'Pengajuan selisih dibuat oleh Store Manager Senopati'
			}
		],
		created_at: '2026-10-12T15:00:00.000Z',
		updated_at: '2026-10-12T15:00:00.000Z',
		version: 1
	},
	// Riwayat: Sudah Disetujui
	{
		id: 'req-06',
		document_type: 'external_purchase_order',
		document_id: 'po-ext-000',
		document_version: 1,
		document_title: 'PO Pembelian Kopi Blend Darurat',
		document_ref: 'PO-EXT-202610-000',
		organization_id: 'org-jodi',
		outlet_id: 'out-bdg-01',
		outlet_name: 'Jodi Dago',
		amount: '850000.00',
		amount_num: 850000,
		submitted_by: {
			id: 'usr-sari',
			name: 'Sari (Store Manager)',
			role: 'store_manager'
		},
		status: 'approved',
		tier: 2,
		rule_id: 'rule-po-ext',
		rule_name: 'Persetujuan Belanja Supplier Luar',
		approver_roles: ['owner'],
		mode: 'any_of',
		require_step_up: false,
		approvals: [
			{
				approver_id: 'usr-rina',
				approver_name: 'Rina (Owner)',
				role: 'owner',
				decided_at: '2026-10-11T10:15:00.000Z',
				note: 'Disetujui untuk menjaga kelangsungan operasional Dago.'
			}
		],
		rejection: null,
		details: {
			supplier_name: 'CV Roastery Lokal Bandung',
			category: 'Bahan Baku Kopi',
			justification: 'Stok biji kopi menipis sebelum jadwal pengiriman mingguan.'
		},
		timeline: [
			{
				id: 'tl-106-a',
				action: 'submitted',
				actor_id: 'usr-sari',
				actor_name: 'Sari (Store Manager)',
				actor_role: 'store_manager',
				timestamp: '2026-10-11T08:00:00.000Z',
				note: 'Pengajuan dibuat'
			},
			{
				id: 'tl-106-b',
				action: 'approved',
				actor_id: 'usr-rina',
				actor_name: 'Rina (Owner)',
				actor_role: 'owner',
				timestamp: '2026-10-11T10:15:00.000Z',
				note: 'Disetujui untuk menjaga kelangsungan operasional Dago.'
			}
		],
		created_at: '2026-10-11T08:00:00.000Z',
		updated_at: '2026-10-11T10:15:00.000Z',
		version: 2
	},
	// Riwayat: Sudah Ditolak
	{
		id: 'req-07',
		document_type: 'petty_cash_expense',
		document_id: 'pc-sub-003',
		document_version: 1,
		document_title: 'Pengeluaran Kas Kecil Snack Non-Operasional',
		document_ref: 'PC-SUB-202610-003',
		organization_id: 'org-jodi',
		outlet_id: 'out-sub-01',
		outlet_name: 'Jodi Gubeng',
		amount: '180000.00',
		amount_num: 180000,
		submitted_by: {
			id: 'usr-sari',
			name: 'Sari (Store Manager)',
			role: 'store_manager'
		},
		status: 'rejected',
		tier: 2,
		rule_id: 'rule-pc-tier2',
		rule_name: 'Kas Kecil Bertingkat (Tingkat 2)',
		approver_roles: ['finance', 'owner'],
		mode: 'any_of',
		require_step_up: false,
		approvals: [],
		rejection: {
			rejected_by: 'usr-maya',
			rejected_by_name: 'Maya (Finance)',
			role: 'finance',
			reason: 'Pengeluaran snack pribadi kru tidak dapat dibebankan ke pos kas kecil operasional outlet.',
			decided_at: '2026-10-10T14:30:00.000Z'
		},
		details: {
			category: 'Konsumsi Kru Non-Resmi',
			justification: 'Snack pizza untuk lembur staf bar.'
		},
		timeline: [
			{
				id: 'tl-107-a',
				action: 'submitted',
				actor_id: 'usr-sari',
				actor_name: 'Sari (Store Manager)',
				actor_role: 'store_manager',
				timestamp: '2026-10-10T11:00:00.000Z',
				note: 'Pengajuan dibuat'
			},
			{
				id: 'tl-107-b',
				action: 'rejected',
				actor_id: 'usr-maya',
				actor_name: 'Maya (Finance)',
				actor_role: 'finance',
				timestamp: '2026-10-10T14:30:00.000Z',
				note: 'Pengeluaran snack pribadi kru tidak dapat dibebankan ke pos kas kecil operasional outlet.'
			}
		],
		created_at: '2026-10-10T11:00:00.000Z',
		updated_at: '2026-10-10T14:30:00.000Z',
		version: 2
	}
];

// Simulasi versi dokumen sumber terkini untuk pengujian Optimistic Concurrency Locking (§MS-05 AC-05.5)
export const mockSourceDocumentVersions: Record<string, number> = {
	'po-ext-001': 1,
	'pc-sen-012': 1,
	'pc-bdg-008': 1,
	'prop-202610-004': 1,
	'count-sen-01': 1
};

/**
 * Menghitung jumlah permohonan yang menunggu persetujuan pengguna saat ini
 * Digunakan untuk sinkronisasi lencana navigasi 'approvals.pending_for_me' (AC-05.6)
 */
export function getPendingApprovalsCountForUser(user: User | null): number {
	if (!user) {
		return 0;
	}
	// Untuk Store Manager, lencana mencerminkan 1 pengajuan aktif yang membutuhkan perhatian
	if (user.role === 'store_manager') {
		return 1;
	}
	if (user.role === 'cashier') {
		return 0;
	}

	return mockApprovalRequests.filter((req) => {
		if (req.status !== 'pending') return false;
		if (req.submitted_by.id === user.id) return false;
		// Penyetuju yang memiliki wewenang untuk permohonan ini
		return req.approver_roles.includes(user.role);
	}).length;
}

// =============================================================================
// REGISTRASI HANDLER ROUTER MOCK
// =============================================================================

export function registerApprovalHandlers(): void {
	// ---------------------------------------------------------------------------
	// 1. GET /api/v1/approval-requests (PG-apr-inbox)
	// ---------------------------------------------------------------------------
	router.register('GET', '/api/v1/approval-requests', async (ctx) => {
		const currentUser = getCurrentMockUser();
		if (!currentUser) {
			throw ApiErrors.unauthenticated();
		}
		const tab = (ctx.query?.get('tab') || ctx.req.query?.tab as string) || 'pending_for_me';
		const docType = ctx.query?.get('type') || ctx.req.query?.type as string;
		const outletId = ctx.query?.get('outlet_id') || ctx.req.query?.outlet_id as string;
		const status = ctx.query?.get('status') || ctx.req.query?.status as string;
		const search = (ctx.query?.get('search') || ctx.req.query?.search as string)?.toLowerCase();

		let list = [...mockApprovalRequests];

		// Tambahkan flag is_overdue (tertunda > 24 jam berbasis clock) (§MS-05 Perilaku 7)
		const nowTime = clock.now().getTime();
		list = list.map((req) => {
			const createdTime = new Date(req.created_at).getTime();
			const isOverdue = req.status === 'pending' && nowTime - createdTime > 24 * 3600 * 1000;
			return {
				...req,
				is_overdue: isOverdue
			};
		});

		// Filter Tab: Menunggu Saya, Diajukan Saya, Riwayat
		if (tab === 'pending_for_me') {
			list = list.filter((req) => {
				if (req.status !== 'pending') return false;
				// Invarian: Pembuat dokumen tidak melihat permohonannya sendiri di tab Menunggu Saya
				if (req.submitted_by.id === currentUser.id) return false;
				// Store Manager tidak memiliki wewenang persetujuan
				if (currentUser.role === 'store_manager' || currentUser.role === 'cashier') return false;
				// Owner dapat menyetujui seluruh dokumen
				if (currentUser.role === 'owner') return true;
				// Peran lain harus ada dalam approver_roles
				return req.approver_roles.includes(currentUser.role);
			});
		} else if (tab === 'submitted_by_me') {
			list = list.filter((req) => req.submitted_by.id === currentUser.id);
		} else if (tab === 'history') {
			list = list.filter((req) => req.status === 'approved' || req.status === 'rejected' || req.status === 'cancelled');
		}

		// Filter Tambahan: Jenis Dokumen
		if (docType && docType !== 'all') {
			list = list.filter((req) => req.document_type === docType);
		}

		// Filter Tambahan: Outlet
		if (outletId && outletId !== 'all') {
			list = list.filter((req) => req.outlet_id === outletId);
		}

		// Filter Tambahan: Status
		if (status && status !== 'all') {
			list = list.filter((req) => req.status === status);
		}

		// Filter Pencarian Teks
		if (search) {
			list = list.filter(
				(req) =>
					req.document_ref.toLowerCase().includes(search) ||
					req.document_title.toLowerCase().includes(search) ||
					req.submitted_by.name.toLowerCase().includes(search) ||
					(req.details?.justification && req.details.justification.toLowerCase().includes(search))
			);
		}

		// Urutkan: Pending paling baru di atas, riwayat di bawah
		list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

		return { data: list };
	});

	// ---------------------------------------------------------------------------
	// 2. GET /api/v1/approval-requests/:id (PG-apr-detail)
	// ---------------------------------------------------------------------------
	router.register('GET', '/api/v1/approval-requests/:id', async (ctx) => {
		const id = ctx.params.id;
		const req = mockApprovalRequests.find((r) => r.id === id);
		if (!req) {
			throw ApiErrors.notFound(`Permintaan persetujuan dengan ID "${id}" tidak ditemukan.`);
		}

		const nowTime = clock.now().getTime();
		const createdTime = new Date(req.created_at).getTime();
		const isOverdue = req.status === 'pending' && nowTime - createdTime > 24 * 3600 * 1000;

		return {
			data: {
				...req,
				is_overdue: isOverdue
			}
		};
	});

	// ---------------------------------------------------------------------------
	// 3. POST /api/v1/approval-requests (Buat Permintaan Baru)
	// ---------------------------------------------------------------------------
	router.register('POST', '/api/v1/approval-requests', async (ctx) => {
		const currentUser = getCurrentMockUser();
		if (!currentUser) {
			throw ApiErrors.unauthenticated();
		}
		const body = (ctx.req.body || {}) as Partial<ApprovalRequest>;

		if (!body.document_type || !body.document_id || !body.document_title) {
			throw ApiErrors.validationError(
				[
					{ field: 'document_type', code: 'required', message: 'Tipe dokumen wajib diisi' },
					{ field: 'document_id', code: 'required', message: 'ID dokumen wajib diisi' },
					{ field: 'document_title', code: 'required', message: 'Judul dokumen wajib diisi' }
				],
				'Data permintaan persetujuan tidak lengkap'
			);
		}

		// Evaluasi aturan persetujuan untuk menentukan tier dan approver
		const evalResult = evaluateApprovalRules(
			mockApprovalRules,
			{
				document_type: body.document_type,
				outlet_id: body.outlet_id,
				organization_id: body.organization_id,
				amount: body.amount || undefined
			},
			clock.businessDate()
		);

		const newId = `req-${Date.now().toString(36)}`;
		const nowIso = clock.nowIso();

		const newRequest: ApprovalRequest = {
			id: newId,
			document_type: body.document_type,
			document_id: body.document_id,
			document_version: body.document_version || 1,
			document_title: body.document_title,
			document_ref: body.document_ref || `REF-${Date.now().toString(36).toUpperCase()}`,
			organization_id: body.organization_id || currentUser.organization_id || 'org-jodi',
			outlet_id: body.outlet_id || (currentUser.outlet_ids && currentUser.outlet_ids[0]) || 'out-jkt-01',
			outlet_name: body.outlet_name || 'Gerai',
			amount: body.amount || null,
			amount_num: body.amount ? Number(body.amount) : undefined,
			submitted_by: {
				id: currentUser.id,
				name: currentUser.name,
				role: currentUser.role
			},
			status: 'pending',
			tier: evalResult.tier,
			rule_id: evalResult.rule_id || 'rule-custom',
			rule_name: evalResult.rule_name || 'Aturan Persetujuan',
			approver_roles: evalResult.approver_roles,
			mode: evalResult.mode,
			require_step_up: evalResult.require_step_up,
			approvals: [],
			rejection: null,
			details: body.details || {},
			timeline: [
				{
					id: `tl-${Date.now()}`,
					action: 'submitted',
					actor_id: currentUser.id,
					actor_name: currentUser.name,
					actor_role: currentUser.role,
					timestamp: nowIso,
					note: 'Permintaan persetujuan diajukan ke sistem.'
				}
			],
			created_at: nowIso,
			updated_at: nowIso,
			version: 1
		};

		mockApprovalRequests.unshift(newRequest);
		mockSourceDocumentVersions[body.document_id] = newRequest.document_version;

		// Pancarkan event ApprovalRequested
		await eventBus.emit(
			'ApprovalRequested',
			newRequest.id,
			'ApprovalRequest',
			{
				request_id: newRequest.id,
				document_type: newRequest.document_type,
				document_id: newRequest.document_id,
				tier: newRequest.tier,
				amount: newRequest.amount
			},
			{ actorId: currentUser.id, outletId: newRequest.outlet_id }
		);

		return { data: newRequest };
	});

	// ---------------------------------------------------------------------------
	// 4. POST /api/v1/approval-requests/:id/actions/approve (AC-05.2, AC-05.3, AC-05.5, AC-05.8)
	// ---------------------------------------------------------------------------
	router.register('POST', '/api/v1/approval-requests/:id/actions/approve', async (ctx) => {
		const currentUser = getCurrentMockUser();
		if (!currentUser) {
			throw ApiErrors.unauthenticated();
		}
		const id = ctx.params.id;
		const body = (ctx.req.body || {}) as ApproveRequestPayload;

		const req = mockApprovalRequests.find((r) => r.id === id);
		if (!req) {
			throw ApiErrors.notFound(`Permintaan persetujuan "${id}" tidak ditemukan.`);
		}

		// 1. Optimistic locking permohonan via If-Match header jika disertakan
		const ifMatch = ctx.req.ifMatchVersion;
		if (ifMatch !== undefined && req.version !== ifMatch) {
			throw ApiErrors.versionMismatch(`Versi permohonan tidak cocok (If-Match: v${ifMatch}, data: v${req.version}).`);
		}

		// 2. Optimistic locking dokumen sumber (AC-05.5): jika dokumen sumber berubah versi, tolak 409 conflict
		const currentSourceVer = mockSourceDocumentVersions[req.document_id];
		if (currentSourceVer !== undefined) {
			const verCheck = validateDocumentVersionMatch(req.document_version, currentSourceVer);
			if (!verCheck.match) {
				throw ApiErrors.conflict(verCheck.error!);
			}
		}

		// 3. Validasi Otorisasi & Pencegahan Self-Approval (AC-05.2)
		const canApprove = canUserApproveRequest(currentUser, req);
		if (!canApprove.allowed) {
			if (canApprove.code === 'self_approval') {
				throw ApiErrors.selfApproval(canApprove.message!);
			}
			throw ApiErrors.forbidden(canApprove.message!);
		}

		// 4. Validasi Step-Up Auth jika disyaratkan oleh aturan (AC-05.8)
		if (req.require_step_up) {
			if (!body.step_up_token || !body.step_up_token.startsWith('stepup_')) {
				throw ApiErrors.stepUpRequired(
					'Tindakan persetujuan tingkat sensitif ini memerlukan verifikasi Step-Up Auth yang sah.'
				);
			}
		}

		const nowIso = clock.nowIso();

		// 5. Catat keputusan persetujuan pengguna
		req.approvals.push({
			approver_id: currentUser.id,
			approver_name: currentUser.name,
			role: currentUser.role,
			decided_at: nowIso,
			note: body.note
		});

		req.timeline.push({
			id: `tl-${Date.now()}`,
			action: 'approved',
			actor_id: currentUser.id,
			actor_name: currentUser.name,
			actor_role: currentUser.role,
			timestamp: nowIso,
			note: body.note || 'Menyetujui permohonan dokumen.'
		});

		// 6. Evaluasi kelengkapan persetujuan (any_of vs all_of) (AC-05.3)
		const completion = evaluateApprovalCompletion(req.mode, req.approver_roles, req.approvals);
		if (completion.isComplete) {
			req.status = 'approved';
			req.updated_at = nowIso;
			req.version += 1;

			// Memancarkan event ApprovalDecided untuk menggerakkan status dokumen sumber (AC-05.7)
			await eventBus.emit(
				'ApprovalDecided',
				req.id,
				'ApprovalRequest',
				{
					request_id: req.id,
					document_type: req.document_type,
					document_id: req.document_id,
					decision: 'approved',
					decided_by: currentUser.id,
					tier: req.tier
				},
				{ actorId: currentUser.id, outletId: req.outlet_id }
			);
		} else {
			req.updated_at = nowIso;
			req.version += 1;
		}

		return { data: req };
	});

	// ---------------------------------------------------------------------------
	// 5. POST /api/v1/approval-requests/:id/actions/reject (AC-05.4)
	// ---------------------------------------------------------------------------
	router.register('POST', '/api/v1/approval-requests/:id/actions/reject', async (ctx) => {
		const currentUser = getCurrentMockUser();
		if (!currentUser) {
			throw ApiErrors.unauthenticated();
		}
		const id = ctx.params.id;
		const body = (ctx.req.body || {}) as RejectRequestPayload;

		const req = mockApprovalRequests.find((r) => r.id === id);
		if (!req) {
			throw ApiErrors.notFound(`Permintaan persetujuan "${id}" tidak ditemukan.`);
		}

		// 1. Validasi Alasan Penolakan Wajib Diisi (AC-05.4)
		const reasonCheck = validateRejectReason(body.reason);
		if (!reasonCheck.valid) {
			throw ApiErrors.validationError(
				[{ field: 'reason', code: 'required', message: reasonCheck.error! }],
				reasonCheck.error!
			);
		}

		// 2. Validasi Otorisasi & Self-Approval
		const canApprove = canUserApproveRequest(currentUser, req);
		if (!canApprove.allowed) {
			if (canApprove.code === 'self_approval') {
				throw ApiErrors.selfApproval(canApprove.message!);
			}
			throw ApiErrors.forbidden(canApprove.message!);
		}

		// 3. Optimistic locking dokumen sumber
		const currentSourceVer = mockSourceDocumentVersions[req.document_id];
		if (currentSourceVer !== undefined) {
			const verCheck = validateDocumentVersionMatch(req.document_version, currentSourceVer);
			if (!verCheck.match) {
				throw ApiErrors.conflict(verCheck.error!);
			}
		}

		const nowIso = clock.nowIso();

		req.status = 'rejected';
		req.rejection = {
			rejected_by: currentUser.id,
			rejected_by_name: currentUser.name,
			role: currentUser.role,
			reason: body.reason.trim(),
			decided_at: nowIso
		};

		req.timeline.push({
			id: `tl-${Date.now()}`,
			action: 'rejected',
			actor_id: currentUser.id,
			actor_name: currentUser.name,
			actor_role: currentUser.role,
			timestamp: nowIso,
			note: `Ditolak: ${body.reason.trim()}`
		});

		req.updated_at = nowIso;
		req.version += 1;

		// Memancarkan event ApprovalDecided dengan status rejected
		await eventBus.emit(
			'ApprovalDecided',
			req.id,
			'ApprovalRequest',
			{
				request_id: req.id,
				document_type: req.document_type,
				document_id: req.document_id,
				decision: 'rejected',
				decided_by: currentUser.id,
				reason: body.reason.trim()
			},
			{ actorId: currentUser.id, outletId: req.outlet_id }
		);

		return { data: req };
	});

	// ---------------------------------------------------------------------------
	// 6. POST /api/v1/approval-requests/:id/actions/cancel (Tarik Kembali oleh Pembuat)
	// ---------------------------------------------------------------------------
	router.register('POST', '/api/v1/approval-requests/:id/actions/cancel', async (ctx) => {
		const currentUser = getCurrentMockUser();
		if (!currentUser) {
			throw ApiErrors.unauthenticated();
		}
		const id = ctx.params.id;
		const body = (ctx.req.body || {}) as CancelRequestPayload;

		const req = mockApprovalRequests.find((r) => r.id === id);
		if (!req) {
			throw ApiErrors.notFound(`Permintaan persetujuan "${id}" tidak ditemukan.`);
		}

		if (req.status !== 'pending') {
			throw ApiErrors.conflict(`Hanya permohonan berstatus "pending" yang dapat ditarik kembali.`);
		}

		// Hanya pembuat atau pimpinan owner yang dapat membatalkan
		if (req.submitted_by.id !== currentUser.id && currentUser.role !== 'owner') {
			throw ApiErrors.forbidden('Hanya pemohon dokumen yang dapat membatalkan atau menarik kembali permohonan.');
		}

		const nowIso = clock.nowIso();

		req.status = 'cancelled';
		req.timeline.push({
			id: `tl-${Date.now()}`,
			action: 'cancelled',
			actor_id: currentUser.id,
			actor_name: currentUser.name,
			actor_role: currentUser.role,
			timestamp: nowIso,
			note: body.note || 'Permohonan ditarik kembali oleh pemohon.'
		});

		req.updated_at = nowIso;
		req.version += 1;

		return { data: req };
	});

	// ---------------------------------------------------------------------------
	// 7. ENDPOINT ATURAN PERSETUJUAN (PG-set-approval-rules & AC-05.1)
	// ---------------------------------------------------------------------------

	// GET /api/v1/approval-rules
	router.register('GET', '/api/v1/approval-rules', async (ctx) => {
		const docType = ctx.query?.get('document_type') || ctx.req.query?.document_type as string;
		const isActive = ctx.query?.get('is_active') || ctx.req.query?.is_active as string;

		let list = [...mockApprovalRules];
		if (docType && docType !== 'all') {
			list = list.filter((r) => r.document_type === docType);
		}
		if (isActive !== undefined && isActive !== '') {
			const boolVal = isActive === 'true';
			list = list.filter((r) => r.is_active === boolVal);
		}

		list.sort((a, b) => b.tier - a.tier || (b.priority || 0) - (a.priority || 0));
		return { data: list };
	});

	// GET /api/v1/approval-rules/:id
	router.register('GET', '/api/v1/approval-rules/:id', async (ctx) => {
		const id = ctx.params.id;
		const rule = mockApprovalRules.find((r) => r.id === id);
		if (!rule) {
			throw ApiErrors.notFound(`Aturan persetujuan dengan ID "${id}" tidak ditemukan.`);
		}
		return { data: rule };
	});

	// POST /api/v1/approval-rules
	router.register('POST', '/api/v1/approval-rules', async (ctx) => {
		const body = (ctx.req.body || {}) as Partial<ApprovalRule>;
		if (!body.name || !body.document_type || !body.tier) {
			throw ApiErrors.validationError(
				[
					{ field: 'name', code: 'required', message: 'Nama aturan wajib diisi' },
					{ field: 'document_type', code: 'required', message: 'Tipe dokumen wajib diisi' },
					{ field: 'tier', code: 'required', message: 'Tingkat (tier) aturan wajib ditentukan' }
				],
				'Data konfigurasi aturan tidak lengkap'
			);
		}

		const newRule: ApprovalRule = {
			id: `rule-${Date.now().toString(36)}`,
			name: body.name.trim(),
			document_type: body.document_type,
			organization_id: body.organization_id || null,
			outlet_id: body.outlet_id || null,
			outlet_group_id: body.outlet_group_id || null,
			tier: body.tier,
			min_amount: body.min_amount || null,
			max_amount: body.max_amount || null,
			daily_cumulative_limit: body.daily_cumulative_limit || null,
			percentage_variance_threshold: body.percentage_variance_threshold || null,
			variance_amount_threshold: body.variance_amount_threshold || null,
			approver_roles: body.approver_roles || ['owner'],
			mode: body.mode || 'any_of',
			require_step_up: Boolean(body.require_step_up),
			effective_from: body.effective_from || null,
			effective_to: body.effective_to || null,
			is_active: body.is_active !== false,
			priority: body.priority || 10,
			description: body.description || '',
			created_at: clock.nowIso(),
			updated_at: clock.nowIso(),
			version: 1
		};

		mockApprovalRules.unshift(newRule);
		return { data: newRule };
	});

	// PUT /api/v1/approval-rules/:id
	router.register('PUT', '/api/v1/approval-rules/:id', async (ctx) => {
		const id = ctx.params.id;
		const body = (ctx.req.body || {}) as Partial<ApprovalRule>;
		const idx = mockApprovalRules.findIndex((r) => r.id === id);
		if (idx === -1) {
			throw ApiErrors.notFound(`Aturan persetujuan "${id}" tidak ditemukan.`);
		}

		const existing = mockApprovalRules[idx];
		const updated: ApprovalRule = {
			...existing,
			...body,
			id: existing.id,
			version: existing.version + 1,
			updated_at: clock.nowIso()
		};

		mockApprovalRules[idx] = updated;
		return { data: updated };
	});

	// POST /api/v1/approval-rules/evaluate (AC-05.1: Panel Uji Aturan Interaktif)
	router.register('POST', '/api/v1/approval-rules/evaluate', async (ctx) => {
		const input = (ctx.req.body || {}) as EvaluateApprovalInput;
		if (!input.document_type) {
			throw ApiErrors.validationError(
				[{ field: 'document_type', code: 'required', message: 'Tipe dokumen wajib diisi' }],
				'Tipe dokumen wajib diisi untuk evaluasi aturan'
			);
		}

		const result = evaluateApprovalRules(mockApprovalRules, input, clock.businessDate());
		return { data: result };
	});
}
