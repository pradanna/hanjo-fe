/**
 * Mock Handler: Proyeksi Kartu Dashboard 4 Peran (T-01.6 - T-01.9, T-01.14)
 * Referensi: PRD 8.1, MILESTONE.md §MS-01, AC-01.1, AC-01.5, AC-01.6, AC-01.12, AC-01.13
 */

import { router } from '../engine/router.js';
import { clock } from '../engine/clock.js';
import { ApiErrors } from '../../../contract/errors.js';
import { DEMO_OUTLETS } from '../../../../auth/scope.js';
import { getOutletEodStatus } from './eod.js';
import type {
	DashboardCardKey,
	DashboardCardResponse,
	ActionCenterCardData,
	SalesSummaryCardData,
	GrossProfitCardData,
	OutletComparisonCardData,
	OutletComparisonRow,
	StockIssuesCardData,
	HqPayablesCardData,
	DuePayableBill,
	PettyCashCardData,
	OutletOpsStatusCardData,
	OutletEodStatusCardData,
	PaymentReconciliationCardData,
	TrueUpPendingCardData,
	SmStockMinCardData,
	SmCountScheduleCardData,
	SmPettyCashCardData,
	SmProposalsCardData,
	SmEodStatusCardData,
	ActionCenterItem
} from '../../../contract/types.js';

export function registerDashboardHandlers(): void {
	// GET /api/v1/dashboard/cards/:key
	router.register('GET', '/api/v1/dashboard/cards/:key', async (ctx) => {
		const key = ctx.params.key as DashboardCardKey;
		const role = (ctx.req.query?.role as string) || 'owner';
		const organizationId = (ctx.req.query?.organization_id as string) || '*';
		const outletId = (ctx.req.query?.outlet_id as string) || '*';
		const ownerType = (ctx.req.query?.owner_type as string) || 'all';
		const date = (ctx.req.query?.date as string) || clock.businessDate();

		// Pembatasan Cakupan Outlet (RBAC & Scope §7):
		// Brand Manager & Store Manager tidak boleh mengakses kartu rekonsiliasi bank, hutang pusat, atau true-up nota supplier
		if (role === 'brand_manager' || role === 'store_manager') {
			if (key === 'payment_reconciliation' || key === 'true_up_pending' || key === 'hq_payables') {
				throw ApiErrors.forbidden(`Kartu ${key} tidak diizinkan untuk peran Manager (khusus Finance)`);
			}
		}
		if (role === 'store_manager') {
			if (key === 'outlet_comparison' || key === 'petty_cash') {
				throw ApiErrors.forbidden(`Kartu ${key} tidak diizinkan untuk Store Manager (Scope lock)`);
			}
		}

		// Hitung data proyeksi per kartu
		let cardData: unknown;

		switch (key) {
			case 'action_center': {
				cardData = generateActionCenterData(role, outletId, date);
				break;
			}

			case 'sales_summary': {
				cardData = generateSalesSummaryData(organizationId, outletId);
				break;
			}

			case 'gross_profit': {
				cardData = generateGrossProfitData(organizationId, outletId);
				break;
			}

			case 'outlet_comparison': {
				if (role === 'store_manager') {
					throw ApiErrors.forbidden('Akses ditolak');
				}
				cardData = generateOutletComparisonData(role, ownerType, organizationId);
				break;
			}

			case 'stock_issues': {
				cardData = generateStockIssuesData(role, organizationId, outletId);
				break;
			}

			case 'hq_payables': {
				cardData = generateHqPayablesData(role);
				break;
			}

			case 'petty_cash': {
				cardData = generatePettyCashData(organizationId);
				break;
			}

			case 'outlet_ops_status': {
				cardData = generateOutletOpsStatusData(organizationId);
				break;
			}

			case 'outlet_eod_status': {
				cardData = generateOutletEodStatusData(date, organizationId);
				break;
			}

			case 'payment_reconciliation': {
				cardData = generatePaymentReconciliationData();
				break;
			}

			case 'true_up_pending': {
				cardData = generateTrueUpPendingData();
				break;
			}

			case 'sm_stock_min': {
				cardData = generateSmStockMinData(outletId);
				break;
			}

			case 'sm_count_schedule': {
				cardData = generateSmCountScheduleData(outletId);
				break;
			}

			case 'sm_petty_cash': {
				cardData = generateSmPettyCashData(outletId);
				break;
			}

			case 'sm_proposals': {
				cardData = generateSmProposalsData(outletId);
				break;
			}

			case 'sm_eod_status': {
				cardData = generateSmEodStatusData(outletId, date);
				break;
			}

			default:
				throw ApiErrors.notFound(`Kartu dashboard ${key} tidak ditemukan`);
		}

		const response: DashboardCardResponse = {
			card_key: key,
			updated_at: clock.nowIso(),
			data: cardData
		};

		return { data: response };
	});
}

// ---------------------------------------------------------------------------
// Generator Data Proyeksi Deterministik per Kartu
// ---------------------------------------------------------------------------

