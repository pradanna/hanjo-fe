/**
 * Konfigurasi Navigasi Deklaratif Hanjo ERP
 * Referensi: PRD 8.4, MILESTONE.md §MS-01, T-00.10
 *
 * Struktur navigasi dinamis berbasis RBAC 4 Peran (owner, hq_admin, finance, store_manager)
 * dan evaluasi Feature Flag.
 */

import type { User, UserRole } from '../api/contract/types.js';
import type { FeatureFlagKey } from './feature_flags.js';
import { can } from '../auth/can.js';

export interface NavSubItem {
	title: string;
	href: string;
	permission?: string;
	roles?: UserRole[];
	featureFlag?: FeatureFlagKey;
	badgeKey?: string;
	badgeVariant?: 'danger' | 'warning' | 'info';
}

export interface NavItem {
	id: string;
	title: string;
	href: string;
	icon: string;
	permission?: string;
	roles?: UserRole[];
	featureFlag?: FeatureFlagKey;
	badgeKey?: string;
	badgeVariant?: 'danger' | 'warning' | 'info';
	subItems?: NavSubItem[];
}

export interface NavSection {
	id: string;
	title: string; // Misal: "OPERASIONAL", "KEUANGAN", dll. Kosong untuk seksi atas.
	items: NavItem[];
}

