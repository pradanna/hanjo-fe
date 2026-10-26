<script lang="ts">
	import { themeStore } from '../../lib/theme.svelte';

	let activeSettingsTab = $state<'FLAGS' | 'THEME' | 'CHANNELS' | 'APPROVAL_RULES' | 'AUDIT_LOG'>('FLAGS');

	// Feature Flags with Dependency Rules (PRD 6.2)
	let featureFlags = $state([
		{ key: 'inventory', name: 'Manajemen Inventaris & Ledger Stok', enabled: true, requiredBy: ['recipes', 'production'], desc: 'Pencatatan saldo stok append-only dan moving average cost.' },
		{ key: 'recipes', name: 'Resep BOM & Pengurangan Bahan Otomatis', enabled: true, dependsOn: 'inventory', desc: 'Resep varian berversi dan efek modifier pada stok.' },
		{ key: 'production', name: 'Produksi Bahan Olahan Outlet', enabled: true, dependsOn: 'inventory', desc: 'Batch produksi sirup racikan dan cold brew di outlet.' },
		{ key: 'procurement', name: 'Pengadaan & PO Tanpa Harga', enabled: true, requiredBy: ['payables'], desc: 'Alur PO blind request, penerimaan barang, dan input nota.' },
		{ key: 'payables', name: 'Hutang Supplier & Verifikasi Tagihan', enabled: true, dependsOn: 'procurement', desc: 'Tagihan resmi (bill), syarat bayar, dan umur hutang.' },
		{ key: 'petty_cash', name: 'Kas Kecil Bertingkat', enabled: true, desc: 'Dana kas kecil operasional outlet non-stok dengan batas limit.' },
		{ key: 'tax', name: 'Pencatatan Pajak (PPN & PPh / PBJT)', enabled: true, desc: 'Pencatatan dasar pengenaan pajak pada nota dan biaya.' },
		{ key: 'partner_ownership', name: 'Manajemen Outlet Kemitraan (Mitra)', enabled: true, desc: 'Pencatatan kepemilikan investor/mitra dengan persentase bagi hasil.' },
		{ key: 'menu_proposals', name: 'Usulan Menu Lokal dari Store Manager', enabled: true, desc: 'Alur pengajuan resep dan menu khusus outlet ke pusat.' },
		{ key: 'sales_ingest', name: 'Integrasi Penjualan POS (Sales Ingest)', enabled: true, desc: 'Penerimaan data transaksi real-time dari aplikasi POS kasir.' },
		{ key: 'midtrans_reconciliation', name: 'Rekonsiliasi Pembayaran Midtrans', enabled: true, desc: 'Pencocokan settlement QRIS/GoPay terhadap penjualan POS.' }
	]);

	// Sales Channels & Markup (PRD 6.4)
	let salesChannels = $state([
		{ code: 'pos', name: 'Kasir POS (Dine-In & Takeaway)', markupPct: 0, rounding: 'Rp 500', active: true },
		{ code: 'app_order', name: 'Aplikasi Pelanggan (App Order)', markupPct: 5, rounding: 'Rp 500', active: true },
		{ code: 'delivery_gofood', name: 'GoFood Marketplace', markupPct: 20, rounding: 'Rp 1.000', active: true },
		{ code: 'delivery_grabfood', name: 'GrabFood Marketplace', markupPct: 20, rounding: 'Rp 1.000', active: true }
	]);

	// Audit Logs (PRD 6.14)
	const auditLogs = [
		{
			id: 'aud-01',
			timestamp: '13 Okt 2026 14:02 WIB',
			actor: 'Budi Pratama (Owner)',
			action: 'APPROVAL_DECIDED',
			entity: 'petty_cash_expense #PC-SEN-202610-012',
			details: 'Menyetujui pengeluaran kas kecil penggantian Seal Karet (Rp 350.000)',
			ipAddress: '182.253.11.42'
		},
		{
			id: 'aud-02',
			timestamp: '13 Okt 2026 11:35 WIB',
			actor: 'Sari Handayani (Finance)',
			action: 'INVOICE_VERIFIED',
			entity: 'supplier_invoice #INV-GYO-202610-088',
			details: 'Verifikasi nota supplier Gayo. Selisih HPP True-Up: -Rp 150.000',
			ipAddress: '182.253.11.19'
		},
		{
			id: 'aud-03',
			timestamp: '12 Okt 2026 16:40 WIB',
			actor: 'Hendro (Admin Pusat)',
			action: 'RECIPE_VERSION_CREATED',
			entity: 'recipe #REC-AREN-LATTE-V2',
			details: 'Membuat versi baru resep Aren Latte V2 (Gula aren 25ml -> 22ml)',
			ipAddress: '182.253.11.08'
		}
	];

	function toggleFlag(flag: any) {
		// Validasi dependensi (PRD 6.2)
		if (flag.enabled && flag.requiredBy) {
			const activeDependents = featureFlags.filter((f) => flag.requiredBy.includes(f.key) && f.enabled);
			if (activeDependents.length > 0) {
				alert(`Tidak dapat mematikan ${flag.name} karena dibutuhkan oleh fitur: ${activeDependents.map((d) => d.name).join(', ')}`);
				return;
			}
		}
		flag.enabled = !flag.enabled;
	}
