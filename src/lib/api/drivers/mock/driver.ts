/**
 * Mock Data Driver
 * Referensi: MILESTONE.md §3.3
 *
 * Mengimplementasikan `DataDriver`. Menerima `ApiRequest`, meneruskannya
 * ke `router.dispatch()`, dan mengembalikan `ApiResponse<T>` yang terstandarisasi.
 */

import type { ApiRequest, ApiResponse, DataDriver, Envelope } from '../../contract/types.js';
import { AppError } from '../../contract/errors.js';
import { router } from './engine/router.js';
import { registerAuthHandlers } from './handlers/auth.js';
import { registerDevHandlers } from './handlers/dev.js';
import { registerNavHandlers } from './handlers/nav.js';
import { registerDashboardHandlers } from './handlers/dashboard.js';
import { registerEodHandlers } from './handlers/eod.js';
import { registerOrganizationHandlers } from './handlers/organization.js';
import { registerCatalogHandlers } from './handlers/catalog.js';
import { registerMenuHandlers } from './handlers/menu.js';
import { registerApprovalHandlers } from './handlers/approval.js';

export class MockDriver implements DataDriver {
	async request<T>(req: ApiRequest): Promise<ApiResponse<T>> {
		try {
			const result = await router.dispatch(req);

			// Jika handler sudah mengembalikan struktur ApiResponse lengkap
			if (result && typeof result === 'object' && 'status' in result && 'body' in result) {
				return result as ApiResponse<T>;
			}

			// Jika handler mengembalikan envelope data { data: ... } atau { data: ..., meta: ... }
			if (result && typeof result === 'object' && 'data' in result) {
				return {
					status: 200,
					body: result as Envelope<T>,
					headers: { 'Content-Type': 'application/json' }
				};
			}

			// Bungkus data mentah ke dalam Envelope baku
			return {
				status: 200,
				body: { data: result } as Envelope<T>,
				headers: { 'Content-Type': 'application/json' }
			};
		} catch (error: any) {
			if (error instanceof AppError) {
				return {
					status: error.status,
					body: error.envelope,
					headers: { 'Content-Type': 'application/json' }
				};
			}

			// Galat tak terduga (500)
			const message = error instanceof Error ? error.message : 'Terjadi galat server yang tidak diharapkan';
			return {
				status: 500,
				body: {
					error: {
						code: 'server_error',
						message
					}
				},
				headers: { 'Content-Type': 'application/json' }
			};
		}
	}
}

export const mockDriver = new MockDriver();

// Registrasi handler awal
registerAuthHandlers();
registerDevHandlers();
registerNavHandlers();
registerDashboardHandlers();
registerEodHandlers();
registerOrganizationHandlers();
registerCatalogHandlers();
registerMenuHandlers();
registerApprovalHandlers();
