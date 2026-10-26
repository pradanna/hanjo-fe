<script lang="ts">
	/**
	 * OrganizationModal.svelte (T-02.0)
	 * Formulir tambah/ubah data master Organisasi Induk
	 */
	import Modal from '../../../components/feedback/Modal.svelte';
	import TextField from '../../../components/forms/TextField.svelte';
	import Textarea from '../../../components/forms/Textarea.svelte';
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

	<form id="org-form" onsubmit={handleSubmit} class="flex flex-col gap-4">
		{#if errorMessage}
			<div class="p-3 text-xs font-semibold rounded-lg" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.25);">
				{errorMessage}
			</div>
		{/if}

		<div class="form-section-card">
			<div class="section-card-header">
				<div class="section-icon-badge">
					<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4"/>
					</svg>
				</div>
				<div class="section-meta">
					<h4 class="section-title">Identitas & Legalitas Brand</h4>
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
					inputClass="uppercase"
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
					<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
						<circle cx="12" cy="10" r="3"/>
					</svg>
				</div>
				<div class="section-meta">
					<h4 class="section-title">Domisili & Kantor Pusat</h4>
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
		background: var(--bg-panel-sub, #161c28);
		border: 1px solid var(--border-panel, #1d2535);
		border-radius: var(--radius-lg, 12px);
		padding: 14px 18px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.section-card-header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
	}

	.section-icon-badge {
		width: 30px;
		height: 30px;
		border-radius: var(--radius-sm, 6px);
		background: var(--brand-primary-dim, rgba(16, 185, 129, 0.12));
		color: var(--brand-primary, #10b981);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.section-meta {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.section-title {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--text-main, #f1f5f9);
		margin: 0;
		line-height: 1.2;
	}

	.section-desc {
		font-size: 11px;
		color: var(--text-muted, #94a3b8);
		margin: 0;
		line-height: 1.3;
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
