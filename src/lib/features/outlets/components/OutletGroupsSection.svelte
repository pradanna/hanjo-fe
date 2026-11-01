<script lang="ts">
	/**
	 * OutletGroupsSection.svelte (T-02.8, PG-org-groups)
	 * Pengelompokan outlet untuk pelaporan dan aturan persetujuan
	 */
	import type { OutletGroup, Outlet } from '../../../api/contract/types.js';
	import Icon from '../../../components/data/Icon.svelte';
	import CodeBadge from '../../../components/data/CodeBadge.svelte';
	import Badge from '../../../components/data/Badge.svelte';
	import Modal from '../../../components/feedback/Modal.svelte';
	import TextField from '../../../components/forms/TextField.svelte';
	import Textarea from '../../../components/forms/Textarea.svelte';
	import EmptyState from '../../../components/feedback/EmptyState.svelte';

	interface Props {
		groups: OutletGroup[];
		outlets: Outlet[];
		canManage?: boolean;
		onCreateGroup: (data: Partial<OutletGroup>) => Promise<void>;
	}

	let { groups, outlets, canManage = true, onCreateGroup }: Props = $props();

	let showAddModal = $state(false);
	let groupName = $state('');
	let groupCode = $state('');
	let groupDesc = $state('');
	let selectedOutletIds = $state<string[]>([]);
	let isSubmitting = $state(false);

	function toggleOutlet(id: string) {
		if (selectedOutletIds.includes(id)) {
			selectedOutletIds = selectedOutletIds.filter((o) => o !== id);
		} else {
			selectedOutletIds = [...selectedOutletIds, id];
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!groupName.trim()) return;

		isSubmitting = true;
		try {
			await onCreateGroup({
				name: groupName.trim(),
				code: groupCode.trim().toUpperCase(),
				description: groupDesc.trim(),
				outlet_ids: selectedOutletIds
			});
			showAddModal = false;
			groupName = '';
			groupCode = '';
			groupDesc = '';
			selectedOutletIds = [];
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex flex-col gap-5">
	<div class="flex items-center justify-between flex-wrap gap-4">
		<div>
			<h3 class="font-bold text-base text-[var(--text-main)] m-0">Grup Wilayah &amp; Area Operasional</h3>
			<p class="text-xs text-[var(--text-muted)] m-0 mt-0.5">Pengelompokan gerai untuk konsolidasi laporan wilayah dan hierarki approval belanja.</p>
		</div>
		{#if canManage}
			<button
				type="button"
				class="btn btn-primary"
				onclick={() => (showAddModal = true)}
			>
				<Icon name="plus" size={16} />
				<span>Tambah Grup Baru</span>
			</button>
		{/if}
	</div>

	{#if groups.length === 0}
		<EmptyState
			title="Belum Ada Grup Wilayah"
			description="Buat grup wilayah baru untuk mengelompokkan beberapa gerai dalam satu regional operasional."
		>
			{#snippet action()}
				{#if canManage}
					<button type="button" class="btn btn-primary" onclick={() => (showAddModal = true)}>
						<Icon name="plus" size={16} />
						<span>Tambah Grup Baru</span>
					</button>
				{/if}
			{/snippet}
		</EmptyState>
	{:else}
		<div class="outlets-grid">
			{#each groups as grp}
				<div class="outlet-item-card">
					<div class="outlet-card-top">
						<div class="outlet-name-block">
							<CodeBadge code={grp.code} />
							<h4 class="outlet-title">{grp.name}</h4>
						</div>
						<Badge variant="info" size="sm">
							{grp.outlet_ids.length} Gerai Terdaftar
						</Badge>
					</div>

					<p class="text-xs text-[var(--text-muted)] m-0 leading-relaxed">
						{grp.description || 'Grup operasional regional.'}
					</p>

					<div class="rounded-xl flex flex-wrap gap-2 p-3.5 bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)]">
						{#each grp.outlet_ids as outId}
							{@const out = outlets.find((o) => o.id === outId)}
							<span class="inline-flex items-center gap-1.5 rounded-md text-[11.5px] font-medium px-2.5 py-1 bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-main)]">
								<span class="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]"></span>
								<span>{out?.name || outId}</span>
							</span>
						{/each}
						{#if grp.outlet_ids.length === 0}
							<span class="text-xs italic text-[var(--text-muted)]">Belum ada gerai terdaftar dalam grup ini</span>
						{/if}
					</div>

					<!-- Progressive Disclosure Card Footer -->
					<div class="outlet-card-footer">
						<span class="text-xs text-[var(--text-muted)] font-medium">
							Total Anggota: <strong class="text-[var(--text-main)] font-mono">{grp.outlet_ids.length} Cabang</strong>
						</span>
						<span class="text-xs font-semibold text-[var(--brand-primary)]">
							Regional Aktif
						</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal Tambah Grup Baru (Reused Modal Component - Golden Rule 3 & 14) -->
<Modal
	open={showAddModal}
	title="Buat Grup Wilayah Baru"
	subtitle="Kelompokkan gerai untuk konsolidasi laporan wilayah dan hierarki approval belanja."
	maxWidth="580px"
	onclose={() => (showAddModal = false)}
>
	{#snippet footer()}
		<button type="button" class="btn btn-secondary" onclick={() => (showAddModal = false)} disabled={isSubmitting}>
			Batal
		</button>
		<button type="submit" form="grp-form" class="btn btn-primary" disabled={isSubmitting}>
			{isSubmitting ? 'Membuat...' : 'Buat Grup Wilayah'}
		</button>
	{/snippet}

	<form id="grp-form" onsubmit={handleSubmit} class="form-field-stack">
		<TextField
			id="grp-name"
			label="Nama Grup Wilayah"
			required
			bind:value={groupName}
			placeholder="Contoh: Regional Jawa Barat"
		/>

		<TextField
			id="grp-code"
			label="Kode Singkat Grup"
			bind:value={groupCode}
			placeholder="Contoh: GRP-JABAR"
			inputClass="uppercase font-mono"
			helperText="Kode pengenal grup untuk dokumen laporan."
		/>

		<Textarea
			id="grp-desc"
			label="Deskripsi Wilayah"
			rows={2}
			bind:value={groupDesc}
			placeholder="Area cakupan operasional dan pengawasan regional..."
		/>

		<div class="field-group">
			<span class="field-label">Pilih Gerai Anggota:</span>
			<div class="max-h-48 overflow-y-auto flex flex-col gap-2 p-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border-input)]">
				{#each outlets as o}
					<label class="flex items-center gap-2.5 cursor-pointer text-xs p-1 rounded hover:bg-[var(--bg-panel-hover)] transition-colors">
						<input
							type="checkbox"
							class="w-4 h-4 rounded text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] cursor-pointer"
							checked={selectedOutletIds.includes(o.id)}
							onchange={() => toggleOutlet(o.id)}
						/>
						<span class="font-medium text-[var(--text-main)]">{o.name}</span>
						<span class="text-[var(--text-muted)] text-[11px]">({o.city})</span>
					</label>
				{/each}
			</div>
			<span class="field-help">Pilih gerai-gerai yang tercakup dalam area manajerial grup ini.</span>
		</div>
	</form>
</Modal>
