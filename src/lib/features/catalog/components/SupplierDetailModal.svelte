<script lang="ts">
	/**
	 * Detail Modal: Informasi Master Pemasok (PG-proc-suppliers)
	 * Menampilkan lencana khusus Gudang Pusat dan pencegahan hapus berelasi (AC-03.7)
	 */
	import Modal from '#lib/components/feedback/Modal.svelte';
	import Icon from '#lib/components/data/Icon.svelte';
	import StatusBadge from '#lib/components/data/StatusBadge.svelte';
	import CodeBadge from '#lib/components/data/CodeBadge.svelte';
	import type { Supplier } from '#lib/api/contract/types.js';

	interface Props {
		open: boolean;
		supplier: Supplier | null;
		onclose: () => void;
		onedit: (supplier: Supplier) => void;
		ondelete: (supplier: Supplier) => Promise<boolean>;
	}

	let { open, supplier, onclose, onedit, ondelete }: Props = $props();

	let isDeleting = $state(false);

	async function handleDelete() {
		if (!supplier) return;
		if (supplier.has_transactions) {
			alert(`Pemasok "${supplier.name}" memiliki riwayat transaksi/pengadaan dan tidak dapat dihapus (AC-03.7). Silakan ubah statusnya menjadi non-aktif.`);
			return;
		}
		if (confirm(`Yakin ingin menghapus pemasok "${supplier.name}" secara permanen?`)) {
			isDeleting = true;
			await ondelete(supplier);
			isDeleting = false;
			onclose();
		}
	}
</script>

{#if supplier}
	<Modal
		{open}
		title={supplier.name}
		subtitle={`Profil Lengkap Pemasok Kode ${supplier.code}`}
		maxWidth="600px"
		{onclose}
	>
		<div class="flex flex-col gap-4">
			<!-- Header Badge Strip (AC-03.7) -->
			<div class="p-4 rounded-xl bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] flex items-center justify-between gap-4">
				<div class="flex items-center gap-2.5">
					<CodeBadge code={supplier.code} />
					{#if supplier.type === 'hq_warehouse'}
						<span class="pill-badge pill-info flex items-center gap-1 font-bold">
							<Icon name="building-office-2" size={13} />
							<span>Gudang Pusat (HQ Central Hub)</span>
						</span>
					{:else}
						<span class="pill-badge pill-success">Pemasok Luar (Vendor Eksternal)</span>
					{/if}
					<StatusBadge status={supplier.status === 'active' ? 'active' : 'inactive'} />
				</div>

				<div>
					{#if supplier.has_transactions}
						<span class="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
							Ada Riwayat Transaksi
						</span>
					{:else}
						<span class="text-[11px] text-[var(--text-subtle)]">Belum ada transaksi</span>
					{/if}
				</div>
			</div>

			<!-- Notice jika Gudang Pusat atau ada transaksi -->
			{#if supplier.has_transactions}
				<div class="detail-notice-callout warning">
					<Icon name="shield-exclamation" size={18} />
					<span>
						Pemasok ini dilindungi oleh aturan integritas finansial: entitas yang telah memiliki mutasi faktur/penerimaan barang tidak dapat dihapus dari database (AC-03.7).
					</span>
				</div>
			{/if}

			<!-- Grid Informasi -->
			<div class="grid grid-cols-2 gap-3.5">
				<div class="p-3.5 rounded-lg bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] flex flex-col gap-1">
					<span class="text-[11px] text-[var(--text-subtle)] font-medium">Kontak PIC</span>
					<span class="text-sm font-semibold text-[var(--text-main)]">
						{supplier.contact_person || 'Tidak dicantumkan'}
					</span>
				</div>

				<div class="p-3.5 rounded-lg bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] flex flex-col gap-1">
					<span class="text-[11px] text-[var(--text-subtle)] font-medium">Telepon / WhatsApp</span>
					<span class="text-sm font-semibold font-mono text-[var(--text-main)]">
						{supplier.phone || '-'}
					</span>
				</div>

				<div class="p-3.5 rounded-lg bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] flex flex-col gap-1">
					<span class="text-[11px] text-[var(--text-subtle)] font-medium">Email Pemesanan</span>
					<span class="text-sm font-semibold text-[var(--text-main)]">
						{supplier.email || '-'}
					</span>
				</div>

				<div class="p-3.5 rounded-lg bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] flex flex-col gap-1">
					<span class="text-[11px] text-[var(--text-subtle)] font-medium">Syarat Tempo Bayar</span>
					<span class="text-sm font-semibold text-emerald-400">
						{supplier.payment_terms_days === 0 ? 'COD (Tunai saat kirim)' : `Net ${supplier.payment_terms_days} Hari`}
					</span>
				</div>

				<div class="p-3.5 rounded-lg bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] flex flex-col gap-1 col-span-2">
					<span class="text-[11px] text-[var(--text-subtle)] font-medium">Alamat Kantor / Gudang</span>
					<p class="text-xs text-[var(--text-main)] leading-relaxed">
						{supplier.address ? `${supplier.address}, ${supplier.city || ''}` : `Kota: ${supplier.city || '-'}`}
					</p>
				</div>

				{#if supplier.notes}
					<div class="p-3.5 rounded-lg bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] flex flex-col gap-1 col-span-2">
						<span class="text-[11px] text-[var(--text-subtle)] font-medium">Catatan Khusus</span>
						<p class="text-xs text-[var(--text-muted)] leading-relaxed">
							{supplier.notes}
						</p>
					</div>
				{/if}
			</div>
		</div>

		{#snippet footer()}
			<div class="flex items-center justify-between w-full">
				<div>
					{#if !supplier.has_transactions}
						<button
							type="button"
							class="btn btn-danger-outline"
							onclick={handleDelete}
							disabled={isDeleting}
						>
							<Icon name="trash" size={16} />
							<span>Hapus Pemasok</span>
						</button>
					{:else}
						<span class="text-xs text-[var(--text-subtle)] italic">
							Tidak dapat dihapus (ada transaksi)
						</span>
					{/if}
				</div>

				<div class="flex items-center gap-3">
					<button type="button" class="btn btn-secondary" onclick={onclose}>
						Tutup
					</button>
					<button
						type="button"
						class="btn btn-primary"
						onclick={() => {
							onclose();
							onedit(supplier);
						}}
					>
						<Icon name="pencil-square" size={16} />
						<span>Ubah Data</span>
					</button>
				</div>
			</div>
		{/snippet}
	</Modal>
{/if}
