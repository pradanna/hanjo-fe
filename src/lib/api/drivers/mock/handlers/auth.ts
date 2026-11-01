/**
 * Mock Handler: Auth, Identitas & Sesi Pengguna
 * Referensi: MILESTONE.md §7, T-00.8
 *
 * Mengelola 5 akun demo, pengalihan peran (dev-only switch),
 * endpoint /api/v1/me, login, logout, dan step-up auth.
 */

import type { User, UserRole } from '../../../contract/types.js';
import { ApiErrors } from '../../../contract/errors.js';
import { Endpoints } from '../../../contract/endpoints.js';
import { router, type RouteContext } from '../engine/router.js';
import { clock } from '../engine/clock.js';
import { getDefaultFeatureFlags } from '../../../../config/feature_flags.js';
import { DEMO_USERS } from '../../../../config/demo_accounts.js';

export { DEMO_USERS };

export const DEMO_USERS_BY_ROLE: Record<UserRole, User> = {
	owner: DEMO_USERS['usr-rina'],
	hq_admin: DEMO_USERS['usr-dimas'],
	finance: DEMO_USERS['usr-maya'],
	brand_manager: DEMO_USERS['usr-sari'],
	store_manager: DEMO_USERS['usr-budi'],
	cashier: DEMO_USERS['usr-fajar']
};

function getInitialMockUser(): User | null {
	if (typeof window !== 'undefined' && window.localStorage) {
		const savedUserId = localStorage.getItem('hanjo_mock_user_id');
		if (savedUserId && DEMO_USERS[savedUserId]) {
			return DEMO_USERS[savedUserId];
		}
		const savedRole = localStorage.getItem('hanjo_mock_user_role') as UserRole;
		if (savedRole && DEMO_USERS_BY_ROLE[savedRole]) {
			return DEMO_USERS_BY_ROLE[savedRole];
		}
	}
	return DEMO_USERS['usr-rina'];
}

// Sesi mock aktif di memori browser (otomatis dipulihkan dari localStorage saat reload)
let currentMockUser: User | null = getInitialMockUser();
let currentFlags: Record<string, boolean> = getDefaultFeatureFlags();

export function getCurrentMockUser(): User | null {
	if (!currentMockUser) {
		currentMockUser = getInitialMockUser();
	}
	return currentMockUser;
}

export function getCurrentFeatureFlags(): Record<string, boolean> {
	return currentFlags;
}

export function setMockFeatureFlag(flag: string, value: boolean): void {
	currentFlags[flag] = value;
}

export function setCurrentMockUser(user: User | null): void {
	currentMockUser = user;
	if (typeof window !== 'undefined' && window.localStorage) {
		if (user) {
			localStorage.setItem('hanjo_mock_user_id', user.id);
			localStorage.setItem('hanjo_mock_user_role', user.role);
		} else {
			localStorage.removeItem('hanjo_mock_user_id');
			localStorage.removeItem('hanjo_mock_user_role');
		}
	}
}

/**
 * Mendaftarkan handler autentikasi ke Mock Router
 */
export function registerAuthHandlers(): void {
	// GET /api/v1/me
	router.get(Endpoints.AUTH.ME, async () => {
		if (!currentMockUser) {
			currentMockUser = getInitialMockUser();
		}
		if (!currentMockUser) {
			throw ApiErrors.unauthenticated('Sesi pengguna tidak ditemukan atau telah kedaluwarsa');
		}

		return {
			user: currentMockUser,
			feature_flags: currentFlags,
			permissions: [currentMockUser.role]
		};
	});

	// POST /api/v1/auth/login
	router.post(Endpoints.AUTH.LOGIN, async (ctx: RouteContext) => {
		const body = (ctx.req.body || {}) as { email?: string; role?: UserRole; password?: string };

		let userToLogin: User | undefined;

		if (body.role && DEMO_USERS_BY_ROLE[body.role]) {
			userToLogin = DEMO_USERS_BY_ROLE[body.role];
		} else if (body.email) {
			userToLogin = Object.values(DEMO_USERS).find(
				(u) => u.email.toLowerCase() === body.email?.toLowerCase()
			);
		}

		if (!userToLogin) {
			throw ApiErrors.validationError(
				[{ field: 'email', code: 'invalid_credentials', message: 'Email atau kata sandi tidak valid' }],
				'Kredensial login tidak valid'
			);
		}

		setCurrentMockUser(userToLogin);

		return {
			token: `mock-token-${userToLogin.id}-${clock.now().getTime()}`,
			user: userToLogin,
			expires_at: new Date(clock.now().getTime() + 86400000).toISOString(),
			feature_flags: currentFlags,
			permissions: [userToLogin.role]
		};
	});

	// POST /api/v1/auth/logout
	router.post(Endpoints.AUTH.LOGOUT, async () => {
		setCurrentMockUser(null);
		return { success: true, message: 'Berhasil keluar' };
	});

	// POST /api/v1/dev/switch-role
	router.post(Endpoints.AUTH.DEV_SWITCH_ROLE, async (ctx: RouteContext) => {
		const body = (ctx.req.body || {}) as { role?: UserRole; userId?: string };

		let targetUser: User | undefined;

		if (body.userId && DEMO_USERS[body.userId]) {
			targetUser = DEMO_USERS[body.userId];
		} else if (body.role && DEMO_USERS_BY_ROLE[body.role]) {
			targetUser = DEMO_USERS_BY_ROLE[body.role];
		}

		if (!targetUser) {
			throw ApiErrors.validationError(
				[{ field: 'role', code: 'invalid', message: 'Peran atau pengguna demo tidak valid' }],
				'Permintaan tidak valid'
			);
		}

		setCurrentMockUser(targetUser);

		return {
			token: `mock-token-${targetUser.id}-${clock.now().getTime()}`,
			user: targetUser,
			feature_flags: currentFlags,
			permissions: [targetUser.role]
		};
	});

	// POST /api/v1/auth/step-up
	router.post(Endpoints.AUTH.STEP_UP, async (ctx: RouteContext) => {
		const body = (ctx.req.body || {}) as { password?: string; pin?: string };
		const pass = body.password || body.pin;

		// Default demo password/pin adalah "123456", "hanjo123", atau "demo" (§MS-05)
		if (pass !== '123456' && pass !== 'hanjo123' && pass !== 'demo') {
			throw ApiErrors.validationError(
				[
					{
						field: 'password',
						code: 'invalid_credentials',
						message: 'Kata sandi atau PIN step-up salah. (Gunakan 123456 untuk demo)'
					}
				],
				'Konfirmasi step-up gagal'
			);
		}

		return {
			step_up_token: `stepup_${clock.now().getTime()}_${Math.random().toString(36).substring(2, 9)}`,
			expires_in_seconds: 300
		};
	});
}
