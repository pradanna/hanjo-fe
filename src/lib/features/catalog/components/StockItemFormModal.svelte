<script lang="ts">
	/**
	 * Form Modal: Tambah & Ubah Bahan Baku (Stock Item)
	 * Menggunakan komponen form terpadu: Input, Select, CurrencyInput, Checkbox, Textarea, Button.
	 * Mengikuti Golden Rule 2 (Thin Svelte), Golden Rule 10 (Tokens), Golden Rule 14 (Padding).
	 */
	import Modal from '#lib/components/feedback/Modal.svelte';
	import Icon from '#lib/components/data/Icon.svelte';
	import Input from '#lib/components/forms/Input.svelte';
	import Select from '#lib/components/forms/Select.svelte';
	import CurrencyInput from '#lib/components/forms/CurrencyInput.svelte';
	import Radio from '#lib/components/forms/Radio.svelte';
	import Textarea from '#lib/components/forms/Textarea.svelte';
	import Button from '#lib/components/forms/Button.svelte';
	import type { StockItem, ItemCategory, Unit, DecimalString } from '#lib/api/contract/types.js';

	interface Props {
		open: boolean;
		item: StockItem | null;
		categories: ItemCategory[];
		units: Unit[];
		onclose: () => void;
		onsave: (data: Partial<StockItem>) => Promise<boolean>;
	}

	let { open, item, categories, units, onclose, onsave }: Props = $props();

	// Local Form State
	let name = $state('');
	let code = $state('');
	let category_id = $state('');
	let base_unit_id = $state('');
	type SourcingType = 'hq_warehouse' | 'external_buy' | 'in_house_prep';
	let sourcingType = $state<SourcingType>('hq_warehouse');
	let storage_temperature = $state<'ambient' | 'chilled' | 'frozen'>('ambient');
	let hq_ref_code = $state('');
	let hq_ref_price = $state<DecimalString>('0.00');
	let description = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	const isHqSourced = $derived(sourcingType === 'hq_warehouse');
	const isInternalPrep = $derived(sourcingType === 'in_house_prep');

	// Otomatis bersihkan kode & harga referensi pusat saat bukan bahan pasokan sentral HQ
	$effect(() => {
		if (!isHqSourced) {
			hq_ref_code = '';
			hq_ref_price = '0.00';
		}
	});

	// Opsi dropdown terstandarisasi untuk Select.svelte
	const categoryOptions = $derived(
		categories.map((cat) => ({
			value: cat.id,
			label: cat.name,
			subtitle: cat.code
		}))
	);

	const unitOptions = $derived(
		units.map((u) => ({
			value: u.id,
			label: `${u.name} (${u.symbol})`,
			subtitle: u.type
		}))
	);

	const storageOptions = [
		{ value: 'ambient', label: 'Suhu Ruang (Ambient)', subtitle: 'Suhu ruangan standar' },
		{ value: 'chilled', label: 'Dingin / Kulkas (Chilled 2°C - 4°C)', subtitle: 'Produk susu, keju, sirup dingin' },
		{ value: 'frozen', label: 'Beku / Freezer (Frozen < -18°C)', subtitle: 'Daging, es batu, bahan beku' }
	];

	const sourcingOptions = [
		{
			value: 'hq_warehouse',
			label: 'Pasokan Gudang Pusat HQ (Sentralisasi)',
			description: 'Bahan mentah yang wajib dipasok secara sentral dari gudang logistik pusat (contoh: Roast Beans HQ, Cup Logo Sablon, Bubuk Matcha import).'
		},
		{
			value: 'external_buy',
			label: 'Pengadaan Langsung (Beli Luar / Direct PO)',
			description: 'Bahan mentah yang diizinkan dibeli mandiri oleh gerai langsung ke supplier lokal via PO (contoh: Susu Segar Pasteurisasi, Es Batu, Buah Segar).'
		},
		{
			value: 'in_house_prep',
			label: 'Olahan Internal Gerai (Batch Prep / Semi-Finished)',
			description: 'Bahan setengah jadi yang diracik sendiri oleh barista atau dapur di gerai (contoh: Cold Brew concentrate batch 24h, Sirup Gula Aren Pandan batch).'
		}
	];

	// Sinkronisasi saat item prop berubah
	$effect(() => {
		if (item) {
			name = item.name || '';
			code = item.code || '';
			category_id = item.category_id || (categories[0]?.id || '');
			base_unit_id = item.base_unit_id || (units[0]?.id || '');
			if (item.is_producible) {
				sourcingType = 'in_house_prep';
			} else if (item.can_buy_external) {
				sourcingType = 'external_buy';
			} else {
				sourcingType = 'hq_warehouse';
			}
			storage_temperature = item.storage_temperature || 'ambient';
			hq_ref_code = item.hq_ref_code || '';
			hq_ref_price = (item.hq_ref_price || '0.00') as DecimalString;
			description = item.description || '';
		} else {
			name = '';
			code = '';
			category_id = categories[0]?.id || '';
			base_unit_id = units[0]?.id || '';
			sourcingType = 'hq_warehouse';
			storage_temperature = 'ambient';
			hq_ref_code = '';
			hq_ref_price = '0.00';
			description = '';
		}
		errorMessage = null;
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!name.trim()) {
			errorMessage = 'Nama bahan baku wajib diisi';
			return;
		}
		if (!code.trim()) {
			errorMessage = 'Kode bahan baku (SKU) wajib diisi';
			return;
		}

		isSubmitting = true;
		errorMessage = null;

		const is_producible = sourcingType === 'in_house_prep';
		const can_buy_external = sourcingType === 'external_buy';

		const success = await onsave({
			name: name.trim(),
			code: code.trim().toUpperCase(),
			category_id,
			base_unit_id,
			is_producible,
			can_buy_external,
			storage_temperature,
			hq_ref_code: isHqSourced ? hq_ref_code.trim() : '',
			hq_ref_price: isHqSourced ? (hq_ref_price || '0.00') : '0.00',
			description: description.trim()
		});

		isSubmitting = false;
		if (!success) {
			errorMessage = 'Gagal menyimpan data bahan. Periksa kembali isian Anda.';
		}
	}
