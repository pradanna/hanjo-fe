<script lang="ts">
	import Icon from '#lib/components/data/Icon.svelte';
	import { ValidationMessages } from '../../config/validation_dictionary.js';

	interface Props {
		id?: string;
		label?: string;
		accept?: string;
		maxSizeMb?: number;
		required?: boolean;
		disabled?: boolean;
		error?: string;
		helperText?: string;
		class?: string;
		file?: File | null;
		onchange?: (file: File | null) => void;
	}

	let {
		id,
		label = '',
		accept = 'image/jpeg,image/png,image/webp,application/pdf',
		maxSizeMb = 5,
		required = false,
		disabled = false,
		error = '',
		helperText = '',
		class: className = '',
		file = $bindable(null),
		onchange
	}: Props = $props();

	const defaultId = `fupload-${Math.random().toString(36).substring(2, 9)}`;
	const uploadId = $derived(id || defaultId);
	let isDragging = $state(false);
	let localError = $state('');
	let previewUrl = $state<string | null>(null);

	const displayError = $derived(error || localError);

	function processFile(selectedFile: File) {
		localError = '';

		// Cek ukuran berkas
		const maxBytes = maxSizeMb * 1024 * 1024;
		if (selectedFile.size > maxBytes) {
			localError = ValidationMessages.fileTooLarge(maxSizeMb);
			return;
		}

		file = selectedFile;
		onchange?.(selectedFile);

		// Buat preview jika gambar
		if (selectedFile.type.startsWith('image/')) {
			previewUrl = URL.createObjectURL(selectedFile);
		} else {
			previewUrl = null;
		}
	}

	function handleFileInput(e: Event & { currentTarget: HTMLInputElement }) {
		const files = e.currentTarget.files;
		if (files && files.length > 0) {
			processFile(files[0]);
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (disabled) return;

		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			processFile(files[0]);
		}
	}

	function removeFile(e: MouseEvent) {
		e.stopPropagation();
		file = null;
		previewUrl = null;
		localError = '';
		onchange?.(null);
	}
</script>

<div class="form-control {className}">
	{#if label}
		<label for={uploadId} class="form-label">
			{label}
			{#if required}
				<span class="required-star" aria-hidden="true">*</span>
			{/if}
		</label>
	{/if}

	<div
		class="dropzone"
		role="region"
		aria-label="Area Unggah Berkas"
		class:is-dragging={isDragging}
		class:has-file={!!file}
		class:has-error={!!displayError}
		class:is-disabled={disabled}
		ondragover={(e) => {
			e.preventDefault();
			if (!disabled) isDragging = true;
		}}
		ondragleave={() => (isDragging = false)}
		ondrop={handleDrop}
	>
		<input
			id={uploadId}
			type="file"
			{accept}
			{disabled}
			{required}
			class="file-input"
			onchange={handleFileInput}
		/>

		{#if file}
			<div class="file-preview-card">
				{#if previewUrl}
					<img src={previewUrl} alt="Pratinjau berkas" class="thumb-img" />
				{:else}
					<div class="doc-icon">
						<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
							<polyline points="14 2 14 8 20 8"></polyline>
						</svg>
					</div>
				{/if}

				<div class="file-info">
					<span class="file-name">{file.name}</span>
					<span class="file-size">{(file.size / 1024).toFixed(1)} KB</span>
				</div>

				{#if !disabled}
					<button
						type="button"
						class="btn-remove"
						aria-label="Hapus berkas"
						onclick={removeFile}
					>
						<Icon name="x-mark" size={16} />
					</button>
				{/if}
			</div>
		{:else}
			<label for={uploadId} class="dropzone-label">
				<div class="upload-icon">
					<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
						<polyline points="17 8 12 3 7 8"></polyline>
						<line x1="12" y1="3" x2="12" y2="15"></line>
					</svg>
				</div>
				<div class="upload-text">
					<span class="main-instruction">Klik untuk memilih berkas atau seret ke sini</span>
					<span class="sub-instruction">Maks. {maxSizeMb} MB (JPG, PNG, PDF)</span>
				</div>
			</label>
		{/if}
	</div>

	{#if displayError}
		<p class="form-feedback error" role="alert">{displayError}</p>
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

	.dropzone {
		position: relative;
		border: 2px dashed var(--border-panel, #cbd5e1);
		border-radius: var(--radius-lg, 12px);
		background-color: var(--bg-panel-sub, #f8fafc);
		padding: 16px;
		text-align: center;
		transition: all 0.2s ease-in-out;
		cursor: pointer;
	}

	.dropzone:hover:not(.is-disabled) {
		border-color: var(--brand-primary, #059669);
		background-color: #f0fdf4;
	}

	.dropzone.is-dragging {
		border-color: var(--brand-primary, #059669);
		background-color: #ecfdf5;
		transform: scale(1.01);
	}

	.dropzone.has-error {
		border-color: var(--pill-danger-text, #dc2626);
		background-color: var(--pill-danger-bg, #fef2f2);
	}

	.dropzone.is-disabled {
		opacity: 0.6;
		cursor: not-allowed;
		background-color: #f1f5f9;
	}

	.file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}

	.dropzone-label {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		width: 100%;
	}

	.upload-icon {
		color: var(--brand-primary, #059669);
	}

	.upload-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.main-instruction {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-main, #0f172a);
	}

	.sub-instruction {
		font-size: 11.5px;
		color: var(--text-muted, #64748b);
	}

	.file-preview-card {
		display: flex;
		align-items: center;
		gap: 12px;
		background: var(--bg-panel-sub, #ffffff);
		border: 1px solid var(--border-panel, #e2e8f0);
		border-radius: var(--radius-md, 8px);
		padding: 8px 12px;
		text-align: left;
	}

	.thumb-img {
		width: 44px;
		height: 44px;
		object-fit: cover;
		border-radius: 6px;
		border: 1px solid var(--border-panel, #e2e8f0);
	}

	.doc-icon {
		width: 44px;
		height: 44px;
		background: var(--bg-panel-hover, #f1f5f9);
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted, #475569);
	}

	.file-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.file-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-main, #0f172a);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.file-size {
		font-size: 11px;
		color: var(--text-muted, #64748b);
	}

	.btn-remove {
		background: none;
		border: none;
		font-size: 20px;
		color: #94a3b8;
		cursor: pointer;
		line-height: 1;
		padding: 2px 6px;
	}

	.btn-remove:hover {
		color: var(--pill-danger-text, #dc2626);
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
