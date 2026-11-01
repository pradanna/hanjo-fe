/**
 * Logika Domain Murni: Mesin Evaluasi Aturan Persetujuan (MS-05)
 * Referensi: MILESTONE.md §6.7 & §6.8, Invarian Monorepo §2.5, AC-05.1 s/d AC-05.8
 *
 * Prinsip:
 * 1. Murni, deterministik, bebas I/O dan bebas dependensi UI / mock driver.
 * 2. Presisi finansial untuk batas nominal dan persentase.
 * 3. Evaluasi aturan hierarkis (Outlet > Outlet Group > Organisasi > Global).
 * 4. Pembuat tidak dapat menyetujui dokumen sendiri (self-approval forbidden).
 */

import Decimal from 'decimal.js';
import type {
	ApprovalRule,
	ApprovalRequest,
	EvaluateApprovalInput,
	EvaluateApprovalResult,
	ApprovalMode
} from '../api/contract/types.js';

/**
 * Aturan Bawaan Kas Kecil Bertingkat (§6.8)
 * Batas bebas per transaksi Rp 100.000
 * Batas harian akumulasi per outlet Rp 300.000
 * Batas pengeluaran besar Rp 1.000.000 (butuh step-up)
 */
export const PETTY_CASH_LIMITS = {
	SINGLE_TRANSACTION_LIMIT: 100000,
	DAILY_CUMULATIVE_LIMIT: 300000,
	LARGE_EXPENSE_LIMIT: 1000000
} as const;

/**
 * Menguji apakah tanggal efektif aturan berlaku
 */
export function isRuleDateEffective(
	rule: Pick<ApprovalRule, 'effective_from' | 'effective_to'>,
	businessDate: string
): boolean {
	if (rule.effective_from && businessDate < rule.effective_from) {
		return false;
	}
	if (rule.effective_to && businessDate > rule.effective_to) {
		return false;
	}
	return true;
}

/**
 * Menghitung tingkat spesifisitas aturan:
 * 4 = Spesifik Outlet
 * 3 = Spesifik Grup Outlet
 * 2 = Spesifik Organisasi
 * 1 = Aturan Global (*)
 */
export function getRuleSpecificity(
	rule: Pick<ApprovalRule, 'outlet_id' | 'outlet_group_id' | 'organization_id'>,
	targetOutletId?: string,
	targetGroupId?: string,
	targetOrgId?: string
): number {
	if (rule.outlet_id && rule.outlet_id !== '*' && rule.outlet_id === targetOutletId) {
		return 4;
	}
	if (rule.outlet_group_id && rule.outlet_group_id !== '*' && rule.outlet_group_id === targetGroupId) {
		return 3;
	}
	if (rule.organization_id && rule.organization_id !== '*' && rule.organization_id === targetOrgId) {
		return 2;
	}
	if (
		(!rule.outlet_id || rule.outlet_id === '*') &&
		(!rule.outlet_group_id || rule.outlet_group_id === '*') &&
		(!rule.organization_id || rule.organization_id === '*')
	) {
		return 1;
	}
	return 0; // Tidak cocok dengan target
}

/**
 * Evaluasi Khusus Kas Kecil Bertingkat (§6.8)
 * Memvalidasi batas per-transaksi dan akumulasi harian outlet
 */
