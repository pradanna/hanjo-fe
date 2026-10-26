<script lang="ts">
	import './sidebar.css';
	import { page } from '$app/state';
	import { session } from '../../auth/session.svelte.js';
	import { getNavigationForUser } from '../../config/navigation.js';
	import { navBadges } from '../../features/nav/stores/badges.svelte.js';

	interface Props {
		isCollapsed?: boolean;
		onToggleCollapse?: () => void;
	}

	let { isCollapsed = false, onToggleCollapse }: Props = $props();

	let currentPath = $derived(page.url.pathname);
	let openAccordion = $state<string | null>(null);

	// Hitung daftar navigasi dinamis sesuai izin (PBAC) & flag aktif pengguna
	const navSections = $derived(
		getNavigationForUser(session.currentUser, session.featureFlags)
	);

	// Muat ulang lencana ketika peran pengguna berubah
	$effect(() => {
		if (session.currentRole) {
			navBadges.refresh();
		}
	});

	// Buka accordion secara otomatis jika rute aktif berada di dalamnya
	$effect(() => {
		for (const sec of navSections) {
			for (const item of sec.items) {
				if (item.subItems && currentPath.startsWith(item.href) && item.href !== '/') {
					openAccordion = item.id;
					return;
				}
			}
		}
	});

	function toggleAccordion(itemId: string) {
		if (openAccordion === itemId) {
			openAccordion = null;
		} else {
			openAccordion = itemId;
		}
	}
</script>

