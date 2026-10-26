<script lang="ts">
	export interface RadioOption {
		value: string;
		label: string;
		description?: string;
		disabled?: boolean;
	}

	interface Props {
		id?: string;
		name: string;
		label?: string;
		value?: string;
		options?: RadioOption[];
		orientation?: 'vertical' | 'horizontal';
		required?: boolean;
		disabled?: boolean;
		error?: string;
		helperText?: string;
		class?: string;
		onchange?: (val: string) => void;
	}

	let {
		id,
		name,
		label = '',
		value = $bindable(''),
		options = [],
		orientation = 'vertical',
		required = false,
		disabled = false,
		error = '',
		helperText = '',
		class: className = '',
		onchange
	}: Props = $props();

	const defaultId = `radio-${Math.random().toString(36).substring(2, 9)}`;
	const groupId = $derived(id || defaultId);

	function handleSelect(val: string) {
		if (disabled) return;
		value = val;
		onchange?.(val);
	}
</script>

<div class="form-control {className}" role="radiogroup" aria-labelledby="{groupId}-label">
	{#if label}
		<div id="{groupId}-label" class="form-label">
			{label}
			{#if required}
				<span class="required-star" aria-hidden="true">*</span>
			{/if}
		</div>
	{/if}

	<div class="radio-options {orientation}">
		{#each options as opt (opt.value)}
			{@const isChecked = value === opt.value}
			{@const isDisabled = disabled || opt.disabled}
			<label
				class="radio-card"
				class:is-checked={isChecked}
				class:is-disabled={isDisabled}
			>
				<input
					type="radio"
					{name}
					value={opt.value}
					checked={isChecked}
					disabled={isDisabled}
					class="sr-only"
					onchange={() => handleSelect(opt.value)}
				/>
				<div class="radio-circle" class:checked={isChecked}>
					{#if isChecked}
						<div class="inner-dot"></div>
					{/if}
				</div>
				<div class="radio-text">
					<span class="option-title">{opt.label}</span>
					{#if opt.description}
						<span class="option-desc">{opt.description}</span>
					{/if}
				</div>
			</label>
		{/each}
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
		gap: 8px;
		width: 100%;
	}

	.form-label {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--text-main, #0f172a);
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.required-star {
		color: var(--pill-danger-text, #dc2626);
		font-weight: 700;
	}

	.radio-options {
		display: flex;
		gap: 8px;
	}

	.radio-options.vertical {
		flex-direction: column;
	}

	.radio-options.horizontal {
		flex-direction: row;
		flex-wrap: wrap;
	}

	.radio-card {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 12px 16px;
		border: 1px solid var(--border-panel, rgba(255, 255, 255, 0.08));
		border-radius: var(--radius-lg, 10px);
		background: var(--bg-panel, #1e293b);
		cursor: pointer;
		transition: all 0.2s ease-in-out;
		min-height: 48px;
	}

	.radio-card:hover:not(.is-disabled) {
		border-color: var(--brand-primary, #10b981);
		background-color: var(--bg-panel-hover, rgba(255, 255, 255, 0.04));
	}

	.radio-card.is-checked {
		border-color: var(--pill-success-border, rgba(16, 185, 129, 0.35));
		background-color: var(--pill-success-bg, rgba(16, 185, 129, 0.08));
	}

	.radio-card.is-disabled {
		opacity: 0.6;
		cursor: not-allowed;
		background: var(--bg-panel-sub, #0f172a);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}

	.radio-circle {
		width: 20px;
		height: 20px;
		border: 1.5px solid var(--border-panel, rgba(255, 255, 255, 0.2));
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 2px;
		flex-shrink: 0;
		transition: all 0.2s;
		background: var(--bg-input, #0f172a);
	}

	.radio-circle.checked {
		border-color: var(--brand-primary, #10b981);
	}

	.inner-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background-color: var(--brand-primary, #10b981);
	}

	.radio-text {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.option-title {
		font-size: 13.5px;
		font-weight: 600;
		color: var(--text-main, #f8fafc);
	}

	.option-desc {
		font-size: 12px;
		color: var(--text-muted, #94a3b8);
		line-height: 1.4;
	}

	.form-feedback {
		font-size: 11.5px;
		margin: 0;
	}

	.form-feedback.error {
		color: var(--pill-danger-text, #dc2626);
		font-weight: 500;
	}

	.form-feedback.helper {
		color: var(--text-muted, #64748b);
	}
</style>