export function evaluatePettyCashTier(
	amount: number | string,
	dailyCumulative: number | string
): {
	tier: number;
	requires_approval: boolean;
	approver_roles: string[];
	mode: ApprovalMode;
	require_step_up: boolean;
	reason: string;
} {
	const amountDec = new Decimal(amount || 0);
	const cumulativeDec = new Decimal(dailyCumulative || 0);

	// Tingkat 3: Pengeluaran Besar > Rp 1.000.000 (Pimpinan / Owner + Step-Up Auth)
	if (amountDec.gt(PETTY_CASH_LIMITS.LARGE_EXPENSE_LIMIT)) {
		return {
			tier: 3,
			requires_approval: true,
			approver_roles: ['owner'],
			mode: 'any_of',
			require_step_up: true,
			reason: `Pengeluaran Kas Kecil melebihi batas besar Rp 1.000.000 (Nominal: Rp ${amountDec.toNumber().toLocaleString('id-ID')}). Memerlukan persetujuan Owner dengan Step-Up Auth.`
		};
	}

	// Tingkat 2 Kondisi A: Nominal per transaksi > Rp 100.000
	const exceedsSingleLimit = amountDec.gt(PETTY_CASH_LIMITS.SINGLE_TRANSACTION_LIMIT);

	// Tingkat 2 Kondisi B: Akumulasi harian outlet > Rp 300.000
	const exceedsDailyLimit = cumulativeDec.gt(PETTY_CASH_LIMITS.DAILY_CUMULATIVE_LIMIT);

	if (exceedsSingleLimit || exceedsDailyLimit) {
		let reason = 'Pengeluaran Kas Kecil Tingkat 2: ';
		if (exceedsSingleLimit && exceedsDailyLimit) {
			reason += `Melewati batas per transaksi (Rp ${amountDec.toNumber().toLocaleString('id-ID')} > Rp 100.000) dan akumulasi harian (Rp ${cumulativeDec.toNumber().toLocaleString('id-ID')} > Rp 300.000).`;
		} else if (exceedsSingleLimit) {
			reason += `Melewati batas per transaksi (Rp ${amountDec.toNumber().toLocaleString('id-ID')} > Rp 100.000).`;
		} else {
			reason += `Total akumulasi harian outlet mencapai Rp ${cumulativeDec.toNumber().toLocaleString('id-ID')} (melewati batas bebas harian Rp 300.000).`;
		}

		return {
			tier: 2,
			requires_approval: true,
			approver_roles: ['finance', 'owner'],
			mode: 'any_of',
			require_step_up: false,
			reason
		};
	}

	// Tingkat 1: Bebas persetujuan (langsung tercatat)
	return {
		tier: 1,
		requires_approval: false,
		approver_roles: [],
		mode: 'any_of',
		require_step_up: false,
		reason: `Tingkat 1: Pengeluaran di bawah batas bebas (Rp ${amountDec.toNumber().toLocaleString('id-ID')} ≤ Rp 100.000 dan akumulasi harian ≤ Rp 300.000). Langsung tercatat tanpa persetujuan.`
	};
}

/**
 * Mesin Evaluasi Aturan Persetujuan Terpusat (§6.7 & §6.8)
 *
 * Menerima daftar seluruh aturan persetujuan dan input dokumen, lalu:
 * 1. Menyaring aturan aktif yang cocok dengan jenis dokumen dan cakupan hierarki.
 * 2. Memilih kelompok aturan dengan spesifisitas tertinggi (Outlet > Grup > Organisasi > Global).
 * 3. Menguji ambang batas (nominal, kumulatif, atau selisih persentase).
 * 4. Memilih aturan dengan tingkat persetujuan tertinggi (highest tier).
 */
