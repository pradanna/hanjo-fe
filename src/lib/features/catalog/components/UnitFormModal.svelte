<script lang="ts">
	/**
	 * Form Modal: Tambah Satuan Ukuran (Unit)
	 * Menggunakan komponen form terpadu: Input, Select, Button.
	 */
	import Modal from '#lib/components/feedback/Modal.svelte';
	import Icon from '#lib/components/data/Icon.svelte';
	import Input from '#lib/components/forms/Input.svelte';
	import Select from '#lib/components/forms/Select.svelte';
	import Button from '#lib/components/forms/Button.svelte';
	import type { Unit } from '#lib/api/contract/types.js';

	interface Props {
		open: boolean;
		onclose: () => void;
		onsave: (data: Partial<Unit>) => Promise<boolean>;
	}

	let { open, onclose, onsave }: Props = $props();

	let name = $state('');
	let symbol = $state('');
	let type = $state<'weight' | 'volume' | 'count' | 'other'>('count');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	const unitTypeOptions = [
		{ value: 'weight', label: 'Berat / Massa (Weight: kg, g, mg)', subtitle: 'Pengukuran timbangan padat' },
		{ value: 'volume', label: 'Volume Cairan (Volume: liter, ml)', subtitle: 'Pengukuran takaran cairan' },
		{ value: 'count', label: 'Satuan Cacah / Buah (Count: pcs, box, kaleng)', subtitle: 'Kuantitas satuan terhitung' },
		{ value: 'other', label: 'Lainnya / Khusus', subtitle: 'Satuan custom' }
	];

	$effect(() => {
		if (open) {
			name = '';
			symbol = '';
			type = 'count';
			errorMessage = null;
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!name.trim()) {
			errorMessage = 'Nama satuan wajib diisi';
			return;
		}
		if (!symbol.trim()) {
			errorMessage = 'Simbol satuan wajib diisi';
			return;
		}

		isSubmitting = true;
		errorMessage = null;

		const success = await onsave({
			name: name.trim(),
			symbol: symbol.trim().toLowerCase(),
			type
		});

		isSubmitting = false;
		if (!success) {
			errorMessage = 'Gagal menyimpan satuan baru.';
		}
	}
</script>

<Modal
	{open}
	title="Tambah Satuan Ukuran Baru"
	subtitle="Daftarkan satuan (UOM) baru untuk takaran bahan dan resep"
	maxWidth="500px"
	{onclose}
>
	<form id="unit-form" onsubmit={handleSubmit} class="unit-form-stack">
		{#if errorMessage}
			<div class="detail-notice-callout warning">
				<Icon name="exclamation-triangle" size={18} />
				<span>{errorMessage}</span>
			</div>
		{/if}

		<Input
			id="unit-name"
			label="Nama Satuan"
			placeholder="Contoh: Kilogram, Liter, Kaleng"
			bind:value={name}
			required
		/>

		<Input
			id="unit-symbol"
			label="Simbol / Singkatan"
			placeholder="kg, l, can"
			bind:value={symbol}
			required
			class="font-mono"
		/>

		<Select
			id="unit-type"
			label="Tipe Besaran Fisik"
			bind:value={type}
			options={unitTypeOptions}
			required
		/>
	</form>

	{#snippet footer()}
		<div class="flex items-center justify-end gap-3 w-full">
			<Button variant="secondary" onclick={onclose} disabled={isSubmitting}>
				Batal
			</Button>
			<Button
				variant="primary"
				type="submit"
				form="unit-form"
				loading={isSubmitting}
			>
				<Icon name="check" size={16} />
				<span>Tambah Satuan</span>
			</Button>
		</div>
	{/snippet}
</Modal>

<style>
	.unit-form-stack {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
</style>
