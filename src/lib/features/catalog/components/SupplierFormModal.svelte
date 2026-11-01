<script lang="ts">
	/**
	 * Form Modal: Tambah & Ubah Data Supplier
	 * Menggunakan komponen form terpadu: Input, Select, Textarea, Button.
	 * Mengakomodasi tipe 'hq_warehouse' vs 'external' (AC-03.7)
	 */
	import Modal from '#lib/components/feedback/Modal.svelte';
	import Icon from '#lib/components/data/Icon.svelte';
	import Input from '#lib/components/forms/Input.svelte';
	import Select from '#lib/components/forms/Select.svelte';
	import Textarea from '#lib/components/forms/Textarea.svelte';
	import Button from '#lib/components/forms/Button.svelte';
	import type { Supplier } from '#lib/api/contract/types.js';

	interface Props {
		open: boolean;
		supplier: Supplier | null;
		onclose: () => void;
		onsave: (data: Partial<Supplier>) => Promise<boolean>;
	}

	let { open, supplier, onclose, onsave }: Props = $props();

	let name = $state('');
	let code = $state('');
	let type = $state<'hq_warehouse' | 'external'>('external');
	let contact_person = $state('');
	let phone = $state('');
	let email = $state('');
	let address = $state('');
	let city = $state('Jakarta');
	let payment_terms_str = $state('30');
	let notes = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	const typeOptions = [
		{ value: 'external', label: 'Supplier Luar (External Vendor)', subtitle: 'Penyedia bahan baku pihak ketiga' },
		{ value: 'hq_warehouse', label: 'Gudang Distribusi Pusat (HQ Central Warehouse)', subtitle: 'Hub logistik internal HQ' }
	];

	const paymentTermsOptions = [
		{ value: '0', label: 'Tunai Saat Pengiriman (COD / Cash on Delivery)', subtitle: 'Bayar saat barang diterima' },
		{ value: '7', label: 'Tempo 7 Hari Kalender (Net 7)', subtitle: 'Jatuh tempo 1 minggu' },
		{ value: '14', label: 'Tempo 14 Hari Kalender (Net 14)', subtitle: 'Jatuh tempo 2 minggu' },
		{ value: '30', label: 'Tempo 30 Hari Kalender (Net 30)', subtitle: 'Standar pengadaan korporat' },
		{ value: '45', label: 'Tempo 45 Hari Kalender (Net 45)', subtitle: 'Mitra berskala besar' }
	];

	$effect(() => {
		if (supplier) {
			name = supplier.name || '';
			code = supplier.code || '';
			type = supplier.type || 'external';
			contact_person = supplier.contact_person || '';
			phone = supplier.phone || '';
			email = supplier.email || '';
			address = supplier.address || '';
			city = supplier.city || 'Jakarta';
			payment_terms_str = String(supplier.payment_terms_days ?? 30);
			notes = supplier.notes || '';
		} else {
			name = '';
			code = '';
			type = 'external';
			contact_person = '';
			phone = '';
			email = '';
			address = '';
			city = 'Jakarta';
			payment_terms_str = '30';
			notes = '';
		}
		errorMessage = null;
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!name.trim()) {
			errorMessage = 'Nama supplier wajib diisi';
			return;
		}

		isSubmitting = true;
		errorMessage = null;

		const success = await onsave({
			name: name.trim(),
			code: code.trim().toUpperCase(),
			type,
			contact_person: contact_person.trim(),
			phone: phone.trim(),
			email: email.trim(),
			address: address.trim(),
			city: city.trim(),
			payment_terms_days: Number(payment_terms_str) || 0,
			notes: notes.trim()
		});

		isSubmitting = false;
		if (!success) {
			errorMessage = 'Gagal menyimpan data supplier.';
		}
	}
</script>

<Modal
	{open}
	title={supplier ? 'Ubah Data Supplier' : 'Tambah Supplier Baru'}
	subtitle={supplier ? `Perbarui profil ${supplier.name}` : 'Daftarkan supplier eksternal atau gudang pusat internal'}
	maxWidth="640px"
	{onclose}
>
	<form id="supplier-form" onsubmit={handleSubmit} class="space-y-4">
		{#if errorMessage}
			<div class="detail-notice-callout warning">
				<Icon name="exclamation-triangle" size={18} />
				<span>{errorMessage}</span>
			</div>
		{/if}

		<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
			<!-- Nama Supplier -->
			<div class="md:col-span-2">
				<Input
					id="sup-name"
					label="Nama Supplier / Badan Usaha"
					placeholder="Contoh: PT Sumber Kopi Nusantara"
					bind:value={name}
					required
				/>
			</div>

			<!-- Kode Supplier -->
			<Input
				id="sup-code"
				label="Kode Supplier"
				placeholder="SUP-EXT-01"
				bind:value={code}
				class="font-mono"
			/>

			<!-- Tipe Supplier (AC-03.7) -->
			<Select
				id="sup-type"
				label="Tipe Entitas Supplier"
				bind:value={type}
				options={typeOptions}
				required
			/>

			<!-- Kontak PIC -->
			<Input
				id="sup-pic"
				label="Nama Kontak PIC / Sales"
				placeholder="Hendro Setiawan"
				bind:value={contact_person}
			/>

			<!-- Nomor Telepon -->
			<Input
				id="sup-phone"
				label="Nomor Telepon / WhatsApp"
				placeholder="021-5551234 atau 0812..."
				bind:value={phone}
			/>

			<!-- Email -->
			<Input
				id="sup-email"
				label="Alamat Email Pemesanan"
				type="email"
				placeholder="order@supplier.com"
				bind:value={email}
			/>

			<!-- Kota -->
			<Input
				id="sup-city"
				label="Kota Domisili"
				placeholder="Jakarta, Bandung, Surabaya..."
				bind:value={city}
			/>

			<!-- Tempo Pembayaran (Term of Payment) -->
			<div class="md:col-span-2">
				<Select
					id="sup-top"
					label="Syarat Tempo Pembayaran (Term of Payment)"
					bind:value={payment_terms_str}
					options={paymentTermsOptions}
				/>
			</div>

			<!-- Alamat Gudang / Kantor -->
			<div class="md:col-span-2">
				<Textarea
					id="sup-address"
					label="Alamat Kantor / Gudang Supplier"
					placeholder="Alamat lengkap lokasi pengiriman..."
					bind:value={address}
					rows={3}
				/>
			</div>
		</div>
	</form>

	{#snippet footer()}
		<div class="flex items-center justify-end gap-3 w-full">
			<Button variant="secondary" onclick={onclose} disabled={isSubmitting}>
				Batal
			</Button>
			<Button
				variant="primary"
				type="submit"
				form="supplier-form"
				loading={isSubmitting}
			>
				<Icon name="check" size={16} />
				<span>{supplier ? 'Simpan Perubahan' : 'Tambah Supplier'}</span>
			</Button>
		</div>
	{/snippet}
</Modal>