export function evaluateApprovalRules(
	rules: ApprovalRule[],
	input: EvaluateApprovalInput,
	businessDate?: string
): EvaluateApprovalResult {
	// Kasus khusus Kas Kecil yang menggunakan formula bertingkat §6.8 jika belum ada override spesifik
	if (input.document_type === 'petty_cash_expense') {
		const customPettyCashRules = rules.filter(
			(r) =>
				r.document_type === 'petty_cash_expense' &&
				r.is_active &&
				(r.outlet_id === input.outlet_id || r.organization_id === input.organization_id)
		);

		// Jika tidak ada aturan kustom yang sangat spesifik, terapkan aturan standar tabel §6.8
		if (customPettyCashRules.length === 0) {
			const res = evaluatePettyCashTier(
				input.amount || 0,
				input.daily_cumulative !== undefined ? input.daily_cumulative : input.amount || 0
			);
			return {
				requires_approval: res.requires_approval,
				tier: res.tier,
				rule_id: res.requires_approval ? (res.tier === 3 ? 'rule-pc-tier3' : 'rule-pc-tier2') : null,
				rule_name: res.requires_approval ? (res.tier === 3 ? 'Kas Kecil Besar (Tingkat 3)' : 'Kas Kecil Bertingkat (Tingkat 2)') : 'Kas Kecil Bebas (Tingkat 1)',
				approver_roles: res.approver_roles,
				mode: res.mode,
				require_step_up: res.require_step_up,
				reason: res.reason
			};
		}
	}

	// 1. Saring aturan yang aktif dan cocok dengan jenis dokumen
	const activeRules = rules.filter((r) => {
		if (!r.is_active) return false;
		if (r.document_type !== input.document_type) return false;
		if (businessDate && !isRuleDateEffective(r, businessDate)) return false;
		return true;
	});

	if (activeRules.length === 0) {
		return {
			requires_approval: false,
			tier: 1,
			rule_id: null,
			approver_roles: [],
			mode: 'any_of',
			require_step_up: false,
			reason: `Tidak ada aturan persetujuan aktif untuk jenis dokumen "${input.document_type}". Dokumen diproses otomatis.`
		};
	}

	// 2. Kelompokkan berdasarkan tingkat spesifisitas hierarkis
	const scoredRules = activeRules
		.map((rule) => {
			const score = getRuleSpecificity(
				rule,
				input.outlet_id,
				undefined,
				input.organization_id
			);
			return { rule, score };
		})
		.filter((item) => item.score > 0);

	if (scoredRules.length === 0) {
		return {
			requires_approval: false,
			tier: 1,
			rule_id: null,
			approver_roles: [],
			mode: 'any_of',
			require_step_up: false,
			reason: 'Tidak ada aturan yang cocok dengan cakupan cabang atau organisasi ini.'
		};
	}

	// Cari skor spesifisitas tertinggi (misal jika ada aturan spesifik outlet score 4, abaikan global score 1)
	const maxScore = Math.max(...scoredRules.map((sr) => sr.score));
	const candidates = scoredRules.filter((sr) => sr.score === maxScore).map((sr) => sr.rule);

	// 3. Uji kecocokan ambang batas dokumen terhadap tiap kandidat
	const amountDec = input.amount !== undefined ? new Decimal(input.amount) : null;
	const dailyCumDec = input.daily_cumulative !== undefined ? new Decimal(input.daily_cumulative) : null;
	const varPct = input.variance_pct !== undefined ? input.variance_pct : null;
	const varAmountDec = input.variance_amount !== undefined ? new Decimal(input.variance_amount) : null;

	const matchedRules = candidates.filter((rule) => {
		// Validasi batas nominal (min_amount & max_amount)
		if (amountDec !== null) {
			if (rule.min_amount && amountDec.lt(new Decimal(rule.min_amount))) {
				return false;
			}
			if (rule.max_amount && amountDec.gt(new Decimal(rule.max_amount))) {
				return false;
			}
		}

		// Validasi batas harian kumulatif
		if (dailyCumDec !== null && rule.daily_cumulative_limit) {
			if (dailyCumDec.lte(new Decimal(rule.daily_cumulative_limit))) {
				// Bila rule khusus mensyaratkan melewati batas kumulatif
				// dan amount sendiri belum melewati min_amount
				if (rule.min_amount && amountDec && amountDec.lt(new Decimal(rule.min_amount))) {
					return false;
				}
			}
		}

		// Validasi selisih stock count variance
		if (rule.percentage_variance_threshold && varPct !== null) {
			const meetsPct = Math.abs(varPct) >= rule.percentage_variance_threshold;
			const meetsAmt =
				varAmountDec && rule.variance_amount_threshold
					? varAmountDec.abs().gte(new Decimal(rule.variance_amount_threshold))
					: false;

			// Sesuai spec §MS-05: selisih > Rp 200.000 ATAU selisih > 5%
			if (rule.variance_amount_threshold) {
				if (!meetsPct && !meetsAmt) return false;
			} else {
				if (!meetsPct) return false;
			}
		}

		return true;
	});

	if (matchedRules.length === 0) {
		return {
			requires_approval: false,
			tier: 1,
			rule_id: null,
			approver_roles: [],
			mode: 'any_of',
			require_step_up: false,
			reason: 'Nilai dokumen berada di bawah ambang batas persetujuan.'
		};
	}

	// 4. Pilih aturan dengan tingkat (tier) tertinggi (§6.7)
	matchedRules.sort((a, b) => b.tier - a.tier);
	const winningRule = matchedRules[0];

	// Bila winning rule tier 1 dan tanpa approver roles -> bebas persetujuan
	if (winningRule.tier <= 1 && (!winningRule.approver_roles || winningRule.approver_roles.length === 0)) {
		return {
			requires_approval: false,
			tier: 1,
			rule_id: winningRule.id,
			rule_name: winningRule.name,
			approver_roles: [],
			mode: winningRule.mode,
			require_step_up: false,
			matched_rule: winningRule,
			reason: winningRule.description || 'Tingkat 1: Bebas persetujuan.'
		};
	}

	return {
		requires_approval: true,
		tier: winningRule.tier,
		rule_id: winningRule.id,
		rule_name: winningRule.name,
		approver_roles: winningRule.approver_roles,
		mode: winningRule.mode,
		require_step_up: winningRule.require_step_up,
		matched_rule: winningRule,
		reason: winningRule.description || `Memerlukan persetujuan Tingkat ${winningRule.tier} (${winningRule.name}).`
	};
}