export const NAVIGATION_CONFIG: NavSection[] = [
	// Seksi Atas (Tanpa Header)
	{
		id: 'top',
		title: '',
		items: [
			{
				id: 'dashboard',
				title: 'Dashboard',
				href: '/',
				icon: 'dashboard',
				permission: 'dashboard:view'
			},
			{
				id: 'approvals',
				title: 'Persetujuan',
				href: '/approvals',
				icon: 'approvals',
				permission: 'approvals:read',
				badgeKey: 'approvals.pending_for_me',
				badgeVariant: 'warning'
			}
		]
	},

	// Seksi 1: OPERASIONAL
	{
		id: 'operasional',
		title: 'OPERASIONAL',
		items: [
			{
				id: 'pos',
				title: 'Kasir POS',
				href: '/pos',
				icon: 'pos',
				permission: 'pos:order:create'
			},
			{
				id: 'inventory',
				title: 'Inventaris',
				href: '/inventory',
				icon: 'inventory',
				featureFlag: 'inventory',
				permission: 'inventory:read',
				badgeKey: 'inventory.below_min',
				badgeVariant: 'danger',
				subItems: [
					{ title: 'Stok per Outlet', href: '/inventory', permission: 'inventory:read', badgeKey: 'inventory.below_min', badgeVariant: 'danger' },
					{ title: 'Pergerakan (Ledger)', href: '/inventory#movements', permission: 'inventory:read' },
					{ title: 'Stock Opname', href: '/inventory#opname', permission: 'inventory:count' },
					{ title: 'Waste & Kerusakan', href: '/inventory#waste', permission: 'inventory:record_waste' },
					{ title: 'Produksi Bahan Olahan', href: '/inventory#production', permission: 'inventory:read' }
				]
			},
			{
				id: 'procurement',
				title: 'Pembelian & Hutang',
				href: '/procurement',
				icon: 'procurement',
				featureFlag: 'procurement',
				permission: 'procurement:read',
				badgeKey: 'procurement.invoices_waiting',
				badgeVariant: 'danger',
				subItems: [
					{ title: 'Permintaan Barang (PO Blind)', href: '/procurement#po', permission: 'procurement:create_po' },
					{ title: 'Penerimaan Barang', href: '/procurement#receipts', permission: 'procurement:receive_goods' },
					{ title: 'Nota Supplier (Penyesuaian Biaya)', href: '/procurement#invoices', permission: 'procurement:read', badgeKey: 'procurement.invoices_waiting', badgeVariant: 'danger' },
					{ title: 'Daftar Tagihan (Bills)', href: '/procurement#bills', permission: 'payables:read' },
					{ title: 'Pembayaran Hutang', href: '/procurement#payments', permission: 'payables:pay' },
					{ title: 'Daftar Pemasok', href: '/procurement#suppliers', permission: 'procurement:read' }
				]
			},
			{
				id: 'petty_cash',
				title: 'Biaya & Kas Kecil',
				href: '/petty-cash',
				icon: 'petty_cash',
				featureFlag: 'petty_cash',
				permission: 'petty_cash:read',
				badgeKey: 'petty_cash.pending_verification',
				badgeVariant: 'warning',
				subItems: [
					{ title: 'Kas Kecil Outlet', href: '/petty-cash', permission: 'petty_cash:read', badgeKey: 'petty_cash.pending_verification', badgeVariant: 'warning' },
					{ title: 'Biaya Pusat (HQ)', href: '/petty-cash#hq', permission: 'costs:read_hq' }
				]
			}
		]
	},

	// Seksi 2: KEUANGAN
	{
		id: 'keuangan',
		title: 'KEUANGAN',
		items: [
			{
				id: 'finance',
				title: 'Keuangan & Pajak',
				href: '/finance',
				icon: 'finance',
				permission: 'finance:read',
				badgeKey: 'finance.true_up_pending',
				badgeVariant: 'warning',
				subItems: [
					{ title: 'Penyesuaian Biaya & HPP', href: '/finance', permission: 'finance:read', badgeKey: 'finance.true_up_pending', badgeVariant: 'warning' },
					{ title: 'Pajak PBJT & PPN', href: '/finance#tax', permission: 'finance:manage_tax', featureFlag: 'tax' },
					{ title: 'Penutupan Periode Fiskal', href: '/finance#periods', permission: 'finance:read' },
					{ title: 'Rekonsiliasi Midtrans / POS', href: '/finance#reconciliation', permission: 'finance:midtrans_reconcile' }
				]
			},
			{
				id: 'reports',
				title: 'Laporan',
				href: '/reports',
				icon: 'reports',
				permission: 'reports:read',
				subItems: [
					{ title: 'Semua Laporan', href: '/reports', permission: 'reports:read' },
					{ title: 'Laporan Laba Rugi (P&L)', href: '/reports#pnl', permission: 'dashboard:view:gross_profit' },
					{ title: 'Laporan Penjualan POS', href: '/reports#sales', permission: 'reports:read' },
					{ title: 'Analisis HPP & Food Cost', href: '/reports#cogs', permission: 'reports:read' },
					{ title: 'Laporan Umur Hutang', href: '/reports#aging', permission: 'payables:manage_bills' }
				]
			}
		]
	},

	// Seksi 3: MASTER DATA
	{
		id: 'master_data',
		title: 'MASTER DATA',
		items: [
			{
				id: 'materials',
				title: 'Master Bahan',
				href: '/materials',
				icon: 'materials',
				permission: 'catalog:read'
			},
			{
				id: 'catalog',
				title: 'Menu & Resep',
				href: '/menu',
				icon: 'menu',
				permission: 'catalog:read',
				badgeKey: 'catalog.proposals_pending',
				badgeVariant: 'info'
			},
			{
				id: 'suppliers',
				title: 'Supplier',
				href: '/suppliers',
				icon: 'suppliers',
				permission: 'procurement:read'
			},
			{
				id: 'outlets',
				title: 'Outlet & Mitra',
				href: '/outlets',
				icon: 'outlets',
				permission: 'org:read'
			}
		]
	},

	// Seksi 4: SISTEM
	{
		id: 'sistem',
		title: 'SISTEM',
		items: [
			{
				id: 'settings',
				title: 'Pengaturan',
				href: '/settings',
				icon: 'settings',
				permission: 'settings:read',
				subItems: [
					{ title: 'Profil Perusahaan', href: '/settings', permission: 'settings:read' },
					{ title: 'Feature Flags', href: '/settings#flags', permission: 'settings:manage_features' },
					{ title: 'Aturan Persetujuan', href: '/settings#rules', permission: 'settings:manage_general' },
					{ title: 'Audit Trail Log', href: '/settings#audit', permission: 'settings:audit_log' }
				]
			}
		]
	}
];

/**
 * Filter seksi & item navigasi berdasarkan izin pengguna (PBAC) dan status feature flags.
 * Menerima `User` objek (untuk evaluasi izin granular `user.permissions`) atau string `UserRole`.
 */
