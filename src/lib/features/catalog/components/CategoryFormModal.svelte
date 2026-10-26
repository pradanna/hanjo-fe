<script lang="ts">
	/**
	 * Form Modal: Tambah & Ubah Kategori Item Bahan (Item Category)
	 * Menggunakan komponen form terpadu: Input, Textarea, Button.
	 */
	import Modal from '#lib/components/feedback/Modal.svelte';
	import Icon from '#lib/components/data/Icon.svelte';
	import Input from '#lib/components/forms/Input.svelte';
	import Textarea from '#lib/components/forms/Textarea.svelte';
	import Button from '#lib/components/forms/Button.svelte';
	import type { ItemCategory } from '#lib/api/contract/types.js';

	interface Props {
		open: boolean;
		category: ItemCategory | null;
		onclose: () => void;
		onsave: (data: Partial<ItemCategory>) => Promise<boolean>;
	}

	let { open, category, onclose, onsave }: Props = $props();

	let name = $state('');
	let code = $state('');
	let description = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	$effect(() => {
		if (category) {
			name = category.name || '';
			code = category.code || '';
			description = category.description || '';
		} else {
			name = '';
			code = '';
			description = '';
		}
		errorMessage = null;
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!name.trim()) {
			errorMessage = 'Nama kategori wajib diisi';
			return;
		}

		isSubmitting = true;
		errorMessage = null;

		const success = await onsave({
			name: name.trim(),
			code: code.trim().toUpperCase(),
			description: description.trim()
		});

		isSubmitting = false;
		if (!success) {
			errorMessage = 'Gagal menyimpan kategori. Periksa kembali isian.';
		}
	}
</script>

<Modal
	{open}
	title={category ? 'Ubah Kategori Bahan' : 'Tambah Kategori Baru'}
	subtitle={category ? `Perbarui informasi kategori ${category.name}` : 'Buat pengelompokan baru untuk master bahan baku'}
	maxWidth="520px"
	{onclose}
>
	<form id="category-form" onsubmit={handleSubmit} class="category-form-stack">
		{#if errorMessage}
			<div class="detail-notice-callout warning">
				<Icon name="exclamation-triangle" size={18} />
				<span>{errorMessage}</span>
			</div>
		{/if}

		<Input
			id="cat-name"
			label="Nama Kategori"
			placeholder="Contoh: Kopi & Espresso"
			bind:value={name}
			required
		/>

		<Input
			id="cat-code"
			label="Kode Kategori"
			placeholder="CAT-KOP"
			bind:value={code}
			helperText="Otomatis jika dibiarkan kosong"
			class="font-mono"
		/>

		<Textarea
			id="cat-desc"
			label="Deskripsi Kategori"
			placeholder="Deskripsi singkat jenis bahan dalam kategori ini..."
			bind:value={description}
			rows={3}
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
				form="category-form"
				loading={isSubmitting}
			>
				<Icon name="check" size={16} />
				<span>{category ? 'Simpan Perubahan' : 'Tambah Kategori'}</span>
			</Button>
		</div>
	{/snippet}
</Modal>

<style>
	.category-form-stack {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
</style>
