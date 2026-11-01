<script lang="ts">
	/**
	 * Komponen Modal Tambah / Edit Master Menu Siap Jual (PG-cat-menus, T-04.5)
	 * Dilengkapi Pengelolaan Multi-Varian Menu & Harga Dasar (AC-04.1)
	 */
	import { menuStore } from '../stores/menu.svelte.js';
	import { tick } from 'svelte';
	import Icon from '../../../components/data/Icon.svelte';
	import Button from '../../../components/forms/Button.svelte';
	import Modal from '../../../components/feedback/Modal.svelte';
	import Select, { type SelectOption } from '../../../components/forms/Select.svelte';
	import type { MenuItem, MenuVariant } from '../../../api/contract/types.js';

	interface VariantFormRow {
		id?: string;
		name: string;
		code: string;
		sku: string;
		base_price: string;
		is_active: boolean;
	}

	let name = $state('');
	let code = $state('');
	let categoryId = $state('');
	let description = $state('');
	let scopeType = $state<'all_outlets' | 'outlet_set'>('all_outlets');
	let targetOutletIds = $state<string[]>([]);
	let isTimeLimited = $state(false);
	let availableFrom = $state('');
	let availableUntil = $state('');
	let selectedModifierGroupIds = $state<string[]>([]);
	let selectedPresetNoteIds = $state<string[]>([]);
	let modifierSearchQuery = $state('');
	let isModifierDropdownOpen = $state(false);

	let variants = $state<VariantFormRow[]>([
		{
			name: 'Standard',
			code: 'MNU-STD',
			sku: 'MNU-STD',
			base_price: '25000.00',
			is_active: true
		}
	]);

	let searchContainerEl = $state<HTMLElement | null>(null);
	let dropdownEl = $state<HTMLElement | null>(null);
	let dropdownTop = $state(0);
	let dropdownLeft = $state(0);
	let dropdownWidth = $state(0);

	let isSubmitting = $state(false);

	const selectedModifierGroups = $derived(
		menuStore.modifierGroups.filter((g) => selectedModifierGroupIds.includes(g.id))
	);

	const availableModifierGroups = $derived(
		menuStore.modifierGroups.filter((g) => {
			const notSelected = !selectedModifierGroupIds.includes(g.id);
			const q = modifierSearchQuery.trim().toLowerCase();
			if (!q) return notSelected;
			return (
				notSelected &&
				(g.name.toLowerCase().includes(q) ||
					g.code.toLowerCase().includes(q) ||
					(g.description || '').toLowerCase().includes(q) ||
					(g.options || []).some((o) => o.name.toLowerCase().includes(q)))
			);
		})
	);

	const categoryOptions = $derived<SelectOption[]>(
		menuStore.categories.map((c) => ({
			value: c.id,
			label: c.name
		}))
	);

	$effect(() => {
		if (menuStore.editingMenuItem) {
			const item = menuStore.editingMenuItem;
			name = item.name;
			code = item.code;
			categoryId = item.category_id;
			description = item.description || '';
			scopeType = item.scope_type;
			targetOutletIds = item.target_outlet_ids || [];
			isTimeLimited = item.is_time_limited || false;
			availableFrom = item.available_from || '';
			availableUntil = item.available_until || '';
			selectedModifierGroupIds = item.modifier_group_ids || [];
			selectedPresetNoteIds = item.preset_note_ids || ['np-1', 'np-2', 'np-3', 'np-4', 'np-5', 'np-6', 'np-7'];

			if (item.variants && item.variants.length > 0) {
				variants = item.variants.map((v) => ({
					id: v.id,
					name: v.name,
					code: v.code || v.sku || `${item.code}-${v.name.toUpperCase().replace(/\s+/g, '-')}`,
					sku: v.sku || v.code || `${item.code}-${v.name.toUpperCase().replace(/\s+/g, '-')}`,
					base_price: v.base_price,
					is_active: v.is_active ?? true
				}));
			} else {
				variants = [
					{
						id: 'var-1',
						name: 'Standard',
						code: `${item.code}-STD`,
						sku: `${item.code}-STD`,
						base_price: '25000.00',
						is_active: true
					}
				];
			}
		} else {
			name = '';
			const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
			const defaultCode = `MNU-${randomSuffix}`;
			code = defaultCode;
			categoryId = menuStore.categories[0]?.id || '';
			description = '';
			scopeType = 'all_outlets';
			targetOutletIds = [];
			isTimeLimited = false;
			availableFrom = '';
			availableUntil = '';
			selectedModifierGroupIds = [];
			selectedPresetNoteIds = ['np-1', 'np-2', 'np-3', 'np-4', 'np-5', 'np-6', 'np-7'];
			variants = [
				{
					name: 'Standard',
					code: `${defaultCode}-STD`,
					sku: `${defaultCode}-STD`,
					base_price: '25000.00',
					is_active: true
				}
			];
		}
		modifierSearchQuery = '';
		isModifierDropdownOpen = false;
	});

	function handleCodeInput() {
		const clean = code.trim().toUpperCase();
		variants = variants.map((v, i) => {
			const suffix = v.name ? v.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-') : `V${i + 1}`;
			return {
				...v,
				code: `${clean}-${suffix}`,
				sku: `${clean}-${suffix}`
			};
		});
	}

	function handleVariantNameChange(index: number) {
		const cleanCode = code.trim().toUpperCase() || 'MNU';
		const v = variants[index];
		if (v && v.name) {
			const suffix = v.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-');
			if (suffix) {
				v.sku = `${cleanCode}-${suffix}`;
				v.code = `${cleanCode}-${suffix}`;
			}
		}
	}

	function addVariant() {
		const num = variants.length + 1;
		const cleanCode = code.trim().toUpperCase() || 'MNU';
		const defaultName = num === 2 ? 'Iced' : num === 3 ? 'Hot' : `Varian ${num}`;
		const suffix = defaultName.toUpperCase().replace(/[^A-Z0-9]/g, '-');
		const defaultPrice = variants[0]?.base_price || '25000.00';
		variants = [
			...variants,
			{
				id: `var-${num}`,
				name: defaultName,
				code: `${cleanCode}-${suffix}`,
				sku: `${cleanCode}-${suffix}`,
				base_price: defaultPrice,
				is_active: true
			}
		];
	}

	function removeVariant(index: number) {
		if (variants.length <= 1) return;
		variants = variants.filter((_, i) => i !== index);
	}

	function toggleOutlet(outletId: string) {
		if (targetOutletIds.includes(outletId)) {
			targetOutletIds = targetOutletIds.filter((id) => id !== outletId);
		} else {
			targetOutletIds = [...targetOutletIds, outletId];
		}
	}

	function addModifierGroup(groupId: string) {
		if (!selectedModifierGroupIds.includes(groupId)) {
			selectedModifierGroupIds = [...selectedModifierGroupIds, groupId];
		}
		modifierSearchQuery = '';
		isModifierDropdownOpen = false;
	}

	function removeModifierGroup(groupId: string) {
		selectedModifierGroupIds = selectedModifierGroupIds.filter((id) => id !== groupId);
	}

	function portal(node: HTMLElement) {
		if (typeof document !== 'undefined') {
			document.body.appendChild(node);
		}
		return {
			destroy() {
				if (node.parentNode) {
					node.parentNode.removeChild(node);
				}
			}
		};
	}

	function updateDropdownPosition() {
		if (!searchContainerEl) return;
		const rect = searchContainerEl.getBoundingClientRect();

		if (rect.bottom < 0 || rect.top > window.innerHeight) {
			isModifierDropdownOpen = false;
			return;
		}

		const dropdownHeight = dropdownEl ? dropdownEl.offsetHeight : 240;
		const spaceBelow = window.innerHeight - rect.bottom - 16;
		let top = rect.bottom + 6;
		let left = rect.left;

		if (spaceBelow < 220 && rect.top > dropdownHeight + 20) {
			top = rect.top - dropdownHeight - 6;
		}

		dropdownTop = top;
		dropdownLeft = left;
		dropdownWidth = rect.width;
	}

	$effect(() => {
		if (isModifierDropdownOpen) {
			updateDropdownPosition();
			tick().then(() => updateDropdownPosition());

			const handleScrollCapture = () => {
				if (isModifierDropdownOpen) updateDropdownPosition();
			};

			window.addEventListener('scroll', handleScrollCapture, true);
			window.addEventListener('resize', handleScrollCapture);

			return () => {
				window.removeEventListener('scroll', handleScrollCapture, true);
				window.removeEventListener('resize', handleScrollCapture);
			};
		}
	});

	$effect(() => {
		if (isModifierDropdownOpen) {
			const _ = modifierSearchQuery;
			const __ = availableModifierGroups.length;
			tick().then(() => updateDropdownPosition());
		}
	});

	function handleWindowClick(e: MouseEvent) {
		if (!isModifierDropdownOpen) return;
		const target = e.target as HTMLElement;
		const isInsideContainer = searchContainerEl?.contains(target);
		const isInsideDropdown = dropdownEl?.contains(target);
		if (!isInsideContainer && !isInsideDropdown) {
			isModifierDropdownOpen = false;
		}
	}

	function togglePresetNote(id: string) {
		if (selectedPresetNoteIds.includes(id)) {
			selectedPresetNoteIds = selectedPresetNoteIds.filter((p) => p !== id);
		} else {
			selectedPresetNoteIds = [...selectedPresetNoteIds, id];
		}
	}

	async function handleSubmit() {
		if (!name.trim() || !code.trim() || !categoryId) {
			return;
		}

		isSubmitting = true;
		try {
			const cleanVariants = variants.length > 0 ? variants : [
				{
					name: 'Standard',
					code: `${code.trim().toUpperCase()}-STD`,
					sku: `${code.trim().toUpperCase()}-STD`,
					base_price: '25000.00',
					is_active: true
				}
			];

			await menuStore.saveMenuItem({
				name: name.trim(),
				code: code.trim().toUpperCase(),
				category_id: categoryId,
				description: description.trim(),
				scope_type: scopeType,
				target_outlet_ids: scopeType === 'outlet_set' ? targetOutletIds : [],
				is_time_limited: isTimeLimited,
				available_from: isTimeLimited ? availableFrom : undefined,
				available_until: isTimeLimited ? availableUntil : undefined,
				modifier_group_ids: selectedModifierGroupIds,
				addon_group_ids: selectedModifierGroupIds,
				preset_note_ids: selectedPresetNoteIds,
				variants: cleanVariants.map((v, idx) => ({
					id: v.id || `var-${idx + 1}`,
					menu_item_id: menuStore.editingMenuItem?.id || '',
					name: v.name.trim() || `Varian ${idx + 1}`,
					code: v.sku.trim().toUpperCase() || `${code.trim().toUpperCase()}-${idx + 1}`,
					sku: v.sku.trim().toUpperCase() || `${code.trim().toUpperCase()}-${idx + 1}`,
					is_active: v.is_active ?? true,
					base_price: v.base_price.trim() || '0.00',
					sort_order: idx + 1,
					created_at: menuStore.editingMenuItem?.created_at || '',
					updated_at: ''
				}))
			});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:window onclick={handleWindowClick} />

<Modal
	open={menuStore.isMenuModalOpen}
	title={menuStore.editingMenuItem ? 'Edit Master Menu Siap Jual' : 'Tambah Menu Baru'}
	maxWidth="1140px"
	onclose={() => (menuStore.isMenuModalOpen = false)}
>
	<form id="menu-item-form" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="flex flex-col gap-6">
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
			<!-- KOLOM 1 (KIRI): Informasi Master Menu Siap Jual & Varian -->
			<div class="flex flex-col gap-5">
				<!-- Nama Menu -->
				<div>
					<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2" for="input-menu-name">
						Nama Menu Siap Jual <span class="text-rose-400">*</span>
					</label>
					<input
						type="text"
						class="form-input-lg"
						placeholder="Contoh: Hanjo Aren Latte Signature"
						bind:value={name}
						required
						id="input-menu-name"
					/>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<!-- Kode SKU Menu Induk -->
					<div>
						<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2" for="input-menu-code">
							Kode Menu (SKU Induk) <span class="text-rose-400">*</span>
						</label>
						<input
							type="text"
							class="form-input-lg font-mono uppercase"
							placeholder="Contoh: MNU-LAT-AREN"
							bind:value={code}
							oninput={handleCodeInput}
							required
							id="input-menu-code"
						/>
					</div>

					<!-- Kategori Menu -->
					<div>
						<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2" for="select-menu-category">
							Kategori Menu <span class="text-rose-400">*</span>
						</label>
						<Select
							id="select-menu-category"
							bind:value={categoryId}
							options={categoryOptions}
							placeholder="Pilih Kategori Menu..."
						/>
					</div>
				</div>

				<!-- Deskripsi Menu -->
				<div>
					<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2" for="input-menu-desc">
						Deskripsi Karakteristik Rasa &amp; Bahan
					</label>
					<textarea
						class="form-input-lg !min-h-[84px] resize-none"
						placeholder="Jelaskan karakteristik cita rasa dan bahan unggulan..."
						bind:value={description}
						id="input-menu-desc"
					></textarea>
				</div>

				<!-- Seksi Kelola Varian Menu & Harga Dasar (AC-04.1, T-04.5) -->
				<div class="variants-panel">
					<div class="variants-panel-header">
						<div class="flex items-center gap-2">
							<Icon name="squares-2x2" size={15} class="text-[var(--brand-primary)]" />
							<span class="variants-panel-title">1. Pilihan Varian Menu (Wajib, Single-Select) ({variants.length})</span>
						</div>
						<button
							type="button"
							class="btn-add-variant"
							onclick={addVariant}
						>
							<Icon name="plus" size={13} strokeWidth={2.5} />
							<span>Tambah Varian</span>
						</button>
					</div>

					<p class="variants-panel-subtitle">
						Atur pilihan ukuran atau sajian (mis. <em>Standard</em>, <em>Iced</em>, <em>Hot</em>) lengkap dengan SKU dan harga dasar masing-masing.
					</p>

					<div class="variants-cards-stack">
						{#each variants as variant, idx}
							<div class="variant-item-card">
								<div class="variant-item-header">
									<div class="flex items-center gap-2">
										<span class="variant-index-badge">#{idx + 1}</span>
										<span class="variant-title-preview">{variant.name || 'Varian Baru'}</span>
									</div>

									{#if variants.length > 1}
										<button
											type="button"
											class="variant-btn-remove"
											title="Hapus varian #{idx + 1}"
											aria-label="Hapus varian #{idx + 1}"
											onclick={() => removeVariant(idx)}
										>
											<Icon name="trash" size={13} />
											<span>Hapus</span>
										</button>
									{/if}
								</div>

								<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
									<div>
										<label class="variant-label" for="var-name-{idx}">
											Nama Varian <span class="text-rose-400">*</span>
										</label>
										<input
											id="var-name-{idx}"
											type="text"
											class="form-input-md"
											placeholder="mis. Iced / Hot"
											bind:value={variant.name}
											oninput={() => handleVariantNameChange(idx)}
											required
										/>
									</div>

									<div>
										<label class="variant-label" for="var-sku-{idx}">
											SKU Varian <span class="text-rose-400">*</span>
										</label>
										<input
											id="var-sku-{idx}"
											type="text"
											class="form-input-md font-mono uppercase"
											placeholder="MNU-xxx-VAR"
											bind:value={variant.sku}
											required
										/>
									</div>

									<div>
										<label class="variant-label" for="var-price-{idx}">
											Harga Dasar (Rp) <span class="text-rose-400">*</span>
										</label>
										<input
											id="var-price-{idx}"
											type="text"
											class="form-input-md font-mono"
											placeholder="25000.00"
											bind:value={variant.base_price}
											required
										/>
									</div>
								</div>
							</div>
						{/each}

						<button
							type="button"
							class="btn-add-variant-dashed"
							onclick={addVariant}
						>
							<Icon name="plus" size={15} strokeWidth={2.5} />
							<span>Tambah Varian Baru</span>
						</button>
					</div>
				</div>
			</div>

			<!-- KOLOM 2 (KANAN): Cakupan Penjualan, Periode & Grup Modifier -->
			<div class="flex flex-col gap-5">
				<!-- Cakupan Gerai (Scope Type) -->
				<div class="scope-panel">
					<div>
						<span id="scope-heading" class="scope-panel-title">
							Cakupan Gerai Penjualan
						</span>
						<div class="scope-pills-group" role="radiogroup" aria-labelledby="scope-heading">
							<label class="scope-pill-btn {scopeType === 'all_outlets' ? 'active' : ''}">
								<input
									type="radio"
									name="scope"
									value="all_outlets"
									checked={scopeType === 'all_outlets'}
									onchange={() => (scopeType = 'all_outlets')}
									class="sr-only"
								/>
								{#if scopeType === 'all_outlets'}
									<Icon name="check" size={15} strokeWidth={2.5} class="scope-pill-icon" />
								{/if}
								<span>Semua Gerai</span>
							</label>

							<label class="scope-pill-btn {scopeType === 'outlet_set' ? 'active' : ''}">
								<input
									type="radio"
									name="scope"
									value="outlet_set"
									checked={scopeType === 'outlet_set'}
									onchange={() => (scopeType = 'outlet_set')}
									class="sr-only"
								/>
								{#if scopeType === 'outlet_set'}
									<Icon name="check" size={15} strokeWidth={2.5} class="scope-pill-icon" />
								{/if}
								<span>Khusus Gerai Tertentu (Menu Lokal)</span>
							</label>
						</div>
					</div>

					{#if scopeType === 'outlet_set'}
						<div class="scope-outlets-section">
							<span class="scope-outlets-label">
								Pilih Gerai yang Menyediakan Menu Ini:
							</span>
							<div class="scope-outlets-chips">
								{#each [
									{ id: 'out-jkt-01', name: 'Jodi Senopati' },
									{ id: 'out-bdg-01', name: 'Jodi Dago' },
									{ id: 'out-sub-01', name: 'Jodi Gubeng' },
									{ id: 'out-ubud-01', name: 'Kaveloka Ubud' },
									{ id: 'out-plg-01', name: 'Plaga Bistro' }
								] as out}
									<button
										type="button"
										class="modifier-chip {targetOutletIds.includes(out.id) ? 'selected' : ''}"
										onclick={() => toggleOutlet(out.id)}
									>
										{#if targetOutletIds.includes(out.id)}
											<Icon name="check" size={13} strokeWidth={2.5} class="text-[var(--brand-primary)]" />
										{/if}
										<span>{out.name}</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Periode Berlaku (Musiman) -->
				<div class="scope-panel">
					<div class="flex items-center justify-between mb-3">
						<div class="flex items-center gap-2">
							<Icon name="calendar" size={15} class="text-[var(--text-muted)]" />
							<span class="scope-panel-title !mb-0">Sifat Penjualan Waktu</span>
						</div>
						<label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--text-main)]">
							<input
								type="checkbox"
								bind:checked={isTimeLimited}
								class="rounded border-[var(--border-panel)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
							/>
							<span>Menu Musiman / Terbatas</span>
						</label>
					</div>

					{#if isTimeLimited}
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3.5 mt-2 border-t border-[var(--border-subtle)]">
							<div>
								<label class="block text-xs font-medium text-[var(--text-muted)] mb-1" for="available-from">
									Mulai Berlaku
								</label>
								<input
									id="available-from"
									type="date"
									class="form-input-md"
									bind:value={availableFrom}
								/>
							</div>
							<div>
								<label class="block text-xs font-medium text-[var(--text-muted)] mb-1" for="available-until">
									Berakhir Pada
								</label>
								<input
									id="available-until"
									type="date"
									class="form-input-md"
									bind:value={availableUntil}
								/>
							</div>
						</div>
					{:else}
						<p class="text-xs text-[var(--text-muted)] m-0 leading-relaxed">
							Menu ini bersifat <strong>Reguler Tetap</strong> dan akan selalu tersedia di katalog aktif gerai.
						</p>
					{/if}
				</div>

				<!-- Lapis 2: Pilihan Add-ons & Ekstra Berbayar -->
				<div class="scope-panel">
					<div>
						<div class="flex items-center justify-between mb-3.5">
							<span class="scope-panel-title !mb-0">
								2. Pilihan Add-ons &amp; Ekstra ({selectedModifierGroupIds.length})
							</span>
							{#if selectedModifierGroupIds.length > 0}
								<button
									type="button"
									class="text-[0.725rem] font-medium text-[var(--text-muted)] hover:text-rose-400 transition-colors"
									onclick={() => (selectedModifierGroupIds = [])}
								>
									Kosongkan Semua
								</button>
							{/if}
						</div>

						<!-- Kolom Pencarian / Dropdown Picker -->
						<div
							id="modifier-search-container"
							class="modifier-search-container"
							bind:this={searchContainerEl}
						>
							<div class="modifier-search-input-group">
								<Icon name="magnifying-glass" size={15} class="modifier-search-icon" />
								<input
									type="text"
									class="modifier-search-input"
									placeholder="Cari &amp; tambah grup add-on (mis. Susu, Topping, Extra Shot)..."
									bind:value={modifierSearchQuery}
									onfocus={() => (isModifierDropdownOpen = true)}
									onclick={() => (isModifierDropdownOpen = true)}
									onkeydown={(e) => {
										if (e.key === 'Escape') isModifierDropdownOpen = false;
									}}
								/>
								{#if modifierSearchQuery}
									<button
										type="button"
										class="modifier-search-clear"
										aria-label="Bersihkan pencarian"
										onclick={() => (modifierSearchQuery = '')}
									>
										<Icon name="x-mark" size={13} />
									</button>
								{/if}
							</div>

							{#if isModifierDropdownOpen}
								<div
									use:portal
									bind:this={dropdownEl}
									class="modifier-dropdown-menu"
									style="top: {dropdownTop}px; left: {dropdownLeft}px; width: {dropdownWidth}px;"
									role="listbox"
								>
									{#if availableModifierGroups.length === 0}
										<div class="modifier-dropdown-empty">
											{#if modifierSearchQuery.trim()}
												Tidak ada grup add-on cocok dengan "{modifierSearchQuery}"
											{:else}
												Semua grup add-on telah ditambahkan
											{/if}
										</div>
									{:else}
										{#each availableModifierGroups as grp (grp.id)}
											<button
												type="button"
												class="modifier-dropdown-item"
												role="option"
												aria-selected="false"
												onclick={() => addModifierGroup(grp.id)}
											>
												<div class="flex flex-col gap-0.5 text-left">
													<span class="font-semibold">{grp.name}</span>
													<span class="text-[0.7rem] text-[var(--text-muted)]">
														{grp.options.map((o) => o.name).join(', ')}
													</span>
												</div>
												<span class="text-[0.7rem] px-2 py-0.5 rounded bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] text-[var(--brand-primary)] shrink-0 ml-2">
													+ Tambah
												</span>
											</button>
										{/each}
									{/if}
								</div>
							{/if}
						</div>

						<!-- Selected Modifier Pills -->
						{#if selectedModifierGroupIds.length === 0}
							<div class="modifier-empty-hint">
								<Icon name="information-circle" size={16} class="text-[var(--text-subtle)] shrink-0" />
								<span>Belum ada grup add-on yang dipilih. Komponen ini menambah harga jual dan memotong stok.</span>
							</div>
						{:else}
							<div class="selected-modifiers-list">
								{#each selectedModifierGroups as grp (grp.id)}
									<span class="modifier-pill-selected">
										<span class="modifier-pill-name">{grp.name}</span>
										<span class="modifier-pill-count">({grp.options.length} opsi)</span>
										<button
											type="button"
											class="modifier-pill-remove"
											title="Hapus {grp.name}"
											aria-label="Hapus {grp.name}"
											onclick={() => removeModifierGroup(grp.id)}
										>
											<Icon name="x-mark" size={12} strokeWidth={2.5} />
										</button>
									</span>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<!-- Lapis 3: Preset Catatan Dapur / Barista (+Rp 0) -->
				<div class="scope-panel">
					<div>
						<div class="flex items-center justify-between mb-3.5">
							<span class="scope-panel-title !mb-0">
								3. Preset Catatan Dapur ({selectedPresetNoteIds.length})
							</span>
							{#if selectedPresetNoteIds.length > 0}
								<button
									type="button"
									class="text-[0.725rem] font-medium text-[var(--text-muted)] hover:text-rose-400 transition-colors"
									onclick={() => (selectedPresetNoteIds = [])}
								>
									Kosongkan Semua
								</button>
							{/if}
						</div>

						<p class="text-xs text-[var(--text-muted)] mb-3 leading-relaxed">
							Instruksi peracikan dapur (+Rp 0) untuk menu ini. Pilihan aktif akan muncul sebagai tombol sekali-tap (*quick chips*) di kasir POS.
						</p>

						{#if menuStore.notePresets.length === 0}
							<div class="modifier-empty-hint">
								<Icon name="information-circle" size={16} class="text-[var(--text-subtle)] shrink-0" />
								<span>Belum ada master preset catatan dapur yang aktif.</span>
							</div>
						{:else}
							<div class="flex flex-wrap gap-2">
								{#each menuStore.notePresets as np (np.id)}
									{@const isSelected = selectedPresetNoteIds.includes(np.id)}
									<button
										type="button"
										class="px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border {isSelected ? 'bg-sky-500/15 text-sky-400 border-sky-500/40' : 'bg-[var(--bg-panel)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:border-[var(--border-focus)]'}"
										onclick={() => togglePresetNote(np.id)}
									>
										{#if isSelected}
											<Icon name="check" size={12} class="inline mr-1 text-sky-400" />
										{/if}
										<span>{np.name}</span>
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</form>

	{#snippet footer()}
		<div class="flex items-center justify-end gap-3 w-full">
			<Button
				variant="secondary"
				type="button"
				onclick={() => (menuStore.isMenuModalOpen = false)}
			>
				Batal
			</Button>

			<Button
				variant="primary"
				type="submit"
				form="menu-item-form"
				loading={isSubmitting}
			>
				{menuStore.editingMenuItem ? 'Simpan Perubahan Menu' : 'Simpan Menu Siap Jual'}
			</Button>
		</div>
	{/snippet}
</Modal>

<style>
	.variants-panel {
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-panel);
		border-radius: var(--radius-xl, 14px);
		padding: 20px 22px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.variants-panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.variants-panel-title {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--text-main);
	}

	.variants-panel-subtitle {
		font-size: 0.775rem;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.5;
	}

	.btn-add-variant {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 14px;
		border-radius: var(--radius-md, 8px);
		font-size: 0.775rem;
		font-weight: 600;
		background: rgba(16, 185, 129, 0.12);
		border: 1px solid rgba(16, 185, 129, 0.3);
		color: var(--brand-primary);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-add-variant:hover {
		background: rgba(16, 185, 129, 0.22);
		border-color: var(--brand-primary);
	}

	.btn-add-variant-dashed {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		padding: 12px 18px;
		border-radius: var(--radius-lg, 10px);
		border: 1px dashed rgba(16, 185, 129, 0.45);
		background: rgba(16, 185, 129, 0.06);
		color: var(--brand-primary);
		font-size: 0.825rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-add-variant-dashed:hover {
		background: rgba(16, 185, 129, 0.14);
		border-color: var(--brand-primary);
	}

	.variants-cards-stack {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.variant-item-card {
		padding: 16px 18px;
		border-radius: var(--radius-lg, 12px);
		background: var(--bg-panel);
		border: 1px solid var(--border-panel);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.variant-item-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--border-subtle);
	}

	.variant-index-badge {
		font-size: 0.7rem;
		font-weight: 700;
		font-family: var(--font-mono, monospace);
		padding: 2px 7px;
		border-radius: 9999px;
		background: rgba(99, 102, 241, 0.15);
		color: #a5b4fc;
		border: 1px solid rgba(99, 102, 241, 0.25);
	}

	.variant-title-preview {
		font-size: 0.825rem;
		font-weight: 600;
		color: var(--text-main);
	}

	.variant-btn-remove {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.725rem;
		color: var(--text-muted);
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 6px;
		transition: all 0.15s ease;
	}

	.variant-btn-remove:hover {
		color: #f87171;
		background: rgba(244, 63, 94, 0.1);
	}

	.variant-label {
		display: block;
		font-size: 0.725rem;
		font-weight: 600;
		color: var(--text-muted);
		margin-bottom: 6px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.form-input-md {
		width: 100%;
		min-height: 40px;
		padding: 9px 14px;
		border-radius: var(--radius-md, 8px);
		background: var(--bg-panel-sub);
		border: 1px solid var(--border-panel);
		color: var(--text-main);
		font-size: 0.825rem;
		transition: all 0.15s ease;
		box-sizing: border-box;
	}

	.form-input-md:focus {
		outline: none;
		border-color: var(--brand-primary);
		box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
	}
</style>

