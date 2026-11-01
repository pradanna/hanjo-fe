<script lang="ts">
	/**
	 * Detail Modal: Informasi Master Supplier (PG-proc-suppliers)
	 * Menampilkan lencana khusus Gudang Pusat dan pencegahan hapus berelasi (AC-03.7)
	 */
	import Modal from '#lib/components/feedback/Modal.svelte';
	import Icon from '#lib/components/data/Icon.svelte';
	import Badge from '#lib/components/data/Badge.svelte';
	import InfoPanel from '#lib/components/data/InfoPanel.svelte';
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
			alert(`Supplier "${supplier.name}" memiliki riwayat transaksi/pengadaan dan tidak dapat dihapus (AC-03.7). Silakan ubah statusnya menjadi non-aktif.`);
			return;
		}
		if (confirm(`Yakin ingin menghapus supplier "${supplier.name}" secara permanen?`)) {
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
		subtitle={`Profil Lengkap Supplier Kode ${supplier.code}`}
		maxWidth="640px"
		{onclose}
	>
		<div class="flex flex-col gap-4">
			<!-- Header Badge Strip (AC-03.7) -->
			<div class="p-3.5 px-4 rounded-xl bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] flex items-center justify-between gap-3 flex-wrap">
				<div class="flex items-center gap-2.5 flex-wrap">
					<CodeBadge code={supplier.code} />
					{#if supplier.type === 'hq_warehouse'}
						<Badge variant="info">
							<Icon name="building-office-2" size={13} />
							<span>Gudang Pusat (HQ Central Hub)</span>
						</Badge>
					{:else}
						<Badge variant="success" text="Supplier Luar (Vendor Eksternal)" />
					{/if}
					<StatusBadge status={supplier.status === 'active' ? 'active' : 'inactive'} />
				</div>

				<div class="flex items-center">
					{#if supplier.has_transactions}
						<Badge variant="warning" text="Ada Riwayat Transaksi" />
					{:else}
						<span class="inline-flex items-center text-xs text-[var(--text-subtle)] px-2.5 py-1">Belum ada transaksi</span>
					{/if}
				</div>
			</div>

			<!-- Notice jika Gudang Pusat atau ada transaksi -->
			{#if supplier.has_transactions}
				<div class="detail-notice-callout warning">
					<Icon name="exclamation-triangle" size={18} class="shrink-0 text-amber-400 mt-0.5" />
					<span>
						Supplier ini dilindungi oleh aturan integritas finansial: entitas yang telah memiliki mutasi faktur/penerimaan barang tidak dapat dihapus dari database (AC-03.7).
					</span>
				</div>
			{/if}

			<!-- Grid Informasi -->
			<div class="grid grid-cols-2 gap-3.5">
				<InfoPanel
					title="Kontak PIC"
					value={supplier.contact_person || 'Tidak dicantumkan'}
				/>

				<InfoPanel
					title="Telepon / WhatsApp"
					value={supplier.phone || '-'}
					monospace
				/>

				<InfoPanel
					title="Email Pemesanan"
					value={supplier.email || '-'}
				/>

				<InfoPanel title="Syarat Tempo Bayar">
					<span class="text-sm font-semibold text-emerald-400 font-mono">
						{supplier.payment_terms_days === 0 ? 'COD (Tunai saat kirim)' : `Net ${supplier.payment_terms_days} Hari`}
					</span>
				</InfoPanel>

				<InfoPanel title="Alamat Kantor / Gudang" colSpan={2}>
					<p class="text-xs text-[var(--text-main)] leading-relaxed m-0">
						{supplier.address ? `${supplier.address}, ${supplier.city || ''}` : `Kota: ${supplier.city || '-'}`}
					</p>
				</InfoPanel>

				{#if supplier.notes}
					<InfoPanel title="Catatan Khusus" colSpan={2}>
						<p class="text-xs text-[var(--text-muted)] leading-relaxed m-0">
							{supplier.notes}
						</p>
					</InfoPanel>
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
							<span>Hapus Supplier</span>
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
