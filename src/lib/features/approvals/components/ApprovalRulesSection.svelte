<script lang="ts">
	/**
	 * Komponen Editor & Simulator Evaluasi Aturan Persetujuan (PG-set-approval-rules)
	 * Memenuhi Kriteria Penerimaan AC-05.1:
	 * Panel uji aturan interaktif yang mereproduksi skenario tabel §6.8 secara presisi.
	 */

	import Button from '../../../components/forms/Button.svelte';
	import Select from '../../../components/forms/Select.svelte';
	import Input from '../../../components/forms/Input.svelte';
	import NumberInput from '../../../components/forms/NumberInput.svelte';
	import CurrencyInput from '../../../components/forms/CurrencyInput.svelte';
	import Switch from '../../../components/forms/Switch.svelte';
	import Modal from '../../../components/feedback/Modal.svelte';
	import { approvalsStore } from '../stores/approvals.svelte.js';
	import { formatRupiah } from '../../../utils/format.js';
	import type { ApprovalDocumentType, ApprovalRule } from '../../../api/contract/types.js';

	const docTypeOptions = [
		{ value: 'petty_cash_expense', label: 'Kas Kecil Bertingkat (§6.8)' },
		{ value: 'external_purchase_order', label: 'PO Supplier Luar' },
		{ value: 'menu_proposal', label: 'Usulan Menu Lokal' },
		{ value: 'stock_count_variance', label: 'Selisih Hasil Stock Opname' },
		{ value: 'payment_verification', label: 'Verifikasi Pembayaran Hutang' },
		{ value: 'period_reopen', label: 'Pembukaan Kembali Periode Buku' }
	];

	const outletOptions = [
		{ value: 'out-jkt-01', label: 'Jodi Senopati (Jakarta)' },
		{ value: 'out-bdg-01', label: 'Jodi Dago (Bandung)' },
		{ value: 'out-sub-01', label: 'Jodi Gubeng (Surabaya)' }
	];

	const tierOptions = [
		{ value: '1', label: 'Tingkat 1 (Langsung / Bebas Persetujuan)' },
		{ value: '2', label: 'Tingkat 2 (Manajerial / Finance)' },
		{ value: '3', label: 'Tingkat 3 (Pimpinan / Owner)' }
	];

	const modeOptions = [
		{ value: 'any_of', label: 'Salah Satu Cukup (any_of)' },
		{ value: 'all_of', label: 'Seluruh Peran Wajib (all_of)' }
	];

	function getDocTypeName(type: string): string {
		const match = docTypeOptions.find((d) => d.value === type);
		return match ? match.label : type;
	}

	function handleRunTester() {
		approvalsStore.evaluateTester();
	}
</script>

