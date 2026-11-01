<script lang="ts">
	/**
	 * OutletDetailDrawer.svelte (T-02.4, T-02.5, T-02.7)
	 * Detail Gerai Luas & Terstruktur Tanpa Tab:
	 * Identitas, Parameter Operasional, Finansial, Tim Pengguna, dan Investor Mitra
	 */
	import Modal from '../../../components/feedback/Modal.svelte';
	import type { Organization, Outlet, OutletOwnership } from '../../../api/contract/types.js';
	import { formatRupiah } from '../../../utils/format.js';
	import Icon from '../../../components/data/Icon.svelte';
	import StatusBadge from '../../../components/data/StatusBadge.svelte';
	import Badge from '../../../components/data/Badge.svelte';
	import { validateOwnershipRules } from '../../../domain/organization.js';
	import DatePicker from '../../../components/forms/DatePicker.svelte';

	interface Props {
		open: boolean;
		outlet: Outlet | null;
		organizations: Organization[];
		ownerships: OutletOwnership[];
		isPartnerEnabled?: boolean;
		canManage?: boolean;
		onClose: () => void;
		onSaveOwnerships: (ownerships: OutletOwnership[]) => Promise<void>;
	}

	let {
		open,
		outlet,
		organizations,
		ownerships,
		isPartnerEnabled = true,
		canManage = true,
		onClose,
		onSaveOwnerships
	}: Props = $props();

	let localOwnerships = $state<OutletOwnership[]>([]);
	let ownershipError = $state<string | null>(null);
	let isSavingOwners = $state(false);

	const parentOrg = $derived(
		organizations.find((o) => o.id === outlet?.organization_id)
	);

	// Sinkronisasi data kepemilikan saat modal dibuka
	$effect(() => {
		if (open) {
			localOwnerships = ownerships.map((o) => ({ ...o }));
			ownershipError = null;
		}
	});

	// Evaluasi aturan kepemilikan lokal
	const ownershipEvaluation = $derived(validateOwnershipRules(localOwnerships));

	function handleAddOwnerRow() {
		localOwnerships = [
			...localOwnerships,
			{
				id: `temp-${Date.now()}`,
				outlet_id: outlet?.id || '',
				owner_name: '',
				owner_email: '',
				owner_phone: '',
				share_pct: null,
				effective_from: '2026-01-01',
				effective_to: null,
				notes: ''
			}
		];
	}

	function handleRemoveOwnerRow(index: number) {
		localOwnerships = localOwnerships.filter((_, i) => i !== index);
	}

	async function handleSaveOwners() {
		ownershipError = null;
		if (!ownershipEvaluation.valid) {
			ownershipError = ownershipEvaluation.error || 'Pembagian persentase kepemilikan tidak valid.';
			return;
		}

		isSavingOwners = true;
		try {
			await onSaveOwnerships(localOwnerships);
		} catch (err: any) {
			ownershipError = err.message || 'Gagal menyimpan data kepemilikan.';
		} finally {
			isSavingOwners = false;
		}
	}
</script>

<Modal
	{open}
	title={outlet ? `Detail Gerai: ${outlet.name} (${outlet.code})` : 'Detail Gerai'}
	subtitle={outlet ? `Informasi profil, parameter fiskal, penugasan pengguna, dan struktur permodalan gerai.` : undefined}
	maxWidth="1140px"
	onclose={onClose}