export function getNavigationForUser(
	userOrRole: User | UserRole | null | undefined = 'owner',
	flags: Record<string, boolean> = {}
): NavSection[] {
	const user: User =
		typeof userOrRole === 'string'
			? { id: 'temp-user', name: 'User', email: '', role: userOrRole }
			: userOrRole ?? { id: 'anon-user', name: 'Anon', email: '', role: 'owner' };

	return NAVIGATION_CONFIG.map((section) => {
		const filteredItems = section.items
			.filter((item) => {
				// Cek permission (PBAC)
				if (item.permission && !can(user, item.permission)) return false;
				// Fallback jika item masih mendefinisikan roles mentah
				if (!item.permission && item.roles && !item.roles.includes(user.role)) return false;
				// Cek feature flag
				if (item.featureFlag && flags[item.featureFlag] === false) return false;
				return true;
			})
			.map((item) => {
				if (!item.subItems) return item;
				const filteredSubs = item.subItems.filter((sub) => {
					// Cek permission sub-item (PBAC)
					if (sub.permission && !can(user, sub.permission)) return false;
					// Fallback jika sub-item masih mendefinisikan roles mentah
					if (!sub.permission && sub.roles && !sub.roles.includes(user.role)) return false;
					// Cek feature flag
					if (sub.featureFlag && flags[sub.featureFlag] === false) return false;
					return true;
				});
				return { ...item, subItems: filteredSubs };
			});

		return {
			...section,
			items: filteredItems
		};
	}).filter((section) => section.items.length > 0);
}

/**
 * Item pencarian global (Command Palette Ctrl+K).
 */
export interface CommandSearchItem {
	title: string;
	section: string;
	href: string;
	icon: string;
	tags: string[];
	permission?: string;
	roles?: UserRole[];
}

