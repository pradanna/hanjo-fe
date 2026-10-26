<script lang="ts">
	/**
	 * CodeBadge Component Hanjo ERP
	 * Referensi: AGENTS.md §2 (Invarian Monorepo: Code badge lebar/padding fleksibel min-width >= 68px)
	 *
	 * Komponen badge kode SKU/kategori/master dengan gaya monospace hijau neon khas Hanjo,
	 * konsisten lintas Master Bahan Baku, Kategori, Menu, Resep, dan Modifier.
	 */
	import type { Snippet } from 'svelte';

	interface Props {
		code?: string;
		text?: string;
		variant?: 'emerald' | 'cyan' | 'amber' | 'indigo' | 'muted';
		class?: string;
		title?: string;
		children?: Snippet;
	}

	let {
		code = '',
		text = '',
		variant = 'emerald',
		class: className = '',
		title,
		children
	}: Props = $props();

	const displayContent = $derived(code || text);
</script>

<span
	class="code-badge variant-{variant} {className}"
	title={title || displayContent}
>
	{#if children}
		{@render children()}
	{:else}
		{displayContent}
	{/if}
</span>

<style>
	.code-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 68px;
		padding: 4px 12px;
		border-radius: 6px;
		font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
		font-size: 11.5px;
		font-weight: 700;
		letter-spacing: 0.03em;
		background: var(--bg-panel-sub, #0f172a);
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
		width: fit-content;
		white-space: nowrap;
		box-sizing: border-box;
		line-height: 1.35;
		font-variant-numeric: tabular-nums;
		font-feature-settings: 'tnum' on, 'lnum' on;
		transition: border-color 0.15s ease, background-color 0.15s ease;
	}

	.code-badge:hover {
		border-color: rgba(16, 185, 129, 0.35);
	}

	.variant-emerald {
		color: var(--brand-primary, #10b981);
	}

	.variant-cyan {
		color: #38bdf8;
		border-color: rgba(56, 189, 248, 0.2);
	}

	.variant-amber {
		color: #fbbf24;
		border-color: rgba(251, 191, 36, 0.2);
	}

	.variant-indigo {
		color: #818cf8;
		border-color: rgba(129, 140, 248, 0.2);
	}

	.variant-muted {
		color: var(--text-muted, #94a3b8);
	}
</style>
