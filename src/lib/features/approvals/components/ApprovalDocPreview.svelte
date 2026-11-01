<script lang="ts">
	/**
	 * Komponen Viewer Dokumen Sumber Spesifik (PG-apr-detail)
	 * Menampilkan pratinjau data kontekstual sesuai jenis dokumen:
	 * - external_purchase_order: PO belanja luar, supplier, item
	 * - petty_cash_expense: rincian kas kecil, bukti nota, kumulatif harian
	 * - menu_proposal: usulan menu lokal, proyeksi HPP, target margin
	 * - stock_count_variance: komparasi sistem vs fisik, persentase selisih
	 */

	import { formatRupiah } from '../../../utils/format.js';
	import type { ApprovalRequest } from '../../../api/contract/types.js';

	interface Props {
		request: ApprovalRequest;
	}

	let { request }: Props = $props();
</script>

<div class="preview-specific-card">
	{#if request.document_type === 'external_purchase_order'}
		<div class="preview-card-title">
			<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
				<path d="M3 6h18" />
				<path d="M16 10a4 4 0 0 1-8 0" />
			</svg>
			<span>Rincian Pengadaan Supplier Luar</span>
		</div>
		<div class="detail-grid-row">
			<div class="detail-item-col">
				<span class="detail-item-label">Nama Supplier Eksternal</span>
				<span class="detail-item-value font-bold">{request.details?.supplier_name || 'Distributor Lokal'}</span>
			</div>
			<div class="detail-item-col">
				<span class="detail-item-label">Kategori Belanja</span>
				<span class="detail-item-value">{request.details?.category || 'Bahan Baku Darurat'}</span>
			</div>
		</div>
		{#if request.details?.items_preview}
			<div class="detail-item-col">
				<span class="detail-item-label">Kuantitas & Item Barang</span>
				<span class="detail-item-value font-mono text-sm">{request.details.items_preview}</span>
			</div>
		{/if}
		<div class="detail-item-col">
			<span class="detail-item-label">Justifikasi Kebutuhan Gerai</span>
			<span class="detail-item-value text-muted italic">"{request.details?.justification || '-'}"</span>
		</div>

	{:else if request.document_type === 'petty_cash_expense'}
		<div class="preview-card-title">
			<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
				<rect width="20" height="14" x="2" y="5" rx="2" />
				<line x1="2" x2="22" y1="10" y2="10" />
			</svg>
			<span>Rincian Pengeluaran Kas Kecil Bertingkat (§6.8)</span>
		</div>
		<div class="detail-grid-row">
			<div class="detail-item-col">
				<span class="detail-item-label">Pos Kategori Biaya</span>
				<span class="detail-item-value font-bold">{request.details?.category || 'Operasional Toko'}</span>
			</div>
			<div class="detail-item-col">
				<span class="detail-item-label">Nomor Struk / Bukti Kas</span>
				<span class="detail-item-value font-mono">{request.details?.receipt_number || '-'}</span>
			</div>
			<div class="detail-item-col">
				<span class="detail-item-label">Nominal Pengeluaran</span>
				<span class="detail-item-value font-bold font-mono text-emerald-600">
					{formatRupiah(request.amount_num || Number(request.amount || 0))}
				</span>
			</div>
			<div class="detail-item-col">
				<span class="detail-item-label">Akumulasi Harian Gerai</span>
				<span class="detail-item-value font-mono text-amber-600">
					{formatRupiah(Number(request.details?.daily_cumulative || request.amount || 0))}
				</span>
			</div>
		</div>
		<div class="detail-item-col">
			<span class="detail-item-label">Keperluan Operasional</span>
			<span class="detail-item-value text-muted italic">"{request.details?.justification || '-'}"</span>
		</div>

	{:else if request.document_type === 'menu_proposal'}
		<div class="preview-card-title">
			<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
			</svg>
			<span>Kurasi Usulan Menu & Resep Lokal (MS-10)</span>
		</div>
		<div class="detail-grid-row">
			<div class="detail-item-col">
				<span class="detail-item-label">Usulan Nama Menu</span>
				<span class="detail-item-value font-bold">{request.details?.item_name || request.document_title}</span>
			</div>
			<div class="detail-item-col">
				<span class="detail-item-label">Usulan Harga Jual</span>
				<span class="detail-item-value font-mono font-bold text-emerald-600">
					{formatRupiah(Number(request.details?.suggested_price || request.amount || 0))}
				</span>
			</div>
			<div class="detail-item-col">
				<span class="detail-item-label">Estimasi HPP Resep</span>
				<span class="detail-item-value font-mono">
					{formatRupiah(Number(request.details?.estimated_hpp || 0))}
				</span>
			</div>
			<div class="detail-item-col">
				<span class="detail-item-label">Target Gross Margin</span>
				<span class="detail-item-value font-bold text-indigo-600">
					{request.details?.target_margin || '70.0%'}
				</span>
			</div>
		</div>
		{#if request.details?.recipe_summary}
			<div class="detail-item-col">
				<span class="detail-item-label">Komposisi Resep Usulan</span>
				<span class="detail-item-value text-sm font-mono">{request.details.recipe_summary}</span>
			</div>
		{/if}

	{:else if request.document_type === 'stock_count_variance'}
		<div class="preview-card-title">
			<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
				<path d="m21 16-4 4-4-4" />
				<path d="M17 20V4" />
				<path d="m3 8 4-4 4 4" />
				<path d="M7 4v16" />
			</svg>
			<span>Evaluasi Selisih Hasil Stock Opname Fisik (MS-06)</span>
		</div>
		<div class="detail-grid-row">
			<div class="detail-item-col">
				<span class="detail-item-label">Nama Bahan Baku</span>
				<span class="detail-item-value font-bold">{request.details?.item_name || 'Bahan Baku'}</span>
			</div>
			<div class="detail-item-col">
				<span class="detail-item-label">Saldo Sistem vs Hitung Fisik</span>
				<span class="detail-item-value font-mono">
					{request.details?.system_qty || '0'} ➔ <span class="font-bold">{request.details?.physical_qty || '0'}</span>
				</span>
			</div>
			<div class="detail-item-col">
				<span class="detail-item-label">Selisih Kuantitas</span>
				<span class="detail-item-value font-bold font-mono text-red-600">
					{request.details?.variance_qty || '-'}
				</span>
			</div>
			<div class="detail-item-col">
				<span class="detail-item-label">Estimasi Nilai Selisih</span>
				<span class="detail-item-value font-bold font-mono text-red-600">
					{formatRupiah(Number(request.details?.variance_value || request.amount || 0))}
					{#if request.details?.variance_pct}
						({request.details.variance_pct}%)
					{/if}
				</span>
			</div>
		</div>
		<div class="detail-item-col">
			<span class="detail-item-label">Alasan & Temuan di Gerai</span>
			<span class="detail-item-value text-muted italic">"{request.details?.justification || '-'}"</span>
		</div>

	{:else}
		<div class="preview-card-title">
			<span>Rincian Dokumen</span>
		</div>
		<div class="detail-grid-row">
			<div class="detail-item-col">
				<span class="detail-item-label">Nomor Referensi</span>
				<span class="detail-item-value font-mono">{request.document_ref}</span>
			</div>
			<div class="detail-item-col">
				<span class="detail-item-label">Nilai Dokumen</span>
				<span class="detail-item-value font-mono font-bold">
					{request.amount ? formatRupiah(Number(request.amount)) : '—'}
				</span>
			</div>
		</div>
	{/if}
</div>
