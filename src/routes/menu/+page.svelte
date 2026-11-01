<script lang="ts">
	/**
	 * Halaman Master Menu, Varian, Resep Berversi (BOM), Modifier & Ketersediaan Gerai
	 * Referensi: PRD §6, MILESTONE.md §MS-04
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { menuStore } from '#lib/features/menu/stores/menu.svelte.js';
	import { catalogStore } from '#lib/features/catalog/stores/catalog.svelte.js';

	import '#lib/features/catalog/catalog.css';
	import '#lib/features/menu/menu.css';

	import Icon from '#lib/components/data/Icon.svelte';
	import MenuItemsTab from '#lib/features/menu/components/tabs/MenuItemsTab.svelte';
	import MenuCategoriesTab from '#lib/features/menu/components/tabs/MenuCategoriesTab.svelte';
	import RecipesTab from '#lib/features/menu/components/tabs/RecipesTab.svelte';
	import ModifiersTab from '#lib/features/menu/components/tabs/ModifiersTab.svelte';
	import NotePresetsTab from '#lib/features/menu/components/tabs/NotePresetsTab.svelte';
	import ChannelPricingTab from '#lib/features/menu/components/tabs/ChannelPricingTab.svelte';
	import OutletAvailabilityTab from '#lib/features/menu/components/tabs/OutletAvailabilityTab.svelte';

	import MenuItemDetailDrawer from '#lib/features/menu/components/MenuItemDetailDrawer.svelte';
	import MenuItemFormModal from '#lib/features/menu/components/MenuItemFormModal.svelte';
	import MenuCategoryFormModal from '#lib/features/menu/components/MenuCategoryFormModal.svelte';
	import RecipeEditorModal from '#lib/features/menu/components/RecipeEditorModal.svelte';
	import ModifierGroupFormModal from '#lib/features/menu/components/ModifierGroupFormModal.svelte';
	import NotePresetFormModal from '#lib/features/menu/components/NotePresetFormModal.svelte';
	import PricingCalculatorModal from '#lib/features/menu/components/PricingCalculatorModal.svelte';

	type MenuTab = 'menus' | 'categories' | 'recipes' | 'modifiers' | 'notes' | 'pricing' | 'availability';
	let activeTab = $state<MenuTab>('menus');

	function setTab(tab: MenuTab) {
		activeTab = tab;
		try { window.location.hash = tab; } catch {}
	}

	const tabs = $derived<{ id: MenuTab; htmlId: string; label: string; icon: string; count?: number }[]>([
		{ id: 'menus', htmlId: 'tab-menu-siap-jual', label: 'Menu & Varian', icon: 'book-open', count: menuStore.menuItems.length },
		{ id: 'categories', htmlId: 'tab-kategori-menu', label: 'Kategori Menu', icon: 'tag', count: menuStore.categories.length },
		{ id: 'recipes', htmlId: 'tab-resep-berversi', label: 'Resep & HPP', icon: 'clipboard-document-list', count: menuStore.recipes.length },
		{ id: 'modifiers', htmlId: 'tab-modifier', label: 'Add-ons & Ekstra', icon: 'sparkles', count: menuStore.modifierGroups.length },
		{ id: 'notes', htmlId: 'tab-preset-catatan', label: 'Preset Catatan Dapur', icon: 'chat-bubble-bottom-center-text', count: menuStore.notePresets.length },
		{ id: 'pricing', htmlId: 'tab-harga-channel', label: 'Harga & Channel', icon: 'calculator', count: menuStore.channels.length },
		{ id: 'availability', htmlId: 'tab-ketersediaan', label: 'Ketersediaan Gerai', icon: 'building-storefront' }
	]);

	$effect(() => {
		const tabParam = page.url.searchParams.get('tab');
		const ingredientParam = page.url.searchParams.get('ingredient_id') || page.url.searchParams.get('ingredient');
		const hash = page.url.hash.replace('#', '');
		if (tabParam && ['menus', 'categories', 'recipes', 'modifiers', 'notes', 'pricing', 'availability'].includes(tabParam)) {
			activeTab = tabParam as MenuTab;
		} else if (hash && ['menus', 'categories', 'recipes', 'modifiers', 'notes', 'pricing', 'availability'].includes(hash)) {
			activeTab = hash as MenuTab;
		}
		if (ingredientParam) menuStore.recipeIngredientFilter = ingredientParam;
	});

	onMount(() => {
		catalogStore.loadAll();
		menuStore.loadAll();
		try {
			const hash = window.location.hash.replace('#', '');
			if (hash && ['menus', 'categories', 'recipes', 'modifiers', 'notes', 'pricing', 'availability'].includes(hash)) {
				activeTab = hash as MenuTab;
			} else if (hash === 'proposals') {
				activeTab = 'recipes';
			}
		} catch {}
	});
</script>

<svelte:head>
	<title>Menu &amp; Resep | Hanjo ERP</title>
</svelte:head>

<div class="catalog-page-container">
	<!-- 1. Page Header -->
	<header class="catalog-page-header">
		<div class="page-header-lead">
			<div class="page-header-icon"><Icon name="book-open" size={26} /></div>
			<div class="page-header-text">
				<h1 class="page-title">Katalog Menu &amp; Resep</h1>
				<p class="page-subtitle">Master menu siap jual, formula resep berversi, modifier opsional, margin HPP, dan ketersediaan per gerai.</p>
			</div>
		</div>
	</header>

	<!-- 2. Hero KPI Strip (4 Kolom Responsif) -->
	<div class="catalog-hero-stats">
		<div class="stat-box"><span class="stat-box-title">Menu Siap Jual</span><span class="stat-box-val">{menuStore.menuItems.length}</span><span class="stat-box-sub">{menuStore.totalVariantsCount} Varian Aktif</span></div>
		<div class="stat-box"><span class="stat-box-title">Resep Berversi</span><span class="stat-box-val">{menuStore.recipes.length}</span><span class="stat-box-sub">Formula Resep &amp; Override</span></div>
		<div class="stat-box"><span class="stat-box-title">Add-ons &amp; Catatan</span><span class="stat-box-val">{menuStore.modifierGroups.length} Add-on</span><span class="stat-box-sub">{menuStore.notePresets.length} Preset Catatan Dapur</span></div>
		<div class="stat-box"><span class="stat-box-title">Channel Penjualan</span><span class="stat-box-val">{menuStore.channels.length} Channel</span><span class="stat-box-sub">Dine-In, App, Marketplace</span></div>
	</div>

	<!-- 3. Workspace Terpadu Menu & Resep (1 Panel Solid) -->
	<div class="catalog-workspace-panel">
		<nav class="catalog-tabs-nav" aria-label="Tab Menu dan Resep">
			{#each tabs as t}
				<button type="button" class="catalog-tab-btn {activeTab === t.id ? 'active' : ''}" onclick={() => setTab(t.id)} id={t.htmlId}>
					<Icon name={t.icon} size={16} />
					<span>{t.label}{t.count !== undefined ? ` (${t.count})` : ''}</span>
				</button>
			{/each}
		</nav>

		{#if activeTab === 'menus'}
			<MenuItemsTab />
		{:else if activeTab === 'categories'}
			<MenuCategoriesTab onsetTab={(tab) => setTab(tab)} />
		{:else if activeTab === 'recipes'}
			<RecipesTab />
		{:else if activeTab === 'modifiers'}
			<ModifiersTab />
		{:else if activeTab === 'notes'}
			<NotePresetsTab />
		{:else if activeTab === 'pricing'}
			<ChannelPricingTab />
		{:else if activeTab === 'availability'}
			<OutletAvailabilityTab />
		{/if}
	</div>
</div>

<!-- Modal Dialogs & Drawers Global Menu & Resep -->
<MenuItemDetailDrawer />
<MenuItemFormModal />
<MenuCategoryFormModal open={menuStore.isCategoryModalOpen} category={menuStore.editingCategory} onclose={() => menuStore.closeCategoryModal()} onsave={(data) => menuStore.saveCategory(data)} />
<RecipeEditorModal />
<ModifierGroupFormModal />
<NotePresetFormModal open={menuStore.isNotePresetModalOpen} preset={menuStore.editingNotePreset as any} onclose={() => { menuStore.isNotePresetModalOpen = false; menuStore.editingNotePreset = null; }} onsave={async (data) => { try { await menuStore.saveNotePreset(data); return true; } catch { return false; } }} />
<PricingCalculatorModal />
