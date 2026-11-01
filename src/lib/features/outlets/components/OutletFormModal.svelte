<script lang="ts">
	/**
	 * OutletFormModal.svelte (T-02.3, AC-02.0, AC-02.1)
	 * Formulir tambah/ubah Outlet dengan dropdown pemilihan Organisasi Induk
	 */
	import Modal from '../../../components/feedback/Modal.svelte';
	import Select, { type SelectOption } from '../../../components/forms/Select.svelte';
	import TextField from '../../../components/forms/TextField.svelte';
	import Textarea from '../../../components/forms/Textarea.svelte';
	import Icon from '../../../components/data/Icon.svelte';
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

	<form id="outlet-form" onsubmit={handleSubmit} class="flex flex-col gap-5">
		{#if errorMessage}
			<div class="conflict-box">
				<div class="conflict-title">
					<Icon name="exclamation-triangle" size={16} />
					<span>Peringatan Validasi</span>
				</div>
				<p class="text-xs m-0 leading-relaxed">{errorMessage}</p>
			</div>
		{/if}

		<!-- Grup 1: Identitas & Organisasi Induk -->
		<div class="form-section-card">
			<div class="section-card-header">
				<div class="section-icon-badge">
					<Icon name="building-storefront" size={16} />
				</div>
				<div class="section-meta">
					<h4 class="section-title">Identitas &amp; Organisasi Induk</h4>
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
					<Icon name="map-pin" size={16} />
				</div>
				<div class="section-meta">
					<h4 class="section-title">Lokasi &amp; Kontak Gerai</h4>
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
					<Icon name="banknotes" size={16} />
				</div>
				<div class="section-meta">
					<h4 class="section-title">Model Bisnis &amp; Parameter Finansial</h4>
					<p class="section-desc">Struktur kepemilikan modal, plafon kas kecil harian, serta tarif pajak &amp; servis.</p>
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