export const COMMAND_PALETTE_ITEMS: CommandSearchItem[] = [
	{ title: 'Dashboard Eksekutif', section: 'Umum', href: '/', icon: 'chart-bar', tags: ['omzet', 'kpi', 'home'], permission: 'dashboard:view' },
	{ title: 'Persetujuan (Approval Inbox)', section: 'Tindakan', href: '/approvals', icon: 'bolt', tags: ['approval', 'inbox', 'verifikasi'], permission: 'approvals:read' },
	{ title: 'Stok per Outlet', section: 'Operasional • Inventaris', href: '/inventory', icon: 'cube', tags: ['stok', 'bahan', 'buffer'], permission: 'inventory:read' },
	{ title: 'Pergerakan Stok (Ledger)', section: 'Operasional • Inventaris', href: '/inventory#movements', icon: 'arrow-path', tags: ['ledger', 'kartu stok', 'mutasi'], permission: 'inventory:read' },
	{ title: 'Stock Opname Fisik', section: 'Operasional • Inventaris', href: '/inventory#opname', icon: 'clipboard-document-check', tags: ['hitung fisik', 'selisih', 'opname'], permission: 'inventory:count' },
	{ title: 'Pencatatan Waste & Rusak', section: 'Operasional • Inventaris', href: '/inventory#waste', icon: 'trash', tags: ['waste', 'rusak', 'basi'], permission: 'inventory:record_waste' },
	{ title: 'Produksi Bahan Olahan', section: 'Operasional • Inventaris', href: '/inventory#production', icon: 'building-office', tags: ['produksi', 'batch', 'simple syrup'], permission: 'inventory:read' },
	{ title: 'Permintaan Barang (PO Blind)', section: 'Operasional • Pembelian', href: '/procurement#po', icon: 'document-text', tags: ['po', 'order', 'reorder'], permission: 'procurement:create_po' },
	{ title: 'Penerimaan Barang (Goods Receipt)', section: 'Operasional • Pembelian', href: '/procurement#receipts', icon: 'inbox-arrow-down', tags: ['surat jalan', 'terima'], permission: 'procurement:receive_goods' },
	{ title: 'Input Nota Supplier (Penyesuaian Biaya)', section: 'Operasional • Pembelian', href: '/procurement#invoices', icon: 'receipt-percent', tags: ['nota', 'foto', 'supplier invoice', 'penyesuaian biaya', 'true-up'], permission: 'procurement:read' },
	{ title: 'Daftar Tagihan (Bills)', section: 'Operasional • Pembelian', href: '/procurement#bills', icon: 'banknotes', tags: ['tagihan', 'jatuh tempo', 'bill'], permission: 'payables:read' },
	{ title: 'Pembayaran Hutang', section: 'Operasional • Pembelian', href: '/procurement#payments', icon: 'credit-card', tags: ['bayar', 'alokasi', 'transfer'], permission: 'payables:pay' },
	{ title: 'Daftar Pemasok (Suppliers)', section: 'Operasional • Pembelian', href: '/procurement#suppliers', icon: 'building-office', tags: ['vendor', 'gudang pusat', 'supplier'], permission: 'procurement:read' },
	{ title: 'Kas Kecil Outlet (Petty Cash)', section: 'Operasional • Kas', href: '/petty-cash', icon: 'wallet', tags: ['kas kecil', 'float', 'nota kecil'], permission: 'petty_cash:read' },
	{ title: 'Biaya Pusat (HQ Expenses)', section: 'Operasional • Kas', href: '/petty-cash#hq', icon: 'building-office', tags: ['biaya pusat', 'operasional', 'hq'], permission: 'costs:read_hq' },
	{ title: 'Penyesuaian Biaya & HPP', section: 'Keuangan', href: '/finance', icon: 'trending-up', tags: ['penyesuaian biaya', 'hpp', 'selisih', 'true-up', 'rekonsiliasi'], permission: 'finance:read' },
	{ title: 'Pajak PBJT & PPN', section: 'Keuangan', href: '/finance#tax', icon: 'document-text', tags: ['pajak', 'pb1', 'ppn'], permission: 'finance:manage_tax' },
	{ title: 'Penutupan Periode Fiskal', section: 'Keuangan', href: '/finance#periods', icon: 'lock-closed', tags: ['tutup buku', 'fiskal', 'periode'], permission: 'finance:read' },
	{ title: 'Rekonsiliasi Midtrans / POS', section: 'Keuangan', href: '/finance#reconciliation', icon: 'arrow-path', tags: ['qris', 'settlement', 'rekon'], permission: 'finance:midtrans_reconcile' },
	{ title: 'Laporan Laba Rugi (P&L)', section: 'Laporan', href: '/reports#pnl', icon: 'chart-pie', tags: ['laba', 'rugi', 'omzet', 'ebitda'], permission: 'dashboard:view:gross_profit' },
	{ title: 'Laporan Penjualan POS', section: 'Laporan', href: '/reports#sales', icon: 'chart-bar', tags: ['sales', 'item', 'terlaris', 'kasir'], permission: 'reports:read' },
	{ title: 'Laporan Umur Hutang (Aging)', section: 'Laporan', href: '/reports#aging', icon: 'clock', tags: ['hutang', 'jatuh tempo', 'aging'], permission: 'payables:manage_bills' },
	{ title: 'Master Bahan Baku', section: 'Master Data', href: '/materials#items', icon: 'cube', tags: ['bahan', 'item', 'biji kopi', 'susu'], permission: 'catalog:read' },
	{ title: 'Kategori Bahan Baku', section: 'Master Data', href: '/materials#categories', icon: 'tag', tags: ['kategori', 'klasifikasi'], permission: 'catalog:read' },
	{ title: 'Satuan & Konversi', section: 'Master Data', href: '/materials#units', icon: 'scale', tags: ['satuan', 'konversi'], permission: 'catalog:read' },
	{ title: 'Menu Siap Jual & Varian', section: 'Master Data', href: '/menu#menus', icon: 'book-open', tags: ['menu', 'varian', 'kopi susu'], permission: 'catalog:read' },
	{ title: 'Formula Resep & HPP', section: 'Master Data', href: '/menu#recipes', icon: 'book-open', tags: ['resep', 'formula', 'bom', 'hpp'], permission: 'catalog:read' },
	{ title: 'Modifier & Efek Resep', section: 'Master Data', href: '/menu#modifiers', icon: 'sparkles', tags: ['modifier', 'topping', 'sugar level'], permission: 'catalog:read' },
	{ title: 'Penetapan Harga Channel', section: 'Master Data', href: '/menu#pricing', icon: 'calculator', tags: ['harga', 'channel', 'gofood', 'grabfood'], permission: 'catalog:read' },
	{ title: 'Ketersediaan Menu Gerai', section: 'Master Data', href: '/menu#availability', icon: 'building-storefront', tags: ['ketersediaan', 'sold out', 'stok gerai'], permission: 'catalog:read' },
	{ title: 'Direktori Supplier & Pemasok', section: 'Master Data', href: '/suppliers', icon: 'truck', tags: ['vendor', 'gudang pusat', 'supplier', 'pemasok'], permission: 'procurement:read' },
	{ title: 'Daftar Outlet & Cabang', section: 'Master Data', href: '/outlets', icon: 'building-storefront', tags: ['outlet', 'cabang', 'toko'], permission: 'org:read' },
	{ title: 'Pengaturan & Audit Trail', section: 'Sistem', href: '/settings', icon: 'cog-6-tooth', tags: ['pengaturan', 'fitur', 'audit log'], permission: 'settings:read' }
];
