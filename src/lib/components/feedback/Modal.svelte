<script lang="ts">
	import type { Snippet } from 'svelte';
	import { lockScroll, unlockScroll } from '../../utils/scrollLock.js';

	interface Props {
		open?: boolean;
		title?: string;
		subtitle?: string;
		maxWidth?: string;
		onclose?: () => void;
		header?: Snippet;
		children?: Snippet;
		footer?: Snippet;
	}

	let {
		open = false,
		title = '',
		subtitle = '',
		maxWidth = '520px',
		onclose,
		header,
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
		class="modal-backdrop"
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
		<div class="modal-card" style="max-width: {maxWidth};">
			{#if header || title}
				<div class="modal-header">
					{#if header}
						{@render header()}
					{:else}
						<div class="modal-titles">
							<h3 class="modal-title">{title}</h3>
							{#if subtitle}
								<p class="modal-subtitle">{subtitle}</p>
							{/if}
						</div>
					{/if}
					{#if onclose}
						<button
							type="button"
							class="modal-close-btn"
							onclick={onclose}
							aria-label="Tutup dialog"
						>
							<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="18" y1="6" x2="6" y2="18"></line>
								<line x1="6" y1="6" x2="18" y2="18"></line>
							</svg>
						</button>
					{/if}
				</div>
			{/if}

			<div class="modal-body">
				{#if children}
					{@render children()}
				{/if}
			</div>

			{#if footer}
				<div class="modal-footer">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		backdrop-filter: blur(4px);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		animation: fadeIn 0.15s ease-out;
		overscroll-behavior: contain;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.modal-card {
		width: 100%;
		background: var(--bg-panel);
		border: 1px solid var(--border-panel);
		border-radius: var(--radius-xl);
		box-shadow: 0 20px 45px rgba(0, 0, 0, 0.45);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		max-height: calc(100vh - 40px);
		animation: scaleUp 0.15s ease-out;
		overscroll-behavior: contain;
	}

	@keyframes scaleUp {
		from { transform: scale(0.96); opacity: 0; }
		to { transform: scale(1); opacity: 1; }
	}

	.modal-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		padding: 18px 24px;
		border-bottom: 1px solid var(--border-panel);
		background: var(--bg-panel-sub);
	}

	.modal-titles {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.modal-title {
		font-size: 15.5px;
		font-weight: 700;
		color: var(--text-main);
	}

	.modal-subtitle {
		font-size: 12px;
		color: var(--text-muted);
		margin: 0;
	}

	.modal-close-btn {
		color: var(--text-subtle);
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		padding: 6px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.15s, background 0.15s;
	}

	.modal-close-btn:hover {
		color: var(--text-main);
		background: var(--bg-panel-hover);
	}

	.modal-body {
		padding: 24px;
		overflow-y: auto;
		flex: 1;
		overscroll-behavior: contain;
	}

	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 12px;
		padding: 20px 24px;
		border-top: 1px solid var(--border-panel);
		background: var(--bg-panel-sub);
	}
</style>
