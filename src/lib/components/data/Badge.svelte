<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'success' | 'warning' | 'danger' | 'info' | 'live' | 'neutral';
		text?: string;
		dot?: boolean;
		size?: 'sm' | 'md';
		children?: Snippet;
		class?: string;
	}

	let {
		variant = 'neutral',
		text = '',
		dot = false,
		size = 'md',
		children,
		class: className = ''
	}: Props = $props();
</script>

<span class="pill-badge pill-{variant} size-{size} {className}">
	{#if dot}
		<span class="badge-dot"></span>
	{/if}
	{#if children}
		{@render children()}
	{/if}
	{#if !children && text}
		{text}
	{/if}
</span>

<style>
	.pill-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: 600;
		border-radius: var(--radius-full, 9999px);
		white-space: nowrap;
		line-height: 1.35;
		transition: all 0.15s;
		box-sizing: border-box;
	}

	.size-sm {
		font-size: 11px;
		padding: 4px 13px;
	}

	.size-md {
		font-size: 12px;
		padding: 5px 16px;
	}

	.pill-neutral {
		background: var(--bg-panel-sub);
		color: var(--text-muted);
		border: 1px solid var(--border-panel);
	}

	.pill-live {
		background-color: var(--pill-live-bg);
		color: var(--pill-live-text);
		font-weight: 700;
		letter-spacing: 0.5px;
	}

	.pill-success {
		background-color: var(--pill-success-bg);
		color: var(--pill-success-text);
		border: 1px solid var(--pill-success-border);
	}

	.pill-warning {
		background-color: var(--pill-warning-bg);
		color: var(--pill-warning-text);
		border: 1px solid var(--pill-warning-border);
	}

	.pill-danger {
		background-color: var(--pill-danger-bg);
		color: var(--pill-danger-text);
		border: 1px solid var(--pill-danger-border);
	}

	.pill-info {
		background-color: var(--pill-info-bg);
		color: var(--pill-info-text);
		border: 1px solid var(--pill-info-border);
	}

	.badge-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background-color: currentColor;
	}
</style>
