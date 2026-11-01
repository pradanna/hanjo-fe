<script lang="ts">
	import Icon from '#lib/components/data/Icon.svelte';
	import {
		MOCK_INGREDIENTS,
		MOCK_STOCK,
		MOCK_OUTLET,
		formatRupiah,
		type StockLevel
	} from '#lib/api/client';

	let stockList = $state<StockLevel[]>(MOCK_STOCK);
	let showAddStockModal = $state(false);
	let selectedIngredientId = $state(MOCK_INGREDIENTS[0].id);
	let addQuantity = $state(10);
	let addNote = $state('Penerimaan Supplier');

	// Computed statistics
	let totalValue = $derived(
		stockList.reduce((sum, item) => {
			const ing = MOCK_INGREDIENTS.find((i) => i.id === item.ingredient_id);
			return sum + item.current_qty * (ing?.cost_per_unit || 0);
		}, 0)
	);

	let lowStockCount = $derived(
		stockList.filter((item) => {
			const ing = MOCK_INGREDIENTS.find((i) => i.id === item.ingredient_id);
			return ing && item.current_qty <= ing.reorder_point;
		}).length
	);

	function handleAddStock() {
		const target = stockList.find((s) => s.ingredient_id === selectedIngredientId);
		if (target) {
			target.current_qty += addQuantity;
			target.last_updated = new Date().toISOString();
		}
		showAddStockModal = false;
	}

	const recentMovements = [
		{ time: '14:28', type: 'OUT (POS Sale)', ref: 'TRX-JKT-01-20261012-0042', desc: 'Konsumsi Resep: 0.036kg Biji Kopi, 0.24L Susu, 0.05L Aren, 2 Cup', user: 'POS Kasir #1' },
		{ time: '14:15', type: 'OUT (POS Sale)', ref: 'TRX-JKT-01-20261012-0041', desc: 'Konsumsi Resep: 0.036kg Biji Kopi, 0.12L Susu, 2 Cup', user: 'POS Kasir #1' },
		{ time: '11:00', type: 'IN (Purchase)', ref: 'PO-202610-001', desc: 'Penerimaan Fresh Milk Greenfield +50 Liter', user: 'Admin Purchasing' },
		{ time: '08:00', type: 'ADJUSTMENT', ref: 'OPNAME-001', desc: 'Stok Opname Pagi Biji Kopi Arabica Gayo', user: 'Supervisor Cabang' },
	];
</script>

