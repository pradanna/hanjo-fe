<script lang="ts">
	import Icon from '#lib/components/data/Icon.svelte';

	export interface MultiSelectOption {
		value: string;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		id?: string;
		label?: string;
		value?: string[];
		options?: MultiSelectOption[];
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		error?: string;
		helperText?: string;
		class?: string;
		onchange?: (val: string[]) => void;
	}

	let {
		id,
		label = '',
		value = $bindable([]),
		options = [],
		placeholder = 'Pilih beberapa opsi...',
		required = false,
		disabled = false,
		error = '',
		helperText = '',
		class: className = '',
		onchange
	}: Props = $props();

	const defaultId = `msel-${Math.random().toString(36).substring(2, 9)}`;
	const selectId = $derived(id || defaultId);
	let isOpen = $state(false);
	let searchTerm = $state('');

	const filteredOptions = $derived(
		searchTerm.trim() === ''
			? options
			: options.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase().trim()))
	);

	const selectedOptions = $derived(
		options.filter((opt) => value.includes(opt.value))
	);

	function toggleOption(optValue: string) {
		if (disabled) return;
		let next: string[];
		if (value.includes(optValue)) {
			next = value.filter((v) => v !== optValue);
		} else {
			next = [...value, optValue];
		}
		value = next;
		onchange?.(next);
	}

	function removeTag(optValue: string, e: MouseEvent) {
		e.stopPropagation();
		if (disabled) return;
		const next = value.filter((v) => v !== optValue);
		value = next;
		onchange?.(next);
	}

	function handleWindowClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest(`#${selectId}-container`)) {
			isOpen = false;
		}
	}
</script>

<svelte:window onclick={handleWindowClick} />

