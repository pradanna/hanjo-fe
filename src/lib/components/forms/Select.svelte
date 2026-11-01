<script lang="ts">
	/**
	 * Custom Select Component Hanjo ERP
	 * Referensi: PRD 13.1, Design Aesthetics
	 *
	 * Komponen Custom Single-Select konsisten lintas browser & platform
	 * dengan chevron panah berjarak lega (padding), pencarian terpadu,
	 * animasi halus, dan dukungan penuh tema terang / gelap.
	 */
	export interface SelectOption {
		value: string;
		label: string;
		subtitle?: string;
		disabled?: boolean;
	}

	interface Props {
		id?: string;
		name?: string;
		label?: string;
		value?: string;
		options?: SelectOption[];
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		error?: string;
		helperText?: string;
		class?: string;
		searchable?: boolean;
		onchange?: (val: string) => void;
	}

	let {
		id,
		name,
		label = '',
		value = $bindable(''),
		options = [],
		placeholder = 'Pilih salah satu...',
		required = false,
		disabled = false,
		error = '',
		helperText = '',
		class: className = '',
		searchable = false,
		onchange
	}: Props = $props();

	const defaultId = `sel-${Math.random().toString(36).substring(2, 9)}`;
	const selectId = $derived(id || defaultId);

	let isOpen = $state(false);
	let searchTerm = $state('');
	let highlightedIndex = $state(-1);

	const selectedOption = $derived(options.find((opt) => String(opt.value) === String(value)));
	const isAutoSearchable = $derived(searchable || options.length > 7);

	const filteredOptions = $derived(
		!isAutoSearchable || searchTerm.trim() === ''
			? options
			: options.filter(
					(opt) =>
						opt.label.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
						(opt.subtitle && opt.subtitle.toLowerCase().includes(searchTerm.toLowerCase().trim()))
				)
	);

	function toggleOpen() {
		if (disabled) return;
		isOpen = !isOpen;
		if (isOpen) {
			searchTerm = '';
			const idx = filteredOptions.findIndex((o) => String(o.value) === String(value));
			highlightedIndex = idx >= 0 ? idx : 0;
		}
	}

	function selectOption(opt: SelectOption) {
		if (opt.disabled || disabled) return;
		value = opt.value;
		isOpen = false;
		searchTerm = '';
		onchange?.(opt.value);
	}

	function handleWindowClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest(`#${selectId}-container`)) {
			isOpen = false;
			searchTerm = '';
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (disabled) return;

		if (!isOpen) {
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				toggleOpen();
			}
			return;
		}

		if (e.key === 'Escape') {
			e.preventDefault();
			isOpen = false;
			searchTerm = '';
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (filteredOptions.length > 0) {
				highlightedIndex = (highlightedIndex + 1) % filteredOptions.length;
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (filteredOptions.length > 0) {
				highlightedIndex = (highlightedIndex - 1 + filteredOptions.length) % filteredOptions.length;
			}
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
				const opt = filteredOptions[highlightedIndex];
				if (!opt.disabled) {
					selectOption(opt);
				}
			}
		} else if (e.key === 'Tab') {
			isOpen = false;
			searchTerm = '';
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
		class="custom-select-container"
		class:has-error={!!error}
		class:is-disabled={disabled}
		class:is-open={isOpen}
	>
		<!-- Native hidden input to integrate seamlessly with forms -->
		<input type="hidden" {name} {value} {required} />

		<button
			type="button"
			id={selectId}
			class="custom-select-trigger"
			aria-haspopup="listbox"
			aria-expanded={isOpen}
			aria-disabled={disabled}
			{disabled}
			onclick={toggleOpen}
			onkeydown={handleKeyDown}
		>
			<span class="select-value-text" class:is-placeholder={!selectedOption}>
				{selectedOption ? selectedOption.label : placeholder}
			</span>

			<div class="select-arrow-wrapper" aria-hidden="true">
				<svg
					class="select-arrow-icon"
					class:is-rotated={isOpen}
					viewBox="0 0 20 20"
					fill="currentColor"
					width="16"
					height="16"
				>
					<path
						fill-rule="evenodd"
						d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
		</button>

		{#if isOpen}
			<div class="custom-select-dropdown" role="listbox" id="{selectId}-listbox">
				{#if isAutoSearchable}
					<div class="dropdown-search">
						<svg class="search-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
							<path
								fill-rule="evenodd"
								d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
								clip-rule="evenodd"
							/>
						</svg>
						<input
							type="text"
							class="dropdown-search-input"
							placeholder="Cari pilihan..."
							bind:value={searchTerm}
							onclick={(e) => e.stopPropagation()}
						/>
					</div>
				{/if}

				<div class="options-list">
					{#if filteredOptions.length === 0}
						<div class="empty-option">Tidak ada pilihan yang cocok</div>
					{:else}
						{#each filteredOptions as opt, idx (opt.value)}
							{@const isSelected = String(opt.value) === String(value)}
							{@const isHighlighted = idx === highlightedIndex}
							<button
								type="button"
								class="select-option-item"
								class:is-selected={isSelected}
								class:is-highlighted={isHighlighted}
								disabled={opt.disabled}
								role="option"
								aria-selected={isSelected}
								onclick={() => selectOption(opt)}
								onmouseenter={() => (highlightedIndex = idx)}
							>
								<div class="option-content">
									<span class="option-label">{opt.label}</span>
									{#if opt.subtitle}
										<span class="option-subtitle">{opt.subtitle}</span>
									{/if}
								</div>

								{#if isSelected}
									<div class="option-check" aria-hidden="true">
										<svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
											<path
												fill-rule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clip-rule="evenodd"
											/>
										</svg>
									</div>
								{/if}
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
		position: relative;
	}

	.form-label {
		font-size: 11.5px;
		font-weight: 500;
		color: var(--text-muted, #94a3b8);
		display: flex;
		align-items: center;
		gap: 3px;
		cursor: pointer;
		user-select: none;
		text-transform: none;
		letter-spacing: 0.015em;
		transition: color 0.15s ease;
	}

	.form-control:focus-within .form-label {
		color: var(--text-main, #f1f5f9);
	}

	.required-star {
		color: var(--pill-danger-text, #ef4444);
		font-size: 11px;
		font-weight: 500;
		opacity: 0.85;
	}

	.custom-select-container {
		position: relative;
		width: 100%;
	}

	.custom-select-trigger {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 40px;
		padding: 9px 14px 9px 14px;
		background: var(--bg-input, #ffffff);
		border: 1px solid var(--border-input, rgba(255, 255, 255, 0.12));
		border-radius: var(--radius-md, 8px);
		color: var(--text-main, #0f172a);
		font-family: inherit;
		font-size: 13px;
		cursor: pointer;
		text-align: left;
		transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
		box-sizing: border-box;
		outline: none;
	}

	.custom-select-trigger:hover:not(:disabled):not(:focus-visible) {
		border-color: var(--border-input-hover, rgba(255, 255, 255, 0.22));
	}

	.custom-select-container.is-open .custom-select-trigger,
	.custom-select-trigger:focus-visible {
		border-color: var(--brand-primary, #10b981);
		box-shadow: 0 0 0 3px var(--brand-primary-dim, rgba(16, 185, 129, 0.15));
	}

	.custom-select-container.has-error .custom-select-trigger {
		border-color: var(--pill-danger-text, #ef4444);
		background-color: var(--pill-danger-bg, #fef2f2);
	}

	.custom-select-container.is-disabled .custom-select-trigger {
		background-color: var(--bg-panel-sub, #f1f5f9);
		opacity: 0.65;
		cursor: not-allowed;
	}

	.select-value-text {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-weight: 500;
		color: var(--text-main, #0f172a);
	}

	.select-value-text.is-placeholder {
		color: var(--text-muted, #94a3b8);
		font-weight: 400;
	}

	/* Arrow wrapper with generous padding to prevent feeling cramped */
	.select-arrow-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted, #94a3b8);
		flex-shrink: 0;
		padding-left: 14px;
		margin-right: 4px;
	}

	.select-arrow-icon {
		transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), color 0.15s ease;
	}

	.select-arrow-icon.is-rotated {
		transform: rotate(180deg);
		color: var(--brand-primary, #10b981);
	}

	/* Floating Dropdown */
	.custom-select-dropdown {
		position: absolute;
		top: calc(100% + 5px);
		left: 0;
		right: 0;
		z-index: 70;
		background: var(--bg-panel, #ffffff);
		border: 1px solid var(--border-panel, #e2e8f0);
		border-radius: var(--radius-md, 8px);
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: selectDropdownIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes selectDropdownIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.dropdown-search {
		display: flex;
		align-items: center;
		padding: 10px 14px;
		border-bottom: 1px solid var(--border-panel, #e2e8f0);
		background: var(--bg-panel-sub, #f8fafc);
		gap: 8px;
	}

	.search-icon {
		color: var(--text-muted, #94a3b8);
		flex-shrink: 0;
	}

	.dropdown-search-input {
		width: 100%;
		border: none;
		outline: none;
		background: transparent;
		font-size: 12.5px;
		color: var(--text-main, #0f172a);
		font-family: inherit;
	}

	.dropdown-search-input::placeholder {
		color: var(--text-muted, #94a3b8);
	}

	.options-list {
		max-height: 220px;
		overflow-y: auto;
		padding: 6px;
	}

	.select-option-item {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 9px 14px;
		border: none;
		background: transparent;
		color: var(--text-main, #0f172a);
		font-size: 13px;
		font-family: inherit;
		text-align: left;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 0.12s ease, color 0.12s ease;
	}

	.select-option-item:hover:not(:disabled),
	.select-option-item.is-highlighted:not(:disabled) {
		background-color: var(--bg-panel-hover);
	}

	.select-option-item.is-selected {
		background-color: var(--brand-primary-dim, rgba(16, 185, 129, 0.1));
		color: var(--brand-primary, #10b981);
		font-weight: 600;
	}

	.select-option-item:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.option-content {
		display: flex;
		flex-direction: column;
		gap: 1px;
		flex: 1;
		min-width: 0;
	}

	.option-label {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.option-subtitle {
		font-size: 11px;
		color: var(--text-muted, #64748b);
		font-weight: 400;
	}

	.option-check {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--brand-primary, #10b981);
		flex-shrink: 0;
		padding-left: 6px;
	}

	.empty-option {
		padding: 14px;
		text-align: center;
		font-size: 12.5px;
		color: var(--text-muted, #94a3b8);
	}

	.form-feedback {
		font-size: 11.5px;
		line-height: 1.3;
		margin: 0;
	}

	.form-feedback.error {
		color: var(--pill-danger-text, #ef4444);
		font-weight: 500;
	}

	.form-feedback.helper {
		color: var(--text-muted, #64748b);
	}
</style>
