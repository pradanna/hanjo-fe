<script lang="ts">
	/**
	 * Detail Drawer / Modal: Informasi Komprehensif Bahan Baku (PG-cat-item-detail)
	 * Mengikuti Golden Rule 2 (Thin Svelte), Golden Rule 10 (Tokens), AC-03.5 & AC-03.6
	 * Rule §2.7: Generous Padding, Anti-Sesak, Clean Segmented Tabs & Progressive Disclosure
	 */
	import Modal from '#lib/components/feedback/Modal.svelte';
	import Icon from '#lib/components/data/Icon.svelte';
	import StatusBadge from '#lib/components/data/StatusBadge.svelte';
	import CodeBadge from '#lib/components/data/CodeBadge.svelte';
	import { session } from '#lib/auth/session.svelte.js';
	import { can } from '#lib/auth/can.js';
	import { formatRupiah, formatDate } from '#lib/utils/format.js';
	import type { StockItem, StockItemCostHistory } from '#lib/api/contract/types.js';

	interface Props {
		open: boolean;
		item: StockItem | null;
		costHistory: StockItemCostHistory | null;
		onclose: () => void;
		onedit: (item: StockItem) => void;
		onarchive: (item: StockItem) => Promise<boolean>;
		onrestore: (item: StockItem) => Promise<boolean>;
		onupdateminstock: (outletId: string, minStock: string) => Promise<boolean>;
	}

	let {
		open,
		item,
		costHistory,
		onclose,
		onedit,
		onarchive,
		onrestore,
		onupdateminstock
	}: Props = $props();

	// Local Active Tab in Detail Drawer
	let activeTab = $state<'info' | 'stock' | 'pricing' | 'min_stock' | 'recipes'>('info');

	// Local state for updating min stock
	let editingMinOutletId = $state<string | null>(null);
	let newMinStockVal = $state('');

	const canManageCatalog = $derived(can(session.user, 'catalog:manage'));

	function startEditMinStock(outletId: string, currentMin: string) {
		if (!canManageCatalog) return;
		editingMinOutletId = outletId;
		newMinStockVal = currentMin;
	}

	async function saveMinStock(outletId: string) {
		if (!newMinStockVal.trim()) return;
		await onupdateminstock(outletId, newMinStockVal.trim());
		editingMinOutletId = null;
	}

	function cancelEditMinStock() {
		editingMinOutletId = null;
		newMinStockVal = '';
	}

	const isItemOutOfStock = $derived.by(() => {
		if (item?.status === 'archived') return false;
		return parseFloat(item?.current_stock || '0') <= 0;
	});

	const isItemLowStock = $derived.by(() => {
		if (item?.status === 'archived' || isItemOutOfStock) return false;
		if (!item?.stock_by_outlet) return false;
		const entries = Object.values(item.stock_by_outlet);
		return entries.some((d) => {
			const curr = parseFloat(d.current || '0');
			const min = parseFloat(d.min || '0');
			return min > 0 && curr <= min;
		});
	});
</script>