<aside class="sidebar" class:collapsed={isCollapsed} aria-label="Navigasi Utama">
	<!-- Brand Header -->
	<div class="brand">
		<div class="brand-center">
			{#if !isCollapsed}
				<a href="/" class="brand-logo-link" title="Hanjō ERP & POS">
					<img src="/logo-light.png?v=5" alt="Hanjō Logo" class="brand-logo-img light-only" />
					<img src="/logo-dark.png?v=5" alt="Hanjō Logo" class="brand-logo-img dark-only" />
				</a>
			{:else}
				<a href="/" class="brand-emblem-link" title="Hanjō ERP & POS">
					<img src="/logo-emblem.png?v=5" alt="Hanjō Emblem" class="brand-emblem-img light-only" />
					<img src="/logo-emblem-dark.png?v=5" alt="Hanjō Emblem" class="brand-emblem-img dark-only" />
				</a>
			{/if}
		</div>

		{#if onToggleCollapse}
			<button
				type="button"
				class="collapse-toggle-btn"
				aria-label={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
				onclick={onToggleCollapse}
			>
				<svg
					class="toggle-icon"
					class:flipped={isCollapsed}
					viewBox="0 0 24 24"
					width="14"
					height="14"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<polyline points="15 18 9 12 15 6"></polyline>
				</svg>
			</button>
		{/if}
	</div>

	<!-- Navigation Menu List -->
	<nav class="nav-container">
		{#each navSections as section (section.id)}
			<div class="nav-section">
				{#if section.title && !isCollapsed}
					<div class="nav-section-title">{section.title}</div>
				{/if}

				{#each section.items as item (item.id)}
					{@const isActive = item.href === '/' ? currentPath === '/' : currentPath.startsWith(item.href)}
					{@const hasSubmenu = !!item.subItems && item.subItems.length > 0}
					{@const isOpen = openAccordion === item.id}
					{@const badgeCount = item.badgeKey ? navBadges.get(item.badgeKey) : 0}

					{#if hasSubmenu}
						<div class="accordion-item" class:is-open={isOpen}>
							<button
								type="button"
								class="nav-item has-submenu"
								class:active={isActive}
								onclick={() => toggleAccordion(item.id)}
								title={isCollapsed ? item.title : undefined}
								aria-expanded={isOpen}
							>
								<span class="nav-icon" aria-hidden="true">
									{#if item.icon === 'pos'}
										<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line><circle cx="7" cy="14" r="1.5"></circle><circle cx="12" cy="14" r="1.5"></circle><circle cx="17" cy="14" r="1.5"></circle></svg>
									{:else if item.icon === 'inventory'}
										<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
									{:else if item.icon === 'procurement'}
										<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
									{:else if item.icon === 'petty_cash'}
										<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
									{:else if item.icon === 'finance'}
										<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
									{:else if item.icon === 'reports'}
										<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
									{:else if item.icon === 'catalog' || item.icon === 'menu'}
										<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
									{:else if item.icon === 'materials'}
										<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
									{:else if item.icon === 'suppliers'}
										<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
									{:else if item.icon === 'outlets'}
										<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
									{:else if item.icon === 'settings'}
										<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
									{:else}
										<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>
									{/if}
								</span>

								{#if !isCollapsed}
									<span class="nav-label">{item.title}</span>
									{#if badgeCount > 0}
										<span class="badge-count badge-{item.badgeVariant || 'warning'}">
											{badgeCount}
										</span>
									{/if}
									<svg
										class="accordion-chevron"
										class:rotate={isOpen}
										viewBox="0 0 24 24"
										width="13"
										height="13"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<polyline points="6 9 12 15 18 9"></polyline>
									</svg>
								{:else if badgeCount > 0}
									<span
										class="collapsed-badge-dot badge-{item.badgeVariant || 'warning'}"
										title="{badgeCount} item menunggu tindakan"
									></span>
								{/if}
							</button>

							{#if !isCollapsed && isOpen && item.subItems}
								<div class="submenu-list">
									{#each item.subItems as sub}
										{@const isSubActive = currentPath === sub.href || (sub.href.includes('#') && currentPath + (page.url.hash || '') === sub.href)}
										{@const subBadgeCount = sub.badgeKey ? navBadges.get(sub.badgeKey) : 0}
										<a href={sub.href} class="submenu-item" class:active={isSubActive}>
											<span>{sub.title}</span>
											{#if subBadgeCount > 0}
												<span class="badge-count badge-sm badge-{sub.badgeVariant || item.badgeVariant || 'warning'}">{subBadgeCount}</span>
											{/if}
										</a>
									{/each}
								</div>
							{/if}

							{#if isCollapsed && item.subItems}
								<div class="collapsed-flyout" role="menu">
									<div class="flyout-header">{item.title}</div>
									{#each item.subItems as sub}
										{@const isSubActive = currentPath === sub.href || (sub.href.includes('#') && currentPath + (page.url.hash || '') === sub.href)}
										{@const subBadgeCount = sub.badgeKey ? navBadges.get(sub.badgeKey) : 0}
										<a href={sub.href} class="submenu-item" class:active={isSubActive} role="menuitem">
											<span>{sub.title}</span>
											{#if subBadgeCount > 0}
												<span class="badge-count badge-sm badge-{sub.badgeVariant || item.badgeVariant || 'warning'}">{subBadgeCount}</span>
											{/if}
										</a>
									{/each}
								</div>
							{/if}
						</div>
					{:else}
						<a
							href={item.href}
							class="nav-item"
							class:active={isActive}
							title={isCollapsed ? item.title : undefined}
						>
							<span class="nav-icon" aria-hidden="true">
								{#if item.icon === 'dashboard'}
									<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
								{:else if item.icon === 'approvals'}
									<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
								{:else if item.icon === 'pos'}
									<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line><circle cx="7" cy="14" r="1.5"></circle><circle cx="12" cy="14" r="1.5"></circle><circle cx="17" cy="14" r="1.5"></circle></svg>
								{:else if item.icon === 'catalog' || item.icon === 'menu'}
									<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
								{:else if item.icon === 'materials'}
									<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
								{:else if item.icon === 'suppliers'}
									<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
								{:else if item.icon === 'outlets'}
									<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
								{:else}
									<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>
								{/if}
							</span>

							{#if !isCollapsed}
								<span class="nav-label">{item.title}</span>
								{#if badgeCount > 0}
									<span class="badge-count badge-{item.badgeVariant || 'warning'}">
										{badgeCount}
									</span>
								{/if}
							{:else if badgeCount > 0}
								<span
									class="collapsed-badge-dot badge-{item.badgeVariant || 'warning'}"
									title="{badgeCount} item menunggu tindakan"
								></span>
							{/if}
						</a>
					{/if}
				{/each}
			</div>
		{/each}
	</nav>
</aside>
