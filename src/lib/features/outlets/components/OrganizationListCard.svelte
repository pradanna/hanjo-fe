<script lang="ts">
	/**
	 * OrganizationListCard.svelte (T-02.0, PG-org-list)
	 * Menampilkan daftar entitas bisnis induk dengan ringkasan jumlah outlet aktif di bawahnya
	 */
	import type { Organization } from '../../../api/contract/types.js';
	import Icon from '../../../components/data/Icon.svelte';
	import StatusBadge from '../../../components/data/StatusBadge.svelte';
	import CodeBadge from '../../../components/data/CodeBadge.svelte';
	import ActionMenu from '../../../components/feedback/ActionMenu.svelte';
	import EmptyState from '../../../components/feedback/EmptyState.svelte';

	interface Props {
		organizations: Organization[];
		canManage?: boolean;
		onEdit: (org: Organization) => void;
		onToggleStatus: (org: Organization) => void;
		onSelectOrgFilter: (orgId: string) => void;
		onAdd?: () => void;
	}

	let {
		organizations,
		canManage = true,
		onEdit,
		onToggleStatus,
		onSelectOrgFilter,
		onAdd
	}: Props = $props();
</script>

<div class="flex flex-col gap-5">
	<div class="flex items-center justify-between flex-wrap gap-4">
		<div>
			<h3 class="font-bold text-base text-[var(--text-main)] m-0">Daftar Organisasi Induk</h3>
			<p class="text-xs text-[var(--text-muted)] m-0 mt-0.5">Entitas bisnis induk pengelola jaringan multi-gerai dan perizinan.</p>
		</div>
		{#if onAdd && canManage}
			<button
				type="button"
				class="btn btn-primary"
				onclick={onAdd}
				id="btn-tambah-org"
			>
				<Icon name="plus" size={16} />
				<span>Tambah Organisasi Induk</span>
			</button>
		{/if}
	</div>

	{#if organizations.length === 0}
		<EmptyState
			title="Belum Ada Organisasi Induk"
			description="Daftarkan entitas organisasi induk baru untuk menaungi gerai-gerai multi-outlet."
		>
			{#snippet action()}
				{#if onAdd && canManage}
					<button type="button" class="btn btn-primary" onclick={onAdd}>
						<Icon name="plus" size={16} />
						<span>Tambah Organisasi Induk</span>
					</button>
				{/if}
			{/snippet}
		</EmptyState>
	{:else}
		<div class="outlets-grid" id="org-list-grid">
			{#each organizations as org}
				<div class="outlet-item-card" id="org-card-{org.id}">
					<div class="outlet-card-top">
						<div class="outlet-name-block">
							<CodeBadge code={org.code} />
							<h3 class="outlet-title">{org.name}</h3>
							<span class="outlet-org-subtitle">
								<Icon name="building-office" size={14} />
								<span>Entitas Bisnis Induk</span>
							</span>
						</div>
						<div class="outlet-card-top-right">
							<StatusBadge
								status={org.active !== false ? 'active' : 'inactive'}
							/>
							<ActionMenu
								items={[
									{
										label: `Lihat ${org.outlet_count || 0} Gerai`,
										icon: 'funnel',
										onclick: () => onSelectOrgFilter(org.id)
									},
									...(canManage
										? [
												{
													label: 'Ubah Data Organisasi',
													icon: 'pencil-square',
													onclick: () => onEdit(org)
												},
												{
													divider: true,
													label: org.active !== false ? 'Nonaktifkan Organisasi' : 'Aktifkan Organisasi',
													icon: org.active !== false ? 'lock-closed' : 'check-circle',
													variant: (org.active !== false ? 'danger' : 'success') as 'danger' | 'success',
													onclick: () => onToggleStatus(org)
												}
											]
										: [])
								]}
							/>
						</div>
					</div>

					<p class="text-xs text-[var(--text-muted)] leading-relaxed m-0">
						{org.description || 'Tidak ada deskripsi entitas bisnis.'}
					</p>

					<div class="outlet-info-grid">
						<div class="info-item">
							<span class="info-label">NPWP Entitas</span>
							<span class="info-val font-mono">{org.tax_id || '-'}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Gerai Aktif</span>
							<button
								type="button"
								class="info-val font-bold text-left cursor-pointer bg-transparent border-0 p-0 hover:underline flex items-center gap-1 text-[var(--brand-primary)]"
								onclick={() => onSelectOrgFilter(org.id)}
								title="Filter outlet di bawah organisasi ini"
							>
								<span>{org.outlet_count || 0} Gerai</span>
								<Icon name="arrow-right" size={12} />
							</button>
						</div>
						<div class="info-item col-span-2">
							<span class="info-label">Alamat Kantor Pusat</span>
							<span class="info-val truncate">{org.address || '-'}</span>
						</div>
					</div>

					<!-- Progressive Disclosure Card Footer (Golden Rule 13) -->
					<div class="outlet-card-footer">
						<button
							type="button"
							class="btn-view-direct"
							onclick={() => onSelectOrgFilter(org.id)}
							id="btn-view-org-{org.id}"
						>
							<Icon name="building-storefront" size={14} />
							<span>Lihat {org.outlet_count || 0} Gerai</span>
						</button>

						{#if canManage}
							<button
								type="button"
								class="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--brand-primary)] flex items-center gap-1.5 transition-colors bg-transparent border-0 cursor-pointer p-1"
								onclick={() => onEdit(org)}
								title="Ubah Data Organisasi"
							>
								<Icon name="pencil-square" size={13} />
								<span>Ubah</span>
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