function generateActionCenterData(role: string, outletId: string, date: string): ActionCenterCardData {
	let items: ActionCenterItem[] = [];

	if (role === 'owner') {
		items = [
			{
				id: 'act-own-1',
				type: 'APPROVAL',
				title: 'Persetujuan Kas Kecil Melebihi Batas Bebas',
				desc: 'Penggantian Seal Karet Steam Wand Senopati (Rp 350.000) butuh otorisasi Owner.',
				actionUrl: '/approvals',
				actionLabel: 'Tinjau Persetujuan',
				badge: 'Persetujuan Tertunda',
				badgeColor: 'warning',
				amount: '350000.00',
				requester: 'Budi Santoso - Store Manager',
				outlet_name: 'Jodi Senopati',
				reason: 'Penggantian darurat karet seal mesin espresso Synesso untuk menghindari bocor tekanan uap saat jam sibuk.'
			},
			{
				id: 'act-own-2',
				type: 'PERIOD_REOPEN',
				title: 'Permintaan Buka Ulang Periode Fiskal (Bulan September 2026)',
				desc: 'Audit penyesuaian True-Up 3 nota supplier susu segar & biji kopi yang terlambat diterima.',
				actionUrl: '/approvals',
				actionLabel: 'Tinjau Permintaan',
				badge: 'Izin Sensitif',
				badgeColor: 'danger',
				amount: '0.00',
				requester: 'Maya Septiani - Finance HQ',
				outlet_name: 'Kantor Pusat (HQ)',
				reason: 'Faktur resmi dari PT Kemasan Prima & Dairy Farm baru tiba. Butuh buka ulang jurnal September selama 24 jam untuk pencatatan HPP akrual yang presisi.'
			},
			{
				id: 'act-own-3',
				type: 'PROCUREMENT_OVER_LIMIT',
				title: 'Pembelian Darurat Luar Jaringan (CV Kemasan Nusantara)',
				desc: 'Outlet Senopati memesan Cup 16oz (Rp 2.450.000) karena lonjakan volume akhir pekan.',
				actionUrl: '/approvals',
				actionLabel: 'Setujui PO',
				badge: 'Persetujuan Tertunda',
				badgeColor: 'warning',
				amount: '2450000.00',
				requester: 'Budi Santoso - Store Manager',
				outlet_name: 'Jodi Senopati',
				reason: 'Buffer cup reguler menipis di bawah stok kritis 2 hari akibat event komunitas lari Sabtu lalu.'
			}
		];
	} else if (role === 'hq_admin') {
		items = [
			{
				id: 'act-adm-1',
				type: 'MENU_PROPOSAL',
				title: 'Usulan Menu Lokal Menunggu Kurasi',
				desc: 'Store Manager Senopati mengajukan varian Avocado Cold Brew untuk menu seasonal.',
				actionUrl: '/menu#recipes',
				actionLabel: 'Kurasi Resep',
				badge: 'Usulan Baru',
				badgeColor: 'info'
			},
			{
				id: 'act-adm-2',
				type: 'STOCK_COUNT_VARIANCE',
				title: 'Koreksi Stok Opname Melebihi Toleransi',
				desc: 'Selisih opname Syrup Caramel di Cabang Dago (-1.2 L) membutuhkan verifikasi admin pusat.',
				actionUrl: '/inventory',
				actionLabel: 'Verifikasi Selisih',
				badge: 'Opname Audit',
				badgeColor: 'warning'
			},
			{
				id: 'act-adm-3',
				type: 'POS_SYNC_DELAY',
				title: 'Sinkronisasi POS Outlet Terlambat',
				desc: 'Cabang Gubeng belum mengirim heartbeat struk selama lebih dari 15 menit.',
				actionUrl: '/reports',
				actionLabel: 'Periksa Koneksi',
				badge: 'Perhatian Sinkron',
				badgeColor: 'warning'
			}
		];
	} else if (role === 'finance') {
		items = [
			{
				id: 'act-fin-1',
				type: 'INVOICE_TRUE_UP',
				title: '3 Nota Supplier Menunggu Verifikasi & True-Up',
				desc: 'Penerimaan Fresh Milk & Green Beans siap disesuaikan HPP-nya dengan faktur resmi.',
				actionUrl: '/procurement#invoices',
				actionLabel: 'Verifikasi & True-Up',
				badge: 'Menunggu True-Up',
				badgeColor: 'danger'
			},
			{
				id: 'act-fin-2',
				type: 'PETTY_CASH_EXPENSE',
				title: 'Pengeluaran Kas Kecil Menunggu Verifikasi',
				desc: 'Bukti nota beli sabun & kertas thermal Senopati (Rp 85.000) siap diverifikasi.',
				actionUrl: '/petty-cash',
				actionLabel: 'Verifikasi Bukti',
				badge: 'Kas Kecil',
				badgeColor: 'warning'
			},
			{
				id: 'act-fin-3',
				type: 'BILL_DUE_SOON',
				title: 'Tagihan Jatuh Tempo Dalam 5 Hari',
				desc: 'Faktur CV Kemasan Nusantara (Rp 1.250.000) jatuh tempo pada 18 Oktober 2026.',
				actionUrl: '/payables',
				actionLabel: 'Proses Pembayaran',
				badge: 'Jatuh Tempo',
				badgeColor: 'warning'
			},
			{
				id: 'act-fin-4',
				type: 'FISCAL_PERIOD_READY',
				title: 'Periode Fiskal Siap Ditutup',
				desc: 'Seluruh jurnal penerimaan dan penjualan September telah direkonsiliasi 100%.',
				actionUrl: '/finance',
				actionLabel: 'Review Laporan',
				badge: 'Tutup Buku',
				badgeColor: 'info'
			}
		];
	} else if (role === 'brand_manager') {
		items = [
			{
				id: 'act-bm-1',
				type: 'STOCK_TRANSFER_RECOMMENDATION',
				title: 'Rekomendasi Transfer Stok Antar Gerai',
				desc: 'Jodi Dago surplus Fresh Milk (+15L), Jodi Gubeng diprediksi kehabisan pukul 15:00 WIB.',
				actionUrl: '/inventory#transfer',
				actionLabel: 'Buat Transfer Stok',
				badge: 'Optimasi Stok',
				badgeColor: 'warning',
				outlet_name: 'Jodi Dago ➔ Jodi Gubeng',
				requester: 'Sistem Prediksi ERP'
			},
			{
				id: 'act-bm-2',
				type: 'MENU_PROPOSAL',
				title: 'Usulan Menu Baru (Avocado Cold Brew)',
				desc: 'Store Manager Senopati mengajukan varian seasonal summer. Butuh kurasi Brand Manager sebelum diteruskan ke HQ.',
				actionUrl: '/menu#recipes',
				actionLabel: 'Kurasi Resep',
				badge: 'Kurasi Resep',
				badgeColor: 'info',
				outlet_name: 'Jodi Senopati',
				requester: 'Budi Santoso (SM Senopati)'
			},
			{
				id: 'act-bm-3',
				type: 'PETTY_CASH_EXPENSE',
				title: 'Otorisasi Belanja Luar Kas Kecil (Rp 85.000)',
				desc: 'Pembelian emergency es kristal di Jodi Senopati melebihi batas harian kasir.',
				actionUrl: '/petty-cash',
				actionLabel: 'Setujui Pengeluaran',
				badge: 'Otorisasi Biaya',
				badgeColor: 'warning',
				amount: '85000.00',
				outlet_name: 'Jodi Senopati',
				requester: 'Budi Santoso'
			},
			{
				id: 'act-bm-4',
				type: 'EOD_PENDING',
				title: 'Laporan Tutup Hari (EOD) Belum Masuk',
				desc: 'Jodi Gubeng belum menyelesaikan checklist kas laci dan sinkronisasi POS shift malam.',
				actionUrl: '#health-matrix',
				actionLabel: 'Pantau Gerai',
				badge: 'Tutup Hari',
				badgeColor: 'danger',
				outlet_name: 'Jodi Gubeng'
			},
			{
				id: 'act-bm-5',
				type: 'STOCK_COUNT_SCHEDULED',
				title: 'Jadwal Stock Opname Terjadwal Malam Ini',
				desc: 'Audit fisik Biji Kopi House Blend & Sirup di Jodi Dago dan Jodi Senopati.',
				actionUrl: '/inventory',
				actionLabel: 'Lihat Jadwal',
				badge: 'Opname Audit',
				badgeColor: 'info',
				outlet_name: 'Jodi Dago'
			}
		];
	} else {
		// store_manager (Single-Outlet operasional gerai tugas)
		const activeOutlet = outletId && outletId !== '*' ? outletId : 'out-jkt-01';
		const eodRecord = getOutletEodStatus(activeOutlet, date);

		items = [
			{
				id: 'act-sm-1',
				type: 'STOCK_BUFFER_ALERT',
				title: 'Fresh Milk di Bawah Batas Minimum',
				desc: 'Sisa stok fisik di gerai tinggal 2 Liter (buffer minimum 8 Liter). Segera ajukan PO pengadaan.',
				actionUrl: '/procurement',
				actionLabel: 'Buat PO Barang',
				badge: 'Stok Kritis',
				badgeColor: 'danger'
			},
			{
				id: 'act-sm-2',
				type: 'PETTY_CASH_RECEIPT',
				title: '1 Bukti Pengeluaran Kas Belum Diunggah',
				desc: 'Pembelian pembersih mesin kopi (Rp 45.000) shift siang belum melampirkan foto struk fisik.',
				actionUrl: '/petty-cash',
				actionLabel: 'Unggah Bukti Struk',
				badge: 'Kas Kecil',
				badgeColor: 'warning'
			}
		];

		if (eodRecord && !eodRecord.is_completed) {
			items.unshift({
				id: 'act-sm-eod',
				type: 'EOD_PENDING',
				title: 'Tutup Hari (EOD) Belum Selesai',
				desc: 'Checklist tutup kas laci shift malam dan pencatatan waste belum diselesaikan.',
				actionUrl: '#eod-checklist',
				actionLabel: 'Selesaikan Tutup Hari',
				badge: 'Tutup Hari',
				badgeColor: 'danger'
			});
		}
	}

	return {
		items,
		total_pending: items.length
	};
}

