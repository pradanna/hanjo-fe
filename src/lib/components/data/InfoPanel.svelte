<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';
	import Badge from './Badge.svelte';

	interface Props {
		title: string;
		value?: string | number | null;
		icon?: string;
		badge?: string;
		badgeVariant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
		colSpan?: 1 | 2;
		monospace?: boolean;
		variant?: 'default' | 'subtle' | 'highlight';
		valueClass?: string;
		class?: string;
		children?: Snippet;
		action?: Snippet;
	}

	let {
		title,
		value = '',
		icon,
		badge,
		badgeVariant = 'neutral',
		colSpan = 1,
		monospace = false,
		variant = 'default',
		valueClass = '',
		class: className = '',
		children,
		action
	}: Props = $props();
</script>

<div
	class="info-panel variant-{variant} {colSpan === 2 ? 'col-span-2' : ''} {className}"
>
	<div class="info-panel-header">
		<div class="info-panel-title-wrap">
			{#if icon}
				<Icon name={icon} size={14} class="info-panel-icon" />
			{/if}
			<span class="info-panel-title">{title}</span>
		</div>

		{#if action}
			{@render action()}
		{:else if badge}
			<Badge variant={badgeVariant} size="sm" text={badge} />
		{/if}
	</div>

	<div class="info-panel-body">
		{#if children}
			{@render children()}
		{:else}
			<span
				class="info-panel-value {valueClass}"
				class:font-mono={monospace}
			>
				{value || '-'}
			</span>
		{/if}
	</div>
</div>

<style>
	.info-panel {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 14px 16px;
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-xl, 12px);
		box-sizing: border-box;
		transition: border-color 0.15s ease, background-color 0.15s ease;
		min-width: 0;
	}

	.info-panel:hover {
		border-color: var(--border-panel);
	}

	.col-span-2 {
		grid-column: span 2 / span 2;
	}

	.variant-subtle {
		background: transparent;
		border-color: var(--border-subtle);
	}

	.variant-highlight {
		background: var(--bg-panel-hover);
		border-color: var(--brand-primary-glow, rgba(16, 185, 129, 0.25));
	}

	.info-panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.info-panel-title-wrap {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}

	:global(.info-panel-icon) {
		color: var(--text-subtle);
		flex-shrink: 0;
	}

	.info-panel-title {
		font-size: 11.5px;
		font-weight: 500;
		color: var(--text-subtle);
		letter-spacing: 0.01em;
		line-height: 1.3;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.info-panel-body {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.info-panel-value {
		font-size: 13.5px;
		font-weight: 600;
		color: var(--text-main);
		line-height: 1.45;
		word-break: break-word;
	}

	.font-mono {
		font-family: var(--font-mono, monospace);
	}
</style>
