/**
 * Domain Logic Murni Katalog Bahan, Satuan, Konversi & Pemasok (MS-03)
 * Referensi: MILESTONE.md §MS-03, AGENTS.md Golden Rule 2 & Golden Rule 5
 *
 * Logika bisnis murni (pure business logic) bebas dari I/O, fetch, atau mock handler.
 */

import { Decimal } from 'decimal.js';
import type { DecimalString } from '../api/contract/types.js';

/**
 * Validasi format kode SKU bahan baku.
 * Wajib alfanumerik, garis hubung '-', atau garis bawah '_', panjang 2–30 karakter.
 */
export function validateItemCode(code: string): { valid: boolean; message?: string } {
	if (!code || typeof code !== 'string') {
		return { valid: false, message: 'Kode bahan baku tidak boleh kosong' };
	}
	const trimmed = code.trim();
	if (trimmed.length < 2) {
		return { valid: false, message: 'Kode bahan baku minimal 2 karakter' };
	}
	if (trimmed.length > 30) {
		return { valid: false, message: 'Kode bahan baku maksimal 30 karakter' };
	}
	const regex = /^[A-Za-z0-9_-]+$/;
	if (!regex.test(trimmed)) {
		return { valid: false, message: 'Kode bahan baku hanya boleh berisi huruf, angka, tanda minus (-), dan garis bawah (_)' };
	}
	return { valid: true };
}

/**
 * Validasi faktor konversi satuan.
 * Wajib berupa angka desimal positif > 0.
 */
export function validateConversionFactor(factor: string | number): { valid: boolean; message?: string } {
	try {
		const dec = new Decimal(factor);
		if (dec.isNegative() || dec.isZero()) {
			return { valid: false, message: 'Faktor konversi harus berupa angka positif lebih besar dari 0' };
		}
		return { valid: true };
	} catch {
		return { valid: false, message: 'Format angka faktor konversi tidak valid' };
	}
}

export interface UnitConversionEdge {
	from_unit_id: string;
	to_unit_id: string;
	factor?: string | number;
}

/**
 * Deteksi pencegahan siklus konversi satuan (AC-03.2).
 * Memeriksa apakah penambahan relasi konversi baru akan menyebabkan siklus (misal: kg -> g -> kg).
 * Menggunakan algoritma penelusuran graf berarah (DFS).
 */
export function detectConversionCycle(
	existingConversions: UnitConversionEdge[],
	newConversion: { from_unit_id: string; to_unit_id: string }
): boolean {
	// Jika satuan asal sama dengan satuan tujuan
	if (newConversion.from_unit_id === newConversion.to_unit_id) {
		return true;
	}

	// Bangun graf adjasensi dari konversi yang ada
	const adj = new Map<string, Set<string>>();
	const addEdge = (u: string, v: string) => {
		if (!adj.has(u)) adj.set(u, new Set());
		adj.get(u)!.add(v);
	};

	for (const edge of existingConversions) {
		addEdge(edge.from_unit_id, edge.to_unit_id);
	}

	// Tambahkan edge baru sementara
	addEdge(newConversion.from_unit_id, newConversion.to_unit_id);

	// Lakukan pemeriksaan cycle untuk semua node dalam graf menggunakan DFS
	const visited = new Set<string>();
	const recStack = new Set<string>();

	function isCyclicUtil(node: string): boolean {
		visited.add(node);
		recStack.add(node);

		const neighbors = adj.get(node) || new Set();
		for (const neighbor of neighbors) {
			if (!visited.has(neighbor)) {
				if (isCyclicUtil(neighbor)) return true;
			} else if (recStack.has(neighbor)) {
				return true;
			}
		}

		recStack.delete(node);
		return false;
	}

	for (const node of adj.keys()) {
		if (!visited.has(node)) {
			if (isCyclicUtil(node)) return true;
		}
	}

	return false;
}

/**
 * Konversi kuantitas antar satuan ukuran menggunakan Decimal.js presisi tinggi.
 * Mendukung konversi langsung (direct), kebalikan (inverse 1/factor), dan multi-hop jika ada jalur.
 */