function generateSalesSummaryData(organizationId: string, outletId: string): SalesSummaryCardData {
	// 1. Jika spesifik per outlet
	if (outletId === 'out-jkt-01') {
		return {
			omzet: '4820000.00',
			cup_count: 238,
			transaction_count: 124,
			yesterday_transaction_count: 118,
			avg_transaction_value: '38870.00',
			cash_amount: '1253200.00',
			cash_percentage: '26.00',
			non_cash_amount: '3566800.00',
			non_cash_percentage: '74.00',
			void_refund_count: 1,
			void_refund_amount: '38500.00',
			trend_vs_previous_pct: '+19.2',
			yesterday_omzet: '4650000.00',
			yesterday_cup_count: 230,
			is_busier_than_yesterday: true,
			busier_label: 'Lebih Ramai (+19.2% vs Kemarin)',
			hourly_traffic: [
				{ hour: '08:00', count: 18, omzet: '360000.00', yesterday_count: 14, yesterday_omzet: '280000.00' },
				{ hour: '09:00', count: 24, omzet: '480000.00', yesterday_count: 20, yesterday_omzet: '400000.00' },
				{ hour: '10:00', count: 22, omzet: '440000.00', yesterday_count: 20, yesterday_omzet: '400000.00' },
				{ hour: '11:00', count: 30, omzet: '600000.00', yesterday_count: 26, yesterday_omzet: '520000.00' },
				{ hour: '12:00', count: 48, omzet: '960000.00', yesterday_count: 42, yesterday_omzet: '840000.00' },
				{ hour: '13:00', count: 42, omzet: '840000.00', yesterday_count: 38, yesterday_omzet: '760000.00' },
				{ hour: '14:00', count: 32, omzet: '640000.00', yesterday_count: 28, yesterday_omzet: '560000.00' },
				{ hour: '15:00', count: 22, omzet: '500000.00', yesterday_count: 18, yesterday_omzet: '420000.00' }
			],
			daily_trends: [
				{ date: '2026-10-07', omzet: '4100000.00', cup_count: 205 },
				{ date: '2026-10-08', omzet: '4250000.00', cup_count: 212 },
				{ date: '2026-10-09', omzet: '4400000.00', cup_count: 220 },
				{ date: '2026-10-10', omzet: '4950000.00', cup_count: 245 },
				{ date: '2026-10-11', omzet: '5100000.00', cup_count: 252 },
				{ date: '2026-10-12', omzet: '4650000.00', cup_count: 230 },
				{ date: '2026-10-13', omzet: '4820000.00', cup_count: 238, is_today: true }
			]
		};
	}

	if (outletId === 'out-bdg-01') {
		return {
			omzet: '2430000.00',
			cup_count: 122,
			transaction_count: 64,
			yesterday_transaction_count: 58,
			avg_transaction_value: '37960.00',
			cash_amount: '631800.00',
			cash_percentage: '26.00',
			non_cash_amount: '1798200.00',
			non_cash_percentage: '74.00',
			void_refund_count: 0,
			void_refund_amount: '0.00',
			trend_vs_previous_pct: '+15.8',
			hourly_traffic: [
				{ hour: '08:00', count: 10, omzet: '190000.00' },
				{ hour: '10:00', count: 15, omzet: '300000.00' },
				{ hour: '12:00', count: 28, omzet: '560000.00' },
				{ hour: '14:00', count: 20, omzet: '400000.00' }
			],
			daily_trends: [
				{ date: '2026-10-07', omzet: '2100000.00', cup_count: 105 },
				{ date: '2026-10-08', omzet: '2200000.00', cup_count: 110 },
				{ date: '2026-10-09', omzet: '2350000.00', cup_count: 118 },
				{ date: '2026-10-10', omzet: '2600000.00', cup_count: 130 },
				{ date: '2026-10-11', omzet: '2700000.00', cup_count: 135 },
				{ date: '2026-10-12', omzet: '2300000.00', cup_count: 115 },
				{ date: '2026-10-13', omzet: '2430000.00', cup_count: 122, is_today: true }
			]
		};
	}

	if (outletId === 'out-sub-01') {
		return {
			omzet: '1200000.00',
			cup_count: 52,
			transaction_count: 32,
			yesterday_transaction_count: 30,
			avg_transaction_value: '38460.00',
			cash_amount: '312000.00',
			cash_percentage: '26.00',
			non_cash_amount: '888000.00',
			non_cash_percentage: '74.00',
			void_refund_count: 0,
			void_refund_amount: '0.00',
			trend_vs_previous_pct: '+12.1',
			hourly_traffic: [
				{ hour: '08:00', count: 6, omzet: '120000.00' },
				{ hour: '12:00', count: 18, omzet: '420000.00' },
				{ hour: '14:00', count: 12, omzet: '280000.00' }
			],
			daily_trends: [
				{ date: '2026-10-07', omzet: '1050000.00', cup_count: 45 },
				{ date: '2026-10-08', omzet: '1100000.00', cup_count: 48 },
				{ date: '2026-10-09', omzet: '1150000.00', cup_count: 50 },
				{ date: '2026-10-10', omzet: '1350000.00', cup_count: 58 },
				{ date: '2026-10-11', omzet: '1400000.00', cup_count: 60 },
				{ date: '2026-10-12', omzet: '1150000.00', cup_count: 50 },
				{ date: '2026-10-13', omzet: '1200000.00', cup_count: 52, is_today: true }
			]
		};
	}

	if (outletId === 'out-kvl-01' || (organizationId === 'org-kaveloka' && outletId === '*')) {
		return {
			omzet: '3200000.00',
			cup_count: 145,
			transaction_count: 82,
			yesterday_transaction_count: 76,
			avg_transaction_value: '39020.00',
			cash_amount: '832000.00',
			cash_percentage: '26.00',
			non_cash_amount: '2368000.00',
			non_cash_percentage: '74.00',
			void_refund_count: 0,
			void_refund_amount: '0.00',
			trend_vs_previous_pct: '+14.5',
			yesterday_omzet: '3050000.00',
			yesterday_cup_count: 138,
			is_busier_than_yesterday: true,
			busier_label: 'Lebih Ramai (+14.5% vs Kemarin)',
			hourly_traffic: [
				{ hour: '08:00', count: 12, omzet: '240000.00' },
				{ hour: '10:00', count: 20, omzet: '420000.00' },
				{ hour: '12:00', count: 35, omzet: '780000.00' },
				{ hour: '14:00', count: 25, omzet: '520000.00' }
			],
			daily_trends: [
				{ date: '2026-10-07', omzet: '2800000.00', cup_count: 125 },
				{ date: '2026-10-08', omzet: '2900000.00', cup_count: 130 },
				{ date: '2026-10-09', omzet: '3100000.00', cup_count: 140 },
				{ date: '2026-10-10', omzet: '3400000.00', cup_count: 152 },
				{ date: '2026-10-11', omzet: '3500000.00', cup_count: 158 },
				{ date: '2026-10-12', omzet: '3050000.00', cup_count: 138 },
				{ date: '2026-10-13', omzet: '3200000.00', cup_count: 145, is_today: true }
			]
		};
	}

	if (outletId === 'out-plg-01' || (organizationId === 'org-plaga' && outletId === '*')) {
		return {
			omzet: '2850000.00',
			cup_count: 115,
			transaction_count: 58,
			yesterday_transaction_count: 54,
			avg_transaction_value: '49130.00',
			cash_amount: '741000.00',
			cash_percentage: '26.00',
			non_cash_amount: '2109000.00',
			non_cash_percentage: '74.00',
			void_refund_count: 0,
			void_refund_amount: '0.00',
			trend_vs_previous_pct: '+11.8',
			yesterday_omzet: '2700000.00',
			yesterday_cup_count: 108,
			is_busier_than_yesterday: true,
			busier_label: 'Lebih Ramai (+11.8% vs Kemarin)',
			hourly_traffic: [
				{ hour: '08:00', count: 8, omzet: '180000.00' },
				{ hour: '11:00', count: 22, omzet: '540000.00' },
				{ hour: '13:00', count: 28, omzet: '720000.00' },
				{ hour: '15:00', count: 18, omzet: '450000.00' }
			],
			daily_trends: [
				{ date: '2026-10-07', omzet: '2500000.00', cup_count: 100 },
				{ date: '2026-10-08', omzet: '2600000.00', cup_count: 104 },
				{ date: '2026-10-09', omzet: '2750000.00', cup_count: 110 },
				{ date: '2026-10-10', omzet: '3000000.00', cup_count: 120 },
				{ date: '2026-10-11', omzet: '3100000.00', cup_count: 125 },
				{ date: '2026-10-12', omzet: '2700000.00', cup_count: 108 },
				{ date: '2026-10-13', omzet: '2850000.00', cup_count: 115, is_today: true }
			]
		};
	}

	// 2. Jika filter Organisasi Seduhan Kopi Jodi (Konsolidasi 3 Outlet)
	if (organizationId === 'org-jodi') {
		return {
			omzet: '8450000.00',
			cup_count: 412,
			transaction_count: 220,
			yesterday_transaction_count: 206,
			avg_transaction_value: '38400.00',
			cash_amount: '2197000.00',
			cash_percentage: '26.00',
			non_cash_amount: '6253000.00',
			non_cash_percentage: '74.00',
			void_refund_count: 1,
			void_refund_amount: '38500.00',
			trend_vs_previous_pct: '+18.4',
			yesterday_omzet: '8100000.00',
			yesterday_cup_count: 395,
			is_busier_than_yesterday: true,
			busier_label: 'Lebih Ramai (+18.4% vs Kemarin)',
			lfl_trend_pct: '+18.2',
			full_day_trend_pct: '+4.3',
			lfl_yesterday_omzet: '7150000.00',
			hourly_traffic: [
				{ hour: '08:00', count: 9, omzet: '320000.00', yesterday_count: 8, yesterday_omzet: '270000.00' },
				{ hour: '09:00', count: 11, omzet: '420000.00', yesterday_count: 9, yesterday_omzet: '350000.00' },
				{ hour: '10:00', count: 13, omzet: '510000.00', yesterday_count: 12, yesterday_omzet: '450000.00' },
				{ hour: '11:00', count: 18, omzet: '700000.00', yesterday_count: 15, yesterday_omzet: '600000.00' },
				{ hour: '12:00', count: 28, omzet: '1080000.00', yesterday_count: 23, yesterday_omzet: '880000.00' },
				{ hour: '13:00', count: 23, omzet: '900000.00', yesterday_count: 19, yesterday_omzet: '750000.00' },
				{ hour: '14:00', count: 12, omzet: '480000.00', yesterday_count: 15, yesterday_omzet: '580000.00' },
				{ hour: '15:00', count: 10, omzet: '370000.00', yesterday_count: 13, yesterday_omzet: '510000.00' },
				{ hour: '16:00', count: 15, omzet: '570000.00', yesterday_count: 12, yesterday_omzet: '470000.00' },
				{ hour: '17:00', count: 13, omzet: '520000.00', yesterday_count: 14, yesterday_omzet: '570000.00' },
				{ hour: '18:00', count: 20, omzet: '760000.00', yesterday_count: 15, yesterday_omzet: '590000.00' },
				{ hour: '19:00', count: 25, omzet: '940000.00', yesterday_count: 18, yesterday_omzet: '720000.00' },
				{ hour: '20:00', count: 16, omzet: '620000.00', yesterday_count: 14, yesterday_omzet: '560000.00' },
				{ hour: '21:00', count: 7, omzet: '260000.00', yesterday_count: 11, yesterday_omzet: '430000.00' }
			],
			daily_trends: [
				{ date: '2026-10-07', omzet: '7250000.00', cup_count: 355 },
				{ date: '2026-10-08', omzet: '7550000.00', cup_count: 370 },
				{ date: '2026-10-09', omzet: '7900000.00', cup_count: 388 },
				{ date: '2026-10-10', omzet: '8900000.00', cup_count: 433 },
				{ date: '2026-10-11', omzet: '9200000.00', cup_count: 447 },
				{ date: '2026-10-12', omzet: '8100000.00', cup_count: 395 },
				{ date: '2026-10-13', omzet: '8450000.00', cup_count: 412, is_today: true }
			]
		};
	}

	// 3. Konsolidasi Global Seluruh Organisasi (Total 5 Outlet: Rp 14.500.000, 672 cups, 360 transactions)
	return {
		omzet: '14500000.00',
		cup_count: 672,
		transaction_count: 360,
		yesterday_transaction_count: 336,
		avg_transaction_value: '40270.00',
		cash_amount: '3770000.00',
		cash_percentage: '26.00',
		non_cash_amount: '10730000.00',
		non_cash_percentage: '74.00',
		void_refund_count: 1,
		void_refund_amount: '38500.00',
		trend_vs_previous_pct: '+17.2',
		lfl_trend_pct: '+17.2',
		full_day_trend_pct: '+4.7',
		yesterday_omzet: '13850000.00',
		lfl_yesterday_omzet: '12370000.00',
		yesterday_cup_count: 641,
		is_busier_than_yesterday: true,
		busier_label: 'Lebih Ramai (+17.2% LFL s/d 21:00 WIB)',
		hourly_traffic: [
			{ hour: '08:00', count: 14, omzet: '560000.00', yesterday_count: 12, yesterday_omzet: '480000.00' },
			{ hour: '09:00', count: 18, omzet: '720000.00', yesterday_count: 15, yesterday_omzet: '600000.00' },
			{ hour: '10:00', count: 22, omzet: '880000.00', yesterday_count: 20, yesterday_omzet: '780000.00' },
			{ hour: '11:00', count: 30, omzet: '1200000.00', yesterday_count: 26, yesterday_omzet: '1040000.00' },
			{ hour: '12:00', count: 46, omzet: '1860000.00', yesterday_count: 38, yesterday_omzet: '1520000.00' },
			{ hour: '13:00', count: 38, omzet: '1540000.00', yesterday_count: 32, yesterday_omzet: '1300000.00' },
			{ hour: '14:00', count: 20, omzet: '820000.00', yesterday_count: 25, yesterday_omzet: '1000000.00' },
			{ hour: '15:00', count: 16, omzet: '640000.00', yesterday_count: 22, yesterday_omzet: '880000.00' },
			{ hour: '16:00', count: 24, omzet: '980000.00', yesterday_count: 20, yesterday_omzet: '820000.00' },
			{ hour: '17:00', count: 22, omzet: '900000.00', yesterday_count: 24, yesterday_omzet: '980000.00' },
			{ hour: '18:00', count: 32, omzet: '1300000.00', yesterday_count: 25, yesterday_omzet: '1020000.00' },
			{ hour: '19:00', count: 40, omzet: '1620000.00', yesterday_count: 30, yesterday_omzet: '1250000.00' },
			{ hour: '20:00', count: 26, omzet: '1060000.00', yesterday_count: 24, yesterday_omzet: '960000.00' },
			{ hour: '21:00', count: 12, omzet: '420000.00', yesterday_count: 15, yesterday_omzet: '740000.00' }
		],
		daily_trends: [
			{ date: '2026-10-07', omzet: '12550000.00', cup_count: 580 },
			{ date: '2026-10-08', omzet: '13050000.00', cup_count: 604 },
			{ date: '2026-10-09', omzet: '13750000.00', cup_count: 638 },
			{ date: '2026-10-10', omzet: '15300000.00', cup_count: 705 },
			{ date: '2026-10-11', omzet: '15800000.00', cup_count: 730 },
			{ date: '2026-10-12', omzet: '13850000.00', cup_count: 641 },
			{ date: '2026-10-13', omzet: '14500000.00', cup_count: 672, is_today: true }
		]
	};
}

