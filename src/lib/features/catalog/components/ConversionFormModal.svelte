<script lang="ts">
	/**
	 * Form Modal: Tambah Aturan Konversi Satuan (Unit Conversion)
	 * Menggunakan komponen form terpadu: Select, Input, Button.
	 * Memenuhi T-03.4 (Pratinjau "1 liter = 1000 ml") & AC-03.2 (Pencegahan Siklus)
	 */
	import Modal from '#lib/components/feedback/Modal.svelte';
	import Icon from '#lib/components/data/Icon.svelte';
	import Select from '#lib/components/forms/Select.svelte';
	import Input from '#lib/components/forms/Input.svelte';
	import Button from '#lib/components/forms/Button.svelte';
	import { validateConversionFactor, detectConversionCycle } from '#lib/domain/catalog.js';
	import type { Unit, UnitConversion } from '#lib/api/contract/types.js';

	interface Props {
		open: boolean;
		units: Unit[];
		existingConversions: UnitConversion[];
		onclose: () => void;
		onsave: (data: Partial<UnitConversion>) => Promise<boolean>;
	}

	let { open, units, existingConversions, onclose, onsave }: Props = $props();

	let from_unit_id = $state('');
	let to_unit_id = $state('');
	let factor = $state('1000');
	let description = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	const unitOptions = $derived(
		units.map((u) => ({
			value: u.id,
			label: `${u.name} (${u.symbol})`,
			subtitle: u.type
		}))
	);

	$effect(() => {
		if (open) {
			if (units.length >= 2) {
				from_unit_id = units[0]?.id || '';
				to_unit_id = units[1]?.id || '';
			}
			factor = '1000';
			description = '';
			errorMessage = null;
		}
	});

	const fromUnit = $derived(units.find((u) => u.id === from_unit_id));
	const toUnit = $derived(units.find((u) => u.id === to_unit_id));

	// Pratinjau interaktif real-time: 1 liter = 1.000 ml (T-03.4)
	const previewText = $derived.by(() => {
		if (!fromUnit || !toUnit || !factor) return '';
		const fNum = parseFloat(factor);
		const formatted = isNaN(fNum) ? factor : fNum.toLocaleString('id-ID');
		return `1 ${fromUnit.symbol} = ${formatted} ${toUnit.symbol}`;
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!from_unit_id || !to_unit_id) {
			errorMessage = 'Satuan asal dan tujuan wajib dipilih';
			return;
		}
		if (from_unit_id === to_unit_id) {
			errorMessage = 'Satuan asal dan tujuan tidak boleh sama';
			return;
		}

		// Validasi faktor > 0
		const factorCheck = validateConversionFactor(factor);
		if (!factorCheck.valid) {
			errorMessage = factorCheck.message!;
			return;
		}

		// Validasi siklus (AC-03.2)
		const hasCycle = detectConversionCycle(existingConversions, {
			from_unit_id,
			to_unit_id
		});

		if (hasCycle) {
			errorMessage = `Terdeteksi siklus konversi satuan (${fromUnit?.symbol} -> ${toUnit?.symbol}). Aturan konversi melingkar dilarang (AC-03.2).`;
			return;
		}

		isSubmitting = true;
		errorMessage = null;

		const success = await onsave({
			from_unit_id,
			to_unit_id,
			factor: factor.trim(),
			description: description.trim() || previewText
		});

		isSubmitting = false;
		if (!success) {
			errorMessage = 'Gagal menyimpan aturan konversi satuan.';
		}
	}
</script>

<Modal
	{open}
	title="Tambah Aturan Konversi Satuan"
	subtitle="Tentukan rasio konversi otomatis antara dua satuan ukuran (AC-03.2)"
	maxWidth="540px"
	{onclose}
>
	<form id="conversion-form" onsubmit={handleSubmit} class="conversion-form-stack">
		{#if errorMessage}
			<div class="detail-notice-callout warning">
				<Icon name="exclamation-triangle" size={18} />
				<span>{errorMessage}</span>
			</div>
		{/if}

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<!-- Satuan Asal -->
			<Select
				id="conv-from"
				label="Dari Satuan (Besar)"
				bind:value={from_unit_id}
				options={unitOptions}
				placeholder="Pilih Satuan Asal..."
				required
			/>

			<!-- Satuan Tujuan -->
			<Select
				id="conv-to"
				label="Ke Satuan (Kecil)"
				bind:value={to_unit_id}
				options={unitOptions}
				placeholder="Pilih Satuan Tujuan..."
				required
			/>
		</div>

		<!-- Faktor Konversi -->
		<Input
			id="conv-factor"
			label="Faktor Pengali (Kuantitas Satuan Tujuan per 1 Satuan Asal)"
			type="number"
			step="any"
			placeholder="1000"
			bind:value={factor}
			required
			class="font-mono"
		/>

		<!-- Live Preview Box (T-03.4) -->
		{#if previewText}
			<div class="p-3.5 rounded-lg bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] flex items-center justify-between">
				<span class="text-xs text-[var(--text-muted)] font-medium">Pratinjau Hubungan:</span>
				<strong class="text-sm font-bold text-emerald-400">{previewText}</strong>
			</div>
		{/if}

		<Input
			id="conv-desc"
			label="Catatan Tambahan"
			placeholder="Contoh: 1 Box Karton berisi 24 kaleng SKM"
			bind:value={description}
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
				form="conversion-form"
				loading={isSubmitting}
			>
				<Icon name="check" size={16} />
				<span>Simpan Konversi</span>
			</Button>
		</div>
	{/snippet}
</Modal>

<style>
	.conversion-form-stack {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
</style>
