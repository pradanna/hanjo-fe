<script lang="ts">
	/**
	 * Subkomponen Tab 5: Preset Catatan Dapur / Barista (Lapis 3: +Rp 0)
	 * Referensi: PRD §6, MILESTONE.md §MS-04
	 */
	import { menuStore } from '../../stores/menu.svelte.js';
	import { session } from '../../../../auth/session.svelte.js';
	import { can } from '../../../../auth/can.js';

	import Icon from '../../../../components/data/Icon.svelte';
	import CodeBadge from '../../../../components/data/CodeBadge.svelte';
	import StatusBadge from '../../../../components/data/StatusBadge.svelte';
	import EmptyState from '../../../../components/feedback/EmptyState.svelte';
	import Pagination from '../../../../components/data/Pagination.svelte';
	import ActionMenu from '../../../../components/feedback/ActionMenu.svelte';
	import Select from '../../../../components/forms/Select.svelte';

	const canManageCatalog = $derived(can(session.user, 'catalog:manage'));

	// Filter & Pagination Preset Catatan Dapur
	let noteSearch = $state('');
	let noteCategoryFilter = $state<'all' | 'beverage' | 'food' | 'general'>('all');
	let notePage = $state(1);
	let notePerPage = $state(12);

	const filteredNotePresets = $derived.by(() => {
		let list = menuStore.notePresets;
		const q = noteSearch.toLowerCase().trim();
		if (q) {
			list = list.filter((n) => n.name.toLowerCase().includes(q) || n.code.toLowerCase().includes(q));
		}
		if (noteCategoryFilter !== 'all') {
			list = list.filter((n) => n.category === noteCategoryFilter);
		}
		return list;
	});

	const paginatedNotePresets = $derived.by(() => {
		const start = (notePage - 1) * notePerPage;
		return filteredNotePresets.slice(start, start + notePerPage);
	});

	$effect(() => {
		const _ = `${noteSearch}|${noteCategoryFilter}`;
		notePage = 1;
	});
</script>

<div class="flex flex-col gap-6">
	<div class="catalog-toolbar">
		<div class="toolbar-left">
			<div class="toolbar-search">
				<Icon name="magnifying-glass" size={16} />
				<input
					type="text"
					placeholder="Cari preset catatan dapur (nama/kode)..."
					bind:value={noteSearch}
					class="toolbar-search-input"
					id="input-cari-preset-catatan"
				/>
				{#if noteSearch}
					<button
						type="button"
						class="toolbar-search-clear"
						onclick={() => (noteSearch = '')}
						aria-label="Hapus pencarian"
					>
						<Icon name="x-mark" size={14} />
					</button>
				{/if}
			</div>

			<div class="w-60">
				<Select
					options={[
						{ value: 'all', label: `Semua Kategori (${menuStore.notePresets.length})` },
						{ value: 'beverage', label: 'Minuman (Gula, Es, Suhu)' },
						{ value: 'food', label: 'Makanan (Pedas, Sambal)' },
						{ value: 'general', label: 'Umum (Kemasan, Sedotan)' }
					]}
					bind:value={noteCategoryFilter}
				/>
			</div>
		</div>

		<div class="toolbar-right">
			{#if canManageCatalog}
				<button
					type="button"
					class="btn btn-primary"
					onclick={() => {
						menuStore.editingNotePreset = null;
						menuStore.isNotePresetModalOpen = true;
					}}
					id="btn-tambah-preset-catatan"
				>
					<Icon name="plus" size={16} />
					<span>Tambah Preset Catatan</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- Banner Penjelasan Konsep Lapis 3 (+Rp 0) -->
	<div class="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex items-start gap-3">
		<div class="p-2 rounded-lg bg-sky-500/15 text-sky-400 shrink-0">
			<Icon name="chat-bubble-bottom-center-text" size={20} />
		</div>
		<div class="flex flex-col gap-1 text-xs">
			<span class="font-bold text-[var(--text-main)]">Preset Catatan Dapur / Barista (Lapis 3: Bebas Biaya +Rp 0)</span>
			<span class="text-[var(--text-muted)]">
				Preset catatan adalah instruksi penyajian cepat tanpa biaya tambahan (+Rp 0) dan tanpa pemotongan stok bahan baku. Digunakan oleh kasir POS sebagai tombol cepat (quick chips) untuk instruksi koki/barista di tiket Kitchen Display System (KDS) dan struk pelanggan (mis. Less Ice, No Sugar, Pisah Sambal).
			</span>
		</div>
	</div>

	{#if paginatedNotePresets.length === 0}
		<EmptyState
			title="Tidak Ada Preset Catatan"
			description="Belum ada preset catatan dapur yang cocok dengan filter atau pencarian saat ini."
		/>
	{:else}
		<div class="data-table-container">
			<table class="data-table">
				<thead>
					<tr>
						<th>Nama Preset</th>
						<th>Kode Preset</th>
						<th>Kategori Instruksi</th>
						<th>Urutan Tampil</th>
						<th>Biaya &amp; Stok</th>
						<th>Status</th>
						<th class="w-24 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody>
					{#each paginatedNotePresets as p}
						<tr>
							<td>
								<div class="flex items-center gap-2">
									<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--text-main)]">
										{p.name}
									</span>
								</div>
							</td>
							<td>
								<CodeBadge code={p.code} />
							</td>
							<td>
								{#if p.category === 'beverage'}
									<span class="pill-badge pill-info">Minuman</span>
								{:else if p.category === 'food'}
									<span class="pill-badge pill-warning">Makanan</span>
								{:else}
									<span class="pill-badge pill-neutral">Umum</span>
								{/if}
							</td>
							<td class="font-mono text-xs text-[var(--text-muted)]">
								#{p.sort_order ?? 1}
							</td>
							<td>
								<span class="text-xs font-semibold text-emerald-400">
									+Rp 0 (Tanpa Stok)
								</span>
							</td>
							<td>
								{#if p.is_active}
									<StatusBadge status="active" />
								{:else}
									<StatusBadge status="inactive" />
								{/if}
							</td>
							<td class="text-right">
								{#if canManageCatalog}
									<ActionMenu
										items={[
											{
												label: 'Ubah Preset',
												icon: 'pencil-square',
												onclick: () => {
													menuStore.editingNotePreset = p;
													menuStore.isNotePresetModalOpen = true;
												}
											},
											{
												label: 'Hapus Preset',
												icon: 'trash',
												variant: 'danger',
												onclick: async () => {
													if (confirm(`Hapus preset catatan "${p.name}"?`)) {
														await menuStore.deleteNotePreset(p.id);
													}
												}
											}
										]}
									/>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if filteredNotePresets.length > 0}
		<div class="catalog-panel-footer">
			<Pagination
				page={notePage}
				perPage={notePerPage}
				total={filteredNotePresets.length}
				perPageOptions={[12, 24, 48]}
				hrefBuilder={(p, pp) => `?tab=notes&page=${p}&per_page=${pp}`}
				onpagechange={(newPage) => (notePage = newPage)}
				onperpagechange={(newSize) => {
					notePerPage = newSize;
					notePage = 1;
				}}
			/>
		</div>
	{/if}
</div>