function generateGrossProfitData(organizationId: string, outletId: string): GrossProfitCardData {
	if (outletId === 'out-jkt-01') {
		return {
			gross_profit: '3325800.00',
			margin_pct: '69.00',
			cogs_amount: '1494200.00',
			is_estimate: true,
			pending_invoice_count: 1,
			estimate_badge: 'Estimasi · 1 nota belum masuk',
			trend_vs_previous_pct: '+2.4'
		};
	}

	if (outletId === 'out-kvl-01' || organizationId === 'org-kaveloka') {
		return {
			gross_profit: '2150000.00',
			margin_pct: '67.20',
			cogs_amount: '1050000.00',
			is_estimate: false,
			pending_invoice_count: 0,
			trend_vs_previous_pct: '+1.8'
		};
	}

	if (outletId === 'out-plg-01' || organizationId === 'org-plaga') {
		return {
			gross_profit: '1950000.00',
			margin_pct: '68.40',
			cogs_amount: '900000.00',
			is_estimate: false,
			pending_invoice_count: 0,
			trend_vs_previous_pct: '+2.0'
		};
	}

	if (organizationId === 'org-jodi') {
		return {
			gross_profit: '5762900.00',
			margin_pct: '68.20',
			cogs_amount: '2687100.00',
			is_estimate: true,
			pending_invoice_count: 1,
			estimate_badge: 'Estimasi · 1 nota belum masuk',
			trend_vs_previous_pct: '+2.1'
		};
	}

	// Global Konsolidasi Seluruh Organisasi
	return {
		gross_profit: '9862900.00',
		margin_pct: '68.00',
		cogs_amount: '4637100.00',
		is_estimate: true,
		pending_invoice_count: 1,
		estimate_badge: 'Estimasi · 1 nota belum masuk',
		trend_vs_previous_pct: '+2.3'
	};
}

