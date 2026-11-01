<script lang="ts">
	/**
	 * Komponen Kotak Masuk Persetujuan Terpadu (PG-apr-inbox)
	 * Mematuhi Invarian Monorepo §2.6 & §2.7:
	 * - 1 Aksi Utama Bersih ("Tinjau" / "Lihat")
	 * - Generous Padding & Anti-Sesak
	 * - 4 Keadaan Layar Wajib (Loading, Empty, Error, Content)
	 */

	import Button from '../../../components/forms/Button.svelte';
	import Select from '../../../components/forms/Select.svelte';
	import TextField from '../../../components/forms/TextField.svelte';
	import StatusBadge from '../../../components/data/StatusBadge.svelte';
	import Skeleton from '../../../components/feedback/Skeleton.svelte';
	import EmptyState from '../../../components/feedback/EmptyState.svelte';
	import ErrorState from '../../../components/feedback/ErrorState.svelte';
	import { approvalsStore } from '../stores/approvals.svelte.js';
	import { formatRupiah, formatDate } from '../../../utils/format.js';
	import type { ApprovalRequest } from '../../../api/contract/types.js';

	const typeOptions = [
		{ value: 'all', label: 'Semua Jenis Dokumen' },
		{ value: 'external_purchase_order', label: 'PO Supplier Luar' },
		{ value: 'petty_cash_expense', label: 'Kas Kecil Bertingkat' },
		{ value: 'menu_proposal', label: 'Usulan Menu Lokal' },
		{ value: 'stock_count_variance', label: 'Selisih Opname Fisik' },
		{ value: 'payment_verification', label: 'Verifikasi Pembayaran' },
		{ value: 'period_reopen', label: 'Buka Periode Buku' }
	];

	const outletOptions = [
		{ value: 'all', label: 'Semua Gerai / Outlet' },
		{ value: 'out-jkt-01', label: 'Jodi Senopati (Jakarta)' },
		{ value: 'out-bdg-01', label: 'Jodi Dago (Bandung)' },
		{ value: 'out-sub-01', label: 'Jodi Gubeng (Surabaya)' }
	];

	const statusOptions = [
		{ value: 'all', label: 'Semua Status' },
		{ value: 'pending', label: 'Menunggu Persetujuan' },
		{ value: 'approved', label: 'Disetujui' },
		{ value: 'rejected', label: 'Ditolak' },
		{ value: 'cancelled', label: 'Ditarik Kembali' }
	];

	function getDocTypeBadgeLabel(type: string): string {
		switch (type) {
			case 'external_purchase_order':
				return 'PO Luar';
			case 'petty_cash_expense':
				return 'Kas Kecil';
			case 'menu_proposal':
				return 'Usulan Menu';
			case 'stock_count_variance':
				return 'Selisih Opname';
			case 'payment_verification':
				return 'Verifikasi Bayar';
			case 'period_reopen':
				return 'Buka Periode';
			default:
				return type;
		}
	}
</script>

