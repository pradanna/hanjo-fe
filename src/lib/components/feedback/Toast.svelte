<script lang="ts">
	import { toast } from './toast.svelte.js';

	interface Props {
		position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
	}

	let { position = 'top-right' }: Props = $props();

	const positionClass = $derived(
		{
			'top-right': 'top-5 right-5',
			'top-left': 'top-5 left-5',
			'bottom-right': 'bottom-5 right-5',
			'bottom-left': 'bottom-5 left-5'
		}[position]
	);
</script>

{#if toast.items.length > 0}
	<div
		class="toast-container {positionClass}"
		role="region"
		aria-label="Pemberitahuan Sistem"
		aria-live="polite"
	>
		{#each toast.items as item (item.id)}
			<div
				class="toast-card toast-{item.type}"
				role="alert"
				data-type={item.type}
			>
				<div class="toast-icon">
					{#if item.type === 'success'}
						<svg class="icon" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
								clip-rule="evenodd"
							/>
						</svg>
					{:else if item.type === 'error'}
						<svg class="icon" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
								clip-rule="evenodd"
							/>
						</svg>
					{:else if item.type === 'warning'}
						<svg class="icon" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
								clip-rule="evenodd"
							/>
						</svg>
					{:else}
						<svg class="icon" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
								clip-rule="evenodd"
							/>
						</svg>
					{/if}
				</div>

				<div class="toast-content">
					<div class="toast-title">{item.title}</div>
					{#if item.message}
						<div class="toast-message">{item.message}</div>
					{/if}
				</div>

				{#if item.dismissible}
					<button
						type="button"
						class="toast-dismiss"
						aria-label="Tutup notifikasi"
						onclick={() => toast.dismiss(item.id)}
					>
						<svg class="close-icon" viewBox="0 0 20 20" fill="currentColor">
							<path
								d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
							/>
						</svg>
					</button>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.toast-container {
		position: fixed;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 10px;
		max-width: 420px;
		width: calc(100vw - 32px);
		pointer-events: none;
	}

	.top-5 { top: 20px; }
	.right-5 { right: 20px; }
	.left-5 { left: 20px; }
	.bottom-5 { bottom: 20px; }

	.toast-card {
		pointer-events: auto;
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 14px 16px;
		border-radius: var(--radius-lg, 12px);
		background: var(--bg-panel, #ffffff);
		border: 1px solid var(--border-panel, #e2e8f0);
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
		animation: toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
		transition: transform 0.2s, opacity 0.2s;
	}

	@keyframes toastSlideIn {
		from {
			opacity: 0;
			transform: translateY(-8px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.toast-icon {
		flex-shrink: 0;
		width: 22px;
		height: 22px;
		margin-top: 1px;
	}

	.icon {
		width: 22px;
		height: 22px;
	}

	.toast-content {
		flex: 1;
		min-width: 0;
	}

	.toast-title {
		font-weight: 600;
		font-size: 13.5px;
		color: var(--text-main, #0f172a);
		line-height: 1.35;
	}

	.toast-message {
		font-size: 12.5px;
		color: var(--text-muted, #475569);
		margin-top: 3px;
		line-height: 1.4;
		word-break: break-word;
	}

	.toast-dismiss {
		flex-shrink: 0;
		background: none;
		border: none;
		color: var(--text-muted, #94a3b8);
		padding: 4px;
		cursor: pointer;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.15s, background-color 0.15s;
	}

	.toast-dismiss:hover {
		color: #0f172a;
		background: #f1f5f9;
	}

	.close-icon {
		width: 16px;
		height: 16px;
	}

	/* Variants */
	.toast-success {
		border-left: 4px solid #059669;
	}
	.toast-success .toast-icon {
		color: #059669;
	}

	.toast-error {
		border-left: 4px solid #dc2626;
	}
	.toast-error .toast-icon {
		color: #dc2626;
	}

	.toast-warning {
		border-left: 4px solid #d97706;
	}
	.toast-warning .toast-icon {
		color: #d97706;
	}

	.toast-info {
		border-left: 4px solid #2563eb;
	}
	.toast-info .toast-icon {
		color: #2563eb;
	}
</style>
