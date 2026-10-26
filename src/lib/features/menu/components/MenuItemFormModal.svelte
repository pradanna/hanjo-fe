<script lang="ts">
	/**
	 * Komponen Modal Tambah / Edit Master Menu Siap Jual (PG-cat-menus, T-04.5)
	 */
	import { menuStore } from '../stores/menu.svelte.js';
	import Icon from '../../../components/data/Icon.svelte';
	import Button from '../../../components/forms/Button.svelte';
	import Modal from '../../../components/feedback/Modal.svelte';
	import type { MenuItem } from '../../../api/contract/types.js';

	let name = $state('');
	let code = $state('');
	let categoryId = $state('');
	let description = $state('');
	let scopeType = $state<'all_outlets' | 'outlet_set'>('all_outlets');
	let targetOutletIds = $state<string[]>([]);
	let isTimeLimited = $state(false);
	let availableFrom = $state('');
	let availableUntil = $state('');
	let initialPrice = $state('25000.00');
	let selectedModifierGroupIds = $state<string[]>([]);

	let isSubmitting = $state(false);

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
			initialPrice = item.variants?.[0]?.base_price || '25000.00';
			selectedModifierGroupIds = item.modifier_group_ids || [];
		} else {
			name = '';
			code = `MNU-${Date.now().toString().slice(-4)}`;
			categoryId = menuStore.categories[0]?.id || '';
			description = '';
			scopeType = 'all_outlets';
			targetOutletIds = [];
			isTimeLimited = false;
			availableFrom = '';
			availableUntil = '';
			initialPrice = '25000.00';
			selectedModifierGroupIds = menuStore.modifierGroups.map((g) => g.id);
		}
	});

	function toggleOutlet(outletId: string) {
		if (targetOutletIds.includes(outletId)) {
			targetOutletIds = targetOutletIds.filter((id) => id !== outletId);
		} else {
			targetOutletIds = [...targetOutletIds, outletId];
		}
	}

	function toggleModifierGroup(groupId: string) {
		if (selectedModifierGroupIds.includes(groupId)) {
			selectedModifierGroupIds = selectedModifierGroupIds.filter((id) => id !== groupId);
		} else {
			selectedModifierGroupIds = [...selectedModifierGroupIds, groupId];
		}
	}

	async function handleSubmit() {
		if (!name.trim() || !code.trim() || !categoryId) {
			return;
		}

		isSubmitting = true;
		try {
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
				variants: menuStore.editingMenuItem?.variants || [
					{
						id: `var-${Date.now()}-1`,
						menu_item_id: '',
						name: 'Standard',
						code: `${code.trim().toUpperCase()}-STD`,
						sku: `${code.trim().toUpperCase()}-STD`,
						is_active: true,
						base_price: initialPrice,
						sort_order: 1,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString()
					}
				]
			});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Modal
	open={menuStore.isMenuModalOpen}
	title={menuStore.editingMenuItem ? 'Edit Master Menu Siap Jual' : 'Tambah Menu Baru'}
	maxWidth="700px"
	onclose={() => (menuStore.isMenuModalOpen = false)}
>
	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="form-field-stack">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<!-- Nama Menu -->
			<div>
				<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5" for="input-menu-name">
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

			<!-- Kode SKU Menu -->
			<div>
				<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5" for="input-menu-code">
					Kode Menu (SKU) <span class="text-rose-400">*</span>
				</label>
				<input
					type="text"
					class="form-input-lg font-mono uppercase"
					placeholder="Contoh: MNU-LAT-AREN"
					bind:value={code}
					required
					id="input-menu-code"
				/>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<!-- Kategori Menu -->
			<div>
				<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5" for="select-menu-category">
					Kategori Menu <span class="text-rose-400">*</span>
				</label>
				<select
					class="form-input-lg"
					bind:value={categoryId}
					required
					id="select-menu-category"
				>
					{#each menuStore.categories as cat}
						<option value={cat.id}>{cat.name}</option>
					{/each}
				</select>
			</div>

			<!-- Harga Dasar Awal -->
			<div>
				<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5" for="input-menu-price">
					Harga Dasar Varian Standard (Rp) <span class="text-rose-400">*</span>
				</label>
				<input
					type="text"
					class="form-input-lg font-mono"
					placeholder="25000.00"
					bind:value={initialPrice}
					required
					id="input-menu-price"
				/>
			</div>
		</div>

		<!-- Deskripsi Menu -->
		<div>
			<label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5" for="input-menu-desc">
				Deskripsi Menu
			</label>
			<textarea
				class="form-input-lg !min-h-[70px] resize-none"
				placeholder="Jelaskan karakteristik cita rasa dan bahan unggulan..."
				bind:value={description}
				id="input-menu-desc"
			></textarea>
		</div>

		<!-- Cakupan Gerai (Scope Type) -->
		<div class="p-3.5 rounded-xl bg-[var(--bg-panel-sub)] border border-[var(--border-subtle)] space-y-3">
			<span class="block text-xs font-semibold text-[var(--text-main)] uppercase">
				Cakupan Gerai Penjualan
			</span>
			<div class="flex items-center gap-4 text-xs">
				<label class="flex items-center gap-2 cursor-pointer">
					<input
						type="radio"
						name="scope"
						value="all_outlets"
						checked={scopeType === 'all_outlets'}
						onchange={() => (scopeType = 'all_outlets')}
					/>
					<span>Semua Gerai (Nasional)</span>
				</label>

				<label class="flex items-center gap-2 cursor-pointer">
					<input
						type="radio"
						name="scope"
						value="outlet_set"
						checked={scopeType === 'outlet_set'}
						onchange={() => (scopeType = 'outlet_set')}
					/>
					<span>Khusus Gerai Tertentu (Menu Lokal)</span>
				</label>
			</div>

			{#if scopeType === 'outlet_set'}
				<div class="pt-2 border-t border-[var(--border-subtle)]">
					<span class="text-[0.75rem] text-[var(--text-muted)] block mb-1.5">
						Pilih Gerai yang Menyediakan Menu Ini:
					</span>
					<div class="flex flex-wrap gap-2 text-xs">
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
								{out.name}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Modifier Groups Yang Aktif -->
		<div>
			<span class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">
				Grup Modifier yang Diaktifkan:
			</span>
			<div class="flex flex-wrap gap-2">
				{#each menuStore.modifierGroups as grp}
					<button
						type="button"
						class="modifier-chip {selectedModifierGroupIds.includes(grp.id) ? 'selected' : ''}"
						onclick={() => toggleModifierGroup(grp.id)}
					>
						<span>{grp.name}</span>
						<span class="text-[0.7rem] text-[var(--text-muted)]">({grp.options.length} opsi)</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
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
				loading={isSubmitting}
			>
				Simpan Menu
			</Button>
		</div>
	</form>
</Modal>