function generateOutletComparisonData(role: string, ownerTypeFilter: string, organizationId: string): OutletComparisonCardData {
	const allRows: OutletComparisonRow[] = [
		{
			outlet_id: 'out-jkt-01',
			outlet_name: 'Jodi Senopati Flagship',
			organization_id: 'org-jodi',
			organization_name: 'Seduhan Kopi Jodi',
			owner_type: 'own_company' as const,
			omzet: '4820000.00',
			cups: 238,
			cogs: '1494200.00',
			operational_costs: '285000.00',
			gross_profit: '3040800.00',
			margin_pct: '69.00',
			stock_diff_pct: '0.40',
			waste_pct: '1.20',
			sync_status: 'ONLINE' as const,
			last_sync: '2 menit lalu'
		},
		{
			outlet_id: 'out-bdg-01',
			outlet_name: 'Jodi Dago',
			organization_id: 'org-jodi',
			organization_name: 'Seduhan Kopi Jodi',
			owner_type: 'own_company' as const,
			omzet: '2430000.00',
			cups: 122,
			cogs: '777600.00',
			operational_costs: '165000.00',
			gross_profit: '1487400.00',
			margin_pct: '68.00',
			stock_diff_pct: '0.60',
			waste_pct: '1.50',
			sync_status: 'ONLINE' as const,
			last_sync: '4 menit lalu'
		},
		{
			outlet_id: 'out-sub-01',
			outlet_name: 'Jodi Gubeng',
			organization_id: 'org-jodi',
			organization_name: 'Seduhan Kopi Jodi',
			owner_type: 'partner' as const,
			omzet: '1200000.00',
			cups: 52,
			cogs: '408000.00',
			operational_costs: '95000.00',
			gross_profit: '697000.00',
			margin_pct: '65.50',
			stock_diff_pct: '0.80',
			waste_pct: '1.80',
			sync_status: 'ONLINE' as const,
			last_sync: '7 menit lalu'
		},
		{
			outlet_id: 'out-kvl-01',
			outlet_name: 'Kaveloka Ubud',
			organization_id: 'org-kaveloka',
			organization_name: 'Kaveloka',
			owner_type: 'own_company' as const,
			omzet: '3200000.00',
			cups: 145,
			cogs: '1050000.00',
			operational_costs: '210000.00',
			gross_profit: '1940000.00',
			margin_pct: '67.20',
			stock_diff_pct: '0.30',
			waste_pct: '0.90',
			sync_status: 'ONLINE' as const,
			last_sync: '1 menit lalu'
		},
		{
			outlet_id: 'out-plg-01',
			outlet_name: 'Plaga Farm Bistro',
			organization_id: 'org-plaga',
			organization_name: 'Plaga',
			owner_type: 'own_company' as const,
			omzet: '2850000.00',
			cups: 115,
			cogs: '900000.00',
			operational_costs: '190000.00',
			gross_profit: '1760000.00',
			margin_pct: '68.40',
			stock_diff_pct: '0.50',
			waste_pct: '1.10',
			sync_status: 'ONLINE' as const,
			last_sync: '3 menit lalu'
		}
	];

	let filteredRows = allRows;

	// Filter organisasi
	if (organizationId && organizationId !== '*' && organizationId !== 'all') {
		filteredRows = filteredRows.filter((row) => row.organization_id === organizationId);
	}

	// Filter kepemilikan
	if (ownerTypeFilter !== 'all') {
		filteredRows = filteredRows.filter((row) => row.owner_type === ownerTypeFilter);
	}

	return {
		rows: filteredRows,
		mode: role === 'owner' ? 'full' : 'operational'
	};
}