{#if item}
	<Modal
		{open}
		maxWidth="clamp(980px, 80vw, 1440px)"
		{onclose}
	>
		{#snippet header()}
			<div class="drawer-merged-header">
				<div class="header-main-info">
					<div class="header-title-and-badges">
						<h3 class="modal-title">{item.name}</h3>
						<CodeBadge code={item.code} />
						<StatusBadge status={item.status === 'active' ? 'active' : 'archived'} size="sm" />
						{#if item.is_producible}
							<span class="header-sourcing-pill pill-info">Bahan Olahan Gerai</span>
						{:else if !item.can_buy_external}
							<span class="header-sourcing-pill pill-warning">Pasokan Gudang HQ</span>
						{:else}
							<span class="header-sourcing-pill pill-success">Boleh Beli Luar</span>
						{/if}
					</div>

					<div class="header-metadata-row">
						<span class="meta-tag">
							<Icon name="tag" size={13} />
							<span>{item.category_name || 'Umum'}</span>
						</span>
						<span class="meta-separator">&bull;</span>
						<span class="meta-unit">
							Satuan Dasar: <strong>{item.base_unit_symbol}</strong>
						</span>
						<span class="meta-separator">&bull;</span>
						<span class="meta-unit font-mono">
							SKU: <strong>{item.code}</strong>
						</span>
					</div>
				</div>

				<div class="header-price-card">
					<span class="price-label">Harga Acuan Pusat</span>
					<span class="price-value">{formatRupiah(item.hq_ref_price || 0)}</span>
					<span class="price-sub">per {item.base_unit_symbol}</span>
				</div>
			</div>
		{/snippet}

		<div class="detail-container">
			<!-- Unified Tabbed Section: Tabs Header & Tab Body merged into one card -->
			<div class="detail-tabbed-container">
				<div class="detail-tabs-header" role="tablist" aria-label="Tab Menu Detail Bahan">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'info'}
						class="detail-tab-btn {activeTab === 'info' ? 'active' : ''}"
						onclick={() => (activeTab = 'info')}
					>
						<Icon name="information-circle" size={15} />
						<span>Ringkasan Info</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'stock'}
						class="detail-tab-btn {activeTab === 'stock' ? 'active' : ''}"
						onclick={() => (activeTab = 'stock')}
					>
						<Icon name="building-storefront" size={15} />
						<span>Stok per Gerai</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'pricing'}
						class="detail-tab-btn {activeTab === 'pricing' ? 'active' : ''}"
						onclick={() => (activeTab = 'pricing')}
					>
						<Icon name="banknotes" size={15} />
						<span>Riwayat Harga &amp; HPP</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'min_stock'}
						class="detail-tab-btn {activeTab === 'min_stock' ? 'active' : ''}"
						onclick={() => (activeTab = 'min_stock')}
					>
						<Icon name="adjustments-horizontal" size={15} />
						<span>Batas Minimum Gerai</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'recipes'}
						class="detail-tab-btn {activeTab === 'recipes' ? 'active' : ''}"
						onclick={() => (activeTab = 'recipes')}
					>
						<Icon name="book-open" size={15} />
						<span>Dipakai di Resep</span>
						{#if (item.recipes_using_count || 0) > 0}
							<span class="tab-count-badge">{item.recipes_using_count}</span>
						{/if}
					</button>
				</div>

				<!-- TAB CONTENT BODY (Seamlessly connected within the container) -->
				<div class="detail-tab-body">
				<!-- TAB 1: RINGKASAN INFO (DATA SHEET SPESIFIKASI MASTER) -->
				{#if activeTab === 'info'}
					<div class="spec-sheet-container">
						<!-- Seksi 1: Spesifikasi Master & Karakteristik Fisik -->
						<div class="spec-section">
							<div class="spec-section-header">
								<Icon name="cube" size={16} />
								<span>Spesifikasi Master &amp; Karakteristik Fisik</span>
							</div>
							<div class="spec-grid">
								<div class="spec-item">
									<span class="spec-label">Kategori Bahan</span>
									<span class="spec-value">{item.category_name || 'Umum'}</span>
								</div>
								<div class="spec-item">
									<span class="spec-label">Satuan Dasar</span>
									<span class="spec-value font-mono font-semibold">{item.base_unit_symbol}</span>
								</div>
								<div class="spec-item">
									<span class="spec-label">Suhu Penyimpanan</span>
									<span class="spec-value">
										{#if item.storage_temperature === 'chilled'}
											Dingin / Kulkas (Chilled, 2°C &ndash; 4°C)
										{:else if item.storage_temperature === 'frozen'}
											Beku / Freezer (Frozen, &lt; -18°C)
										{:else}
											Suhu Ruang (Ambient, 20°C &ndash; 25°C)
										{/if}
									</span>
								</div>
								<div class="spec-item">
									<span class="spec-label">Integritas Satuan (Mutasi)</span>
									<span class="spec-value {item.has_stock_movements ? 'text-amber-400' : 'text-emerald-400'}">
										{#if item.has_stock_movements}
											Terkunci &mdash; sudah memiliki transaksi mutasi stok
										{:else}
											Terbuka &mdash; belum ada transaksi mutasi
										{/if}
									</span>
								</div>
								<div class="spec-item">
									<span class="spec-label">Total Stok Fisik Konsolidasi</span>
									<span class="spec-value font-mono font-semibold text-emerald-400">
										{parseFloat(item.current_stock || '0').toLocaleString('id-ID')} {item.base_unit_symbol}
									</span>
								</div>
								<div class="spec-item">
									<span class="spec-label">Keterikatan Resep Menu</span>
									<span class="spec-value">
										{#if (item.recipes_using_count || 0) > 0}
											Aktif digunakan di {item.recipes_using_count} resep menu
										{:else}
											Belum digunakan di formula resep
										{/if}
									</span>
								</div>
							</div>
						</div>

						<!-- Seksi 2: Metode Pasokan & Referensi Pengadaan -->
						<div class="spec-section">
							<div class="spec-section-header">
								<Icon name="truck" size={16} />
								<span>Metode Pasokan &amp; Referensi Pengadaan</span>
							</div>
							<div class="spec-grid">
								<div class="spec-item">
									<span class="spec-label">Metode Pasokan (Sourcing)</span>
									<span class="spec-value">
										{#if item.is_producible}
											Olahan Internal Gerai (Batch Prep / Semi-Finished)
										{:else if item.can_buy_external}
											Pengadaan Langsung (Beli Luar / Direct PO ke Supplier Lokal)
										{:else}
											Pasokan Gudang Pusat HQ (Distribusi Sentral Logistik)
										{/if}
									</span>
								</div>
								<div class="spec-item">
									<span class="spec-label">Kode Referensi Pusat</span>
									<span class="spec-value font-mono">
										{item.hq_ref_code ? item.hq_ref_code : '— (Tidak berlaku / Bukan HQ)'}
									</span>
								</div>
								<div class="spec-item">
									<span class="spec-label">Harga Acuan Pusat</span>
									<span class="spec-value font-mono font-semibold">
										{#if item.hq_ref_price && parseFloat(item.hq_ref_price) > 0}
											{formatRupiah(item.hq_ref_price)} <span class="text-xs text-[var(--text-muted)] font-normal">/ {item.base_unit_symbol}</span>
										{:else}
											— (Tidak ada harga pusat)
										{/if}
									</span>
								</div>
								<div class="spec-item">
									<span class="spec-label">Harga Pembelian Terakhir</span>
									<span class="spec-value font-mono font-semibold text-emerald-400">
										{#if costHistory?.last_purchased_price}
											{formatRupiah(costHistory.last_purchased_price)} <span class="text-xs text-[var(--text-muted)] font-normal">/ {item.base_unit_symbol}</span>
										{:else}
											— (Belum ada riwayat faktur)
										{/if}
									</span>
								</div>
							</div>
						</div>

						<!-- Seksi 3: Catatan & Petunjuk Penggunaan -->
						<div class="spec-section">
							<div class="spec-section-header">
								<Icon name="document-text" size={16} />
								<span>Catatan &amp; Petunjuk Penggunaan Bahan</span>
							</div>
							<div class="spec-desc-box">
								<p class="spec-desc-text">
									{item.description || 'Tidak ada catatan, petunjuk racikan, atau instruksi khusus untuk bahan baku ini.'}
								</p>
							</div>
						</div>

						<!-- Seksi 4: Audit & Metadata Sistem -->
						<div class="spec-audit-strip">
							<div class="audit-item">
								<span class="audit-label">ID Sistem:</span>
								<span class="audit-value font-mono">{item.id}</span>
							</div>
							<span class="audit-dot">&bull;</span>
							<div class="audit-item">
								<span class="audit-label">Dibuat:</span>
								<span class="audit-value">{formatDate(item.created_at, true)}</span>
							</div>
							<span class="audit-dot">&bull;</span>
							<div class="audit-item">
								<span class="audit-label">Terakhir Diperbarui:</span>
								<span class="audit-value">{formatDate(item.updated_at, true)}</span>
							</div>
						</div>
					</div>

				<!-- TAB 2: STOK PER GERAI -->
				{:else if activeTab === 'stock'}
					<div class="tab-panel-stack">
						{#if !canManageCatalog}
							<div class="detail-notice-callout info">
								<Icon name="information-circle" size={18} />
								<span>Mode Terbatas: Anda hanya berwenang melihat saldo stok gerai tugas Anda.</span>
							</div>
						{/if}

						<div class="data-table-container">
							<table class="data-table">
								<thead>
									<tr>
										<th>Gerai / Outlet</th>
										<th>Sisa Stok Fisik</th>
										<th>Status Ambang</th>
									</tr>
								</thead>
								<tbody>
									{#if item.stock_by_outlet && Object.keys(item.stock_by_outlet).length > 0}
										{#each Object.entries(item.stock_by_outlet) as [outletId, data]}
											{@const currentNum = parseFloat(data.current || '0')}
											{@const minNum = parseFloat(data.min || '0')}
											{@const isOutOfStock = currentNum <= 0}
											{@const isCritical = currentNum <= minNum && !isOutOfStock}
											<tr class={isOutOfStock ? 'row-out-of-stock' : isCritical ? 'row-low-stock' : ''}>
												<td>
													<strong class="text-[var(--text-main)] capitalize">
														{outletId === 'out-jkt-01' ? 'Jodi Senopati (Jakarta)' : outletId === 'out-bdg-01' ? 'Jodi Dago (Bandung)' : outletId === 'out-sby-01' ? 'Jodi Gubeng (Surabaya)' : outletId === 'out-ubud-01' ? 'Kaveloka Ubud (Bali)' : outletId === 'out-plaga-01' ? 'Plaga Bistro (Bali)' : outletId}
													</strong>
												</td>
												<td>
													<span class="font-mono font-bold {isOutOfStock ? 'text-rose-400' : isCritical ? 'text-amber-400' : 'text-emerald-400'}">
														{parseFloat(data.current).toLocaleString('id-ID')} {item.base_unit_symbol}
													</span>
												</td>
												<td>
													{#if isOutOfStock}
														<span class="pill-badge pill-danger">Stok Habis (0)</span>
													{:else if isCritical}
														<span class="pill-badge pill-warning">Stok Menipis (&le; {parseFloat(data.min).toLocaleString('id-ID')})</span>
													{:else}
														<span class="pill-badge pill-success">Aman (Batas Min: {parseFloat(data.min).toLocaleString('id-ID')})</span>
													{/if}
												</td>
											</tr>
										{/each}
									{:else}
										<tr>
											<td colspan="3" class="text-center py-8 text-[var(--text-muted)]">
												Belum ada data stok per outlet untuk bahan ini.
											</td>
										</tr>
									{/if}
								</tbody>
							</table>
						</div>
					</div>

				<!-- TAB 3: RIWAYAT HARGA & HPP -->
				{:else if activeTab === 'pricing'}
					<div class="tab-panel-stack">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="pricing-summary-card">
								<span class="card-caption">Harga Acuan Pusat</span>
								<strong class="card-amount">{formatRupiah(item.hq_ref_price || 0)}</strong>
								<span class="card-hint">Murni acuan belanja acuan pengadaan pusat</span>
							</div>
							<div class="pricing-summary-card">
								<span class="card-caption">Harga Pembelian Terakhir</span>
								<strong class="card-amount text-emerald-400">
									{formatRupiah(costHistory?.last_purchased_price || item.hq_ref_price || 0)} / {item.base_unit_symbol}
								</strong>
								<span class="card-hint">Tercatat dari faktur pengadaan supplier terbaru</span>
							</div>
						</div>

						<h4 class="section-subheading">
							Faktur Pengadaan Terakhir
						</h4>
						<div class="data-table-container">
							<table class="data-table">
								<thead>
									<tr>
										<th>Tanggal</th>
										<th>No. Faktur</th>
										<th>Supplier</th>
										<th>Jumlah</th>
										<th>Harga Satuan</th>
									</tr>
								</thead>
								<tbody>
									{#if costHistory && costHistory.history.length > 0}
										{#each costHistory.history as row}
											<tr>
												<td>{row.date}</td>
												<td class="font-mono text-xs">{row.invoice_number}</td>
												<td>{row.supplier_name}</td>
												<td>{parseFloat(row.qty).toLocaleString('id-ID')} {row.unit}</td>
												<td class="font-mono font-semibold text-emerald-400">
													{formatRupiah(row.unit_price)}
												</td>
											</tr>
										{/each}
									{:else}
										<tr>
											<td colspan="5" class="text-center py-8 text-[var(--text-muted)]">
												Belum ada riwayat faktur pembelian tercatat.
											</td>
										</tr>
									{/if}
								</tbody>
							</table>
						</div>
					</div>

				<!-- TAB 4: BATAS MINIMUM GERAI (AC-03.6) -->
				{:else if activeTab === 'min_stock'}
					<div class="tab-panel-stack">
						{#if !canManageCatalog}
							<div class="detail-notice-callout warning">
								<Icon name="lock-closed" size={18} />
								<span>Akun Anda hanya memiliki hak baca (read-only) pada batas stok minimum.</span>
							</div>
						{:else}
							<div class="detail-notice-callout info">
								<Icon name="information-circle" size={18} />
								<span>HQ Admin &amp; Owner dapat menyetel batas minimum stok berbeda per masing-masing gerai.</span>
							</div>
						{/if}

						<div class="data-table-container">
							<table class="data-table">
								<thead>
									<tr>
										<th>Gerai / Outlet</th>
										<th>Batas Minimum Stok</th>
										{#if canManageCatalog}
											<th class="w-32 text-right">Aksi</th>
										{/if}
									</tr>
								</thead>
								<tbody>
									{#if item.stock_by_outlet && Object.keys(item.stock_by_outlet).length > 0}
										{#each Object.entries(item.stock_by_outlet) as [outletId, data]}
											<tr>
												<td>
													<strong class="text-[var(--text-main)] capitalize">
														{outletId === 'out-jkt-01' ? 'Jodi Senopati (Jakarta)' : outletId === 'out-bdg-01' ? 'Jodi Dago (Bandung)' : outletId === 'out-sby-01' ? 'Jodi Gubeng (Surabaya)' : outletId === 'out-ubud-01' ? 'Kaveloka Ubud (Bali)' : outletId === 'out-plaga-01' ? 'Plaga Bistro (Bali)' : outletId}
													</strong>
												</td>
												<td>
													{#if editingMinOutletId === outletId}
														<div class="flex items-center gap-2">
															<input
																type="number"
																class="toolbar-search-input text-xs"
																style="max-width: 140px; min-height: 38px; padding: 6px 12px;"
																bind:value={newMinStockVal}
															/>
															<span class="text-xs text-[var(--text-subtle)] font-medium">{item.base_unit_symbol}</span>
														</div>
													{:else}
														<span class="font-mono font-semibold text-[var(--text-main)]">
															{parseFloat(data.min).toLocaleString('id-ID')} {item.base_unit_symbol}
														</span>
													{/if}
												</td>
												{#if canManageCatalog}
													<td class="text-right">
														{#if editingMinOutletId === outletId}
															<div class="flex items-center justify-end gap-2">
																<button
																	type="button"
																	class="btn btn-primary"
																	style="min-height: 34px; padding: 6px 14px; font-size: 12px;"
																	onclick={() => saveMinStock(outletId)}
																>
																	Simpan
																</button>
																<button
																	type="button"
																	class="btn btn-secondary"
																	style="min-height: 34px; padding: 6px 14px; font-size: 12px;"
																	onclick={cancelEditMinStock}
																>
																	Batal
																</button>
															</div>
														{:else}
															<button
																type="button"
																class="btn btn-secondary"
																style="min-height: 34px; padding: 6px 14px; font-size: 12px;"
																onclick={() => startEditMinStock(outletId, data.min)}
															>
																Ubah
															</button>
														{/if}
													</td>
												{/if}
											</tr>
										{/each}
									{/if}
								</tbody>
							</table>
						</div>
					</div>

				<!-- TAB 5: DIPAKAI DI RESEP (AC-03.5) -->
				{:else if activeTab === 'recipes'}
					<div class="tab-panel-stack">
						{#if (item.recipes_using_count || 0) > 0}
							<div class="detail-notice-callout warning">
								<Icon name="exclamation-triangle" size={18} />
								<span>
									Bahan ini saat ini aktif digunakan dalam <strong>{item.recipes_using_count} resep menu</strong>. Pengarsipan dilarang sebelum resep dialihkan atau dinonaktifkan.
								</span>
							</div>
						{:else}
							<div class="detail-notice-callout info">
								<Icon name="check-circle" size={18} />
								<span>Bahan ini bebas dari resep menu aktif dan aman untuk diarsipkan bila stok fisik telah habis.</span>
							</div>
						{/if}

						<div class="recipes-action-container">
							<a
								href={`/menu?tab=recipes&ingredient_id=${encodeURIComponent(item.id)}&ingredient_name=${encodeURIComponent(item.name)}#recipes`}
								class="btn btn-primary inline-flex items-center gap-2"
								style="min-height: 42px; padding: 10px 20px; font-size: 13.5px;"
								onclick={() => onclose()}
							>
								<Icon name="book-open" size={16} />
								<span>Lihat dan Kelola Resep</span>
								<Icon name="arrow-top-right-on-square" size={14} />
							</a>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

		{#snippet footer()}
			<div class="detail-modal-footer">
				<div>
					{#if canManageCatalog}
						{#if item.status === 'active'}
							<button
								type="button"
								class="btn btn-danger-outline"
								onclick={() => onarchive(item)}
							>
								<Icon name="archive-box" size={16} />
								<span>Arsipkan Bahan</span>
							</button>
						{:else}
							<button
								type="button"
								class="btn btn-secondary"
								onclick={() => onrestore(item)}
							>
								<Icon name="arrow-path" size={16} />
								<span>Aktifkan Kembali</span>
							</button>
						{/if}
					{/if}
				</div>

				<div class="footer-actions-right">
					<button type="button" class="btn btn-secondary" onclick={onclose}>
						Tutup
					</button>
					{#if canManageCatalog}
						<button
							type="button"
							class="btn btn-primary"
							onclick={() => {
								onclose();
								onedit(item);
							}}
						>
							<Icon name="pencil-square" size={16} />
							<span>Ubah Data Bahan</span>
						</button>
					{/if}
				</div>
			</div>
		{/snippet}
	</Modal>
{/if}

<style>
	.detail-container {
		display: flex;
		flex-direction: column;
	}

	/* Top Merged Header in Modal */
	.drawer-merged-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		width: 100%;
		padding-right: 8px;
	}

	@media (max-width: 768px) {
		.drawer-merged-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 14px;
		}
	}

	.header-main-info {
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
	}

	.header-title-and-badges {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.drawer-merged-header .modal-title {
		font-size: 17px;
		font-weight: 700;
		color: var(--text-main, #f8fafc);
		margin: 0;
	}

	.header-sourcing-pill {
		display: inline-flex;
		align-items: center;
		padding: 4px 12px;
		border-radius: 9999px;
		font-size: 11px;
		font-weight: 600;
		white-space: nowrap;
	}

	.header-sourcing-pill.pill-info {
		background: rgba(56, 189, 248, 0.12);
		color: #38bdf8;
		border: 1px solid rgba(56, 189, 248, 0.25);
	}

	.header-sourcing-pill.pill-warning {
		background: rgba(245, 158, 11, 0.12);
		color: #fbbf24;
		border: 1px solid rgba(245, 158, 11, 0.25);
	}

	.header-sourcing-pill.pill-success {
		background: rgba(16, 185, 129, 0.12);
		color: #34d399;
		border: 1px solid rgba(16, 185, 129, 0.25);
	}

	.header-metadata-row {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 12.5px;
		color: var(--text-muted, #94a3b8);
	}

	.meta-tag {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	.meta-separator {
		color: var(--text-subtle, #64748b);
		opacity: 0.6;
	}

	.meta-unit strong {
		color: var(--text-main, #f8fafc);
	}

	.header-price-card {
		padding: 8px 16px;
		border-radius: var(--radius-lg, 10px);
		background: var(--bg-panel, #1e293b);
		border: 1px solid var(--border-panel, rgba(255, 255, 255, 0.08));
		text-align: right;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		flex-shrink: 0;
	}

	.price-label {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-subtle, #64748b);
		font-weight: 600;
	}

	.price-value {
		font-size: 16.5px;
		font-weight: 700;
		color: var(--brand-primary, #10b981);
		line-height: 1.25;
		margin-top: 1px;
	}

	.price-sub {
		font-size: 10.5px;
		color: var(--text-muted, #94a3b8);
	}

	/* Unified Tabbed Panel (Merged Card: Tabs Bar + Content Body) */
	.detail-tabbed-container {
		background: var(--bg-panel-sub, #0f172a);
		border: 1px solid var(--border-panel, rgba(255, 255, 255, 0.08));
		border-radius: var(--radius-xl, 16px);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
	}

	.detail-tabs-header {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		background: rgba(0, 0, 0, 0.25);
		border-bottom: 1px solid var(--border-panel, rgba(255, 255, 255, 0.08));
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.detail-tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 18px;
		min-height: 42px;
		border-radius: var(--radius-lg, 10px);
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-muted, #94a3b8);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.18s ease;
		user-select: none;
	}

	.detail-tab-btn:hover {
		color: var(--text-main, #f8fafc);
		background: rgba(255, 255, 255, 0.04);
	}

	.detail-tab-btn.active {
		background: var(--bg-panel, #1e293b);
		color: var(--brand-primary, #10b981);
		border-color: rgba(16, 185, 129, 0.35);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
		font-weight: 700;
	}

	.tab-count-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 22px;
		height: 22px;
		padding: 0 7px;
		border-radius: 9999px;
		font-size: 11px;
		font-weight: 700;
		background: rgba(16, 185, 129, 0.15);
		color: var(--brand-primary, #10b981);
	}

	.detail-tab-btn.active .tab-count-badge {
		background: var(--brand-primary, #10b981);
		color: #ffffff;
	}

	/* Content Body inside the Tabbed Container */
	.detail-tab-body {
		padding: 24px;
		min-height: 280px;
	}

	/* SPECIFICATION DATA SHEET (Tab 1: Ringkasan Info) */
	.spec-sheet-container {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.spec-section {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 18px 20px;
		background: var(--bg-panel, #1e293b);
		border: 1px solid var(--border-panel, rgba(255, 255, 255, 0.08));
		border-radius: var(--radius-lg, 12px);
	}

	.spec-section-header {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12.5px;
		font-weight: 700;
		color: var(--text-main, #f8fafc);
		padding-bottom: 10px;
		border-bottom: 1px solid var(--border-panel, rgba(255, 255, 255, 0.08));
	}

	.spec-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16px 24px;
	}

	@media (min-width: 900px) {
		.spec-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (max-width: 640px) {
		.spec-grid {
			grid-template-columns: 1fr;
		}
	}

	.spec-item {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.spec-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-subtle, #64748b);
	}

	.spec-value {
		font-size: 13.5px;
		font-weight: 500;
		color: var(--text-main, #f8fafc);
		line-height: 1.45;
	}

	.spec-desc-box {
		padding: 14px 18px;
		background: var(--bg-panel-sub, #0f172a);
		border: 1px solid var(--border-panel, rgba(255, 255, 255, 0.06));
		border-radius: 8px;
	}

	.spec-desc-text {
		font-size: 13px;
		color: var(--text-main, #f8fafc);
		line-height: 1.6;
		margin: 0;
	}

	.spec-audit-strip {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px;
		padding: 14px 18px;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid var(--border-panel, rgba(255, 255, 255, 0.06));
		border-radius: var(--radius-lg, 10px);
		font-size: 11.5px;
		color: var(--text-subtle, #64748b);
	}

	.audit-item {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.audit-label {
		color: var(--text-subtle, #64748b);
	}

	.audit-value {
		color: var(--text-muted, #cbd5e1);
	}

	.audit-dot {
		color: var(--border-panel, rgba(255, 255, 255, 0.15));
	}

	/* Tab Panel Stack */
	.tab-panel-stack {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	/* Pricing Tab */
	.pricing-summary-card {
		padding: 18px 20px;
		border-radius: var(--radius-lg);
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-panel);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.card-caption {
		font-size: 11.5px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-subtle);
	}

	.card-amount {
		font-size: 19px;
		font-weight: 700;
		color: var(--text-main);
		margin-top: 2px;
	}

	.card-hint {
		font-size: 12px;
		color: var(--text-subtle);
		margin-top: 2px;
	}

	.section-subheading {
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		margin: 6px 0 0;
	}

	/* Recipes Tab Action */
	.recipes-action-container {
		padding-top: 8px;
		display: flex;
		align-items: center;
		justify-content: flex-start;
	}

	/* Modal Footer Layout */
	.detail-modal-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}

	.footer-actions-right {
		display: flex;
		align-items: center;
		gap: 12px;
	}
</style>
