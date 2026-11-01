/**
 * Mock Handler: Layanan Lencana & Notifikasi Navigasi (T-01.3)
 * Referensi: PRD 8.4, MILESTONE.md §MS-01, MS-01.md §T-01.3
 */

import { router } from '../engine/router.js';
import { clock } from '../engine/clock.js';
import { getCurrentMockUser, DEMO_USERS_BY_ROLE } from './auth.js';
import { getPendingApprovalsCountForUser } from './approval.js';
import type { NavBadges, NotificationItem, SearchResultItem, UserRole, User } from '../../../contract/types.js';

// In-memory notifications state untuk demo
let mockNotifications: NotificationItem[] = [
	{
		id: 'notif_001',
		title: 'Persetujuan Belanja Luar',
		message: 'Outlet Sudirman mengajukan pembelian darurat Cup 16oz ke supplier luar.',
		type: 'warning',
		read: false,
		link: '/approvals',
		created_at: '2026-10-13T08:30:00.000Z'
	},
	{
		id: 'notif_002',
		title: 'Stok Bahan Baku Hampir Habis',
		message: 'Bahan Susu Fresh Milk di Outlet Bintaro berada di bawah ambang buffer minimum.',
		type: 'danger',
		read: false,
		link: '/inventory',
		created_at: '2026-10-13T09:15:00.000Z'
	},
	{
		id: 'notif_003',
		title: 'Nota Supplier Menunggu Penyesuaian Biaya',
		message: '3 nota penerimaan barang CV Sumber Pangan membutuhkan verifikasi harga aktual.',
		type: 'danger',
		read: false,
		link: '/procurement#invoices',
		created_at: '2026-10-13T09:45:00.000Z'
	},
	{
		id: 'notif_004',
		title: 'Usulan Menu Lokal Baru',
		message: 'Store Manager Outlet Senopati mengajukan resep baru: Avocado Cold Brew.',
		type: 'info',
		read: true,
		link: '/menu#recipes',
		created_at: '2026-10-13T13:20:00.000Z'
	}
];

export function registerNavHandlers(): void {
	// GET /api/v1/nav/badges
	router.register('GET', '/api/v1/nav/badges', async (ctx) => {
		const currentUser = getCurrentMockUser();
		const roleQuery = ctx.req.query?.role as string;
		const role = roleQuery || currentUser?.role || 'owner';
		const targetUser: User = roleQuery
			? {
					id: roleQuery === 'store_manager' ? 'usr-budi' : roleQuery === 'finance' ? 'usr-maya' : 'usr-rina',
					name: roleQuery,
					email: `${roleQuery}@hanjo.id`,
					role: roleQuery as any,
					outlet_ids: ['out-jkt-01']
				}
			: (currentUser || {
					id: 'usr-rina',
					name: 'Rina',
					email: 'rina@hanjo.id',
					role: 'owner',
					outlet_ids: ['*']
				});

		const pendingApprovalsCount = getPendingApprovalsCountForUser(targetUser);

		// Lencana angka per peran (PRD 8.4)
		if (role === 'brand_manager') {
			const bmBadges: NavBadges = {
				'approvals.pending_for_me': pendingApprovalsCount,
				'inventory.below_min': 3,
				'procurement.invoices_waiting': 2,
				'petty_cash.pending_verification': 1,
				'catalog.proposals_pending': 2
			};
			return { data: bmBadges };
		}

		if (role === 'store_manager') {
			const smBadges: NavBadges = {
				'approvals.pending_for_me': pendingApprovalsCount,
				'inventory.below_min': 2,
				'procurement.invoices_waiting': 1,
				'petty_cash.pending_verification': 1,
				'catalog.proposals_pending': 1
			};
			return { data: smBadges };
		}

		if (role === 'finance') {
			const financeBadges: NavBadges = {
				'approvals.pending_for_me': pendingApprovalsCount,
				'procurement.invoices_waiting': 3,
				'petty_cash.pending_verification': 2,
				'finance.true_up_pending': 3
			};
			return { data: financeBadges };
		}

		if (role === 'hq_admin') {
			const adminBadges: NavBadges = {
				'approvals.pending_for_me': pendingApprovalsCount,
				'inventory.below_min': 4,
				'procurement.invoices_waiting': 3,
				'catalog.proposals_pending': 2
			};
			return { data: adminBadges };
		}

		// Owner (akses konsolidasi penuh)
		const ownerBadges: NavBadges = {
			'approvals.pending_for_me': pendingApprovalsCount,
			'inventory.below_min': 4,
			'procurement.invoices_waiting': 3,
			'petty_cash.pending_verification': 2,
			'finance.true_up_pending': 3,
			'catalog.proposals_pending': 2
		};

		return { data: ownerBadges };
	});

	// GET /api/v1/notifications
	router.register('GET', '/api/v1/notifications', async () => {
		return {
			data: mockNotifications,
			meta: {
				unread_count: mockNotifications.filter((n) => !n.read).length
			}
		};
	});

	// POST /api/v1/notifications/:id/read
	router.register('POST', '/api/v1/notifications/:id/read', async (ctx) => {
		const id = ctx.params?.id;
		const target = mockNotifications.find((n) => n.id === id);
		if (target) {
			target.read = true;
		}
		return {
			data: { success: true, id }
		};
	});

	// POST /api/v1/notifications/read-all
	router.register('POST', '/api/v1/notifications/read-all', async () => {
		for (const n of mockNotifications) {
			n.read = true;
		}
		return {
			data: { success: true }
		};
	});

	// GET /api/v1/search?q=&types=&role=&outlet_id= (T-01.4, AC-01.7)
	router.register('GET', '/api/v1/search', async (ctx) => {
		const q = ((ctx.req.query?.q as string) || '').toLowerCase().trim();
		const role = (ctx.req.query?.role as string) || 'owner';
		const outletId = (ctx.req.query?.outlet_id as string) || '';
		const typesParam = (ctx.req.query?.types as string) || '';
		const allowedTypes = typesParam ? typesParam.split(',').map((t) => t.trim()) : null;

		if (!q) {
			return { data: [], meta: { total: 0, query: '' } };
		}

		const results = mockSearchEntities.filter((entity) => {
			// Filter berdasarkan jenis jika dispesifikasikan
			if (allowedTypes && !allowedTypes.includes(entity.type)) {
				return false;
			}

			// Filter hak akses scope outlet (AC-01.7):
			// Jika user adalah Store Manager, entitas yang memiliki outlet_id harus sesuai dengan outlet tugas SM (out-jkt-01)
			if (role === 'store_manager') {
				const smOutlet = outletId || 'out-jkt-01';
				if (entity.outlet_id && entity.outlet_id !== smOutlet) {
					return false;
				}
			}
			if (role === 'brand_manager') {
				const bmOutlets = ['out-jkt-01', 'out-bdg-01', 'out-sub-01'];
				if (entity.outlet_id && !bmOutlets.includes(entity.outlet_id)) {
					return false;
				}
			}

			// Pencocokan teks query
			const matchTitle = entity.title.toLowerCase().includes(q);
			const matchSubtitle = entity.subtitle.toLowerCase().includes(q);
			const matchId = entity.id.toLowerCase().includes(q);
			const matchTags = entity.tags?.some((t) => t.toLowerCase().includes(q));

			return matchTitle || matchSubtitle || matchId || Boolean(matchTags);
		});

		return {
			data: results,
			meta: {
				total: results.length,
				query: q
			}
		};
	});
}