function generateStockIssuesData(role: string, organizationId: string, outletId: string): StockIssuesCardData {
	const allItems = [
		{
			id: 'stk-1',
			item_name: 'Fresh Milk Greenfield',
			outlet_id: 'out-jkt-01',
			outlet_name: 'Jodi Senopati',
			organization_id: 'org-jodi',
			current_qty: '18.2000',
			min_qty: '20.0000',
			unit: 'L',
			est_days_left: '1.5',
			severity: 'danger' as const,
			stock_diff_pct: '-0.40',
			waste_pct: '1.20'
		},
		{
			id: 'stk-2',
			item_name: 'Pure Uji Matcha Powder',
			outlet_id: 'out-jkt-01',
			outlet_name: 'Jodi Senopati',
			organization_id: 'org-jodi',
			current_qty: '120.0000',
			min_qty: '150.0000',
			unit: 'g',
			est_days_left: '2.0',
			severity: 'danger' as const,
			stock_diff_pct: '-0.20',
			waste_pct: '0.80'
		},
		{
			id: 'stk-3',
			item_name: 'House Blend Espresso Beans',
			outlet_id: 'out-bdg-01',
			outlet_name: 'Jodi Dago',
			organization_id: 'org-jodi',
			current_qty: '24.5000',
			min_qty: '10.0000',
			unit: 'kg',
			est_days_left: '5.2',
			severity: 'success' as const,
			stock_diff_pct: '0.00',
			waste_pct: '0.50'
		},
		{
			id: 'stk-4',
			item_name: 'Single Origin Kintamani Beans',
			outlet_id: 'out-kvl-01',
			outlet_name: 'Kaveloka Ubud',
			organization_id: 'org-kaveloka',
			current_qty: '3.2000',
			min_qty: '5.0000',
			unit: 'kg',
			est_days_left: '1.8',
			severity: 'danger' as const,
			stock_diff_pct: '-0.10',
			waste_pct: '0.40'
		}
	];

	let filtered = allItems;
	if (outletId && outletId !== '*' && outletId !== 'all') {
		filtered = filtered.filter((i) => i.outlet_id === outletId);
	} else if (organizationId && organizationId !== '*' && organizationId !== 'all') {
		filtered = filtered.filter((i) => i.organization_id === organizationId);
	}

	return {
		items: filtered,
		total_issues: filtered.filter((i) => i.severity === 'danger').length,
		summary_mode: role === 'owner'
	};
}