>
	{#snippet footer()}
		<button type="button" class="btn btn-secondary" onclick={onClose}>
			Tutup
		</button>
	{/snippet}

	<div class="outlet-detail-layout">
		<!-- 1. Hero Card: Identitas Gerai & Organisasi Induk -->
		<div class="outlet-hero-card">
			<div class="flex items-start gap-4">
				<div class="outlet-hero-code-badge">
					{outlet?.code}
				</div>
				<div class="flex flex-col gap-1.5">
					<div class="flex items-center gap-3 flex-wrap">
						<h3 class="font-bold text-lg text-[var(--text-main)] m-0">{outlet?.name}</h3>
						<span class="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-md font-medium bg-[var(--bg-panel)] border border-[var(--border-panel)] text-[var(--text-muted)]">
							<Icon name="building-office" size={13} />
							<span>Induk: <strong class="text-[var(--text-main)]">{parentOrg?.name || 'Organisasi Terdaftar'}</strong></span>
						</span>
					</div>
					<div class="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
						<Icon name="map-pin" size={13} />
						<span>{outlet?.address || `Area ${outlet?.city || 'Indonesia'}`}</span>
					</div>
				</div>
			</div>

			<StatusBadge
				status={outlet?.active !== false ? 'active' : 'inactive'}
				size="md"
			/>
		</div>

		<!-- 2. Master 2-Kolom: Kiri (Operasional & Tim) | Kanan (Investor Mitra) -->
		<div class="outlet-master-grid">
			<!-- Kolom Kiri: Parameter Operasional & Tim Penugasan -->
			<div class="master-column">
				<!-- Parameter Operasional & Finansial -->
				<div class="detail-section">
					<div class="detail-section-header">
						<div class="detail-section-title">
							<Icon name="banknotes" size={16} class="text-[var(--brand-primary)]" />
							<span>Parameter Operasional &amp; Finansial</span>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3.5 text-xs">
						<div class="dash-subbox">
							<span class="text-[var(--text-muted)] font-medium text-[11px]">Kota / Lokasi</span>
							<p class="font-bold text-xs text-[var(--text-main)] mt-1 mb-0">{outlet?.city || '-'}</p>
						</div>

						<div class="dash-subbox">
							<span class="text-[var(--text-muted)] font-medium text-[11px]">Model Kepemilikan</span>
							<p class="font-bold text-xs text-[var(--text-main)] mt-1 mb-0">
								{outlet?.owner_type === 'partner' ? 'Kemitraan Investor' : 'Milik Sendiri (Internal)'}
							</p>
						</div>

						<div class="dash-subbox">
							<span class="text-[var(--text-muted)] font-medium text-[11px]">Pajak PBJT Restoran</span>
							<p class="font-bold text-xs text-[var(--text-main)] mt-1 mb-0">
								{Math.round((outlet?.tax_rate || 0.1) * 100)}%
							</p>
						</div>

						<div class="dash-subbox">
							<span class="text-[var(--text-muted)] font-medium text-[11px]">Service Charge</span>
							<p class="font-bold text-xs text-[var(--text-main)] mt-1 mb-0">
								{Math.round((outlet?.service_charge || 0.05) * 100)}%
							</p>
						</div>
					</div>

					<!-- Kas Kecil & POS Info Strip -->
					<div class="grid grid-cols-2 gap-3.5 pt-3.5 mt-2 border-t border-[var(--border-subtle)]">
						<div class="dash-subbox flex items-center justify-between text-xs">
							<div>
								<span class="text-[var(--text-muted)] text-[11px] font-medium">Batas Kas Kecil:</span>
								<p class="font-bold text-[var(--text-main)] font-mono m-0 text-xs mt-0.5">
									{formatRupiah(outlet?.petty_cash_limit || '300000.00')}
								</p>
							</div>
							<Badge variant="success" size="sm">HQ Policy</Badge>
						</div>

						<div class="dash-subbox flex items-center justify-between text-xs">
							<div class="flex items-center gap-2">
								<Icon name="device-tablet" size={15} class="text-[var(--brand-primary)]" />
								<div>
									<span class="text-[var(--text-muted)] text-[11px] font-medium">Kasir POS:</span>
									<p class="font-bold text-xs text-[var(--brand-primary)] m-0 mt-0.5">Sinkron Real-Time</p>
								</div>
							</div>
							<StatusBadge status="active" size="sm" />
						</div>
					</div>
				</div>

				<!-- Tim & Penugasan Pengguna Gerai -->
				<div class="detail-section">
					<div class="detail-section-header">
						<div class="detail-section-title">
							<Icon name="users" size={16} class="text-[var(--brand-primary)]" />
							<span>Tim &amp; Penugasan Gerai</span>
						</div>
					</div>

					<!-- Multi-Outlet SM Notice Callout -->
					<div class="detail-notice-callout">
						<Icon name="shield-check" size={16} class="shrink-0 mt-0.5 text-[var(--brand-primary)]" />
						<span class="text-xs">
							<strong>Penugasan Store Manager:</strong> SM dapat mengelola beberapa outlet dalam 1 organisasi (contoh: Sari mengelola Jodi Dago &amp; Gubeng).
						</span>
					</div>

					<!-- Staff List -->
					<div class="grid grid-cols-2 gap-3.5 text-xs">
						<div class="dash-subbox flex items-center justify-between">
							<div class="flex items-center gap-2.5">
								<div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 bg-[var(--bg-panel-hover)] text-[var(--text-main)] border border-[var(--border-subtle)]">
									{outlet?.id === 'out-jkt-01' ? 'BP' : 'SR'}
								</div>
								<div>
									<span class="font-bold text-[var(--text-main)] block text-xs">
										{outlet?.id === 'out-jkt-01' ? 'Budi Santoso' : 'Sari Rahmawati'}
									</span>
									<p class="text-[10.5px] text-[var(--text-muted)] m-0">Store Manager</p>
								</div>
							</div>
							<Badge variant="info" size="sm">Aktif</Badge>
						</div>

						<div class="dash-subbox flex items-center justify-between">
							<div class="flex items-center gap-2.5">
								<div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 bg-[var(--bg-panel-hover)] text-[var(--text-main)] border border-[var(--border-subtle)]">
									AF
								</div>
								<div>
									<span class="font-bold text-[var(--text-main)] block text-xs">Ahmad Faisal</span>
									<p class="text-[10.5px] text-[var(--text-muted)] m-0">Kasir Shift Siang</p>
								</div>
							</div>
							<Badge variant="neutral" size="sm">Kasir</Badge>
						</div>
					</div>
				</div>
			</div>

			<!-- Kolom Kanan: Kepemilikan Gerai & Investor Mitra -->
			<div class="master-column">
				{#if isPartnerEnabled}
					<div class="detail-section h-full flex flex-col justify-between">
						<div>
							<div class="detail-section-header mb-3">
								<div class="detail-section-title">
									<Icon name="clipboard-document-check" size={16} class="text-[var(--brand-primary)]" />
									<span>Kepemilikan Gerai &amp; Investor Mitra</span>
								</div>

								{#if localOwnerships.length > 0}
									<div class="flex items-center gap-2">
										<Badge variant={ownershipEvaluation.totalSharePct === 100 ? 'success' : 'warning'} size="sm">
											Total: {ownershipEvaluation.totalSharePct}%
										</Badge>
										{#if canManage}
											<button
												type="button"
												class="btn btn-secondary btn-xs"
												onclick={handleAddOwnerRow}
											>
												<Icon name="plus" size={12} />
												<span>Tambah Investor</span>
											</button>
										{/if}
									</div>
								{/if}
							</div>

							{#if ownershipError}
								<div class="conflict-box mb-3">
									<div class="conflict-title">
										<Icon name="exclamation-triangle" size={15} />
										<span>Peringatan Kepemilikan</span>
									</div>
									<p class="text-xs m-0 leading-relaxed">{ownershipError}</p>
								</div>
							{/if}

							{#if ownershipEvaluation.hasEmptyShares && localOwnerships.length > 0}
								<div class="warning-empty-share mb-3" id="warning-empty-share-banner">
									<Icon name="exclamation-triangle" size={16} class="shrink-0 mt-0.5" />
									<span class="text-xs">Perhatian: Terdapat persentase kepemilikan yang belum diisi lengkap. Data tetap dapat disimpan sementara.</span>
								</div>
							{/if}

							{#if localOwnerships.length > 0}
								<div class="flex flex-col gap-3">
									{#each localOwnerships as own, idx}
										<div class="timeline-card">
											<div class="timeline-header">
												<span class="text-xs font-bold text-[var(--text-main)]">Investor #{idx + 1}</span>
												{#if canManage}
													<button
														type="button"
														class="text-xs font-semibold cursor-pointer bg-transparent border-0 text-[var(--pill-danger-text)] hover:underline"
														onclick={() => handleRemoveOwnerRow(idx)}
													>
														Hapus
													</button>
												{/if}
											</div>

											<div class="grid grid-cols-2 gap-3.5 text-xs">
												<div class="field-group col-span-2">
													<label class="field-label" for="owner-name-{idx}">Nama Pemilik / Investor</label>
													<input
														id="owner-name-{idx}"
														type="text"
														class="field-input"
														disabled={!canManage}
														bind:value={own.owner_name}
														placeholder="Nama Investor..."
													/>
												</div>

												<div class="field-group">
													<label class="field-label" for="owner-pct-{idx}">Saham (%)</label>
													<input
														id="owner-pct-{idx}"
														type="number"
														step="0.1"
														min="0"
														max="100"
														class="field-input font-bold font-mono"
														disabled={!canManage}
														value={own.share_pct ?? ''}
														oninput={(e) => {
															const val = (e.target as HTMLInputElement).value;
															own.share_pct = val === '' ? null : parseFloat(val);
														}}
														placeholder="Boleh kosong"
													/>
												</div>

												<div class="field-group">
													<DatePicker
														id="owner-from-{idx}"
														label="Berlaku Mulai"
														disabled={!canManage}
														bind:value={own.effective_from}
													/>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<!-- Kondisi Gerai Mandiri (Tanpa Investor Luar) -->
								<div class="dash-subbox p-4 my-2 flex flex-col gap-3">
									<div class="flex items-center justify-between gap-3 flex-wrap">
										<div class="flex items-center gap-2.5">
											<div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[var(--bg-panel-hover)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
												<Icon name="building-storefront" size={16} />
											</div>
											<span class="font-bold text-[var(--text-main)] text-xs block">Gerai Milik Sendiri (Internal 100%)</span>
										</div>
										{#if canManage}
											<button
												type="button"
												class="btn btn-secondary btn-xs shrink-0"
												onclick={handleAddOwnerRow}
											>
												<Icon name="plus" size={12} />
												<span>Tambah Investor Luar</span>
											</button>
										{/if}
									</div>
									<p class="text-xs text-[var(--text-muted)] m-0 leading-relaxed">
										Seluruh modal dan keuntungan gerai dikelola penuh oleh entitas bisnis induk tanpa pembagian saham mitra investor luar.
									</p>
								</div>
							{/if}
						</div>

						{#if localOwnerships.length > 0 && canManage}
							<div class="section-footer-action mt-4 pt-3.5 border-t border-[var(--border-subtle)]">
								<button
									type="button"
									class="btn btn-primary btn-sm w-full"
									onclick={handleSaveOwners}
									disabled={isSavingOwners}
								>
									{isSavingOwners ? 'Menyimpan...' : 'Simpan Pembagian Saham'}
								</button>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
</Modal>