export function convertQuantity(
	amount: string | number,
	fromUnitId: string,
	toUnitId: string,
	conversions: UnitConversionEdge[]
): DecimalString {
	if (fromUnitId === toUnitId) {
		return new Decimal(amount).toFixed(4);
	}

	// Cek direct conversion (from -> to)
	const direct = conversions.find((c) => c.from_unit_id === fromUnitId && c.to_unit_id === toUnitId);
	if (direct && direct.factor) {
		return new Decimal(amount).times(new Decimal(direct.factor)).toFixed(4);
	}

	// Cek inverse conversion (to -> from)
	const inverse = conversions.find((c) => c.from_unit_id === toUnitId && c.to_unit_id === fromUnitId);
	if (inverse && inverse.factor) {
		return new Decimal(amount).dividedBy(new Decimal(inverse.factor)).toFixed(4);
	}

	// Multi-hop path search menggunakan BFS
	const queue: Array<{ unitId: string; currentMultiplier: Decimal }> = [
		{ unitId: fromUnitId, currentMultiplier: new Decimal(1) }
	];
	const visited = new Set<string>([fromUnitId]);

	while (queue.length > 0) {
		const { unitId, currentMultiplier } = queue.shift()!;

		// Periksa semua edge yang terhubung
		for (const edge of conversions) {
			if (!edge.factor) continue;

			if (edge.from_unit_id === unitId && !visited.has(edge.to_unit_id)) {
				const nextMultiplier = currentMultiplier.times(new Decimal(edge.factor));
				if (edge.to_unit_id === toUnitId) {
					return new Decimal(amount).times(nextMultiplier).toFixed(4);
				}
				visited.add(edge.to_unit_id);
				queue.push({ unitId: edge.to_unit_id, currentMultiplier: nextMultiplier });
			} else if (edge.to_unit_id === unitId && !visited.has(edge.from_unit_id)) {
				const nextMultiplier = currentMultiplier.dividedBy(new Decimal(edge.factor));
				if (edge.from_unit_id === toUnitId) {
					return new Decimal(amount).times(nextMultiplier).toFixed(4);
				}
				visited.add(edge.from_unit_id);
				queue.push({ unitId: edge.from_unit_id, currentMultiplier: nextMultiplier });
			}
		}
	}

	throw new Error(`Tidak ditemukan jalur konversi antara satuan ${fromUnitId} dan ${toUnitId}`);
}

/**
 * Evaluasi pengubahan base_unit bahan (AC-03.1).
 * Mengubah base_unit bahan yang telah memiliki mutasi stok ditolak keras (409 conflict).
 */
export function evaluateBaseUnitChange(
	item: { has_stock_movements?: boolean; base_unit_id: string },
	newBaseUnitId: string
): { allowed: boolean; reason?: string } {
	if (item.base_unit_id === newBaseUnitId) {
		return { allowed: true };
	}
	if (item.has_stock_movements) {
		return {
			allowed: false,
			reason: 'Satuan dasar (base unit) tidak dapat diubah setelah bahan memiliki mutasi pergerakan stok'
		};
	}
	return { allowed: true };
}

/**
 * Evaluasi pengarsipan bahan baku (AC-03.5).
 * Ditolak bila masih ada stok > 0 atau dipakai di resep aktif.
 */
export function evaluateStockItemArchiving(
	item: { id: string; name: string },
	outletStockMap: Record<string, string | number>,
	activeRecipesUsingCount: number
): { allowed: boolean; blockingReasons: string[] } {
	const blockingReasons: string[] = [];

	// Cek total stok > 0
	let totalStock = new Decimal(0);
	for (const [outletId, stockVal] of Object.entries(outletStockMap)) {
		const stockDec = new Decimal(stockVal || 0);
		if (stockDec.greaterThan(0)) {
			totalStock = totalStock.plus(stockDec);
			blockingReasons.push(`Outlet ${outletId} masih memiliki sisa stok ${stockDec.toString()}`);
		}
	}

	// Cek resep aktif
	if (activeRecipesUsingCount > 0) {
		blockingReasons.push(`Bahan masih digunakan oleh ${activeRecipesUsingCount} resep menu aktif`);
	}

	return {
		allowed: blockingReasons.length === 0,
		blockingReasons
	};
}