<div class="flex flex-col gap-6 w-full">
	<!-- Panel Uji Aturan Interaktif (Simulator AC-05.1) -->
	<div class="rule-tester-card">
		<div class="flex items-center justify-between flex-wrap gap-4">
			<div>
				<h3 class="text-base font-bold text-main flex items-center gap-2">
					<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" class="text-emerald-500">
						<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
					</svg>
					<span>Panel Simulator Evaluasi Aturan Persetujuan (§6.7 & §6.8)</span>
				</h3>
				<span class="text-xs text-muted">
					Uji coba langsung parameter dokumen untuk melihat aturan yang cocok, tingkat (tier), penyetuju yang berwenang, dan kebutuhan step-up.
				</span>
			</div>

			<Button
				variant="primary"
				size="sm"
				loading={approvalsStore.testerLoading}
				onclick={handleRunTester}
			>
				Uji Evaluasi
			</Button>
		</div>

		<!-- Tombol Vektor Skenario Cepat Tabel §6.8 (AC-05.1) -->
		<div class="quick-scenarios-row">
			<span class="quick-scenarios-label">Skenario Tabel §6.8:</span>
			<Button
				variant="secondary"
				size="sm"
				onclick={() => approvalsStore.applyQuickScenario(1)}
			>
				Skenario 1: Rp 80.000 (Tingkat 1 Bebas)
			</Button>
			<Button
				variant="secondary"
				size="sm"
				onclick={() => approvalsStore.applyQuickScenario(2)}
			>
				Skenario 2: Rp 150.000 (Tingkat 2 Single Limit)
			</Button>
			<Button
				variant="secondary"
				size="sm"
				onclick={() => approvalsStore.applyQuickScenario(3)}
			>
				Skenario 3: 4x Tx Total Rp 320.000 (Tingkat 2 Harian)
			</Button>
			<Button
				variant="secondary"
				size="sm"
				onclick={() => approvalsStore.applyQuickScenario(4)}
			>
				Skenario 4: Rp 1.200.000 (Tingkat 3 + Step-Up)
			</Button>
		</div>

		<!-- Formulir Parameter Uji -->
		<div class="tester-grid-form">
			<Select
				label="Jenis Dokumen"
				options={docTypeOptions}
				bind:value={approvalsStore.testerDocType}
			/>

			<Select
				label="Target Gerai / Outlet"
				options={outletOptions}
				bind:value={approvalsStore.testerOutletId}
			/>

			<CurrencyInput
				label="Nominal Transaksi (Rp)"
				placeholder="Contoh: 150000"
				bind:value={approvalsStore.testerAmount}
			/>

			{#if approvalsStore.testerDocType === 'petty_cash_expense'}
				<CurrencyInput
					label="Akumulasi Harian Gerai (Rp)"
					placeholder="Contoh: 230000"
					bind:value={approvalsStore.testerDailyCumulative}
				/>
			{/if}

			{#if approvalsStore.testerDocType === 'stock_count_variance'}
				<NumberInput
					label="Persentase Selisih Opname (%)"
					placeholder="Contoh: 5"
					bind:value={approvalsStore.testerVariancePct}
				/>
			{/if}
		</div>

		<!-- Hasil Evaluasi Mesin Aturan -->
		{#if approvalsStore.testerResult}
			{@const res = approvalsStore.testerResult}
			<div class="tester-result-box">
				<div class="tester-result-header">
					<div class="tester-result-status">
						{#if res.requires_approval}
							<span class="tier-pill tier-{res.tier}">
								Tingkat {res.tier}
							</span>
							<span class="text-main font-bold">
								{res.rule_name || 'Memerlukan Persetujuan'}
							</span>
						{:else}
							<span class="tier-pill tier-1">
								Tingkat 1
							</span>
							<span class="text-emerald-600 font-bold">
								Bebas Persetujuan (Langsung Tercatat)
							</span>
						{/if}
					</div>

					<div class="flex items-center gap-2">
						{#if res.require_step_up}
							<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
								Wajib Step-Up Password
							</span>
						{/if}
						<span class="text-xs text-muted font-semibold">
							Mode: {res.mode === 'any_of' ? 'Salah Satu (any_of)' : 'Semua (all_of)'}
						</span>
					</div>
				</div>

				<div class="text-sm text-main leading-relaxed">
					{res.reason}
				</div>

				{#if res.requires_approval && res.approver_roles.length > 0}
					<div class="flex items-center gap-2 text-xs pt-2 border-t border-panel">
						<span class="text-muted font-semibold">Peran Penyetuju Berwenang:</span>
						{#each res.approver_roles as role}
							<span class="px-2 py-0.5 rounded bg-panel font-mono text-main border border-panel font-bold">
								{role}
							</span>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Tabel Master Aturan Persetujuan Aktif -->
	<div class="approvals-table-card">
		<div class="p-5 border-b border-panel flex items-center justify-between flex-wrap gap-4 bg-panel-sub">
			<div>
				<h3 class="text-base font-bold text-main">Daftar Aturan Persetujuan Aktif</h3>
				<span class="text-xs text-muted">
					Konfigurasi ambang batas, peran penyetuju, dan mode evaluasi multi-tier.
				</span>
			</div>

			<Button
				variant="secondary"
				size="sm"
				onclick={() => approvalsStore.openRuleEditor()}
			>
				+ Tambah Aturan Baru
			</Button>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="border-b border-panel bg-panel-sub text-xs uppercase font-semibold text-muted tracking-wider">
						<th class="py-3 px-4">Nama Aturan & Jenis</th>
						<th class="py-3 px-4">Cakupan Cabang</th>
						<th class="py-3 px-4">Tingkat</th>
						<th class="py-3 px-4">Ambang Batas / Formula</th>
						<th class="py-3 px-4">Penyetuju & Mode</th>
						<th class="py-3 px-4 text-center">Step-Up</th>
						<th class="py-3 px-4 text-center">Status</th>
						<th class="py-3 px-4 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-panel text-sm">
					{#each approvalsStore.rules as rule}
						<tr class="hover:bg-panel-hover transition-colors">
							<!-- Nama & Jenis -->
							<td class="py-3.5 px-4">
								<div class="flex flex-col gap-0.5">
									<span class="font-bold text-main">{rule.name}</span>
									<span class="text-xs text-muted font-mono">{rule.document_type}</span>
								</div>
							</td>

							<!-- Cakupan -->
							<td class="py-3.5 px-4 text-xs text-muted">
								{rule.outlet_id ? `Outlet: ${rule.outlet_id}` : rule.organization_id ? `Org: ${rule.organization_id}` : 'Semua Cabang (Global)'}
							</td>

							<!-- Tingkat -->
							<td class="py-3.5 px-4">
								<span class="tier-pill tier-{rule.tier}">
									Tingkat {rule.tier}
								</span>
							</td>

							<!-- Ambang Batas -->
							<td class="py-3.5 px-4 text-xs font-mono text-muted">
								{#if rule.min_amount && rule.max_amount}
									{formatRupiah(Number(rule.min_amount))} – {formatRupiah(Number(rule.max_amount))}
								{:else if rule.min_amount}
									&gt; {formatRupiah(Number(rule.min_amount))}
								{:else if rule.max_amount}
									≤ {formatRupiah(Number(rule.max_amount))}
								{:else if rule.percentage_variance_threshold}
									Selisih &gt; {rule.percentage_variance_threshold}%
								{:else}
									Semua Nilai
								{/if}
								{#if rule.daily_cumulative_limit}
									<div class="text-amber-600 font-semibold mt-0.5">
										Harian: {formatRupiah(Number(rule.daily_cumulative_limit))}
									</div>
								{/if}
							</td>

							<!-- Penyetuju & Mode -->
							<td class="py-3.5 px-4 text-xs">
								<div class="flex flex-col gap-1">
									<div class="flex items-center gap-1 flex-wrap">
										{#each rule.approver_roles as role}
											<span class="px-1.5 py-0.5 rounded bg-panel font-mono border border-panel text-main font-semibold">
												{role}
											</span>
										{/each}
									</div>
									<span class="text-subtle">
										{rule.mode === 'any_of' ? 'Salah satu (any_of)' : 'Semua (all_of)'}
									</span>
								</div>
							</td>

							<!-- Step-Up -->
							<td class="py-3.5 px-4 text-center">
								{#if rule.require_step_up}
									<span class="text-xs font-bold text-amber-500">Ya (PIN)</span>
								{:else}
									<span class="text-xs text-muted">Tidak</span>
								{/if}
							</td>

							<!-- Status -->
							<td class="py-3.5 px-4 text-center">
								{#if rule.is_active}
									<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
										Aktif
									</span>
								{:else}
									<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-panel-sub text-muted border border-panel">
										Nonaktif
									</span>
								{/if}
							</td>

							<!-- Aksi -->
							<td class="py-3.5 px-4 text-right">
								<Button
									variant="secondary"
									size="sm"
									onclick={() => approvalsStore.openRuleEditor(rule)}
								>
									Ubah
								</Button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Modal Editor Aturan Persetujuan -->
<Modal
	open={approvalsStore.isRuleModalOpen}
	title={approvalsStore.editingRule?.id ? 'Ubah Aturan Persetujuan' : 'Tambah Aturan Persetujuan Baru'}
	maxWidth="640px"
	onclose={() => approvalsStore.closeRuleEditor()}
>
	{#if approvalsStore.editingRule}
		<div class="flex flex-col gap-5 py-2">
			<Input
				label="Nama Aturan Persetujuan"
				placeholder="Contoh: Persetujuan Belanja Luar Darurat"
				bind:value={approvalsStore.editingRule.name}
				required
			/>

			<div class="grid grid-cols-2 gap-4">
				<Select
					label="Jenis Dokumen"
					options={docTypeOptions}
					bind:value={approvalsStore.editingRule.document_type}
				/>

				<Select
					label="Tingkat Persetujuan (Tier)"
					options={tierOptions}
					value={String(approvalsStore.editingRule.tier || 1)}
					onchange={(val) => {
						if (approvalsStore.editingRule) {
							approvalsStore.editingRule.tier = Number(val);
						}
					}}
				/>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<Select
					label="Mode Persetujuan"
					options={modeOptions}
					bind:value={approvalsStore.editingRule.mode}
				/>

				<div class="flex flex-col justify-center gap-1.5 pt-4">
					<Switch
						label="Wajibkan Step-Up Password / PIN"
						bind:checked={approvalsStore.editingRule.require_step_up}
					/>
				</div>
			</div>

			<Input
				label="Deskripsi / Penjelasan Aturan"
				placeholder="Jelaskan alasan dan kriteria operasional aturan ini..."
				bind:value={approvalsStore.editingRule.description}
			/>
		</div>
	{/if}

	{#snippet footer()}
		<div class="flex items-center justify-end gap-3 w-full">
			<Button
				variant="secondary"
				size="md"
				onclick={() => approvalsStore.closeRuleEditor()}
			>
				Batal
			</Button>
			<Button
				variant="primary"
				size="md"
				loading={approvalsStore.actionLoading}
				onclick={() => approvalsStore.saveRule()}
			>
				Simpan Aturan
			</Button>
		</div>
	{/snippet}
</Modal>
