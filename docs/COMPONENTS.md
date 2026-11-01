# Hanjo Component Registry (Frontend Web ERP)

> **Catatan Referensi Cepat**:  
> Dokumen katalog komponen utama berada di:  
> 👉 [`docs/COMPONENTS.md`](file:///c:/PROJECT/WEBSITE/hanjo/docs/COMPONENTS.md)

Untuk mencegah pembuatan komponen ganda atau redundansi UI, **seluruh agent wajib memeriksa [`docs/COMPONENTS.md`](file:///c:/PROJECT/WEBSITE/hanjo/docs/COMPONENTS.md)** sebelum membuat markup form, kartu, modal, tabel, atau kontrol input baru.

### Ringkasan Pustaka `$lib/ui`:
- **Formulir**: `Button`, `Input`, `TextField`, `CurrencyInput`, `NumberInput`, `Select`, `MultiSelect`, `Combobox`, `DatePicker`, `DateRange`, `Checkbox`, `Radio`, `Switch`, `Textarea`, `FileUpload`.
- **Data Presentation**: `Table`, `MetricCard` *(alias `StatCard`)*, `StatusBadge`, `CodeBadge`, `Badge`, `Pagination`, `FilterBar`, `DiffViewer`, `Timeline`, `Chart`, `Icon`.
- **Feedback & Dialog**: `Modal`, `Drawer`, `ConfirmDialog`, `StepUpDialog`, `ActionMenu`, `ProgressBar`, `Skeleton`, `EmptyState`, `ErrorState`, `ComingSoon`, `Toast` *(dan helper `toast`)*.
- **Layout**: `Header`, `Sidebar`, `PageHeader`, `CommandPalette`, `DevSourcePanel`.
- **Guards**: `Can`, `Feature`.

Untuk detail lengkap props, tipe TypeScript, dan contoh pemakaian, lihat [`docs/COMPONENTS.md`](file:///c:/PROJECT/WEBSITE/hanjo/docs/COMPONENTS.md).