</script>

<svelte:head>
	<title>Pengaturan & Konfigurasi Sistem | HANJO ERP</title>
</svelte:head>

<div class="settings-page">
	<!-- Page Header -->
	<div class="page-head-row">
		<div>
			<h1 class="page-title">Pengaturan & Konfigurasi Sistem</h1>
			<p class="page-subtitle">
				Kontrol preferensi tema, feature flags, markup harga sales channel, dan jejak audit log (PRD 6.2, 6.14, 13.1).
			</p>
		</div>
	</div>

	<!-- Settings Subnav -->
	<div class="panel-card subnav-card">
		<div class="subnav-pills">
			<button class="subnav-pill" class:active={activeSettingsTab === 'FLAGS'} onclick={() => (activeSettingsTab = 'FLAGS')}>
				Feature Flags & Lisensi
			</button>
			<button class="subnav-pill" class:active={activeSettingsTab === 'THEME'} onclick={() => (activeSettingsTab = 'THEME')}>
				Tema Tampilan (Light / Dark)
			</button>
			<button class="subnav-pill" class:active={activeSettingsTab === 'CHANNELS'} onclick={() => (activeSettingsTab = 'CHANNELS')}>
				Sales Channel & Markup %
			</button>
			<button class="subnav-pill" class:active={activeSettingsTab === 'AUDIT_LOG'} onclick={() => (activeSettingsTab = 'AUDIT_LOG')}>
				Audit Log & Jejak Perubahan
			</button>
		</div>
	</div>

	<!-- Tab 1: Feature Flags -->
	{#if activeSettingsTab === 'FLAGS'}
		<div class="panel-card tab-pane">
			<div class="pane-head">
				<div>
					<h3 class="pane-title">Feature Flags per Instalasi (Single-Tenant)</h3>
					<span class="pane-sub">Fitur dapat dihidupkan atau dimatikan tanpa mengubah inti kode (PRD 2 & 6.2).</span>
				</div>
				<span class="pill-badge pill-info">Kombinasi Dependensi Tervalidasi</span>
			</div>

			<div class="flags-grid">
				{#each featureFlags as flag}
					<div class="flag-item-card" class:disabled={!flag.enabled}>
						<div class="flag-info">
							<div class="flag-header">
								<strong>{flag.name}</strong>
								<span class="font-mono text-xs text-subtle">[{flag.key}]</span>
							</div>
							<p class="flag-desc">{flag.desc}</p>
							{#if flag.dependsOn}
								<span class="dep-badge">Membutuhkan: {flag.dependsOn}</span>
							{/if}
						</div>

						<div class="flag-toggle-col">
							<button class="toggle-btn" class:active={flag.enabled} onclick={() => toggleFlag(flag)}>
								<span class="toggle-switch"></span>
								<span class="toggle-text">{flag.enabled ? 'Aktif' : 'Mati'}</span>
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Tab: Theme Settings (PRD 13.1 Light/Dark Mode) -->
	{#if activeSettingsTab === 'THEME'}
		<div class="panel-card tab-pane">
			<div class="pane-head">
				<div>
					<h3 class="pane-title">Preferensi Tema Tampilan (PRD 13.1)</h3>
					<span class="pane-sub">Pilih mode tampilan antarmuka sesuai preferensi Anda. Mode terpilih akan tersimpan otomatis.</span>
				</div>
				<span class="pill-badge pill-info">Mode Switchable Aktif</span>
			</div>

			<div class="theme-selection-grid">
				<div
					class="theme-card panel-subcard"
					class:selected={themeStore.current === 'dark'}
					onclick={() => themeStore.set('dark')}
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && themeStore.set('dark')}
				>
					<div class="theme-preview dark-preview">
						<div class="preview-sidebar"></div>
						<div class="preview-content">
							<div class="preview-header"></div>
							<div class="preview-cards">
								<div class="preview-kpi"></div>
								<div class="preview-kpi"></div>
							</div>
						</div>
					</div>
					<div class="theme-meta">
						<div class="theme-title-row">
							<strong>Mode Gelap (Obsidian Charcoal)</strong>
							{#if themeStore.current === 'dark'}<span class="pill-badge pill-success">Sedang Aktif</span>{/if}
						</div>
						<p class="theme-desc">Palet Obsidian Dark Charcoal (#0b0e14, #111620) dengan aksen Emerald Matcha (#10b981). Desain premium yang nyaman untuk mata dan minim kelelahan visual.</p>
					</div>
				</div>

				<div
					class="theme-card panel-subcard"
					class:selected={themeStore.current === 'light'}
					onclick={() => themeStore.set('light')}
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && themeStore.set('light')}
				>
					<div class="theme-preview light-preview">
						<div class="preview-sidebar"></div>
						<div class="preview-content">
							<div class="preview-header"></div>
							<div class="preview-cards">
								<div class="preview-kpi"></div>
								<div class="preview-kpi"></div>
							</div>
						</div>
					</div>
					<div class="theme-meta">
						<div class="theme-title-row">
							<strong>Mode Terang (Professional Slate)</strong>
							{#if themeStore.current === 'light'}<span class="pill-badge pill-success">Sedang Aktif</span>{/if}
						</div>
						<p class="theme-desc">Palet Clean Professional Slate (#f8fafc, #ffffff) dengan aksen Deep Emerald (#059669). Kontras teks tinggi, ideal untuk pencetakan dokumen dan audit laporan siang hari.</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Tab 3: Sales Channels & Markup -->
	{#if activeSettingsTab === 'CHANNELS'}
		<div class="panel-card tab-pane">
			<div class="pane-head">
				<div>
					<h3 class="pane-title">Sales Channel & Aturan Markup Harga (PRD 6.4)</h3>
					<span class="pane-sub">
						Rumus: harga_akhir = pembulatan((harga_dasar + Σ price_delta modifier) × (1 + markup_pct)).
					</span>
				</div>
			</div>

			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>Kode Channel</th>
							<th>Nama Saluran Penjualan</th>
							<th class="text-right">Markup %</th>
							<th>Aturan Pembulatan</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{#each salesChannels as ch}
							<tr>
								<td class="font-mono font-bold">{ch.code}</td>
								<td>{ch.name}</td>
								<td class="text-right font-mono font-bold text-primary">+{ch.markupPct}%</td>
								<td>
									<span class="rounding-pill">{ch.rounding}</span>
								</td>
								<td>
									{#if ch.active}
										<span class="pill-badge pill-success">Aktif</span>
									{:else}
										<span class="pill-badge pill-danger">Nonaktif</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- Tab 3: Audit Log -->
	{#if activeSettingsTab === 'AUDIT_LOG'}
		<div class="panel-card tab-pane">
			<div class="pane-head">
				<div>
					<h3 class="pane-title">Audit Log Append-Only (PRD 6.14)</h3>
					<span class="pane-sub">Mencatat seluruh aksi penting: persetujuan, true-up, perubahan harga, dan penerimaan barang.</span>
				</div>
			</div>

			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>Waktu Kejadian</th>
							<th>Aktor (Pengguna)</th>
							<th>Jenis Aksi</th>
							<th>Entitas Terkait</th>
							<th>Rincian Perubahan</th>
							<th>Alamat IP</th>
						</tr>
					</thead>
					<tbody>
						{#each auditLogs as log}
							<tr>
								<td class="text-muted text-xs font-mono">{log.timestamp}</td>
								<td class="font-bold">{log.actor}</td>
								<td>
									<span class="action-tag">{log.action}</span>
								</td>
								<td class="font-mono text-xs">{log.entity}</td>
								<td class="details-cell">{log.details}</td>
								<td class="font-mono text-subtle text-xs">{log.ipAddress}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<style>
	.settings-page {
		display: flex;
		flex-direction: column;
		gap: 20px;
		width: 100%;
	}

	.page-head-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.page-title {
		font-size: 22px;
		font-weight: 800;
		color: var(--text-main);
	}

	.page-subtitle {
		font-size: 13px;
		color: var(--text-muted);
		margin-top: 4px;
	}

	/* Subnav */
	.subnav-card {
		padding: 6px;
	}

	.subnav-pills {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.subnav-pill {
		padding: 8px 16px;
		border-radius: var(--radius-sm);
		font-size: 12.5px;
		font-weight: 600;
		color: var(--text-muted);
		border: 1px solid transparent;
		transition: all 0.15s;
	}

	.subnav-pill.active {
		background: var(--pill-success-bg, rgba(16, 185, 129, 0.14));
		color: var(--pill-success-text, #34d399);
		border: 1px solid var(--pill-success-border, rgba(16, 185, 129, 0.35));
		box-shadow: 0 2px 10px rgba(16, 185, 129, 0.15);
	}

	/* Pane */
	.tab-pane {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.pane-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px;
		border-bottom: 1px solid var(--border-panel);
		padding-bottom: 14px;
	}

	.pane-title {
		font-size: 16px;
		font-weight: 700;
	}

	.pane-sub {
		font-size: 12.5px;
		color: var(--text-muted);
	}

	/* Flags Grid */
	.flags-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
		gap: 14px;
	}

	.flag-item-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14px;
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-panel);
		border-radius: var(--radius-md);
		gap: 14px;
	}

	.flag-item-card.disabled {
		opacity: 0.6;
	}

	.flag-header {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
	}

	.flag-desc {
		font-size: 11.5px;
		color: var(--text-muted);
		margin-top: 4px;
		line-height: 1.4;
	}

	.dep-badge {
		display: inline-block;
		font-size: 10px;
		color: var(--brand-primary);
		background: var(--brand-primary-dim);
		padding: 2px 6px;
		border-radius: 4px;
		margin-top: 6px;
	}

	.toggle-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		border-radius: var(--radius-full);
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-panel);
		font-size: 12px;
		font-weight: 600;
		color: var(--text-muted);
		transition: all 0.2s;
	}

	.toggle-btn.active {
		background: var(--brand-primary);
		color: #ffffff;
		border-color: var(--brand-primary);
	}

	.toggle-switch {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #cbd5e1;
	}

	.toggle-btn.active .toggle-switch {
		background: #ffffff;
	}

	/* Table */
	.table-wrap {
		overflow-x: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12.5px;
	}

	.data-table th {
		text-align: left;
		padding: 11px 14px;
		font-weight: 600;
		color: var(--text-subtle);
		background: var(--bg-panel-sub);
		border-bottom: 1px solid var(--border-panel);
		font-size: 11.5px;
	}

	.data-table td {
		padding: 12px 14px;
		border-bottom: 1px solid var(--border-panel);
		color: var(--text-main);
	}

	.rounding-pill,
	.action-tag {
		font-size: 11px;
		background: var(--bg-panel-sub);
		padding: 3px 8px;
		border-radius: 4px;
		font-family: monospace;
	}

	.details-cell {
		max-width: 320px;
		font-size: 12px;
	}

	.text-right {
		text-align: right;
	}

	.text-primary {
		color: var(--brand-primary);
	}

	.font-mono {
		font-family: monospace;
	}

	.font-bold {
		font-weight: 700;
	}

	.text-muted {
		color: var(--text-muted);
	}

	.text-subtle {
		color: var(--text-subtle);
	}

	.text-xs {
		font-size: 11px;
	}

	/* Theme Selection Card Grid (PRD 13.1) */
	.theme-selection-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 20px;
	}

	.theme-card {
		padding: 16px;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 14px;
		transition: all 0.2s;
		border: 2px solid transparent;
	}

	.theme-card:hover {
		border-color: var(--border-panel);
		transform: translateY(-2px);
	}

	.theme-card.selected {
		border-color: var(--brand-primary);
		box-shadow: 0 0 0 1px var(--brand-primary);
	}

	.theme-preview {
		height: 140px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-panel);
		display: flex;
		overflow: hidden;
	}

	.dark-preview {
		background: #0b0e14;
	}

	.dark-preview .preview-sidebar {
		width: 44px;
		background: #0d1118;
		border-right: 1px solid #1d2535;
	}

	.dark-preview .preview-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 10px;
		gap: 8px;
		background: #0b0e14;
	}

	.dark-preview .preview-header {
		height: 16px;
		background: #111620;
		border-radius: 4px;
		border: 1px solid #1d2535;
	}

	.dark-preview .preview-cards {
		display: flex;
		gap: 8px;
		flex: 1;
	}

	.dark-preview .preview-kpi {
		flex: 1;
		background: #111620;
		border-radius: 6px;
		border: 1px solid #1d2535;
		position: relative;
	}

	.dark-preview .preview-kpi:first-child::after {
		content: '';
		position: absolute;
		left: 8px;
		top: 8px;
		right: 8px;
		height: 6px;
		background: #10b981;
		border-radius: 2px;
	}

	.light-preview {
		background: #f8fafc;
	}

	.light-preview .preview-sidebar {
		width: 44px;
		background: #ffffff;
		border-right: 1px solid #e2e8f0;
	}

	.light-preview .preview-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 10px;
		gap: 8px;
		background: #f8fafc;
	}

	.light-preview .preview-header {
		height: 16px;
		background: #ffffff;
		border-radius: 4px;
		border: 1px solid #e2e8f0;
	}

	.light-preview .preview-cards {
		display: flex;
		gap: 8px;
		flex: 1;
	}

	.light-preview .preview-kpi {
		flex: 1;
		background: #ffffff;
		border-radius: 6px;
		border: 1px solid #e2e8f0;
		position: relative;
	}

	.light-preview .preview-kpi:first-child::after {
		content: '';
		position: absolute;
		left: 8px;
		top: 8px;
		right: 8px;
		height: 6px;
		background: #059669;
		border-radius: 2px;
	}

	.theme-meta {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.theme-title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.theme-desc {
		font-size: 11.5px;
		color: var(--text-muted);
		line-height: 1.4;
	}
</style>
