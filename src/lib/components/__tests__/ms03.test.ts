/**
 * Suite Pengujian Otomatis Milestone MS-03: Katalog Bahan, Satuan, Konversi & Pemasok
 * Referensi: MILESTONE.md §MS-03, MS-03.md
 * Kriteria Penerimaan: AC-03.1 s/d AC-03.7
 */

import {
	validateItemCode,
	validateConversionFactor,
	detectConversionCycle,
	convertQuantity,
	evaluateBaseUnitChange,
	evaluateStockItemArchiving,
	evaluateHqRefPriceImpact,
	validateCsvRow
} from '../../domain/catalog.js';
import { catalogService } from '../../services/catalog.service.js';
import { supplierService } from '../../services/supplier.service.js';
import {
	setCurrentMockUser,
	DEMO_USERS
} from '../../api/drivers/mock/handlers/auth.js';
import { AppError } from '../../api/contract/errors.js';

async function runTests() {
	console.log('🧪 Memulai pengujian MS-03: Katalog Bahan, Satuan, Konversi & Pemasok...\n');
	let passed = 0;
	let failed = 0;

	function assert(condition: boolean, msg: string) {
		if (condition) {
			console.log(`  ✅ PASS: ${msg}`);
			passed++;
		} else {
			console.error(`  ❌ FAIL: ${msg}`);
			failed++;
		}
	}

	// Login awal sebagai Owner (Rina)
	setCurrentMockUser(DEMO_USERS['usr-rina']);

	// -------------------------------------------------------------------------
	// 1. Uji Domain Logic Murni (Golden Rule 2 & Golden Rule 5)
	// -------------------------------------------------------------------------
	console.log('▶ Uji 1: Logika Domain Murni (Validasi SKU, Faktor Konversi & Konversi Kuantitas)');

	// 1.1 Validasi SKU
	const skuValid = validateItemCode('KOP-ESP-01');
	assert(skuValid.valid, 'Kode SKU "KOP-ESP-01" valid');

	const skuShort = validateItemCode('A');
	assert(!skuShort.valid, 'Kode SKU 1 karakter ditolak (< 2 char)');

	const skuInvalidChar = validateItemCode('KOP#ESP*');
	assert(!skuInvalidChar.valid, 'Kode SKU dengan karakter spesial ilegal ditolak');

	// 1.2 Validasi Faktor Konversi
	const factorValid = validateConversionFactor('1000');
	assert(factorValid.valid, 'Faktor konversi "1000" valid');

	const factorZero = validateConversionFactor('0');
	assert(!factorZero.valid, 'Faktor konversi "0" ditolak (harus > 0)');

	const factorNegative = validateConversionFactor('-2.5');
	assert(!factorNegative.valid, 'Faktor konversi negatif ditolak');

	// 1.3 Konversi Kuantitas Decimal.js (Multi-Hop)
	const testConversions = [
		{ from_unit_id: 'u-kg', to_unit_id: 'u-g', factor: '1000.0000' },
		{ from_unit_id: 'u-box', to_unit_id: 'u-pcs', factor: '24.0000' },
		{ from_unit_id: 'u-bag', to_unit_id: 'u-kg', factor: '1.0000' }
	];

	// Direct: 2.5 kg -> 2500 g
	const gVal = convertQuantity('2.5', 'u-kg', 'u-g', testConversions);
	assert(gVal === '2500.0000', `2.5 kg terkonversi tepat menjadi 2500.0000 g (hasil: ${gVal})`);

	// Inverse: 500 g -> 0.5 kg
	const kgVal = convertQuantity('500', 'u-g', 'u-kg', testConversions);
	assert(kgVal === '0.5000', `500 g terkonversi kebalikan menjadi 0.5000 kg (hasil: ${kgVal})`);

	// Multi-hop: 2 bag -> kg -> g = 2000 g
	const multiHopVal = convertQuantity('2', 'u-bag', 'u-g', testConversions);
	assert(multiHopVal === '2000.0000', `2 bag terkonversi multi-hop menjadi 2000.0000 g (hasil: ${multiHopVal})`);

	// -------------------------------------------------------------------------
	// 2. Kriteria Penerimaan AC-03.1: Pengubahan Base Unit
	// -------------------------------------------------------------------------
	console.log('\n▶ Uji 2: AC-03.1 Invarian Pengubahan Satuan Dasar (Base Unit)');

	// Evaluasi domain
	const changeBlocked = evaluateBaseUnitChange(
		{ has_stock_movements: true, base_unit_id: 'u-g' },
		'u-kg'
	);
	assert(!changeBlocked.allowed, 'Domain: Ubah base_unit bahan bermutasi ditolak');

	const changeAllowed = evaluateBaseUnitChange(
		{ has_stock_movements: false, base_unit_id: 'u-kg' },
		'u-g'
	);
	assert(changeAllowed.allowed, 'Domain: Ubah base_unit bahan tanpa mutasi diizinkan');

	// Uji via Service & Mock Driver
	let conflictTriggered = false;
	try {
		// item-kop-01 memiliki has_stock_movements = true
		await catalogService.updateItem('item-kop-01', { base_unit_id: 'u-kg' });
	} catch (err: any) {
		if (err instanceof AppError && err.status === 409) {
			conflictTriggered = true;
		}
	}
	assert(conflictTriggered, 'Service API: Mengubah base_unit bahan dengan mutasi stok melempar 409 Conflict');

	// Bahan tanpa mutasi stok (item-tst-01) boleh diubah
	const updatedItem = await catalogService.updateItem('item-tst-01', { base_unit_id: 'u-g' });
	assert(updatedItem.base_unit_id === 'u-g', 'Service API: Mengubah base_unit bahan tanpa mutasi berhasil diperbarui');

	// -------------------------------------------------------------------------
	// 3. Kriteria Penerimaan AC-03.2: Deteksi Siklus Konversi Satuan
	// -------------------------------------------------------------------------
	console.log('\n▶ Uji 3: AC-03.2 Deteksi Siklus Konversi Satuan (Bebas Siklus)');

	// Misal ada: kg -> g. Jika ditambahkan g -> kg, harus terdeteksi siklus langsung.
	const directCycle = detectConversionCycle(
		[{ from_unit_id: 'u-kg', to_unit_id: 'u-g' }],
		{ from_unit_id: 'u-g', to_unit_id: 'u-kg' }
	);
	assert(directCycle, 'Deteksi siklus langsung: g -> kg terdeteksi saat kg -> g telah ada');

	// Multi-hop cycle: A -> B, B -> C, penambahan C -> A harus terdeteksi
	const multiCycle = detectConversionCycle(
		[
			{ from_unit_id: 'u-a', to_unit_id: 'u-b' },
			{ from_unit_id: 'u-b', to_unit_id: 'u-c' }
		],
		{ from_unit_id: 'u-c', to_unit_id: 'u-a' }
	);
	assert(multiCycle, 'Deteksi siklus multi-hop: C -> A terdeteksi saat A -> B -> C ada');

	// Uji via Service: mencoba menambahkan konversi melingkar u-g -> u-kg (sudah ada u-kg -> u-g)
	let cycleErrorCaught = false;
	try {
		await catalogService.createConversion({
			from_unit_id: 'u-g',
			to_unit_id: 'u-kg',
			factor: '0.001'
		});
	} catch (err: any) {
		if (err instanceof AppError && err.status === 422) {
			cycleErrorCaught = true;
		}
	}
	assert(cycleErrorCaught, 'Service API: Menambah aturan konversi siklis ditolak dengan 422 Validation Error');

	// -------------------------------------------------------------------------
	// 4. Kriteria Penerimaan AC-03.3: Pembuktian Independensi HQ Ref Price
	// -------------------------------------------------------------------------
	console.log('\n▶ Uji 4: AC-03.3 Independensi Harga Referensi Pusat terhadap HPP & Saldo');

	const hppTest = evaluateHqRefPriceImpact('240.00', '260.00', '240.00', '18500.0000');
	assert(hppTest.hppUnchanged, 'HPP bergerak tidak terpengaruh oleh perubahan hq_ref_price');
	assert(hppTest.stockBalanceUnchanged, 'Saldo kuantitas fisik tidak berubah saat hq_ref_price diedit');
	assert(hppTest.currentHpp === '240.00', 'Nilai HPP moving average tetap konsisten');

	// Uji via Service: ubah hq_ref_price
	const priceUpdate = await catalogService.updateItem('item-kop-01', { hq_ref_price: '255.00' });
	assert(priceUpdate.hq_ref_price === '255.00', 'hq_ref_price berhasil diubah sebagai harga referensi');

	// -------------------------------------------------------------------------
	// 5. Kriteria Penerimaan AC-03.4: Wizard Impor CSV (200 baris, 5 galat)
	// -------------------------------------------------------------------------
	console.log('\n▶ Uji 5: AC-03.4 Wizard Impor CSV Bahan (200 Baris dengan 5 Baris Galat)');

	// Uji validasi baris CSV domain
	const validRow = validateCsvRow(
		{ name: 'Kopi Baru', code: 'KOP-BARU-01', category_id: 'cat-coffee', base_unit: 'kg' },
		1,
		new Set(),
		new Set(['cat-coffee']),
		new Set(['kg', 'g', 'ml'])
	);
	assert(validRow.valid, 'Domain: Baris CSV lengkap & valid diterima');

	const invalidRow = validateCsvRow(
		{ name: '', code: 'INVALID', category_id: 'cat-unknown', base_unit: 'unknown_unit' },
		2,
		new Set(),
		new Set(['cat-coffee']),
		new Set(['kg'])
	);
	assert(!invalidRow.valid, 'Domain: Baris CSV cacat ditolak dengan daftar galat');
	assert(invalidRow.errors.length >= 3, 'Seluruh kolom cacat dilaporkan secara granular');

	// Uji API Preview
	const preview = await catalogService.previewCsvImport();
	assert(preview.total_rows === 200, 'Pratinjau CSV mendeteksi tepat 200 baris');
	assert(preview.valid_rows === 195, 'Pratinjau CSV memvalidasi 195 baris valid');
	assert(preview.error_rows === 5, 'Pratinjau CSV mendeteksi 5 baris galat');
	assert(preview.errors.length === 5, 'Daftar rincian 5 baris galat disertakan lengkap');

	// Uji API Commit Atomik
	const commitRes = await catalogService.commitCsvImport();
	assert(commitRes.success, 'Komit atomik berhasil memproses baris valid');
	assert(commitRes.skipped_count === 5, 'Tepat 5 baris galat dilewati saat komit');
	assert(commitRes.created_count > 0, 'Baris valid berhasil disimpan ke katalog master');

	// -------------------------------------------------------------------------
	// 6. Kriteria Penerimaan AC-03.5: Penghalang Pengarsipan Bahan
	// -------------------------------------------------------------------------
	console.log('\n▶ Uji 6: AC-03.5 Pencegahan Pengarsipan Bahan Aktif / Bersisa Stok');

	// Evaluasi domain dengan resep aktif
	const archiveBlockedByRecipe = evaluateStockItemArchiving(
		{ id: 'item-1', name: 'Bahan Resep' },
		{ 'out-jkt-01': '0.0000' },
		5 // 5 resep aktif
	);
	assert(!archiveBlockedByRecipe.allowed, 'Domain: Arsip bahan dengan resep aktif ditolak');
	assert(archiveBlockedByRecipe.blockingReasons.some((r) => r.includes('5 resep')), 'Alasan resep penghalang dicantumkan');

	// Evaluasi domain dengan sisa stok > 0
	const archiveBlockedByStock = evaluateStockItemArchiving(
		{ id: 'item-2', name: 'Bahan Berstok' },
		{ 'out-jkt-01': '150.0000' },
		0
	);
	assert(!archiveBlockedByStock.allowed, 'Domain: Arsip bahan dengan sisa stok fisik ditolak');

	// Uji via Service: item-kop-01 memiliki stok dan 14 resep aktif
	let archiveErrorCaught = false;
	try {
		await catalogService.archiveItem('item-kop-01');
	} catch (err: any) {
		if (err instanceof AppError && err.status === 409) {
			archiveErrorCaught = true;
		}
	}
	assert(archiveErrorCaught, 'Service API: Mengarsipkan bahan dengan stok/resep melempar 409 Conflict');

	// Bahan tanpa stok & resep (item-tst-02) berhasil diarsipkan
	const archivedItem = await catalogService.archiveItem('item-tst-02');
	assert(archivedItem.status === 'archived', 'Service API: Bahan tanpa stok & resep berhasil diarsipkan');

	// -------------------------------------------------------------------------
	// 7. Kriteria Penerimaan AC-03.6: Store Manager Scope Lock & Hak Akses
	// -------------------------------------------------------------------------
	console.log('\n▶ Uji 7: AC-03.6 Store Manager Scope Lock & Read-Only Stok Minimum');

	// Beralih peran ke Store Manager (Budi - ditugaskan di out-jkt-01)
	setCurrentMockUser(DEMO_USERS['usr-budi']);

	// Budi memuat daftar bahan
	const smItems = await catalogService.getItems({ role: 'store_manager' });
	const smEspresso = smItems.find((i) => i.id === 'item-kop-01');
	assert(smEspresso !== undefined, 'Store Manager berhasil membaca katalog bahan');

	// Cek scope lock outlet: hanya melihat out-jkt-01, tidak melihat out-bdg-01 / out-sby-01
	const visibleOutlets = Object.keys(smEspresso?.stock_by_outlet || {});
	assert(
		visibleOutlets.length === 1 && visibleOutlets[0] === 'out-jkt-01',
		`Store Manager terkunci hanya melihat stok outlet tugasnya (outlets: ${visibleOutlets.join(', ')})`
	);

	// Store manager mencoba mengubah batas minimum stok -> harus 403 Forbidden
	let forbiddenMinStock = false;
	try {
		await catalogService.updateItemMinStock('item-kop-01', 'out-jkt-01', '6000.0000');
	} catch (err: any) {
		if (err instanceof AppError && err.status === 403) {
			forbiddenMinStock = true;
		}
	}
	assert(forbiddenMinStock, 'Store Manager ditolak saat mencoba mengubah batas minimum stok (403 Forbidden)');

	// Store manager mencoba menambah master bahan -> harus 403 Forbidden
	let forbiddenCreateItem = false;
	try {
		await catalogService.createItem({ name: 'Ilegal Item', code: 'ILEGAL-01', category_id: 'cat-coffee' });
	} catch (err: any) {
		if (err instanceof AppError && err.status === 403) {
			forbiddenCreateItem = true;
		}
	}
	assert(forbiddenCreateItem, 'Store Manager ditolak saat mencoba menambah master bahan baku (403 Forbidden)');

	// -------------------------------------------------------------------------
	// 8. Kriteria Penerimaan AC-03.7: Master Pemasok (HQ Hub vs Eksternal)
	// -------------------------------------------------------------------------
	console.log('\n▶ Uji 8: AC-03.7 Pemasok Gudang Pusat & Pencegahan Hapus Berelasi Transaksi');

	// Kembalikan peran ke Owner
	setCurrentMockUser(DEMO_USERS['usr-rina']);

	const suppliers = await supplierService.getSuppliers();
	const hqSupplier = suppliers.find((s) => s.type === 'hq_warehouse');
	assert(hqSupplier !== undefined, 'Gudang Pusat HQ terdaftar dengan tipe "hq_warehouse"');
	assert(hqSupplier?.has_transactions === true, 'Gudang Pusat memiliki status riwayat transaksi');

	// Menghapus pemasok yang memiliki transaksi harus ditolak dengan 409 Conflict
	let delBlocked = false;
	try {
		await supplierService.deleteSupplier(hqSupplier!.id);
	} catch (err: any) {
		if (err instanceof AppError && err.status === 409) {
			delBlocked = true;
		}
	}
	assert(delBlocked, 'Pemasok berelasi transaksi / Gudang Pusat ditolak saat dihapus (409 Conflict)');

	// Pemasok tanpa transaksi (sup-ext-03) berhasil dihapus
	const delSuccess = await supplierService.deleteSupplier('sup-ext-03');
	assert(delSuccess.success, 'Pemasok tanpa riwayat transaksi berhasil dihapus');

	// =========================================================================
	// Ringkasan Hasil Pengujian
	// =========================================================================
	console.log(`\n=======================================================`);
	console.log(`🎉 Pengujian MS-03 Selesai: ${passed} PASSED, ${failed} FAILED`);
	console.log(`=======================================================\n`);

	if (failed > 0) {
		process.exit(1);
	}
}

runTests().catch((e) => {
	console.error('Unhandled test exception:', e);
	process.exit(1);
});
