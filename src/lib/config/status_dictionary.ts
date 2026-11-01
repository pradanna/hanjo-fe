/**
 * Kamus Status Baku Bahasa Indonesia & Skema Visual
 * Referensi: MILESTONE.md §T-00.11, §4.5, PRD 13.1
 *
 * Mengatur pelabelan resmi dalam Bahasa Indonesia dan penentuan varian warna badge
 * untuk seluruh status dokumen, inventaris, pengadaan, hutang, dan operasional.
 */

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'live' | 'neutral';

export interface StatusMeta {
	label: string;
	variant: StatusVariant;
	description?: string;
}

export const STATUS_DICTIONARY: Record<string, StatusMeta> = {
	// --- Status Dokumen & Alur Kerja Umum ---
	draft: { label: 'Draf', variant: 'neutral', description: 'Dokumen belum diajukan' },
	submitted: { label: 'Diajukan', variant: 'info', description: 'Menunggu peninjauan' },
	pending: { label: 'Menunggu', variant: 'warning', description: 'Menunggu tindakan' },
	pending_approval: { label: 'Menunggu Persetujuan', variant: 'warning', description: 'Menunggu persetujuan atasan' },
	approved: { label: 'Disetujui', variant: 'success', description: 'Telah disetujui' },
	rejected: { label: 'Ditolak', variant: 'danger', description: 'Ditolak dengan alasan' },
	cancelled: { label: 'Dibatalkan', variant: 'neutral', description: 'Dibatalkan oleh pembuat' },
	active: { label: 'Aktif', variant: 'success', description: 'Entitas aktif digunakan' },
	inactive: { label: 'Nonaktif', variant: 'neutral', description: 'Entitas dinonaktifkan' },
	archived: { label: 'Diarsipkan', variant: 'neutral', description: 'Disimpan di arsip' },

	// --- Status Pengadaan & PO (MS-07) ---
	ordered: { label: 'Dipesan', variant: 'info', description: 'PO telah dikirim ke supplier' },
	partially_received: { label: 'Diterima Sebagian', variant: 'warning', description: 'Penerimaan bertahap' },
	received: { label: 'Diterima Penuh', variant: 'success', description: 'Seluruh barang telah sampai di outlet' },
	waiting_invoice: { label: 'Menunggu Nota', variant: 'warning', description: 'Barang diterima, nota fisik belum diinput' },
	invoiced: { label: 'Nota Terbit', variant: 'info', description: 'Nota fisik telah diunggah' },
	verified: { label: 'Terverifikasi (True-Up)', variant: 'success', description: 'Nota diverifikasi Finance, True-Up selesai' },

	// --- Status Hutang & Tagihan (MS-08) ---
	unpaid: { label: 'Belum Lunas', variant: 'danger', description: 'Tagihan belum dibayar' },
	partially_paid: { label: 'Dibayar Sebagian', variant: 'warning', description: 'Pembayaran bertahap' },
	paid: { label: 'Lunas', variant: 'success', description: 'Tagihan telah dibayar penuh' },
	overdue: { label: 'Jatuh Tempo', variant: 'danger', description: 'Telah melewati batas syarat bayar' },

	// --- Status Kas Kecil (MS-09) ---
	requested: { label: 'Diminta', variant: 'info', description: 'Permintaan kas kecil mode ketat diajukan' },
	spent: { label: 'Dibelanjakan', variant: 'warning', description: 'Uang keluar, nota fisik menunggu verifikasi' },
	reimbursed: { label: 'Diganti', variant: 'success', description: 'Dana kas kecil telah diganti' },

	// --- Status Operasional Harian / EOD (MS-01, MS-09) ---
	open: { label: 'Buka Operasional', variant: 'live', description: 'Outlet sedang beroperasi' },
	closed: { label: 'Sudah Tutup Hari (EOD)', variant: 'success', description: 'Tutup hari telah selesai dilakukan' },
	pending_eod: { label: 'Belum Tutup Hari', variant: 'warning', description: 'Perlu menyelesaikan checklist EOD' },

	// --- Status Inventaris & Stok (MS-06) ---
	in_stock: { label: 'Stok Cukup', variant: 'success', description: 'Saldo berada di atas batas minimum' },
	low_stock: { label: 'Stok Menipis', variant: 'warning', description: 'Saldo mendekati atau di batas minimum' },
	out_of_stock: { label: 'Stok Habis', variant: 'danger', description: 'Saldo stok nol' },
	negative_stock: { label: 'Stok Negatif', variant: 'danger', description: 'Stok sistem di bawah nol (perlu opname)' },
	posted: { label: 'Terposting ke Ledger', variant: 'success', description: 'Pergerakan stok final' },
	provisional: { label: 'Biaya Sementara', variant: 'warning', description: 'Menggunakan harga estimasi terakhir' },
	final: { label: 'Biaya Final', variant: 'success', description: 'Biaya telah disesuaikan nota resmi' }
};

/**
 * Mengambil metadata status (label & varian warna).
 * Memberikan fallback yang aman jika status belum terdaftar.
 */
export function getStatusMeta(statusKey?: string | null): StatusMeta {
	if (!statusKey) {
		return { label: '—', variant: 'neutral' };
	}

	const normalized = statusKey.toLowerCase().trim();
	if (STATUS_DICTIONARY[normalized]) {
		return STATUS_DICTIONARY[normalized];
	}

	// Format otomatis jika kata baru (misal: "pending_review" -> "Pending Review")
	const formattedLabel = normalized
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (char) => char.toUpperCase());

	return {
		label: formattedLabel,
		variant: 'neutral'
	};
}
