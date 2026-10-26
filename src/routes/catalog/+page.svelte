<script lang="ts">
	/**
	 * Forwarder kompatibilitas rute /catalog ke modul baru:
	 * - /materials (Master Bahan: Bahan Baku, Kategori, Satuan)
	 * - /menu (Menu & Resep: Menu, Varian, Resep, Modifier, Harga, Ketersediaan)
	 * - /suppliers (Direktori Pemasok)
	 */
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Skeleton from '#lib/components/feedback/Skeleton.svelte';

	onMount(() => {
		const hash = window.location.hash.replace('#', '');
		if (['menus', 'recipes', 'modifiers', 'pricing', 'availability', 'proposals'].includes(hash)) {
			goto(`/menu${window.location.hash}`, { replaceState: true });
		} else if (hash === 'suppliers') {
			goto('/suppliers', { replaceState: true });
		} else if (['items', 'categories', 'units'].includes(hash)) {
			goto(`/materials${window.location.hash}`, { replaceState: true });
		} else {
			goto('/materials', { replaceState: true });
		}
	});
</script>

<div class="p-8 max-w-4xl mx-auto flex flex-col gap-4">
	<div class="flex items-center gap-3">
		<div class="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin"></div>
		<span class="text-sm text-[var(--text-muted)] font-medium">Mengarahkan ke modul katalog terkelompok...</span>
	</div>
	<Skeleton count={4} variant="card" />
</div>