/**
 * Validasi Invarian Otorisasi Penyetuju (AC-05.2 & §MS-05)
 *
 * Menguji apakah pengguna berhak mengeksekusi persetujuan:
 * 1. Pembuat dokumen TIDAK DAPAT menyetujui dokumen miliknya sendiri (code: self_approval).
 * 2. Peran pengguna wajib termasuk dalam daftar approver_roles (atau owner superadmin).
 * 3. Status dokumen harus 'pending'.
 */
export function canUserApproveRequest(
	user: { id: string; role: string; name?: string },
	request: ApprovalRequest
): {
	allowed: boolean;
	code?: 'self_approval' | 'forbidden' | 'already_decided' | 'already_approved_by_user';
	message?: string;
} {
	// Status harus pending
	if (request.status !== 'pending') {
		return {
			allowed: false,
			code: 'already_decided',
			message: `Permintaan persetujuan telah berstatus "${request.status}" dan tidak dapat diubah lagi.`
		};
	}

	// Invarian Wajib: Pembuat tidak dapat menyetujui dokumen sendiri (§MS-05 AC-05.2)
	if (request.submitted_by.id === user.id) {
		return {
			allowed: false,
			code: 'self_approval',
			message: 'Anda tidak dapat menyetujui dokumen yang Anda buat sendiri (Prinsip Segregation of Duties).'
		};
	}

	// Cek apakah pengguna sudah pernah menyetujui sebelumnya (mode all_of)
	const alreadyApproved = request.approvals.some((a) => a.approver_id === user.id);
	if (alreadyApproved) {
		return {
			allowed: false,
			code: 'already_approved_by_user',
			message: 'Anda sudah menyetujui dokumen ini sebelumnya.'
		};
	}

	// Owner selalu memiliki izin pimpinan tertinggi
	if (user.role === 'owner') {
		return { allowed: true };
	}

	// Cek kesesuaian peran approver
	if (!request.approver_roles.includes(user.role)) {
		return {
			allowed: false,
			code: 'forbidden',
			message: `Peran Anda (${user.role}) tidak termasuk dalam penyetuju yang berwenang untuk dokumen ini.`
		};
	}

	return { allowed: true };
}

/**
 * Evaluasi Apakah Persetujuan Selesai Berdasarkan Mode any_of vs all_of (AC-05.3)
 */
export function evaluateApprovalCompletion(
	mode: ApprovalMode,
	approverRoles: string[],
	decisions: Array<{ role: string }>
): {
	isComplete: boolean;
	remainingRoles: string[];
} {
	if (mode === 'any_of') {
		// Satu persetujuan dari salah satu peran yang berhak sudah cukup
		const isComplete = decisions.length >= 1;
		return {
			isComplete,
			remainingRoles: isComplete ? [] : approverRoles
		};
	}

	// Mode all_of: seluruh peran wajib memberikan persetujuan
	const approvedRoles = new Set(decisions.map((d) => d.role));
	const remainingRoles = approverRoles.filter((r) => !approvedRoles.has(r));

	return {
		isComplete: remainingRoles.length === 0,
		remainingRoles
	};
}

/**
 * Validasi Alasan Penolakan (AC-05.4)
 * Menolak permohonan tanpa alasan wajib ditolak oleh validasi sistem.
 */
export function validateRejectReason(reason?: string | null): {
	valid: boolean;
	error?: string;
} {
	if (!reason || typeof reason !== 'string' || !reason.trim()) {
		return {
			valid: false,
			error: 'Alasan penolakan wajib diisi untuk transparansi operasional.'
		};
	}

	if (reason.trim().length < 5) {
		return {
			valid: false,
			error: 'Alasan penolakan minimal 5 karakter agar informatif bagi pemohon.'
		};
	}

	return { valid: true };
}

/**
 * Validasi Optimistic Concurrency Locking Versi Dokumen (AC-05.5)
 * Jika dokumen sumber berubah versi, persetujuan wajib ditolak 409 conflict.
 */
export function validateDocumentVersionMatch(
	requestDocVersion: number,
	currentDocVersion: number
): {
	match: boolean;
	error?: string;
} {
	if (requestDocVersion !== currentDocVersion) {
		return {
			match: false,
			error: `Versi dokumen sumber telah berubah (versi permohonan: v${requestDocVersion}, versi terbaru: v${currentDocVersion}). Muat ulang dokumen sebelum mengambil keputusan.`
		};
	}
	return { match: true };
}