<div class="inventory-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Inventaris & Bahan Baku (Raw Materials)</h1>
			<p class="page-subtitle">Monitoring stok per outlet, peringatan reorder point, dan riwayat mutasi real-time.</p>
		</div>
		<div class="header-actions">
			<button class="btn btn-primary" onclick={() => (showAddStockModal = true)}>
				<Icon name="arrow-down-tray" size={16} />
				<span>Penerimaan Barang Masuk</span>
			</button>
		</div>
	</header>

	<!-- KPI Summary Row -->
	<div class="summary-grid">
		<div class="summary-card glass-card">
			<span class="sum-label">Total Nilai Persediaan</span>
			<div class="sum-val">{formatRupiah(totalValue)}</div>
			<span class="sum-sub">Gerai: {MOCK_OUTLET.name}</span>
		</div>
		<div class="summary-card glass-card">
			<span class="sum-label">Bahan Baku Terdaftar</span>
			<div class="sum-val">{MOCK_INGREDIENTS.length} Komponen</div>
			<span class="sum-sub">Biji kopi, dairy, syrup, packaging</span>
		</div>
		<div class="summary-card glass-card alert-summary">
			<span class="sum-label">Peringatan Reorder</span>
			<div class="sum-val text-rose">{lowStockCount} Bahan Kritis</div>
			<span class="sum-sub">Perlu segera dipesan ke supplier</span>
		</div>
	</div>

	<!-- Main Stock Table -->
	<div class="glass-card table-section">
		<div class="section-top">
			<h2 class="table-title">Stok Bahan Baku Aktif ({MOCK_OUTLET.name})</h2>
			<span class="badge badge-success">Live Sinkronisasi POS</span>
		</div>

		<div class="table-wrap">
			<table class="stock-table">
				<thead>
					<tr>
						<th>SKU</th>
						<th>Nama Bahan Baku</th>
						<th>Sisa Stok Saat Ini</th>
						<th>Batas Minimum</th>
						<th>Titik Reorder</th>
						<th>Biaya / Unit</th>
						<th>Status</th>
						<th>Aksi</th>
					</tr>
				</thead>
				<tbody>
					{#each stockList as item}
						{@const ing = MOCK_INGREDIENTS.find((i) => i.id === item.ingredient_id)}
						{@const isCritical = ing && item.current_qty <= ing.reorder_point}
						<tr>
							<td class="font-mono text-dim">{ing?.sku}</td>
							<td>
								<strong>{ing?.name}</strong>
							</td>
							<td>
								<span class="current-stock" class:text-rose={isCritical}>
									{item.current_qty.toFixed(2)} {item.unit}
								</span>
							</td>
							<td>{ing?.minimum_stock} {item.unit}</td>
							<td>{ing?.reorder_point} {item.unit}</td>
							<td>{formatRupiah(ing?.cost_per_unit || 0)}</td>
							<td>
								{#if isCritical}
									<span class="badge badge-danger">PERLU REORDER</span>
								{:else}
									<span class="badge badge-success">AMAN</span>
								{/if}
							</td>
							<td>
								<button
									class="action-btn"
									onclick={() => {
										selectedIngredientId = item.ingredient_id;
										showAddStockModal = true;
									}}
								>
									+ Tambah
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Audit Trail: Recent Stock Movements from POS -->
	<div class="glass-card table-section" style="margin-top: 32px;">
		<div class="section-top">
			<div>
				<h2 class="table-title">Riwayat Mutasi Stok Otomatis (Audit Trail)</h2>
				<p class="section-sub">Setiap transaksi penjualan POS otomatis mengurangi stok bahan baku berdasarkan takaran resep secara real-time.</p>
			</div>
		</div>

		<div class="movements-list">
			{#each recentMovements as m}
				<div class="movement-row">
					<div class="m-time">{m.time}</div>
					<div class="m-badge">
						{#if m.type.startsWith('OUT')}
							<span class="badge badge-warning">{m.type}</span>
						{:else}
							<span class="badge badge-success">{m.type}</span>
						{/if}
					</div>
					<div class="m-ref">{m.ref}</div>
					<div class="m-desc">{m.desc}</div>
					<div class="m-user">{m.user}</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Modal: Add Stock / Receiving -->
{#if showAddStockModal}
	<div
		class="modal-backdrop"
		role="button"
		tabindex="0"
		aria-label="Tutup Modal Penerimaan Barang"
		onclick={(e) => {
			if (e.target === e.currentTarget) showAddStockModal = false;
		}}
		onkeydown={(e) => e.key === 'Escape' && (showAddStockModal = false)}
	>
		<div class="glass-card modal-box" role="region" aria-label="Form Penerimaan Barang">
			<div class="modal-head">
				<h3 class="modal-title">Penerimaan Barang / Tambah Stok</h3>
				<button class="close-x" onclick={() => (showAddStockModal = false)} aria-label="Tutup dialog">
					<Icon name="x-mark" size={16} />
				</button>
			</div>

			<div class="form-body">
				<div class="form-group">
					<label for="ing-select" class="group-label">Pilih Bahan Baku</label>
					<select id="ing-select" class="select-input" bind:value={selectedIngredientId}>
						{#each MOCK_INGREDIENTS as ing}
							<option value={ing.id}>{ing.name} ({ing.unit})</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="ing-qty" class="group-label">Jumlah Masuk</label>
					<input id="ing-qty" type="number" class="text-input" bind:value={addQuantity} min="1" step="0.5" />
				</div>

				<div class="form-group">
					<label for="ing-note" class="group-label">Catatan / No. PO Supplier</label>
					<input id="ing-note" type="text" class="text-input" bind:value={addNote} placeholder="Contoh: PO-202610-002 dari Supplier Kopi Gayo" />
				</div>
			</div>

			<div class="modal-foot">
				<button class="btn btn-secondary" onclick={() => (showAddStockModal = false)}>Batal</button>
				<button class="btn btn-primary" onclick={handleAddStock}>Simpan Penerimaan</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.inventory-page {
		padding: 8px 0 32px 0;
		width: 100%;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 28px;
		flex-wrap: wrap;
		gap: 16px;
	}

	.page-title {
		font-size: 2rem;
		font-weight: 800;
	}

	.page-subtitle {
		color: var(--text-muted);
		font-size: 0.95rem;
		margin-top: 4px;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 20px;
		margin-bottom: 32px;
	}

	.summary-card {
		padding: 24px;
	}

	.sum-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.sum-val {
		font-size: 1.85rem;
		font-weight: 800;
		font-family: var(--font-heading);
		color: #fff;
		margin: 6px 0 4px 0;
	}

	.sum-sub {
		font-size: 0.78rem;
		color: var(--text-dim);
	}

	.text-rose {
		color: var(--accent-rose);
	}

	.table-section {
		padding: 28px;
	}

	.section-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 20px;
	}

	.table-title {
		font-size: 1.2rem;
		font-weight: 700;
	}

	.section-sub {
		font-size: 0.82rem;
		color: var(--text-dim);
		margin-top: 2px;
	}

	.table-wrap {
		overflow-x: auto;
	}

	.stock-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.88rem;
	}

	.stock-table th {
		text-align: left;
		padding: 12px 14px;
		border-bottom: 1px solid var(--border-medium);
		color: var(--text-dim);
		font-weight: 700;
		text-transform: uppercase;
		font-size: 0.75rem;
		letter-spacing: 0.05em;
	}

	.stock-table td {
		padding: 14px;
		border-bottom: 1px solid var(--border-subtle);
	}

	.current-stock {
		font-weight: 800;
		font-size: 1.05rem;
		font-family: var(--font-heading);
	}

	.action-btn {
		background: var(--bg-surface);
		border: 1px solid var(--border-medium);
		color: var(--text-main);
		padding: 6px 12px;
		border-radius: var(--radius-sm);
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
	}
	.action-btn:hover {
		border-color: var(--primary);
		color: var(--primary);
	}

	.movements-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.movement-row {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 12px 16px;
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
	}

	.m-time {
		font-weight: 700;
		color: var(--text-dim);
		min-width: 50px;
	}

	.m-ref {
		font-family: 'Courier New', monospace;
		font-weight: 600;
		color: var(--text-muted);
		min-width: 180px;
	}

	.m-desc {
		flex: 1;
		color: var(--text-main);
	}

	.m-user {
		color: var(--text-dim);
		font-size: 0.78rem;
	}

	/* Modal */
	.modal-box {
		width: 100%;
		max-width: 480px;
		padding: 28px;
		background: var(--bg-surface);
	}

	.modal-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}

	.modal-title {
		font-size: 1.2rem;
		font-weight: 700;
	}

	.close-x {
		background: transparent;
		border: none;
		font-size: 1.6rem;
		color: var(--text-dim);
		cursor: pointer;
	}

	.form-body {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.group-label {
		display: block;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text-muted);
		margin-bottom: 6px;
	}

	.select-input, .text-input {
		width: 100%;
		padding: 10px 14px;
		background: var(--bg-input);
		border: 1px solid var(--border-medium);
		border-radius: var(--radius-md);
		color: var(--text-main);
		font-size: 0.9rem;
	}

	.modal-foot {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 24px;
	}
</style>
