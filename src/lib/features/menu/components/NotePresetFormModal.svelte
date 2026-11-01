<script lang="ts">
	/**
	 * Form Modal: Tambah & Ubah Preset Catatan Dapur / Barista (Lapis 3: Rp 0)
	 * Mengikuti Golden Rule 14 (Generous padding, min-height >= 40px, sticky footer)
	 */
	import Modal from '#lib/components/feedback/Modal.svelte';
	import Icon from '#lib/components/data/Icon.svelte';
	import Input from '#lib/components/forms/Input.svelte';
	import Select, { type SelectOption } from '#lib/components/forms/Select.svelte';
	import Button from '#lib/components/forms/Button.svelte';
	import type { NotePreset } from '#lib/api/contract/types.js';

	interface Props {
		open: boolean;
		preset: NotePreset | null;
		onclose: () => void;
		onsave: (data: Partial<NotePreset>) => Promise<boolean>;
	}

	let { open, preset, onclose, onsave }: Props = $props();

	let name = $state('');
	let code = $state('');
	let category = $state<'beverage' | 'food' | 'general'>('beverage');
	let sortOrder = $state('1');
	let isActive = $state(true);
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	const categoryOptions: SelectOption[] = [
		{ value: 'beverage', label: 'Minuman (Level Gula, Es, Suhu)' },
		{ value: 'food', label: 'Makanan (Tingkat Pedas, Bumbu, Sambal)' },
		{ value: 'general', label: 'Umum (Kemasan, Sedotan, Sendok)' }
	];

	$effect(() => {
		if (preset) {
			name = preset.name || '';
			code = preset.code || '';
			category = preset.category || 'beverage';
			sortOrder = String(preset.sort_order ?? 1);
			isActive = preset.is_active ?? true;
		} else {
			name = '';
			code = '';
			category = 'beverage';
			sortOrder = '1';
			isActive = true;
		}
		errorMessage = null;
	});

	function handleNameChange() {
		if (preset?.id) return;
		if (name.trim()) {
			const clean = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-');
			code = `NOTE-${clean}`;
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!name.trim()) {
			errorMessage = 'Nama preset catatan instruksi dapur wajib diisi.';
			return;
		}

		if (!code.trim()) {
			errorMessage = 'Kode preset catatan wajib diisi (mis. NOTE-LESS-SUG).';
			return;
		}

		isSubmitting = true;
		errorMessage = null;

		const success = await onsave({
			name: name.trim(),
			code: code.trim().toUpperCase(),
			category,
			sort_order: Number(sortOrder) || 1,
			is_active: isActive
		});

		isSubmitting = false;
		if (!success) {
			errorMessage = 'Gagal menyimpan preset catatan. Periksa kembali isian formulir.';
		}
	}
</script>

<Modal
	{open}
	title={preset ? 'Ubah Preset Catatan Dapur' : 'Tambah Preset Catatan Dapur'}
	subtitle={preset ? `Perbarui preset instruksi ${preset.name}` : 'Daftarkan opsi instruksi cepat (+Rp 0) untuk kasir POS dan koki/barista'}
	maxWidth="520px"
	{onclose}
>
	<form id="note-preset-form" onsubmit={handleSubmit} class="note-preset-form-stack">
		{#if errorMessage}
			<div class="note-preset-alert warning">
				<Icon name="exclamation-triangle" size={18} />
				<span>{errorMessage}</span>
			</div>
		{/if}

		<div class="info-callout">
			<Icon name="information-circle" size={18} class="text-sky-400 shrink-0 mt-0.5" />
			<div class="text-xs text-[var(--text-muted)] leading-relaxed">
				<strong>Lapis 3 (Catatan Dapur)</strong> bersifat bebas biaya (+Rp 0) dan tidak mempengaruhi stok bahan baku. Preset ini muncul sebagai tombol cepat (*quick chips*) saat barista/kasir mencatat pesanan.
			</div>
		</div>

		<Input
			id="note-preset-name"
			label="Nama Instruksi / Preferensi"
			placeholder="Contoh: Less Sugar (50%), No Ice, Pisah Sambal"
			bind:value={name}
			oninput={handleNameChange}
			required
		/>

		<Input
			id="note-preset-code"
			label="Kode Preset"
			placeholder="NOTE-LESS-SUG"
			bind:value={code}
			helperText="Kode unik format kapital untuk sistem KDS dan struk"
			class="font-mono uppercase"
			required
		/>

		<div class="form-group">
			<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2" for="note-preset-cat">
				Kategori Menu Sasaran <span class="text-rose-400">*</span>
			</label>
			<Select
				id="note-preset-cat"
				bind:value={category}
				options={categoryOptions}
			/>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<Input
				id="note-preset-sort"
				type="number"
				label="Urutan Tampil"
				placeholder="1"
				bind:value={sortOrder}
				helperText="Prioritas urutan tombol chip di POS"
				min="1"
			/>

			<div class="status-toggle-container">
				<label for="note-preset-active" class="status-toggle-label">
					Status Preset
				</label>
				<label class="toggle-switch-wrapper">
					<input
						type="checkbox"
						id="note-preset-active"
						bind:checked={isActive}
						class="toggle-checkbox"
					/>
					<span class="toggle-text font-medium text-sm">
						{isActive ? 'Aktif (Tampil di POS)' : 'Nonaktif'}
					</span>
				</label>
			</div>
		</div>
	</form>

	{#snippet footer()}
		<div class="flex items-center justify-end gap-3 w-full">
			<Button variant="secondary" onclick={onclose} disabled={isSubmitting}>
				Batal
			</Button>
			<Button variant="primary" type="submit" form="note-preset-form" loading={isSubmitting}>
				{preset ? 'Simpan Perubahan' : 'Tambahkan Preset'}
			</Button>
		</div>
	{/snippet}
</Modal>

<style>
	.note-preset-form-stack {
		display: flex;
		flex-direction: column;
		gap: 22px;
		padding: 4px 0;
	}

	.info-callout {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 14px 16px;
		border-radius: var(--radius-lg, 12px);
		background: rgba(14, 165, 233, 0.08);
		border: 1px solid rgba(14, 165, 233, 0.2);
	}

	.note-preset-alert.warning {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
		border-radius: var(--radius-lg, 12px);
		background: var(--pill-warning-bg);
		border: 1px solid var(--pill-warning-border);
		color: var(--pill-warning-text);
		font-size: 0.85rem;
		font-weight: 500;
	}

	.form-group {
		display: flex;
		flex-direction: column;
	}

	.status-toggle-container {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.status-toggle-label {
		display: block;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.toggle-switch-wrapper {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 42px;
		padding: 0 12px;
		background: var(--bg-panel);
		border: 1px solid var(--border-panel);
		border-radius: var(--radius-lg, 12px);
		cursor: pointer;
		user-select: none;
	}

	.toggle-checkbox {
		width: 18px;
		height: 18px;
		accent-color: var(--brand-primary);
		cursor: pointer;
	}

	.toggle-text {
		color: var(--text-main);
	}
</style>