function generateHqPayablesData(role: string): HqPayablesCardData {
	const dueBills: DuePayableBill[] = [
		{
			id: 'bill-001',
			invoice_number: 'INV-SPM-2610-089',
			supplier_name: 'PT Sukses Pangan Mandiri',
			category: 'Biji Kopi & Sirup',
			due_date: '2026-10-14',
			due_date_formatted: '14 Okt 2026',
			days_left: 1,
			days_left_label: 'Besok (H-1)',
			amount: '2450000.00',
			status: 'due_soon'
		},
		{
			id: 'bill-002',
			invoice_number: 'INV-SSL-2610-092',
			supplier_name: 'CV Susu Segar Lembang',
			category: 'Susu Pasteurisasi',
			due_date: '2026-10-16',
			due_date_formatted: '16 Okt 2026',
			days_left: 3,
			days_left_label: '3 hari lagi',
			amount: '1850000.00',
			status: 'due_soon'
		},
		{
			id: 'bill-003',
			invoice_number: 'INV-CKN-2610-098',
			supplier_name: 'CV Kemasan Nusantara',
			category: 'Paper Cup & Kemasan',
			due_date: '2026-10-18',
			due_date_formatted: '18 Okt 2026',
			days_left: 5,
			days_left_label: '5 hari lagi',
			amount: '1250000.00',
			status: 'due_soon'
		},
		{
			id: 'bill-004',
			invoice_number: 'INV-RN-2610-104',
			supplier_name: 'CV Rempah Nusantara',
			category: 'Bumbu & Teh Artisan',
			due_date: '2026-10-20',
			due_date_formatted: '20 Okt 2026',
			days_left: 7,
			days_left_label: '7 hari lagi',
			amount: '1300000.00',
			status: 'due_soon'
		}
	];

	return {
		total_balance: '14850000.00',
		due_soon_amount: '6850000.00',
		due_soon_count: dueBills.length,
		due_bills: dueBills,
		overdue_amount: '0.00',
		aging: {
			not_due: '9500000.00',
			days_1_30: '4100000.00',
			days_31_60: '1250000.00',
			days_61_90: '0.00',
			days_over_90: '0.00'
		},
		summary_mode: role === 'owner'
	};
}

function generatePettyCashData(organizationId: string): PettyCashCardData {
	const allOutlets = [
		{
			outlet_id: 'out-jkt-01',
			outlet_name: 'Jodi Senopati',
			organization_id: 'org-jodi',
			organization_name: 'Seduhan Kopi Jodi',
			current_balance: '1500000.00',
			imprest_ceiling: '2000000.00',
			daily_spent: '85000.00',
			daily_limit: '300000.00',
			pending_verification_count: 1,
			pending_verification_amount: '85000.00'
		},
		{
			outlet_id: 'out-bdg-01',
			outlet_name: 'Jodi Dago',
			organization_id: 'org-jodi',
			organization_name: 'Seduhan Kopi Jodi',
			current_balance: '1750000.00',
			imprest_ceiling: '2000000.00',
			daily_spent: '150000.00',
			daily_limit: '300000.00',
			pending_verification_count: 1,
			pending_verification_amount: '350000.00'
		},
		{
			outlet_id: 'out-sub-01',
			outlet_name: 'Jodi Gubeng',
			organization_id: 'org-jodi',
			organization_name: 'Seduhan Kopi Jodi',
			current_balance: '1000000.00',
			imprest_ceiling: '1500000.00',
			daily_spent: '50000.00',
			daily_limit: '200000.00',
			pending_verification_count: 0,
			pending_verification_amount: '0.00'
		},
		{
			outlet_id: 'out-kvl-01',
			outlet_name: 'Kaveloka Ubud',
			organization_id: 'org-kaveloka',
			organization_name: 'Kaveloka',
			current_balance: '1200000.00',
			imprest_ceiling: '1500000.00',
			daily_spent: '60000.00',
			daily_limit: '250000.00',
			pending_verification_count: 0,
			pending_verification_amount: '0.00'
		},
		{
			outlet_id: 'out-plg-01',
			outlet_name: 'Plaga Farm Bistro',
			organization_id: 'org-plaga',
			organization_name: 'Plaga',
			current_balance: '1100000.00',
			imprest_ceiling: '1500000.00',
			daily_spent: '75000.00',
			daily_limit: '250000.00',
			pending_verification_count: 0,
			pending_verification_amount: '0.00'
		}
	];

	const filtered = organizationId && organizationId !== '*' && organizationId !== 'all'
		? allOutlets.filter((o) => o.organization_id === organizationId)
		: allOutlets;

	const totalBal = filtered.reduce((acc, curr) => acc + parseFloat(curr.current_balance), 0);
	const totalCeiling = filtered.reduce((acc, curr) => acc + parseFloat(curr.imprest_ceiling), 0);
	const totalSpent = filtered.reduce((acc, curr) => acc + parseFloat(curr.daily_spent), 0);
	const totalLimit = filtered.reduce((acc, curr) => acc + parseFloat(curr.daily_limit), 0);
	const totalPending = filtered.reduce((acc, curr) => acc + curr.pending_verification_count, 0);
	const totalPendingAmt = filtered.reduce((acc, curr) => acc + parseFloat(curr.pending_verification_amount), 0);

	return {
		total_balance: totalBal.toFixed(2),
		total_imprest_ceiling: totalCeiling.toFixed(2),
		total_daily_spent: totalSpent.toFixed(2),
		total_daily_limit: totalLimit.toFixed(2),
		pending_verification_count: totalPending,
		pending_verification_amount: totalPendingAmt.toFixed(2),
		outlets: filtered
	};
}

function generateOutletOpsStatusData(organizationId: string): OutletOpsStatusCardData {
	const allOutlets = [
		{
			outlet_id: 'out-jkt-01',
			outlet_name: 'Jodi Senopati',
			organization_id: 'org-jodi',
			organization_name: 'Seduhan Kopi Jodi',
			sync_status: 'ONLINE' as const,
			last_sync_time: '14:28 WIB',
			last_sync_mins_ago: 2,
			eod_status: 'pending' as const
		},
		{
			outlet_id: 'out-bdg-01',
			outlet_name: 'Jodi Dago',
			organization_id: 'org-jodi',
			organization_name: 'Seduhan Kopi Jodi',
			sync_status: 'ONLINE' as const,
			last_sync_time: '14:26 WIB',
			last_sync_mins_ago: 4,
			eod_status: 'completed' as const
		},
		{
			outlet_id: 'out-sub-01',
			outlet_name: 'Jodi Gubeng',
			organization_id: 'org-jodi',
			organization_name: 'Seduhan Kopi Jodi',
			sync_status: 'ONLINE' as const,
			last_sync_time: '14:23 WIB',
			last_sync_mins_ago: 7,
			eod_status: 'pending' as const
		},
		{
			outlet_id: 'out-kvl-01',
			outlet_name: 'Kaveloka Ubud',
			organization_id: 'org-kaveloka',
			organization_name: 'Kaveloka',
			sync_status: 'ONLINE' as const,
			last_sync_time: '14:29 WIB',
			last_sync_mins_ago: 1,
			eod_status: 'pending' as const
		},
		{
			outlet_id: 'out-plg-01',
			outlet_name: 'Plaga Farm Bistro',
			organization_id: 'org-plaga',
			organization_name: 'Plaga',
			sync_status: 'ONLINE' as const,
			last_sync_time: '14:27 WIB',
			last_sync_mins_ago: 3,
			eod_status: 'completed' as const
		}
	];

	const filtered = organizationId && organizationId !== '*' && organizationId !== 'all'
		? allOutlets.filter((o) => o.organization_id === organizationId)
		: allOutlets;

	return {
		online_count: filtered.filter((o) => o.sync_status === 'ONLINE').length,
		total_outlets: filtered.length,
		outlets: filtered
	};
}

