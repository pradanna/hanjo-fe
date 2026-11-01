<script lang="ts">
	/**
	 * Reusable Side Drawer Component
	 * Mengikuti Golden Rule 3 (Component-First), Golden Rule 10 (Design Tokens),
	 * Golden Rule 14 (Generous Padding & Anti-Sesak).
	 */
	import type { Snippet } from 'svelte';
	import { lockScroll, unlockScroll } from '../../utils/scrollLock.js';

	interface Props {
		open?: boolean;
		title?: string;
		subtitle?: string;
		width?: string;
		onclose?: () => void;
		children?: Snippet;
		footer?: Snippet;
	}

	let {
		open = false,
		title = '',
		subtitle = '',
		width = '390px',
		onclose,
		children,
		footer
	}: Props = $props();

	$effect(() => {
		if (open) {
			lockScroll();
			return () => {
				unlockScroll();
			};
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open && onclose) {
			onclose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="drawer-backdrop"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget && onclose) onclose();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape' && onclose) onclose();
		}}
	>
		<div class="drawer-panel" style="max-width: {width};">
			{#if title}
				<div class="drawer-header">
					<div class="drawer-titles">
						<h3 class="drawer-title">{title}</h3>
						{#if subtitle}
							<p class="drawer-subtitle">{subtitle}</p>
						{/if}
					</div>
					{#if onclose}
						<button
							type="button"
							class="drawer-close-btn"
							onclick={onclose}
							aria-label="Tutup panel"
						>
							<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="18" y1="6" x2="6" y2="18"></line>
								<line x1="6" y1="6" x2="18" y2="18"></line>
							</svg>
						</button>
					{/if}
				</div>
			{/if}

			<div class="drawer-body">
				{#if children}
					{@render children()}
				{/if}
			</div>

			{#if footer}
				<div class="drawer-footer">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.drawer-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		backdrop-filter: blur(4px);
		z-index: 1050;
		display: flex;
		justify-content: flex-end;
		animation: fadeIn 0.18s ease-out;
		overscroll-behavior: contain;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.drawer-panel {
		width: 100%;
		height: 100vh;
		background: var(--bg-panel, #1e293b);
		border-left: 1px solid var(--border-panel, rgba(255, 255, 255, 0.1));
		box-shadow: -6px 0 28px rgba(0, 0, 0, 0.35);
		display: flex;
		flex-direction: column;
		animation: slideInRight 0.24s cubic-bezier(0.16, 1, 0.3, 1);
		position: relative;
		overflow: hidden;
		overscroll-behavior: contain;
	}

	@keyframes slideInRight {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	.drawer-header {
		padding: 20px 24px;
		border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		background: var(--bg-panel, #1e293b);
		flex-shrink: 0;
	}

	.drawer-titles {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.drawer-title {
		font-size: 16.5px;
		font-weight: 700;
		color: var(--text-main, #f8fafc);
		letter-spacing: -0.01em;
		margin: 0;
	}

	.drawer-subtitle {
		font-size: 12.5px;
		color: var(--text-muted, #94a3b8);
		margin: 0;
		line-height: 1.4;
	}

	.drawer-close-btn {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: var(--bg-panel-sub, rgba(255, 255, 255, 0.04));
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
		color: var(--text-muted, #94a3b8);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.drawer-close-btn:hover {
		color: var(--text-main, #f8fafc);
		background: var(--bg-panel-hover, rgba(255, 255, 255, 0.08));
		border-color: var(--border-panel, rgba(255, 255, 255, 0.15));
	}

	.drawer-body {
		flex: 1;
		overflow-y: auto;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		overscroll-behavior: contain;
	}

	.drawer-footer {
		padding: 16px 24px;
		border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
		background: var(--bg-panel, #1e293b);
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 12px;
		flex-shrink: 0;
	}

	@media (max-width: 640px) {
		.drawer-panel {
			max-width: 100% !important;
		}

		.drawer-header {
			padding: 16px 20px;
		}

		.drawer-body {
			padding: 20px;
		}

		.drawer-footer {
			padding: 14px 20px;
		}
	}
</style>