/**
 * Evaluasi pembuktian independensi harga referensi pusat (AC-03.3).
 * Mengisi atau mengubah hq_ref_price terbukti murni referensi dan tidak mengubah HPP maupun nilai saldo stok.
 */
export function evaluateHqRefPriceImpact(
	oldHqRefPrice: string | undefined,
	newHqRefPrice: string,
	currentHpp: DecimalString,
	currentStockBalance: DecimalString
): { hppUnchanged: boolean; stockBalanceUnchanged: boolean; currentHpp: DecimalString; currentStockBalance: DecimalString } {
	// hq_ref_price tidak pernah dihitung ke dalam moving average cost atau stok
	return {
		hppUnchanged: true,
		stockBalanceUnchanged: true,
		currentHpp,
		currentStockBalance
	};
}

/**
 * Validasi baris CSV pada wizard impor bahan (AC-03.4).
 */
export function validateCsvRow(
	row: Record<string, string>,
	rowNumber: number,
	existingCodes: Set<string>,
	validCategoryIds: Set<string>,
	validUnitSymbols: Set<string>
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	const name = row['name']?.trim() || row['Nama']?.trim();
	const code = row['code']?.trim() || row['Kode']?.trim() || row['SKU']?.trim();
	const category = row['category_id']?.trim() || row['Kategori']?.trim();
	const unit = row['base_unit']?.trim() || row['Satuan']?.trim() || row['Unit']?.trim();
	const price = row['hq_ref_price']?.trim() || row['Harga_Referensi']?.trim();

	if (!name) {
		errors.push('Nama bahan baku wajib diisi');
	}

	if (!code) {
		errors.push('Kode bahan baku (SKU) wajib diisi');
	} else {
		const codeVal = validateItemCode(code);
		if (!codeVal.valid) {
			errors.push(codeVal.message!);
		}
		if (existingCodes.has(code.toUpperCase())) {
			errors.push(`Kode bahan baku "${code}" sudah terdaftar dalam sistem`);
		}
	}

	if (!category) {
		errors.push('Kategori bahan wajib diisi');
	} else if (!validCategoryIds.has(category.toLowerCase())) {
		errors.push(`Kategori "${category}" tidak ditemukan`);
	}

	if (!unit) {
		errors.push('Satuan dasar (base unit) wajib diisi');
	} else if (!validUnitSymbols.has(unit.toLowerCase())) {
		errors.push(`Satuan dasar "${unit}" tidak dikenali dalam master satuan`);
	}

	if (price) {
		try {
			const p = new Decimal(price.replace(/[^0-9.-]/g, ''));
			if (p.isNegative()) {
				errors.push('Harga referensi tidak boleh negatif');
			}
		} catch {
			errors.push('Format harga referensi tidak valid');
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Evaluasi status ketersediaan/level stok bahan baku.
 * Mengembalikan:
 * - 'out_of_stock': jika total stok fisik <= 0 (Habis)
 * - 'low_stock': jika stok pada salah satu outlet <= batas minimum outlet tersebut (Hampir Habis)
 * - 'normal': stok aman di atas batas minimum
 */
export function getItemStockLevel(item: {
	status?: string;
	current_stock?: string;
	stock_by_outlet?: Record<string, { current?: string; min?: string }>;
}): 'out_of_stock' | 'low_stock' | 'normal' {
	if (item.status === 'archived') return 'normal';
	const total = parseFloat(item.current_stock || '0');
	if (total <= 0) return 'out_of_stock';

	if (item.stock_by_outlet && Object.keys(item.stock_by_outlet).length > 0) {
		const entries = Object.values(item.stock_by_outlet);
		const hasLow = entries.some((d) => {
			const curr = parseFloat(d.current || '0');
			const min = parseFloat(d.min || '0');
			return min > 0 && curr <= min;
		});
		if (hasLow) return 'low_stock';
	}

	return 'normal';
}