</script>

<Modal
	{open}
	title={item ? 'Ubah Bahan Baku' : 'Tambah Bahan Baku Baru'}
	subtitle={item ? `Perbarui spesifikasi bahan SKU ${item.code}` : 'Daftarkan bahan baku baru ke dalam katalog pusat'}
	maxWidth="960px"
	{onclose}
>
	<form id="stock-item-form" onsubmit={handleSubmit} class="form-field-stack">
		{#if errorMessage}
			<div class="detail-notice-callout warning">
				<Icon name="exclamation-triangle" size={18} />
				<span>{errorMessage}</span>
			</div>
		{/if}

		<div class="modal-form-two-col">
			<!-- KOLOM 1 (KIRI): Asal / Metode Pasokan & Catatan Penggunaan -->
			<div class="modal-col">
				<div class="col-section-title">
					<Icon name="building-office" size={16} />
					<span>1. Metode Pasokan & Sifat Asal Bahan</span>
				</div>

				<div class="form-field-stack">
					<div class="sourcing-panel">
						<Radio
							name="item-sourcing-type"
							required
							options={sourcingOptions}
							bind:value={sourcingType}
						/>
					</div>

					<!-- Deskripsi & Petunjuk Penggunaan -->
					<div class="desc-panel">
						<Textarea
							id="item-desc"
							label="Deskripsi / Petunjuk Penggunaan"
							placeholder="Petunjuk perlakuan khusus, racikan olahan, atau catatan batch..."
							bind:value={description}
							rows={3}
						/>
					</div>
				</div>
			</div>

			<!-- KOLOM 2 (KANAN): Identitas & Spesifikasi Inventaris Master -->
			<div class="modal-col">
				<div class="col-section-title">
					<Icon name="cube" size={16} />
					<span>2. Spesifikasi Master Inventaris</span>
				</div>

				<div class="form-field-stack">
					<!-- Nama Bahan -->
					<Input
						id="item-name"
						label="Nama Bahan Baku"
						placeholder="Contoh: Espresso Blend House Arabica"
						bind:value={name}
						required
					/>

					<!-- Kode SKU & Kategori -->
					<div class="grid grid-cols-2 gap-4">
						<Input
							id="item-code"
							label="Kode Bahan / SKU"
							placeholder="KOP-ESP-01"
							bind:value={code}
							disabled={!!item}
							helperText={item ? 'Kode SKU terkunci' : undefined}
							required
						/>

						<Select
							id="item-category"
							label="Kategori Bahan"
							bind:value={category_id}
							options={categoryOptions}
							placeholder="Pilih Kategori..."
							required
						/>
					</div>

					<!-- Satuan Dasar & Suhu Penyimpanan -->
					<div class="grid grid-cols-2 gap-4">
						<Select
							id="item-base-unit"
							label="Satuan Dasar"
							bind:value={base_unit_id}
							options={unitOptions}
							disabled={!!item && item.has_stock_movements}
							helperText={item && item.has_stock_movements ? 'Terkunci: Ada mutasi' : undefined}
							placeholder="Pilih Satuan..."
							required
						/>

						<Select
							id="item-storage"
							label="Suhu Penyimpanan"
							bind:value={storage_temperature}
							options={storageOptions}
						/>
					</div>

					{#if isHqSourced}
						<!-- Kode Referensi Pusat & Harga Acuan Pusat (Khusus Pasokan Gudang Pusat) -->
						<div class="grid grid-cols-2 gap-4">
							<Input
								id="item-hq-code"
								label="Kode Referensi Pusat"
								placeholder="Contoh: HQ-ROAST-01"
								bind:value={hq_ref_code}
								helperText="Kode SKU logistik gudang pusat"
							/>

							<CurrencyInput
								id="item-hq-price"
								label="Harga Acuan Pusat"
								bind:value={hq_ref_price}
								placeholder="0"
								helperText="Murni acuan harga logistik pusat"
							/>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</form>

	{#snippet footer()}
		<div class="modal-footer-actions">
			<Button variant="secondary" onclick={onclose} disabled={isSubmitting}>
				Batal
			</Button>
			<Button
				variant="primary"
				type="submit"
				form="stock-item-form"
				loading={isSubmitting}
			>
				<Icon name="check" size={16} />
				<span>{item ? 'Simpan Perubahan' : 'Tambahkan Bahan'}</span>
			</Button>
		</div>
	{/snippet}
</Modal>

<style>
	.modal-form-two-col {
		display: grid;
		grid-template-columns: 1fr;
		gap: 24px;
	}

	@media (min-width: 768px) {
		.modal-form-two-col {
			grid-template-columns: 1fr 1.12fr;
			gap: 28px;
			align-items: start;
		}
	}

	.modal-col {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.col-section-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		font-weight: 700;
		color: var(--text-main, #f8fafc);
		padding-bottom: 8px;
		border-bottom: 1px solid var(--border-panel, rgba(255, 255, 255, 0.08));
	}

	.form-field-stack {
		display: flex;
		flex-direction: column;
		gap: 22px;
	}

	.modal-footer-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 12px;
		width: 100%;
		margin-top: 22px;
		padding-top: 18px;
	}

	.sourcing-panel {
		padding: 16px 18px;
		background: var(--bg-panel-sub, #0f172a);
		border: 1px solid var(--border-panel, rgba(255, 255, 255, 0.08));
		border-radius: var(--radius-lg, 12px);
	}

	.desc-panel {
		display: flex;
		flex-direction: column;
	}
</style>
