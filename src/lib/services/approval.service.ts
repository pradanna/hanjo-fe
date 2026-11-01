/**
 * Service API: Mesin Persetujuan Multi-Tier & Inbox (MS-05)
 * Mengikuti Golden Rule 1: UI -> Domain Service -> ApiClient -> DataDriver.
 */

import { apiClient } from '../api/client.js';
import { Endpoints } from '../api/contract/endpoints.js';
import type {
	ApprovalRequest,
	ApprovalRule,
	EvaluateApprovalInput,
	EvaluateApprovalResult,
	ApproveRequestPayload,
	RejectRequestPayload,
	CancelRequestPayload,
	StepUpResponse
} from '../api/contract/types.js';

export interface ApprovalQueryFilter {
	tab?: 'pending_for_me' | 'submitted_by_me' | 'history';
	type?: string;
	outlet_id?: string;
	status?: string;
	search?: string;
}

export class ApprovalService {
	// =========================================================================
	// 1. Permintaan Persetujuan (Approval Requests)
	// =========================================================================

	async getRequests(query?: ApprovalQueryFilter): Promise<ApprovalRequest[]> {
		return apiClient.get<ApprovalRequest[]>(Endpoints.APPROVALS.REQUESTS, {
			query: query as Record<string, unknown>
		});
	}

	async getRequest(id: string): Promise<ApprovalRequest> {
		return apiClient.get<ApprovalRequest>(Endpoints.APPROVALS.REQUEST_DETAIL(id));
	}

	async createRequest(payload: Partial<ApprovalRequest>): Promise<ApprovalRequest> {
		return apiClient.post<ApprovalRequest>(Endpoints.APPROVALS.REQUESTS, payload);
	}

	async approve(
		id: string,
		payload: ApproveRequestPayload = {},
		ifMatchVersion?: number
	): Promise<ApprovalRequest> {
		return apiClient.post<ApprovalRequest>(
			Endpoints.APPROVALS.APPROVE(id),
			payload,
			ifMatchVersion !== undefined ? { ifMatchVersion } : undefined
		);
	}

	async reject(
		id: string,
		payload: RejectRequestPayload,
		ifMatchVersion?: number
	): Promise<ApprovalRequest> {
		return apiClient.post<ApprovalRequest>(
			Endpoints.APPROVALS.REJECT(id),
			payload,
			ifMatchVersion !== undefined ? { ifMatchVersion } : undefined
		);
	}

	async cancel(
		id: string,
		payload: CancelRequestPayload = {},
		ifMatchVersion?: number
	): Promise<ApprovalRequest> {
		return apiClient.post<ApprovalRequest>(
			Endpoints.APPROVALS.CANCEL(id),
			payload,
			ifMatchVersion !== undefined ? { ifMatchVersion } : undefined
		);
	}

	// =========================================================================
	// 2. Aturan Persetujuan (Approval Rules)
	// =========================================================================

	async getRules(query?: { document_type?: string; is_active?: boolean }): Promise<ApprovalRule[]> {
		return apiClient.get<ApprovalRule[]>(Endpoints.APPROVALS.RULES, {
			query: query as Record<string, unknown>
		});
	}

	async getRule(id: string): Promise<ApprovalRule> {
		return apiClient.get<ApprovalRule>(Endpoints.APPROVALS.RULE_DETAIL(id));
	}

	async createRule(rule: Partial<ApprovalRule>): Promise<ApprovalRule> {
		return apiClient.post<ApprovalRule>(Endpoints.APPROVALS.RULES, rule);
	}

	async updateRule(
		id: string,
		rule: Partial<ApprovalRule>,
		ifMatchVersion?: number
	): Promise<ApprovalRule> {
		return apiClient.put<ApprovalRule>(
			Endpoints.APPROVALS.RULE_DETAIL(id),
			rule,
			ifMatchVersion !== undefined ? { ifMatchVersion } : undefined
		);
	}

	async evaluateRules(input: EvaluateApprovalInput): Promise<EvaluateApprovalResult> {
		return apiClient.post<EvaluateApprovalResult>(Endpoints.APPROVALS.EVALUATE, input);
	}

	// =========================================================================
	// 3. Step-Up Authentication
	// =========================================================================

	async verifyStepUp(password: string): Promise<StepUpResponse> {
		return apiClient.post<StepUpResponse>(Endpoints.AUTH.STEP_UP, {
			password
		});
	}
}

export const approvalService = new ApprovalService();
