<script lang="ts">
	/**
	 * Subkomponen: Tab Satuan Ukuran & Konversi Satuan (UnitsTab)
	 * Bagian dari modul Master Bahan (MS-03)
	 * Mengikuti Golden Rule 2 (Thin Svelte)
	 */
	import Icon from '#lib/components/data/Icon.svelte';
	import CodeBadge from '#lib/components/data/CodeBadge.svelte';
	import ActionMenu from '#lib/components/feedback/ActionMenu.svelte';
	import { catalogStore } from '#lib/features/catalog/stores/catalog.svelte.js';

	interface Props {
		canManageCatalog: boolean;
	}

	let { canManageCatalog }: Props = $props();
</script>

<!-- Section 1: Master Satuan Ukuran -->
<div class="catalog-section-bar">
	<div class="toolbar-left">
		<div class="flex flex-col gap-0.5">
			<h3 class="text-sm font-bold text-[var(--text-main)]">Master Satuan Ukuran (Units of Measurement)</h3>
			<span class="text-xs text-[var(--text-subtle)]">Daftar satuan standar untuk kuantitas inventaris dan resep master</span>
		</div>
	</div>
	<div class="toolbar-right">
		{#if canManageCatalog}
			<button
				type="button"
				class="btn btn-primary"
				onclick={() => catalogStore.openCreateUnit()}
				id="btn-tambah-satuan"
			>
				<Icon name="plus" size={16} />
				<span>Tambah Satuan</span>
			</button>
		{/if}
	</div>
</div>

<div class="data-table-container">
	<table class="data-table">
		<thead>
			<tr>
				<th>Simbol Satuan</th>
				<th>Nama Lengkap</th>
				<th>Tipe Besaran</th>
				<th>Status Sistem</th>
			</tr>
		</thead>
		<tbody>
			{#each catalogStore.units as u}
				<tr>
					<td><CodeBadge code={u.symbol} /></td>
					<td><strong class="text-[var(--text-main)]">{u.name}</strong></td>
					<td><span class="capitalize text-xs text-[var(--text-muted)]">{u.type}</span></td>
					<td>
						{#if u.is_system}
							<span class="pill-badge pill-info">Baku Sistem</span>
						{:else}
							<span class="pill-badge pill-success">Kustom</span>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<!-- Section 2: Aturan Konversi Satuan (Bebas Siklus) -->
<div id="panel-aturan-konversi">
	<div class="catalog-section-bar">
		<div class="toolbar-left">
			<div class="flex flex-col gap-0.5">
				<h3 class="text-sm font-bold text-[var(--text-main)]">Aturan Konversi Antar-Satuan (Bebas Siklus)</h3>
				<span class="text-xs text-[var(--text-subtle)]">Konversi terverifikasi mencegah siklus rekursif</span>
			</div>
		</div>
		<div class="toolbar-right">
			<span class="text-xs px-3 py-1.5 rounded-full bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-mono">
				Terdaftar: {catalogStore.conversions.length} Aturan
			</span>
			{#if canManageCatalog}
				<button
					type="button"
					class="btn btn-primary"
					onclick={() => catalogStore.openCreateConversion()}
					id="btn-tambah-konversi"
				>
					<Icon name="plus" size={16} />
					<span>Tambah Aturan Konversi</span>
				</button>
			{/if}
		</div>
	</div>

	<div class="data-table-container">
		<table class="data-table">
			<thead>
				<tr>
					<th>Dari Satuan</th>
					<th>Ke Satuan</th>
					<th>Faktor Pengali</th>
					<th>Formula Hubungan</th>
					{#if canManageCatalog}
						<th class="w-16 text-right">Aksi</th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each catalogStore.conversions as conv}
					<tr>
						<td><CodeBadge code={conv.from_unit_symbol} variant="muted" /></td>
						<td><CodeBadge code={conv.to_unit_symbol} /></td>
						<td class="font-mono font-semibold">{parseFloat(conv.factor).toLocaleString('id-ID')}</td>
						<td class="text-xs text-[var(--text-muted)]">{conv.description}</td>
						{#if canManageCatalog}
							<td class="text-right">
								<div class="flex items-center justify-end">
									<ActionMenu
										items={[
											{
												label: 'Hapus Aturan Konversi',
												icon: 'trash',
												variant: 'danger',
												onclick: () => catalogStore.deleteConversion(conv.id)
											}
										]}
									/>
								</div>
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
