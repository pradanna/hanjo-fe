/**
 * Hanjo Enterprise UI Component Kit
 * Referensi: AGENTS.md §2, MILESTONE.md §T-00.3, PRD 13.1
 *
 * Seluruh komponen dibangun dengan Svelte 5 Runes ($props, $state, $derived, $effect)
 * dan standar desain Light Theme WCAG AA (kontras teks ≥ 4.5:1).
 */

// --- Forms ---
export { default as Button } from './forms/Button.svelte';
export { default as Input } from './forms/Input.svelte';
export { default as TextField } from './forms/TextField.svelte';
export { default as NumberInput } from './forms/NumberInput.svelte';
export { default as CurrencyInput } from './forms/CurrencyInput.svelte';
export { default as Select } from './forms/Select.svelte';
export type { SelectOption } from './forms/Select.svelte';
export { default as MultiSelect } from './forms/MultiSelect.svelte';
export { default as Combobox } from './forms/Combobox.svelte';
export { default as DatePicker } from './forms/DatePicker.svelte';
export { default as DateRange } from './forms/DateRange.svelte';
export { default as Checkbox } from './forms/Checkbox.svelte';
export { default as Radio } from './forms/Radio.svelte';
export { default as Switch } from './forms/Switch.svelte';
export { default as Textarea } from './forms/Textarea.svelte';
export { default as FileUpload } from './forms/FileUpload.svelte';

// --- Wrappers & Guards ---
export { default as Feature } from './wrappers/Feature.svelte';
export { default as Can } from './wrappers/Can.svelte';

// --- Data Presentation ---
export { default as Badge } from './data/Badge.svelte';
export { default as CodeBadge } from './data/CodeBadge.svelte';
export { default as StatusBadge } from './data/StatusBadge.svelte';
export { default as InfoPanel } from './data/InfoPanel.svelte';
export { default as MetricCard } from './data/MetricCard.svelte';
export { default as StatCard } from './data/MetricCard.svelte'; // Alias kompatibilitas
export { default as Table } from './data/Table.svelte';
export { default as Pagination } from './data/Pagination.svelte';
export { default as FilterBar } from './data/FilterBar.svelte';
export { default as DiffViewer } from './data/DiffViewer.svelte';
export { default as Timeline } from './data/Timeline.svelte';
export { default as Chart } from './data/Chart.svelte';
export { default as Icon } from './data/Icon.svelte';

// --- Feedback & Overlays ---
export { default as Modal } from './feedback/Modal.svelte';
export { default as Drawer } from './feedback/Drawer.svelte';
export { default as ProgressBar } from './feedback/ProgressBar.svelte';
export { default as Skeleton } from './feedback/Skeleton.svelte';
export { default as EmptyState } from './feedback/EmptyState.svelte';
export { default as ErrorState } from './feedback/ErrorState.svelte';
export { default as ComingSoon } from './feedback/ComingSoon.svelte';
export { default as ConfirmDialog } from './feedback/ConfirmDialog.svelte';
export { default as StepUpDialog } from './feedback/StepUpDialog.svelte';
export { default as ActionMenu } from './feedback/ActionMenu.svelte';
export type { ActionMenuItem } from './feedback/ActionMenu.svelte';
export { default as Toast } from './feedback/Toast.svelte';
export { toast } from './feedback/toast.svelte.js';

// --- Layout ---
export { default as PageHeader } from './layout/PageHeader.svelte';
export { default as Sidebar } from './layout/Sidebar.svelte';
export { default as Header } from './layout/Header.svelte';
export { default as CommandPalette } from './layout/CommandPalette.svelte';
export { default as DevSourcePanel } from './layout/DevSourcePanel.svelte';
