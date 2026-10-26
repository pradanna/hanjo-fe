<script lang="ts">
	/**
	 * Form Modal: Tambah & Ubah Kategori Menu Siap Jual (Menu Category)
	 * Menggunakan komponen terpadu: Modal, Input, Button, Icon.
	 * Mematuhi Invarian Monorepo (§2.7: spacing >= 20px, input min-height >= 40px).
	 */
	import Modal from '#lib/components/feedback/Modal.svelte';
	import Icon from '#lib/components/data/Icon.svelte';
	import Input from '#lib/components/forms/Input.svelte';
	import Button from '#lib/components/forms/Button.svelte';
	import type { MenuCategory } from '#lib/api/contract/types.js';

	interface Props {
		open: boolean;
		category: MenuCategory | null;
		onclose: () => void;
		onsave: (data: Partial<MenuCategory>) => Promise<boolean>;
	}

	let { open, category, onclose, onsave }: Props = $props();

	let name = $state('');
	let code = $state('');
	let sortOrder = $state('1');
	let isActive = $state(true);
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	$effect(() => {
		if (category) {
			name = category.name || '';
			code = category.code || '';
			sortOrder = String(category.sort_order ?? 1);
			isActive = category.is_active ?? true;
		} else {
			name = '';
			code = '';
			sortOrder = '1';
			isActive = true;
		}
		errorMessage = null;
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!name.trim()) {
			errorMessage = 'Nama kategori menu wajib diisi.';
			return;
		}

		if (!code.trim()) {
			errorMessage = 'Kode kategori menu wajib diisi (mis. MNU-CAT-COF).';
			return;
		}

		isSubmitting = true;
		errorMessage = null;

		const success = await onsave({
			name: name.trim(),
			code: code.trim().toUpperCase(),
			sort_order: Number(sortOrder) || 1,
			is_active: isActive
		});

		isSubmitting = false;
		if (!success) {
			errorMessage = 'Gagal menyimpan kategori menu. Periksa kembali isian atau kode yang mungkin sudah terdaftar.';
		}
	}
</script>

<Modal
	{open}
	title={category ? 'Ubah Kategori Menu' : 'Tambah Kategori Menu Baru'}
	subtitle={category ? `Perbarui informasi kategori ${category.name}` : 'Buat pengelompokan baru untuk katalog menu siap jual'}
	maxWidth="520px"
	{onclose}
>
	<form id="menu-category-form" onsubmit={handleSubmit} class="menu-cat-form-stack">
		{#if errorMessage}
			<div class="menu-cat-alert warning">
				<Icon name="exclamation-triangle" size={18} />
				<span>{errorMessage}</span>
			</div>
		{/if}

		<Input
			id="menu-cat-name"
			label="Nama Kategori"
			placeholder="Contoh: Kopi & Espresso"
			bind:value={name}
			required
		/>

		<Input
			id="menu-cat-code"
			label="Kode Kategori"
			placeholder="MNU-CAT-COF"
			bind:value={code}
			helperText="Kode unik format kapital, contoh: MNU-CAT-BEV"
			class="font-mono uppercase"
			required
		/>

		<div class="grid grid-cols-2 gap-4">
			<Input
				id="menu-cat-sort"
				type="number"
				label="Urutan Tampil"
				placeholder="1"
				bind:value={sortOrder}
				helperText="Urutan pada tab dan filter menu"
				min="1"
			/>

			<div class="status-toggle-container">
				<label for="menu-cat-active" class="status-toggle-label">
					Status Kategori
				</label>
				<label class="toggle-switch-wrapper">
					<input
						type="checkbox"
						id="menu-cat-active"
						bind:checked={isActive}
						class="toggle-checkbox"
					/>
					<span class="toggle-text font-medium text-sm">
						{isActive ? 'Aktif (Ditampilkan)' : 'Nonaktif (Disembunyikan)'}
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
			<Button
				variant="primary"
				type="submit"
				form="menu-category-form"
				loading={isSubmitting}
			>
				<Icon name="check" size={16} />
				<span>{category ? 'Simpan Perubahan' : 'Tambah Kategori'}</span>
			</Button>
		</div>
	{/snippet}
</Modal>

<style>
	.menu-cat-form-stack {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.menu-cat-alert {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 18px;
		border-radius: var(--radius-md, 8px);
		font-size: 13px;
		line-height: 1.4;
	}

	.menu-cat-alert.warning {
		background: rgba(239, 68, 68, 0.12);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #fca5a5;
	}

	.status-toggle-container {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.status-toggle-label {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-main, #f1f5f9);
	}

	.toggle-switch-wrapper {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 40px;
		cursor: pointer;
	}

	.toggle-checkbox {
		width: 18px;
		height: 18px;
		accent-color: var(--color-primary, #10b981);
		cursor: pointer;
	}

	.toggle-text {
		color: var(--text-main, #f1f5f9);
	}
</style>