// Indeks Mock Entitas Global (T-01.4)
const mockSearchEntities: SearchResultItem[] = [
	// Purchase Orders (PO)
	{
		id: 'po-202610-001',
		type: 'po',
		title: 'PO-202610-001 (Bahan Baku Minuman & Dairy)',
		subtitle: 'CV Sumber Pangan · Rp 4.250.000',
		href: '/procurement#po-202610-001',
		outlet_id: 'out-jkt-01',
		outlet_name: 'Senopati Flagship',
		badge: 'Menunggu Pengiriman',
		tags: ['po', 'order', 'sumber pangan', 'fresh milk', 'dairy', 'senopati']
	},
	{
		id: 'po-202610-002',
		type: 'po',
		title: 'PO-202610-002 (Cup 16oz & Packaging)',
		subtitle: 'PT Packaging Prima · Rp 1.800.000',
		href: '/procurement#po-202610-002',
		outlet_id: 'out-bdg-01',
		outlet_name: 'Cabang Bandung',
		badge: 'Disetujui',
		tags: ['po', 'order', 'packaging', 'cup', 'bandung']
	},
	{
		id: 'po-202610-003',
		type: 'po',
		title: 'PO-202610-003 (Sirup Aren & Powder Matcha)',
		subtitle: 'PT Sukanda Djaya · Rp 3.100.000',
		href: '/procurement#po-202610-003',
		outlet_id: 'out-sub-01',
		outlet_name: 'Cabang Surabaya',
		badge: 'Draf',
		tags: ['po', 'order', 'sukanda', 'sirup', 'matcha', 'surabaya']
	},

	// Supplier Invoices / Nota
	{
		id: 'inv-sp-8821',
		type: 'invoice',
		title: 'Nota INV-SP-8821 (CV Sumber Pangan)',
		subtitle: 'Rp 4.250.000 · Status: Menunggu Verifikasi True-Up',
		href: '/procurement#invoices',
		outlet_id: 'out-jkt-01',
		outlet_name: 'Senopati Flagship',
		badge: 'Verifikasi True-Up',
		tags: ['nota', 'invoice', 'tagihan', 'sumber pangan', 'true-up', 'senopati']
	},
	{
		id: 'inv-pk-1049',
		type: 'invoice',
		title: 'Nota INV-PK-1049 (PT Packaging Prima)',
		subtitle: 'Rp 1.800.000 · Status: Lunas',
		href: '/procurement#invoices',
		outlet_id: 'out-bdg-01',
		outlet_name: 'Cabang Bandung',
		badge: 'Lunas',
		tags: ['nota', 'invoice', 'packaging', 'lunas', 'bandung']
	},

	// Stok Bahan Baku (Inventory)
	{
		id: 'item-milk-01',
		type: 'item',
		title: 'Susu Fresh Milk Greenfield 1L',
		subtitle: 'Kategori: Dairy · Buffer Min: 20 L · Satuan: Liter',
		href: '/inventory#item-milk-01',
		badge: 'Kritis (Di Bawah Min)',
		tags: ['susu', 'fresh milk', 'greenfield', 'dairy', 'stok', 'bahan baku']
	},
	{
		id: 'item-bean-01',
		type: 'item',
		title: 'Biji Kopi Arabika House Blend 1kg',
		subtitle: 'Kategori: Coffee Beans · Buffer Min: 10 kg · Satuan: Kg',
		href: '/inventory#item-bean-01',
		badge: 'Aman',
		tags: ['kopi', 'biji kopi', 'arabika', 'house blend', 'coffee', 'stok']
	},
	{
		id: 'item-syrup-aren',
		type: 'item',
		title: 'Sirup Gula Aren Organik 1L',
		subtitle: 'Kategori: Syrup · Buffer Min: 5 L · Satuan: Liter',
		href: '/inventory#item-syrup-aren',
		badge: 'Aman',
		tags: ['gula aren', 'sirup', 'aren', 'sweetener', 'stok']
	},
	{
		id: 'item-cup-16',
		type: 'item',
		title: 'Cup Cold 16oz Custom Hanjo',
		subtitle: 'Kategori: Packaging · Buffer Min: 500 pcs · Satuan: Pcs',
		href: '/inventory#item-cup-16',
		badge: 'Perlu Reorder',
		tags: ['cup', 'gelas', 'packaging', '16oz', 'stok']
	},

	// Resep & Menu
	{
		id: 'recipe-aren-latte',
		type: 'recipe',
		title: 'Hanjo Aren Latte (Iced)',
		subtitle: 'Signature Coffee · HPP Estimasi: Rp 8.400 · Harga Jual: Rp 28.000',
		href: '/menu#recipes',
		badge: 'Aktif',
		tags: ['menu', 'resep', 'kopi', 'aren latte', 'minuman']
	},
	{
		id: 'recipe-americano',
		type: 'recipe',
		title: 'Americano (Hot / Iced)',
		subtitle: 'Classic Coffee · HPP Estimasi: Rp 4.200 · Harga Jual: Rp 22.000',
		href: '/menu#recipes',
		badge: 'Aktif',
		tags: ['menu', 'resep', 'americano', 'black coffee']
	},
	{
		id: 'recipe-matcha-latte',
		type: 'recipe',
		title: 'Kyoto Matcha Latte',
		subtitle: 'Non-Coffee · HPP Estimasi: Rp 9.500 · Harga Jual: Rp 32.000',
		href: '/menu#recipes',
		badge: 'Aktif',
		tags: ['menu', 'resep', 'matcha', 'latte', 'green tea']
	},

	// Outlets
	{
		id: 'out-jkt-01',
		type: 'outlet',
		title: 'Senopati Flagship (Jakarta Selatan)',
		subtitle: 'Milik Sendiri · Jl. Senopati No. 45 · 3 Kasir POS Aktif',
		href: '/outlets#out-jkt-01',
		outlet_id: 'out-jkt-01',
		outlet_name: 'Senopati Flagship',
		badge: 'Operasional',
		tags: ['outlet', 'senopati', 'jakarta', 'flagship', 'cabang']
	},
	{
		id: 'out-bdg-01',
		type: 'outlet',
		title: 'Cabang Bandung Dago',
		subtitle: 'Milik Sendiri · Jl. Ir. H. Juanda No. 88 · 2 Kasir POS Aktif',
		href: '/outlets#out-bdg-01',
		outlet_id: 'out-bdg-01',
		outlet_name: 'Cabang Bandung',
		badge: 'Operasional',
		tags: ['outlet', 'bandung', 'dago', 'cabang']
	},
	{
		id: 'out-sub-01',
		type: 'outlet',
		title: 'Cabang Surabaya Gubeng (Mitra)',
		subtitle: 'Mitra Waralaba · Jl. Raya Gubeng No. 12 · 2 Kasir POS Aktif',
		href: '/outlets#out-sub-01',
		outlet_id: 'out-sub-01',
		outlet_name: 'Cabang Surabaya',
		badge: 'Mitra',
		tags: ['outlet', 'surabaya', 'gubeng', 'mitra', 'cabang']
	},

	// Suppliers
	{
		id: 'sup-01',
		type: 'supplier',
		title: 'CV Sumber Pangan',
		subtitle: 'Pemasok Bahan Segar & Dairy · Syarat Pembayaran: TOP 14 Hari',
		href: '/suppliers',
		badge: 'Aktif',
		tags: ['supplier', 'pemasok', 'sumber pangan', 'fresh milk', 'vendor']
	},
	{
		id: 'sup-02',
		type: 'supplier',
		title: 'PT Sukanda Djaya',
		subtitle: 'Distributor Resmi Syrup & Powder · TOP 30 Hari',
		href: '/suppliers',
		badge: 'Aktif',
		tags: ['supplier', 'pemasok', 'sukanda djaya', 'sirup', 'vendor']
	}
];