<div class="flex flex-col gap-5 w-full">
	<!-- Tab Bar Persetujuan (Invarian §2.8) -->
	<div class="approvals-tab-nav">
		<button
			type="button"
			class="approvals-tab-btn"
			class:active={approvalsStore.activeTab === 'pending_for_me'}
			onclick={() => (approvalsStore.activeTab = 'pending_for_me')}
		>
			<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
				<path d="M13.73 21a2 2 0 0 1-3.46 0" />
			</svg>
			<span>Menunggu Saya</span>
			<span
				class="tab-badge-pill"
				class:danger-badge={approvalsStore.pendingForMeCount > 0}
			>
				{approvalsStore.pendingForMeCount}
			</span>
		</button>

		<button
			type="button"
			class="approvals-tab-btn"
			class:active={approvalsStore.activeTab === 'submitted_by_me'}
			onclick={() => (approvalsStore.activeTab = 'submitted_by_me')}
		>
			<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
				<polyline points="14 2 14 8 20 8" />
				<line x1="16" y1="13" x2="8" y2="13" />
				<line x1="16" y1="17" x2="8" y2="17" />
			</svg>
			<span>Diajukan Saya</span>
			<span class="tab-badge-pill">{approvalsStore.submittedByMeCount}</span>
		</button>

		<button
			type="button"
			class="approvals-tab-btn"
			class:active={approvalsStore.activeTab === 'history'}
			onclick={() => (approvalsStore.activeTab = 'history')}
		>
			<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10" />
				<polyline points="12 6 12 12 16 14" />
			</svg>
			<span>Riwayat Keputusan</span>
			<span class="tab-badge-pill">{approvalsStore.historyCount}</span>
		</button>

		<button
			type="button"
			class="approvals-tab-btn"
			class:active={approvalsStore.activeTab === 'rules'}
			onclick={() => (approvalsStore.activeTab = 'rules')}
		>
			<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
				<circle cx="12" cy="12" r="3" />
			</svg>
			<span>Aturan & Simulator (§6.8)</span>
			<span class="tab-badge-pill">{approvalsStore.rulesCount}</span>
		</button>
	</div>

	<!-- Konten Tab Non-Rules -->
	{#if approvalsStore.activeTab !== 'rules'}
		<!-- Toolbar Filter & Pencarian -->
		<div class="approvals-toolbar">
			<div class="toolbar-filters">
				<div class="filter-input-wrap">
					<Select
						options={typeOptions}
						bind:value={approvalsStore.typeFilter}
						placeholder="Jenis Dokumen"
					/>
				</div>

				<div class="filter-input-wrap">
					<Select
						options={outletOptions}
						bind:value={approvalsStore.outletFilter}
						placeholder="Pilih Gerai"
					/>
				</div>

				{#if approvalsStore.activeTab === 'history'}
					<div class="filter-input-wrap">
						<Select
							options={statusOptions}
							bind:value={approvalsStore.statusFilter}
							placeholder="Semua Status"
						/>
					</div>
				{/if}

				<div class="search-input-wrap">
					<TextField
						placeholder="Cari permohonan, nomor ref, pemohon..."
						bind:value={approvalsStore.searchQuery}
					/>
				</div>
			</div>
		</div>

		<!-- 4 Layar Wajib: Loading, Error, Empty, Content -->
		{#if approvalsStore.isLoading}
			<div class="approvals-table-card p-6 flex flex-col gap-4">
				<Skeleton height="32px" width="100%" />
				<Skeleton height="56px" width="100%" />
				<Skeleton height="56px" width="100%" />
				<Skeleton height="56px" width="100%" />
			</div>
		{:else if approvalsStore.error}
			<div class="approvals-table-card p-8">
				<ErrorState
					title="Gagal Memuat Permohonan Persetujuan"
					message={approvalsStore.error}
					onretry={() => approvalsStore.loadRequests()}
				/>
			</div>
		{:else if approvalsStore.filteredRequests.length === 0}
			<div class="approvals-table-card p-8">
				{#if approvalsStore.activeTab === 'pending_for_me'}
					<EmptyState
						title="Tidak Ada Dokumen Menunggu Persetujuan Anda"
						description={approvalsStore.currentUser?.role === 'store_manager'
							? 'Sebagai Store Manager, Anda memegang hak pengajuan operasional cabang. Dokumen yang Anda ajukan dapat dipantau di tab "Diajukan Saya".'
							: 'Seluruh permohonan belanja luar, kas kecil bertingkat, dan usulan menu telah selesai ditinjau.'}
					/>
				{:else if approvalsStore.activeTab === 'submitted_by_me'}
					<EmptyState
						title="Belum Ada Dokumen yang Diajukan"
						description="Seluruh pengajuan belanja eksternal, kas kecil, atau usulan menu lokal Anda akan tampil di sini."
					/>
				{:else}
					<EmptyState
						title="Belum Ada Riwayat Keputusan"
						description="Tidak ditemukan riwayat dokumen yang telah disetujui, ditolak, atau dibatalkan sesuai filter pencarian."
					/>
				{/if}
			</div>
		{:else}
			<div class="approvals-table-card">
				<div class="overflow-x-auto">
					<table class="w-full text-left border-collapse">
						<thead>
							<tr class="border-b border-panel bg-panel-sub text-xs uppercase font-semibold text-muted tracking-wider">
								<th class="py-3 px-4">Dokumen & Referensi</th>
								<th class="py-3 px-4">Jenis</th>
								<th class="py-3 px-4">Gerai</th>
								<th class="py-3 px-4">Pemohon</th>
								<th class="py-3 px-4">Tingkat</th>
								<th class="py-3 px-4 text-right">Nilai / Nominal</th>
								<th class="py-3 px-4 text-center">Status</th>
								<th class="py-3 px-4 text-right">Tindakan</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-panel text-sm">
							{#each approvalsStore.filteredRequests as req}
								<tr class="hover:bg-panel-hover transition-colors">
									<!-- Judul & Ref -->
									<td class="py-3.5 px-4">
										<div class="request-title-cell">
											<div class="request-title-text">{req.document_title}</div>
											<div class="request-meta-row">
												<span class="font-mono text-xs text-subtle">{req.document_ref}</span>
												{#if req.is_overdue}
													<span class="overdue-indicator">
														<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
															<circle cx="12" cy="12" r="10" />
															<line x1="12" y1="8" x2="12" y2="12" />
															<line x1="12" y1="16" x2="12.01" y2="16" />
														</svg>
														<span>Tertunda &gt; 24 Jam</span>
													</span>
												{/if}
											</div>
										</div>
									</td>

									<!-- Jenis -->
									<td class="py-3.5 px-4 whitespace-nowrap">
										<span class="text-xs font-semibold px-2 py-1 rounded bg-panel-sub border border-panel text-muted">
											{getDocTypeBadgeLabel(req.document_type)}
										</span>
									</td>

									<!-- Gerai -->
									<td class="py-3.5 px-4 text-muted whitespace-nowrap">
										{req.outlet_name || 'Semua Gerai'}
									</td>

									<!-- Pemohon & Waktu -->
									<td class="py-3.5 px-4 whitespace-nowrap">
										<div class="flex flex-col">
											<span class="font-semibold text-main text-xs">{req.submitted_by.name}</span>
											<span class="text-xs text-subtle">{formatDate(req.created_at, true)}</span>
										</div>
									</td>

									<!-- Tingkat / Tier -->
									<td class="py-3.5 px-4 whitespace-nowrap">
										<span class="tier-pill tier-{req.tier}">
											Tingkat {req.tier}
										</span>
									</td>

									<!-- Nilai / Nominal -->
									<td class="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap text-main">
										{req.amount ? formatRupiah(Number(req.amount)) : '—'}
									</td>

									<!-- Status -->
									<td class="py-3.5 px-4 text-center whitespace-nowrap">
										<StatusBadge status={req.status} size="sm" />
									</td>

									<!-- Tindakan Tunggal (Invarian §2.6) -->
									<td class="py-3.5 px-4 text-right whitespace-nowrap">
										<Button
											variant={req.status === 'pending' ? 'primary' : 'secondary'}
											size="sm"
											onclick={() => approvalsStore.selectRequest(req)}
										>
											{req.status === 'pending' ? 'Tinjau' : 'Lihat Detail'}
										</Button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}
</div>