function generateOutletEodStatusData(date: string, organizationId: string): OutletEodStatusCardData {
	let targetOutlets = DEMO_OUTLETS;
	if (organizationId && organizationId !== '*' && organizationId !== 'all') {
		targetOutlets = targetOutlets.filter((o) => o.organization_id === organizationId);
	}

	const rows = targetOutlets.map((outlet) => {
		const rec = getOutletEodStatus(outlet.id, date);
		return {
			outlet_id: outlet.id,
			outlet_name: outlet.name,
			organization_id: outlet.organization_id,
			eod_status: rec?.is_completed ? ('completed' as const) : ('pending' as const),
			cash_drawer_counted: rec?.cash_drawer_counted ?? false,
			sales_synced: rec?.sales_synced ?? true,
			waste_recorded: rec?.waste_recorded ?? false,
			completed_at: rec?.completed_at,
			completed_by_name: rec?.completed_by_name
		};
	});

	return {
		business_date: date,
		completed_count: rows.filter((r) => r.eod_status === 'completed').length,
		total_count: rows.length,
		outlets: rows
	};
}

function generatePaymentReconciliationData(): PaymentReconciliationCardData {
	return {
		erp_non_cash_total: '6253000.00',
		midtrans_settlement_total: '6253000.00',
		discrepancy_amount: '0.00',
		status: 'matched',
		settlement_date: '2026-10-13',
		unsettled_transactions_count: 0
	};
}

function generateTrueUpPendingData(): TrueUpPendingCardData {
	return {
		pending_invoices_count: 3,
		provisional_total_value: '3450000.00',
		items: [
			{
				id: 'inv-up-1',
				receipt_number: 'RCV-JKT-01-20261012-01',
				supplier_name: 'CV Sumber Pangan',
				outlet_name: 'Outlet Senopati',
				provisional_total: '1800000.00',
				age_days: 1
			},
			{
				id: 'inv-up-2',
				receipt_number: 'RCV-BDG-01-20261011-01',
				supplier_name: 'PT Susu Nusantara',
				outlet_name: 'Outlet Dago',
				provisional_total: '950000.00',
				age_days: 2
			},
			{
				id: 'inv-up-3',
				receipt_number: 'RCV-JKT-01-20261010-02',
				supplier_name: 'CV Biji Makmur',
				outlet_name: 'Outlet Senopati',
				provisional_total: '700000.00',
				age_days: 3
			}
		]
	};
}

function generateSmStockMinData(outletId: string): SmStockMinCardData {
	const activeOutlet = outletId && outletId !== '*' ? outletId : 'out-jkt-01';
	const outletName = DEMO_OUTLETS.find((o) => o.id === activeOutlet)?.name || 'Outlet Senopati';

	return {
		outlet_id: activeOutlet,
		outlet_name: outletName,
		items: [
			{
				item_id: 'itm-001',
				item_name: 'Fresh Milk Greenfield',
				current_stock: '18.2000',
				min_stock: '20.0000',
				unit: 'Liter',
				est_days: '1.5',
				severity: 'danger'
			},
			{
				item_id: 'itm-002',
				item_name: 'Pure Uji Matcha Powder',
				current_stock: '120.0000',
				min_stock: '150.0000',
				unit: 'Gram',
				est_days: '2.0',
				severity: 'danger'
			}
		]
	};
}

function generateSmCountScheduleData(outletId: string): SmCountScheduleCardData {
	const activeOutlet = outletId && outletId !== '*' ? outletId : 'out-jkt-01';

	return {
		outlet_id: activeOutlet,
		next_count_date: '2026-10-15',
		is_overdue: false,
		overdue_days: 0,
		scope: 'critical',
		status_label: 'Tepat Waktu'
	};
}

function generateSmPettyCashData(outletId: string): SmPettyCashCardData {
	const activeOutlet = outletId && outletId !== '*' ? outletId : 'out-jkt-01';

	return {
		outlet_id: activeOutlet,
		current_balance: '1500000.00',
		daily_spent: '85000.00',
		daily_limit: '300000.00',
		spent_pct: '28.30',
		remaining_today: '215000.00'
	};
}

function generateSmProposalsData(outletId: string): SmProposalsCardData {
	const activeOutlet = outletId && outletId !== '*' ? outletId : 'out-jkt-01';

	return {
		outlet_id: activeOutlet,
		items: [
			{
				id: 'prop-001',
				recipe_name: 'Avocado Cold Brew Special',
				status: 'submitted',
				feedback: 'Menunggu review tim HQ Admin',
				updated_at: '2026-10-12T10:00:00Z'
			}
		]
	};
}

function generateSmEodStatusData(outletId: string, date: string): SmEodStatusCardData {
	const activeOutlet = outletId && outletId !== '*' ? outletId : 'out-jkt-01';
	const outletName = DEMO_OUTLETS.find((o) => o.id === activeOutlet)?.name || 'Outlet Senopati';
	const record = getOutletEodStatus(activeOutlet, date);

	const isCompleted = record?.is_completed ?? false;
	const drawerDone = record?.cash_drawer_counted ?? false;
	const salesDone = record?.sales_synced ?? true;
	const wasteDone = record?.waste_recorded ?? false;

	return {
		outlet_id: activeOutlet,
		outlet_name: outletName,
		business_date: date,
		is_completed: isCompleted,
		completed_at: record?.completed_at,
		checklist: [
			{
				key: 'cash_drawer',
				label: 'Hitung Fisik Uang Kas Laci Kasir',
				done: drawerDone,
				details: drawerDone ? 'Kas laci telah dihitung' : 'Wajib dihitung sebelum toko tutup'
			},
			{
				key: 'sales_synced',
				label: 'Seluruh Penjualan POS Hari Ini Tersinkron',
				done: salesDone,
				details: 'Semua struk offline telah terunggah ke pusat'
			},
			{
				key: 'waste_recorded',
				label: 'Catat Pembuangan & Waste Bahan Harian',
				done: wasteDone,
				details: wasteDone ? 'Waste hari ini sudah dicatat' : 'Catat bahan terbuang hari ini'
			}
		],
		can_complete: !isCompleted && drawerDone && salesDone && wasteDone
	};
}
