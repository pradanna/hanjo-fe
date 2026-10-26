<script lang="ts">
	/**
	 * OutletFormModal.svelte (T-02.3, AC-02.0, AC-02.1)
	 * Formulir tambah/ubah Outlet dengan dropdown pemilihan Organisasi Induk
	 */
	import Modal from '../../../components/feedback/Modal.svelte';
	import Select, { type SelectOption } from '../../../components/forms/Select.svelte';
	import TextField from '../../../components/forms/TextField.svelte';
	import Textarea from '../../../components/forms/Textarea.svelte';
	import type { Organization, Outlet, OutletGroup } from '../../../api/contract/types.js';
	import { validateOutletCode } from '../../../domain/organization.js';

	interface Props {
		open: boolean;
		outlet?: Outlet | null;
		organizations: Organization[];
		groups: OutletGroup[];
		defaultOrgId?: string;
		onClose: () => void;
		onSave: (data: Partial<Outlet>) => Promise<void>;
	}

	let {
		open,
		outlet,
		organizations,
		groups,
		defaultOrgId = '*',
		onClose,
		onSave
	}: Props = $props();

	let organizationId = $state('');
	let name = $state('');
	let code = $state('');
	let city = $state('');
	let address = $state('');
	let phone = $state('');
	let taxRate = $state('10');
	let serviceCharge = $state('5');
	let pettyCashLimit = $state('300000.00');
	let ownerType = $state<'own_company' | 'partner'>('own_company');
	let groupId = $state('');

	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	const orgOptions = $derived<SelectOption[]>(
		organizations.map((org) => ({
			value: org.id,
			label: `${org.name} (${org.code})`,
			subtitle: org.description || undefined
		}))
	);

	const ownerTypeOptions: SelectOption[] = [
		{ value: 'own_company', label: 'Milik Sendiri (100% Internal)', subtitle: 'Dikelola penuh internal perusahaan' },
		{ value: 'partner', label: 'Kemitraan / Investor Mitra', subtitle: 'Bagi hasil kepemilikan modal investor' }
	];

	const groupOptions = $derived<SelectOption[]>([
		{ value: '', label: 'Tanpa Grup Wilayah' },
		...groups.map((grp) => ({
			value: grp.id,
			label: grp.name,
			subtitle: grp.description || undefined
		}))
	]);

	$effect(() => {
		if (open) {
			if (outlet) {
				organizationId = outlet.organization_id;
				name = outlet.name;
				code = outlet.code;
				city = outlet.city;
				address = outlet.address || '';
				phone = outlet.phone || '';
				taxRate = outlet.tax_rate !== undefined ? (outlet.tax_rate * 100).toString() : '10';
				serviceCharge = outlet.service_charge !== undefined ? (outlet.service_charge * 100).toString() : '5';
				pettyCashLimit = outlet.petty_cash_limit || '300000.00';
				ownerType = outlet.owner_type || 'own_company';
				groupId = outlet.group_id || '';
			} else {
				organizationId = defaultOrgId !== '*' ? defaultOrgId : organizations[0]?.id || '';
				name = '';
				code = '';
				city = 'Jakarta';
				address = '';
				phone = '';
				taxRate = '10';
				serviceCharge = '5';
				pettyCashLimit = '300000.00';
				ownerType = 'own_company';
				groupId = '';
			}
			errorMessage = null;
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		errorMessage = null;

		if (!organizationId) {
			errorMessage = 'Organisasi induk wajib dipilih.';
			return;
		}

		if (!name.trim()) {
			errorMessage = 'Nama outlet wajib diisi.';
			return;
		}

		const codeVal = validateOutletCode(code);
		if (!codeVal.valid) {
			errorMessage = codeVal.error!;
			return;
		}

		isSubmitting = true;
		try {
			await onSave({
				organization_id: organizationId,
				name: name.trim(),
				code: code.trim().toUpperCase(),
				city: city.trim(),
				address: address.trim(),
				phone: phone.trim(),
				tax_rate: parseFloat(taxRate) / 100,
				service_charge: parseFloat(serviceCharge) / 100,
				petty_cash_limit: pettyCashLimit,
				owner_type: ownerType,
				group_id: groupId || undefined
			});
			onClose();
		} catch (err: any) {
			errorMessage = err.message || 'Gagal menyimpan data outlet.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Modal
	{open}
	title={outlet ? 'Ubah Pengaturan Outlet' : 'Tambah Outlet / Gerai Baru'}
	subtitle={outlet ? 'Perbarui data profil identitas, lokasi fisik, serta parameter fiskal dan finansial gerai.' : 'Lengkapi data identitas gerai, keterikatan organisasi induk, lokasi fisik, dan parameter operasional.'}
	maxWidth="780px"
	onclose={onClose}
>
	{#snippet footer()}
		<button type="button" class="btn btn-secondary" onclick={onClose} disabled={isSubmitting}>
			Batal
		</button>
		<button type="submit" form="outlet-form" class="btn btn-primary" disabled={isSubmitting}>
			{isSubmitting ? 'Menyimpan...' : outlet ? 'Simpan Perubahan' : 'Buat Outlet'}
		</button>
	{/snippet}

	<form id="outlet-form" onsubmit={handleSubmit} class="flex flex-col gap-4">
		{#if errorMessage}
			<div class="p-3 text-xs font-semibold rounded-lg" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.25);">
				{errorMessage}
			</div>
		{/if}

		<!-- Grup 1: Identitas & Organisasi Induk -->
		<div class="form-section-card">
			<div class="section-card-header">
				<div class="section-icon-badge">
					<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4M5 21V10.85M19 21V10.85M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/>
					</svg>
				</div>
				<div class="section-meta">
					<h4 class="section-title">Identitas & Organisasi Induk</h4>
					<p class="section-desc">Entitas bisnis pemilik brand, nama gerai, kode sistem unik, dan area wilayah.</p>
				</div>
			</div>

			<div class="section-grid">
				<Select
					id="outlet-input-org"
					label="Organisasi Induk (Brand)"
					required
					bind:value={organizationId}
					placeholder="Pilih Organisasi Induk..."
					helperText="Outlet wajib terikat sah pada 1 organisasi brand."
					options={orgOptions}
				/>

				<Select
					id="outlet-input-grp"
					label="Grup Outlet (Area Operasional)"
					bind:value={groupId}
					placeholder="Tanpa Grup Wilayah"
					helperText="Pengelompokan wilayah operasional gerai."
					options={groupOptions}
				/>

				<TextField
					id="outlet-input-name"
					label="Nama Outlet"
					required
					bind:value={name}
					placeholder="Contoh: Jodi Senopati"
				/>

				<TextField
					id="outlet-input-code"
					label="Kode Outlet (Unik)"
					required
					maxlength={12}
					bind:value={code}
					placeholder="Contoh: JKT-01"
					inputClass="uppercase font-mono"
					helperText="Maksimal 12 karakter alphanumeric unik."
				/>
			</div>
		</div>

		<!-- Grup 2: Lokasi & Kontak Operasional -->
		<div class="form-section-card">
			<div class="section-card-header">
				<div class="section-icon-badge">
					<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
						<circle cx="12" cy="10" r="3"/>
					</svg>
				</div>
				<div class="section-meta">
					<h4 class="section-title">Lokasi & Kontak Gerai</h4>
					<p class="section-desc">Wilayah administratif kota, nomor telepon resmi gerai, serta alamat fisik.</p>
				</div>
			</div>

			<div class="section-grid">
				<TextField
					id="outlet-input-city"
					label="Kota / Wilayah"
					required
					bind:value={city}
					placeholder="Contoh: Jakarta Selatan"
				/>

				<TextField
					id="outlet-input-phone"
					label="Nomor Telepon Gerai"
					type="tel"
					bind:value={phone}
					placeholder="Contoh: 021-7251234 atau 0812xxxx"
				/>

				<div class="grid-full">
					<Textarea
						id="outlet-input-addr"
						label="Alamat Lengkap"
						rows={2}
						bind:value={address}
						placeholder="Jalan, nomor, kelurahan, kecamatan, patokan gerai fisik..."
					/>
				</div>
			</div>
		</div>

		<!-- Grup 3: Model Bisnis & Parameter Finansial -->
		<div class="form-section-card">
			<div class="section-card-header">
				<div class="section-icon-badge">
					<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect x="2" y="5" width="20" height="14" rx="2"/>
						<line x1="2" y1="10" x2="22" y2="10"/>
						<circle cx="7" cy="15" r="1"/>
						<line x1="11" y1="15" x2="17" y2="15"/>
					</svg>
				</div>
				<div class="section-meta">
					<h4 class="section-title">Model Bisnis & Parameter Finansial</h4>
					<p class="section-desc">Struktur kepemilikan modal, plafon kas kecil harian, serta tarif pajak & servis.</p>
				</div>
			</div>

			<div class="section-grid">
				<Select
					id="outlet-input-owner"
					label="Model Kepemilikan"
					bind:value={ownerType}
					options={ownerTypeOptions}
				/>

				<TextField
					id="outlet-input-limit"
					label="Batas Kas Kecil Harian (Rp)"
					bind:value={pettyCashLimit}
					placeholder="300000.00"
					helperText="Plafon maksimal petty cash harian kasir."
				/>

				<TextField
					id="outlet-input-tax"
					label="Pajak Restoran PBJT (%)"
					type="number"
					step="0.5"
					min="0"
					max="20"
					bind:value={taxRate}
				/>

				<TextField
					id="outlet-input-service"
					label="Service Charge (%)"
					type="number"
					step="0.5"
					min="0"
					max="20"
					bind:value={serviceCharge}
				/>
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
