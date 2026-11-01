<script lang="ts">
	/**
	 * OrganizationModal.svelte (T-02.0)
	 * Formulir tambah/ubah data master Organisasi Induk
	 */
	import Modal from '../../../components/feedback/Modal.svelte';
	import TextField from '../../../components/forms/TextField.svelte';
	import Textarea from '../../../components/forms/Textarea.svelte';
	import Icon from '../../../components/data/Icon.svelte';
	import type { Organization } from '../../../api/contract/types.js';
	import { validateOrgCode } from '../../../domain/organization.js';

	interface Props {
		open: boolean;
		organization?: Organization | null;
		onClose: () => void;
		onSave: (data: Partial<Organization>) => Promise<void>;
	}

	let { open, organization, onClose, onSave }: Props = $props();

	let name = $state('');
	let code = $state('');
	let description = $state('');
	let taxId = $state('');
	let address = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	$effect(() => {
		if (open) {
			if (organization) {
				name = organization.name;
				code = organization.code;
				description = organization.description || '';
				taxId = organization.tax_id || '';
				address = organization.address || '';
			} else {
				name = '';
				code = '';
				description = '';
				taxId = '';
				address = '';
			}
			errorMessage = null;
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		errorMessage = null;

		if (!name.trim()) {
			errorMessage = 'Nama organisasi wajib diisi.';
			return;
		}

		const codeVal = validateOrgCode(code);
		if (!codeVal.valid) {
			errorMessage = codeVal.error!;
			return;
		}

		isSubmitting = true;
		try {
			await onSave({
				name: name.trim(),
				code: code.trim().toUpperCase(),
				description: description.trim(),
				tax_id: taxId.trim(),
				address: address.trim()
			});
			onClose();
		} catch (err: any) {
			errorMessage = err.message || 'Gagal menyimpan organisasi.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Modal
	{open}
	title={organization ? 'Ubah Data Organisasi' : 'Tambah Organisasi Induk Baru'}
	subtitle={organization ? 'Perbarui data identitas brand, kode penomoran dokumen, dan domisili kantor pusat.' : 'Daftarkan entitas organisasi induk (brand) baru untuk menaungi gerai-gerai multi-outlet.'}
	maxWidth="680px"
	onclose={onClose}
>
	{#snippet footer()}
		<button type="button" class="btn btn-secondary" onclick={onClose} disabled={isSubmitting}>
			Batal
		</button>
		<button type="submit" form="org-form" class="btn btn-primary" disabled={isSubmitting}>
			{isSubmitting ? 'Menyimpan...' : organization ? 'Simpan Perubahan' : 'Buat Organisasi'}
		</button>
	{/snippet}

	<form id="org-form" onsubmit={handleSubmit} class="flex flex-col gap-5">
		{#if errorMessage}
			<div class="conflict-box">
				<div class="conflict-title">
					<Icon name="exclamation-triangle" size={16} />
					<span>Peringatan Validasi</span>
				</div>
				<p class="text-xs m-0 leading-relaxed">{errorMessage}</p>
			</div>
		{/if}

		<div class="form-section-card">
			<div class="section-card-header">
				<div class="section-icon-badge">
					<Icon name="building-office" size={16} />
				</div>
				<div class="section-meta">
					<h4 class="section-title">Identitas &amp; Legalitas Brand</h4>
					<p class="section-desc">Nama resmi badan usaha, kode penomoran transaksi, dan data NPWP perpajakan.</p>
				</div>
			</div>

			<div class="section-grid">
				<TextField
					id="org-input-name"
					label="Nama Organisasi"
					required
					bind:value={name}
					placeholder="Contoh: Seduhan Kopi Jodi"
				/>

				<TextField
					id="org-input-code"
					label="Kode Organisasi (2-10 Huruf)"
					required
					maxlength={10}
					bind:value={code}
					placeholder="Contoh: SKJ"
					inputClass="uppercase font-mono"
					helperText="Digunakan sebagai awalan kode dokumen dan penomoran."
				/>

				<TextField
					id="org-input-tax"
					label="NPWP Entitas Bisnis"
					bind:value={taxId}
					placeholder="01.234.567.8-012.000"
					inputClass="font-mono"
				/>

				<TextField
					id="org-input-desc"
					label="Deskripsi / Brand Tagline"
					bind:value={description}
					placeholder="Jaringan kedai kopi artisanal multi-outlet"
				/>
			</div>
		</div>

		<div class="form-section-card">
			<div class="section-card-header">
				<div class="section-icon-badge">
					<Icon name="map-pin" size={16} />
				</div>
				<div class="section-meta">
					<h4 class="section-title">Domisili &amp; Kantor Pusat</h4>
					<p class="section-desc">Alamat domisili legal perusahaan untuk korespondensi resmi dan faktur.</p>
				</div>
			</div>

			<div class="section-grid">
				<div class="grid-full">
					<Textarea
						id="org-input-addr"
						label="Alamat Kantor Pusat"
						rows={3}
						bind:value={address}
						placeholder="Alamat domisili legal perusahaan..."
					/>
				</div>
			</div>
		</div>
	</form>
</Modal>

<style>
	.form-section-card {
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-panel);
		border-radius: var(--radius-xl, 12px);
		padding: 18px 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.section-card-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--border-subtle);
	}

	.section-icon-badge {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-md, 8px);
		background: var(--brand-primary-dim);
		color: var(--brand-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.section-meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.section-title {
		font-size: 13px;
		font-weight: 700;
		color: var(--text-main);
		margin: 0;
		line-height: 1.25;
	}

	.section-desc {
		font-size: 11.5px;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.35;
	}

	.section-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px 16px;
	}

	.grid-full {
		grid-column: span 2;
	}

	@media (max-width: 640px) {
		.section-grid {
			grid-template-columns: 1fr;
		}
		.grid-full {
			grid-column: span 1;
		}
	}
</style>
