/**
 * Suite Pengujian Sub-Fase MS-00C: Kit Komponen UI, Desain Sistem & Kamus Bahasa Indonesia
 * Referensi: MILESTONE.md §MS-00C, T-00.1, T-00.2, T-00.3, T-00.11, AC-00.2, AC-00.8
 */

import { getStatusMeta, STATUS_DICTIONARY } from '../../config/status_dictionary.js';
import { ValidationMessages } from '../../config/validation_dictionary.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../../');
const srcDir = path.join(rootDir, 'src');

async function runTests() {
	console.log('🧪 Memulai pengujian MS-00C: Kit Komponen UI, Desain Sistem & Kamus Status...\n');
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

	// -------------------------------------------------------------------------
	// 1. Uji Kamus Status Bahasa Indonesia & Varian Warna (T-00.11, PRD 13.1)
	// -------------------------------------------------------------------------
	console.log('▶ Uji 1: Kamus Status Bahasa Indonesia (status_dictionary.ts)');

	const metaDraft = getStatusMeta('draft');
	assert(metaDraft.label === 'Draf' && metaDraft.variant === 'neutral', 'Status draft -> Draf (neutral)');

	const metaApproved = getStatusMeta('approved');
	assert(metaApproved.label === 'Disetujui' && metaApproved.variant === 'success', 'Status approved -> Disetujui (success)');

	const metaRejected = getStatusMeta('rejected');
	assert(metaRejected.label === 'Ditolak' && metaRejected.variant === 'danger', 'Status rejected -> Ditolak (danger)');

	const metaWaitingInvoice = getStatusMeta('waiting_invoice');
	assert(metaWaitingInvoice.label === 'Menunggu Nota' && metaWaitingInvoice.variant === 'warning', 'Status waiting_invoice -> Menunggu Nota (warning)');

	const metaVerified = getStatusMeta('verified');
	assert(metaVerified.label.includes('True-Up') && metaVerified.variant === 'success', 'Status verified -> Terverifikasi True-Up (success)');

	const metaOpen = getStatusMeta('open');
	assert(metaOpen.label === 'Buka Operasional' && metaOpen.variant === 'live', 'Status open -> Buka Operasional (live)');

	const metaNegativeStock = getStatusMeta('negative_stock');
	assert(metaNegativeStock.label === 'Stok Negatif' && metaNegativeStock.variant === 'danger', 'Status negative_stock -> Stok Negatif (danger)');

	// Fallback handling
	const metaNull = getStatusMeta(null);
	assert(metaNull.label === '—' && metaNull.variant === 'neutral', 'Nilai null status ditangani aman');

	const metaCustom = getStatusMeta('in_progress_review');
	assert(metaCustom.label === 'In Progress Review' && metaCustom.variant === 'neutral', 'Status tak dikenal diformat kapital otomatis');

	// -------------------------------------------------------------------------
	// 2. Uji Katalog Pesan Validasi Standar Bahasa Indonesia (T-00.11)
	// -------------------------------------------------------------------------
	console.log('\n▶ Uji 2: Katalog Pesan Validasi Bahasa Indonesia (validation_dictionary.ts)');

	assert(ValidationMessages.required('Nama Bahan') === 'Nama Bahan wajib diisi', 'Pesan required dengan parameter');
	assert(ValidationMessages.required() === 'Kolom ini wajib diisi', 'Pesan required tanpa parameter');
	assert(ValidationMessages.minLength('PIN', 6) === 'PIN minimal 6 karakter', 'Pesan minLength');
	assert(ValidationMessages.email() === 'Format alamat email tidak valid', 'Pesan email validasi');
	assert(ValidationMessages.positive('Harga Satuan') === 'Harga Satuan harus bernilai lebih besar dari 0', 'Pesan nilai positif');
	assert(ValidationMessages.fileTooLarge(10) === 'Ukuran berkas melebihi batas maksimal 10 MB', 'Pesan file terlalu besar');
	assert(ValidationMessages.fileInvalidType(['JPG', 'PNG']) === 'Format berkas tidak diizinkan. Gunakan: JPG, PNG', 'Pesan tipe berkas tidak valid');
	assert(ValidationMessages.invalidDeviationReason().includes('deviasi'), 'Pesan alasan deviasi True-Up');

	// -------------------------------------------------------------------------
	// 3. Uji Ketersediaan Komponen UI Lengkap pada Berkas Fisik & Index (T-00.3)
	// -------------------------------------------------------------------------
	console.log('\n▶ Uji 3: Ketersediaan Berkas Komponen UI Lengkap (T-00.3)');

	const componentsDir = path.join(srcDir, 'lib', 'components');
	const indexContent = fs.readFileSync(path.join(componentsDir, 'index.ts'), 'utf-8');
	const uiAliasContent = fs.readFileSync(path.join(srcDir, 'lib', 'ui', 'index.ts'), 'utf-8');

	const formComponents = [
		'Button.svelte',
		'Input.svelte',
		'NumberInput.svelte',
		'CurrencyInput.svelte',
		'Select.svelte',
		'MultiSelect.svelte',
		'Combobox.svelte',
		'DatePicker.svelte',
		'DateRange.svelte',
		'Checkbox.svelte',
		'Radio.svelte',
		'Switch.svelte',
		'Textarea.svelte',
		'FileUpload.svelte'
	];

	for (const comp of formComponents) {
		const filePath = path.join(componentsDir, 'forms', comp);
		const exists = fs.existsSync(filePath);
		const compName = comp.replace('.svelte', '');
		const inIndex = indexContent.includes(`as ${compName}`);
		assert(exists && inIndex, `Komponen Form terpasang & terekspor: ${compName}`);
	}

	const dataComponents = [
		'Table.svelte',
		'MetricCard.svelte',
		'StatusBadge.svelte',
		'InfoPanel.svelte',
		'Timeline.svelte',
		'DiffViewer.svelte',
		'FilterBar.svelte',
		'Chart.svelte'
	];

	for (const comp of dataComponents) {
		const filePath = path.join(componentsDir, 'data', comp);
		const exists = fs.existsSync(filePath);
		const compName = comp.replace('.svelte', '');
		const inIndex = indexContent.includes(`as ${compName}`);
		assert(exists && inIndex, `Komponen Data terpasang & terekspor: ${compName}`);
	}

	const feedbackComponents = [
		'Modal.svelte',
		'Drawer.svelte',
		'ProgressBar.svelte',
		'Skeleton.svelte',
		'EmptyState.svelte',
		'ErrorState.svelte',
		'ConfirmDialog.svelte',
		'StepUpDialog.svelte',
		'Toast.svelte',
		'toast.svelte.ts'
	];

	for (const comp of feedbackComponents) {
		const filePath = path.join(componentsDir, 'feedback', comp);
		const exists = fs.existsSync(filePath);
		const compName = comp.replace(/\.(svelte|svelte\.ts)$/, '');
		const inIndex = indexContent.includes(compName);
		assert(exists && inIndex, `Komponen Feedback terpasang & terekspor: ${compName}`);
	}

	// Wrapper & Layout
	assert(fs.existsSync(path.join(componentsDir, 'wrappers', 'Feature.svelte')), 'Feature.svelte ada');
	assert(fs.existsSync(path.join(componentsDir, 'wrappers', 'Can.svelte')), 'Can.svelte ada');
	assert(fs.existsSync(path.join(componentsDir, 'layout', 'PageHeader.svelte')), 'PageHeader.svelte ada');
	assert(uiAliasContent.includes('../components/index.js'), 'Alias $lib/ui re-ekspor components/index.js');

	// -------------------------------------------------------------------------
	// 4. Uji Batas Impor Arsitektural (T-00.1, AC-00.2)
	// -------------------------------------------------------------------------
	console.log('\n▶ Uji 4: Batas Impor Arsitektural (AC-00.2)');

	const forbiddenPattern = /from\s+['"][^'"]*drivers\/mock[^'"]*['"]/;

	function checkNoMockImports(dir: string): boolean {
		const files = fs.readdirSync(dir, { withFileTypes: true });
		for (const f of files) {
			const p = path.join(dir, f.name);
			if (f.isDirectory()) {
				if (!checkNoMockImports(p)) return false;
			} else if (/\.(svelte|ts)$/.test(f.name) && !f.name.includes('.test.')) {
				const code = fs.readFileSync(p, 'utf-8');
				if (forbiddenPattern.test(code)) {
					console.error(`Pelanggaran di berkas: ${p}`);
					return false;
				}
			}
		}
		return true;
	}

	const cleanImports = checkNoMockImports(componentsDir);
	assert(cleanImports, 'Tidak ada komponen UI yang mengimpor langsung dari drivers/mock/*');

	// -------------------------------------------------------------------------
	// 5. Uji Katalog Komponen docs/COMPONENTS.md (UI Pre-Flight Guardrail)
	// -------------------------------------------------------------------------
	console.log('\n▶ Uji 5: Sinkronisasi Katalog Komponen (docs/COMPONENTS.md)');

	const rootDocsPath = path.resolve(rootDir, '../docs/COMPONENTS.md');
	const frontendDocsPath = path.resolve(rootDir, 'docs/COMPONENTS.md');

	assert(fs.existsSync(rootDocsPath), 'Berkas docs/COMPONENTS.md utama tersedia');
	assert(fs.existsSync(frontendDocsPath), 'Berkas frontend/docs/COMPONENTS.md tersedia');

	const rootDocsContent = fs.readFileSync(rootDocsPath, 'utf-8');
	assert(rootDocsContent.length > 500, 'Dokumen docs/COMPONENTS.md memuat katalog lengkap');
	assert(rootDocsContent.includes('Button') && rootDocsContent.includes('CurrencyInput'), 'Katalog memuat komponen input forms');
	assert(rootDocsContent.includes('Table') && rootDocsContent.includes('MetricCard'), 'Katalog memuat komponen data presentation');
	assert(rootDocsContent.includes('Modal') && rootDocsContent.includes('Drawer'), 'Katalog memuat komponen feedback overlay');

	console.log('\n========================================');
	console.log(`Hasil Pengujian: ${passed} Lulus, ${failed} Gagal`);
	console.log('========================================\n');

	if (failed > 0) {
		process.exit(1);
	}
}

runTests();