<div class="form-control {className}">
	{#if label}
		<label for={selectId} class="form-label">
			{label}
			{#if required}
				<span class="required-star" aria-hidden="true">*</span>
			{/if}
		</label>
	{/if}

	<div
		id="{selectId}-container"
		class="multiselect-container"
		class:has-error={!!error}
		class:is-disabled={disabled}
		class:is-open={isOpen}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="multiselect-trigger"
			onclick={() => {
				if (!disabled) isOpen = !isOpen;
			}}
		>
			<div class="tags-container">
				{#if selectedOptions.length === 0}
					<span class="placeholder">{placeholder}</span>
				{:else}
					{#each selectedOptions as opt (opt.value)}
						<span class="tag">
							<span class="tag-label">{opt.label}</span>
							<button
								type="button"
								class="tag-remove"
								aria-label="Hapus {opt.label}"
								onclick={(e) => removeTag(opt.value, e)}
							>
								<Icon name="x-mark" size={12} />
							</button>
						</span>
					{/each}
				{/if}
			</div>

			<div class="trigger-icons">
				{#if selectedOptions.length > 0 && !disabled}
					<button
						type="button"
						class="clear-all"
						aria-label="Hapus semua pilihan"
						onclick={(e) => {
							e.stopPropagation();
							value = [];
							onchange?.([]);
						}}
					>
						<Icon name="x-mark" size={14} />
					</button>
				{/if}
				<svg
					class="arrow-icon"
					class:rotate={isOpen}
					viewBox="0 0 24 24"
					width="16"
					height="16"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<polyline points="6 9 12 15 18 9"></polyline>
				</svg>
			</div>
		</div>

		{#if isOpen}
			<div class="multiselect-dropdown">
				<div class="search-box">
					<input
						type="text"
						class="search-input"
						placeholder="Cari opsi..."
						bind:value={searchTerm}
						onclick={(e) => e.stopPropagation()}
					/>
				</div>

				<div class="options-list">
					{#if filteredOptions.length === 0}
						<div class="empty-option">Tidak ada opsi ditemukan</div>
					{:else}
						{#each filteredOptions as opt (opt.value)}
							{@const isSelected = value.includes(opt.value)}
							<button
								type="button"
								class="option-item"
								class:is-selected={isSelected}
								disabled={opt.disabled}
								onclick={() => toggleOption(opt.value)}
							>
								<div class="checkbox-indicator" class:checked={isSelected}>
									{#if isSelected}
										<svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
											<path
												fill-rule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clip-rule="evenodd"
											/>
										</svg>
									{/if}
								</div>
								<span class="option-label">{opt.label}</span>
							</button>
						{/each}
					{/if}
				</div>
			</div>
		{/if}
	</div>

	{#if error}
		<p class="form-feedback error" role="alert">{error}</p>
	{:else if helperText}
		<p class="form-feedback helper">{helperText}</p>
	{/if}
</div>

<style>
	.form-control {
		display: flex;
		flex-direction: column;
		gap: 5px;
		width: 100%;
	}

	.form-label {
		font-size: 11.5px;
		font-weight: 500;
		color: var(--text-muted, #94a3b8);
		display: flex;
		align-items: center;
		gap: 3px;
		text-transform: none;
		letter-spacing: 0.015em;
		transition: color 0.15s ease;
		user-select: none;
	}

	.form-control:focus-within .form-label {
		color: var(--text-main, #f1f5f9);
	}

	.required-star {
		color: var(--pill-danger-text, #dc2626);
		font-size: 11px;
		font-weight: 500;
		opacity: 0.85;
	}

	.multiselect-container {
		position: relative;
		width: 100%;
	}

	.multiselect-trigger {
		min-height: 40px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 14px;
		background: var(--bg-input);
		border: 1px solid var(--border-input);
		border-radius: var(--radius-md, 8px);
		cursor: pointer;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
		gap: 8px;
	}

	.multiselect-trigger:hover:not(:disabled) {
		border-color: var(--border-input-hover);
	}

	.multiselect-container.is-open .multiselect-trigger,
	.multiselect-trigger:focus-within {
		border-color: var(--brand-primary);
		box-shadow: 0 0 0 3px var(--brand-primary-dim);
	}

	.multiselect-container.has-error .multiselect-trigger {
		border-color: var(--pill-danger-text);
		background-color: var(--pill-danger-bg);
	}

	.multiselect-container.is-disabled .multiselect-trigger {
		background-color: var(--bg-panel-sub);
		opacity: 0.65;
		cursor: not-allowed;
	}

	.tags-container {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
		flex: 1;
	}

	.placeholder {
		font-size: 13.5px;
		color: var(--text-muted);
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: var(--pill-success-bg);
		color: var(--pill-success-text);
		border: 1px solid var(--pill-success-border);
		padding: 3px 10px;
		border-radius: var(--radius-full, 9999px);
		font-size: 12px;
		font-weight: 500;
		white-space: nowrap;
	}

	.tag-remove {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--pill-success-text);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		opacity: 0.8;
		transition: opacity 0.15s ease;
	}

	.tag-remove:hover {
		opacity: 1;
	}

	.trigger-icons {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--text-muted);
	}

	.clear-all {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 2px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.clear-all:hover {
		color: var(--text-main);
	}

	.arrow-icon {
		transition: transform 0.2s ease;
	}

	.arrow-icon.rotate {
		transform: rotate(180deg);
	}

	.multiselect-dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		z-index: 50;
		background: var(--bg-panel);
		border: 1px solid var(--border-panel);
		border-radius: var(--radius-md, 8px);
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.45), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
		max-height: 240px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.search-box {
		padding: 10px 14px;
		border-bottom: 1px solid var(--border-panel);
		background: var(--bg-panel-sub);
	}

	.search-input {
		width: 100%;
		padding: 8px 12px;
		font-size: 12.5px;
		background: var(--bg-input);
		color: var(--text-main);
		border: 1px solid var(--border-input);
		border-radius: 6px;
		outline: none;
	}

	.search-input:focus {
		border-color: var(--brand-primary);
	}

	.options-list {
		overflow-y: auto;
		padding: 6px 0;
		max-height: 200px;
	}

	.option-item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 9px 14px;
		font-size: 13px;
		color: var(--text-main);
		text-align: left;
		background: none;
		border: none;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.option-item:hover:not(:disabled) {
		background-color: var(--bg-panel-hover);
	}

	.option-item.is-selected {
		background-color: var(--brand-primary-dim);
		font-weight: 600;
	}

	.option-item:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.checkbox-indicator {
		width: 16px;
		height: 16px;
		border: 1px solid var(--border-input);
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-panel-sub);
	}

	.checkbox-indicator.checked {
		background-color: var(--brand-primary);
		border-color: var(--brand-primary);
		color: #ffffff;
	}

	.empty-option {
		padding: 12px;
		text-align: center;
		font-size: 12.5px;
		color: var(--text-muted);
	}

	.form-feedback {
		font-size: 11.5px;
		margin: 0;
	}

	.form-feedback.error {
		color: var(--pill-danger-text);
		font-weight: 500;
	}

	.form-feedback.helper {
		color: var(--text-muted);
	}
</style>
