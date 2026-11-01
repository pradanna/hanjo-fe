# Antigravity Agent Guidelines: Hanjo Frontend (SvelteKit 5)

> **Cakupan Proyek**: `frontend/` (SvelteKit 5, TypeScript, Vanilla CSS)  
> **Dokumen Referensi Utama**: [`docs/MILESTONE.md`](file:///c:/PROJECT/WEBSITE/hanjo/frontend/docs/MILESTONE.md), [`docs/milestones/README.md`](file:///c:/PROJECT/WEBSITE/hanjo/frontend/docs/milestones/README.md) & [`docs/COMPONENTS.md`](file:///c:/PROJECT/WEBSITE/hanjo/docs/COMPONENTS.md)  
> **Prinsip Inti**: Domain-Driven Design (DDD), Clean Architecture, Component-First, UI Buta Sumber Data, Mock-to-Real Parity.

---

## 1. Golden Rules (Aturan Utama Tanpa Pengecualian)

1. **UI Buta Sumber Data (Prinsip P1 & P2)**:
   - Komponen UI (`features/*`, `routes/*`, `ui/*`) **TIDAK BOLEH** mengetahui dari mana data berasal.
   - **DILARANG KERAS** memanggil `fetch()` langsung dari dalam file `.svelte`.
   - Seluruh interaksi data **WAJIB** melalui alur:  
     `UI Component -> Domain Service -> ApiClient -> DataDriver (MockDriver / HttpDriver)`.
   - Mengubah `PUBLIC_DATA_SOURCE=api` atau `mock` hanya mengganti driver, tidak mengubah satu baris pun kode tampilan.

2. **Pemisahan Logika dari File `.svelte` (Separation of Concerns)**:
   - File `.svelte` **HANYA BERFOKUS PADA PRESENTASI** (tata letak, template markup, visual rendering, binding input, dan visual toggle lokal).
   - Seluruh logika bisnis, manipulasi data, kalkulasi, orkestrasi service, dan state management kompleks **WAJIB dibuat di file `.ts` atau `.svelte.ts` terpisah**:
     - Logika kalkulasi bisnis murni → `src/lib/domain/*.ts`
     - Pemanggilan API & orkestrasi → `src/lib/services/*.service.ts`
     - State reaktif & form handler fitur → `src/lib/features/<modul>/stores/*.svelte.ts`
   - **DILARANG KERAS** menumpuk ratusan baris fungsi algoritma, pemrosesan data, atau state machine langsung di dalam tag `<script>` file `.svelte`. File `.svelte` harus tetap tipis, bersih, dan mudah dibaca.

3. **Arsitektur Component-First & Anti-Duplikasi UI (UI Pre-Flight Protocol)**:
   - **SOP Wajib Agen Sebelum Menulis Kode UI (3 Langkah Mutlak)**:
     1. **Langkah 1 (Stop & Check)**: Sebelum membuat view, drawer, modal, tabel, atau kontrol form baru, **AGEN WAJIB BUKA & BACA [`docs/COMPONENTS.md`](file:///c:/PROJECT/WEBSITE/hanjo/docs/COMPONENTS.md)** dan cek pustaka `$lib/ui`.
     2. **Langkah 2 (Mandatory Reuse)**: Jika komponen sudah ada (misal `Button`, `Input`, `CurrencyInput`, `Select`, `Combobox`, `Modal`, `Drawer`, `Table`, `MetricCard`, `StatusBadge`, `Skeleton`, `EmptyState`), **WAJIB REUSE**. DILARANG KERAS membuat tag HTML mentah (`<input>`, `<button>`, `<select>`) atau membuat styling kustom untuk fungsi yang sudah ada.
     3. **Langkah 3 (Register New Component)**: Jika komponen yang dibutuhkan memang benar-benar belum ada, buat komponen reusable baru di `src/lib/components/` (ekspor ke `index.ts`) atau `src/lib/features/<modul>/components/`, lalu **WAJIB langsung daftarkan ke [`docs/COMPONENTS.md`](file:///c:/PROJECT/WEBSITE/hanjo/docs/COMPONENTS.md)** agar agen berikutnya tidak membuat duplikasi.

4. **Pemisahan Style & Tailwind CSS v4 sebagai Base**:
   - **Tailwind CSS v4 sebagai Base**: Gunakan utility classes Tailwind v4 untuk tata letak (*layout*), *flexbox/grid*, *spacing*, *sizing*, dan tipografi dasar.
   - **Pemisahan Berkas Style (Style Separation)**:
     - **DILARANG KERAS** menumpuk ratusan atau ribuan baris CSS mentah langsung di tag `<style>` pada file `+layout.svelte` atau `+page.svelte`.
     - Styling custom, animasi khusus, atau stylesheet tata letak kompleks **WAJIB disendirikan** ke dalam berkas `.css` terpisah (misalnya `layout.css` atau file CSS modular per komponen).
     - Token desain terpusat (warna brand Emerald, status semantik, latar belakang) dikelola secara terpusat di `src/app.css` menggunakan `@theme` / CSS variables.

5. **Aturan Batas Modul Bersih (§3.6)**:
   - `features/*` dan `ui/*` **DILARANG** mengimpor berkas apa pun dari `api/drivers/*`.
   - `domain/*` adalah logika murni (*pure business logic*, bebas I/O). **DILARANG** mengimpor dari `api/`, `features/`, atau `ui/`.
   - Mock handler boleh memakai `domain/*`; Service dan UI boleh memakai fungsi murni `domain/*` untuk kalkulasi lokal/pratinjau, namun **angka resmi tetap berasal dari server/mock**.

6. **Waktu Deterministik (§5 & Aturan Kerja 4)**:
   - **DILARANG** memanggil `new Date()` atau `Date.now()` secara langsung di dalam logika bisnis atau mock handler.
   - Gunakan selalu `clock.now()`, `clock.nowIso()`, dan `clock.businessDate()` dari `#lib/api/drivers/mock/engine/clock.js`.
   - Hari bisnis dihitung pada zona waktu **Asia/Jakarta (WIB, UTC+7)** dengan format `YYYY-MM-DD`.

7. **Presisi Finansial & String Desimal (§4.2)**:
   - Uang dan jumlah kuantitas pada batas API **selalu dikirim sebagai string desimal** (mis. `"25000.0000"`).
   - Dilarang melakukan operasi aritmatika uang dengan tipe `number` float biasa. Gunakan pustaka `decimal.js` atau utilitas `#lib/utils/format.js`.

8. **4 Keadaan Layar Wajib (Mandatory Screen States §6)**:
   Setiap komponen atau halaman pemuat data **wajib** mengimplementasikan 4 status tampilan:
   - **Memuat (Loading)**: Tampilkan skeleton shimmer (`<Skeleton />`), bukan spinner kosong.
   - **Kosong (Empty)**: Tampilkan pesan informatif + tombol ajakan bertindak (*CTA*).
   - **Galat (Error)**: Tampilkan pesan kesalahan ramah pengguna + tombol Coba Lagi (*Retry*).
   - **Tidak Berhak (403 / Forbidden)**: Tampilkan layar akses ditolak jika `can()` bernilai false.

9. **Otorisasi & Scope Hirarkis Organisasi-Outlet (§7 & Prinsip P5)**:
   - **Hirarki Domain**: `Organisasi` berada di atas `Outlet` (1 organisasi menjalankan 1 atau banyak outlet, mis. Seduhan Kopi Jodi dengan 3 outlet, Kaveloka 1 outlet, Plaga 1 outlet).
   - **Dilarang** hardcode peran di komponen (mis. `if (user.role === 'store_manager')`).
   - Gunakan fungsi izin terpusat: `can(action, resource, outlet_id?)` dari `#lib/auth/can.js`.
   - Store Manager dibatasi secara ketat hanya pada organisasi dan outlet tugasnya (`404 not_found` jika mencoba membuka data outlet luar). Store manager dapat mengelola beberapa outlet dalam organisasi yang sama (mis. Sari mengelola Jodi Dago & Jodi Gubeng).

10. **Invarian Tema Ganda & Anti-Sticker Putih (Light & Dark Mode Parity)**:
   - **DILARANG KERAS** menggunakan warna statis/heksadesimal mentah atau class utility Tailwind statis untuk latar belakang, border, dan teks (seperti `#ffffff`, `#fff`, `#f8fafc`, `#f1f5f9`, `bg-white`, `bg-slate-50`, `bg-slate-100`, `text-slate-900`, `text-slate-800`, `text-slate-700`).
   - Warna latar belakang terang yang di-hardcode menimbulkan efek cacat visual berupa **"sticker putih" (white patches)** di Dark Mode dan menyebabkan teks bertabrakan (*unreadable contrast/white-on-white*).
   - **DILARANG KERAS** memberi pseudo-state hover atau active dengan warna putih (misal `:hover { background: #ffffff; }` atau `hover:bg-white`), karena kartu di Dark Mode akan langsung menjadi blok putih menyilaukan saat kursor melintas.
   - **WAJIB** menggunakan CSS Design Tokens terpusat dari `src/app.css`:
     - **Latar Belakang Panel Utama**: `var(--bg-panel)`
     - **Sub-Container / Item Baris / Sub-Grid / Tabel**: `var(--bg-panel-sub)`
     - **Interaksi Hover / Active**: `var(--bg-panel-hover)` (aktif: `var(--bg-panel-active)`)
     - **Garis Batas (Borders)**: `var(--border-panel)` (utama) dan `var(--border-subtle)` (pembatas item dalam)
     - **Fokus Garis Batas**: `var(--border-focus)`
     - **Tipografi**:
       - Judul & Nilai Metrik: `var(--text-main)` (otomatis putih di dark, slate gelap di light)
       - Subtitle & Label: `var(--text-muted)`
       - Caption, Timestamp & Monospace ID: `var(--text-subtle)`
     - **Banner & Status Callout**:
       - Warning: `var(--pill-warning-bg)`, `var(--pill-warning-border)`, `var(--pill-warning-text)`
       - Success: `var(--pill-success-bg)`, `var(--pill-success-border)`, `var(--pill-success-text)`
       - Danger: `var(--pill-danger-bg)`, `var(--pill-danger-border)`, `var(--pill-danger-text)`
       - Info: `var(--pill-info-bg)`, `var(--pill-info-border)`, `var(--pill-info-text)`
   - **Prosedur Audit Tema Wajib (Visual Theme Audit Protocol)**:
     Setiap pembuatan atau pembaruan komponen UI **WAJIB diuji dan diverifikasi secara visual pada KEDUA mode tema** (`data-theme="light"` dan `data-theme="dark"`). Jangan pernah menyelesaikan task sebelum memastikan tidak ada "sticker putih" di mode gelap dan tidak ada teks pudar di mode terang.

11. **Larangan Keras Emoticon/Emoji & Kewajiban Heroicons SVG**:
   - **DILARANG KERAS** menggunakan karakter emoji/emoticon Unicode (seperti ⚡, 📈, 💰, 🏢, ⚠️, 📑, 📡, 🌙, 💳, 🪙, 📋, 💡, 🧾, 🎉, ℹ️, ☕, dll.) pada seluruh antarmuka ERP Hanjo.
   - Karakter emoji Unicode tampak amatir, tidak konsisten antar sistem operasi (tampilan rendering di Windows, macOS, Android, iOS, dan Linux berbeda drastis), tidak dapat diatur ketebalan garisnya (*stroke weight*), dan tidak mengikuti sistem warna tema.
   - **WAJIB** menggunakan icon SVG berbasis standar **Heroicons** (24x24 outline dengan `stroke-width="1.8"` atau `2`, atau 20x20 solid) yang bersih, profesional, elegan, dan proporsional.
   - Gunakan komponen terpusat `<Icon name="..." size={...} class="..." />` dari `#lib/components/ui/Icon.svelte` atau `#lib/ui/Icon.svelte`.
   - Seluruh icon wajib mewarisi warna secara dinamis menggunakan `stroke="currentColor"` atau `fill="currentColor"` agar otomatis selaras dengan token semantik (`var(--brand-primary)`, `var(--text-muted)`, status badges, dll.).

12. **Wajib Desain Penuh (Full-Width) & Responsif 4-Tier Seketika (Simultaneous Responsive Engineering)**:
   - **Prinsip Seketika (Zero Deferred Responsiveness)**: Setiap kali membuat, mengubah, atau merancang komponen UI, kartu (*card*), filter toolbar, tabel data, chart, atau layout halaman, **WAJIB LANGSUNG DIBUAT RESPONSIF SEKALIAN** mencakup 4 skala layar tanpa ditunda. Dilarang membuat tampilan hanya untuk desktop lalu menunda penyesuaian mobile/tablet.
   - **Full-Width (Bebas Kotak Kaku)**: Kontainer utama dan dashboard **WAJIB 100% Fluid Full-Width** (`max-width: 100%`). **DILARANG KERAS** membatasi kontainer luar dengan `max-width: 1440px` atau `1600px` yang meninggalkan ruang kosong/hitam lebar di sisi kiri-kanan pada monitor desktop besar atau ultrawide.
   - **Standar Adaptasi 4 Skala Layar (4-Tier Breakpoints)**:
     1. **Layar Besar (Large Desktop & Ultrawide $\ge$ 1600px)**:
        - Lebar 100% penuh dengan padding lega (`24px` hingga `32px`).
        - Hero strip KPI berjajar 4 kolom dalam 1 baris (`repeat(4, 1fr)`).
        - Grid kartu 12 kolom dengan gap lega (`gap: 24px`).
     2. **Layar Agak Besar (Laptop & Desktop Standar 1024px – 1599px)**:
        - Lebar 100% penuh dengan padding seimbang (`20px 24px`).
        - Hero strip KPI 4 kolom, grid kartu 12 kolom (pasangan kartu 6+6 sejajar rapi, `gap: 20px`).
     3. **Tablet (768px – 1023px, iPad / Tablet Portrait & Landscape)**:
        - Padding `16px 20px`.
        - Hero strip KPI otomatis menjadi 2 kolom $\times$ 2 baris.
        - Grid kartu bertransformasi menjadi 2 kolom seimbang; kartu-kartu pasangan 6-kolom otomatis membagi rata 1 kolom per kartu (`grid-column: span 1`).
        - Toolbar filter membungkus (*wrap*) rapi tanpa teks label terjepit.
     4. **HP / Smartphone (< 768px, 360px – 480px)**:
        - Padding ringkas `10px 14px` agar area baca layar kecil maksimal.
        - Filter toolbar bertransformasi menjadi form grid 2-kolom yang mudah disentuh jempol (*touch-friendly tap targets* $\ge$ 38px).
        - Seluruh kartu mengambil 1 kolom penuh (100% lebar).
        - Nilai headline metrik menyesuaikan ukuran font (`20px–22px`) agar tidak terpotong.
        - Elemen horizontal lebar (tabel data, grafik batang jam-per-jam) **WAJIB** dibungkus kontainer scroll sentuh (`overflow-x: auto; -webkit-overflow-scrolling: touch;`) sehingga tidak gepeng dan **DILARANG KERAS** menyebabkan layar utama meluap secara horizontal (*zero page-level horizontal overflow*).

13. **Prinsip Tampilan Dashboard: Simple Tapi Informatif & Progressive Disclosure (Anti-Overclutter / Anti-Sesak)**:
    - **Anti-Overclutter / Dilarang Menumpuk Detail & Aksi di Depan**:
      - Seluruh kartu ringkasan dashboard (antrean persetujuan, alert stok bahan kritis, radar operasional, notifikasi tugas) **DILARANG KERAS** menumpuk teks detail bertele-tele (deskripsi panjang, kutipan alasan berparagraf, catatan audit) atau menjejalkan banyak tombol aksi langsung (seperti Setujui + Tolak + Buat PO + Hubungi SM + Menu titik tiga) langsung pada baris kartu di muka (*upfront*).
      - Menjejalkan semua data dan tombol aksi sekaligus di depan membuat dashboard terasa penuh, sesak, berat, sulit dipindai (*unscannable*), dan membingungkan pengguna.
    - **Dibuat Simple Tapi Informatif**:
      - Setiap baris antrean kartu dashboard **hanya menampilkan informasi esensial/inti**:
        - **Entitas Utama**: Judul pengajuan, nama dokumen, atau nama bahan/item.
        - **Konteks Kritis**: Pemohon, nama gerai, nominal ringkas (jika ada), atau status kritis (seperti sisa hari persediaan).
      - **Aksi Tunggal yang Bersih & Konsisten**: Pada baris kartu dashboard, **hanya gunakan satu tombol aksi utama yang ringkas**, yaitu **`Lihat`** (`.btn-view-direct`).
    - **Kewajiban Pola Progressive Disclosure**:
      - Seluruh rincian teks mendalam, alasan pengajuan, formulir persetujuan bertingkat, konfirmasi otorisasi risiko tinggi, penerbitan PO pengadaan, maupun opsi kontak komunikasi (WhatsApp / Telepon) **WAJIB diakses melalui Modal Dialog, Drawer, atau Halaman Lengkap** saat tombol `Lihat` diklik.
      - Dengan pola ini, dashboard tetap bersih, lega, bernapas (*breathable*), dan berkelas tanpa mengorbankan kelengkapan fitur ERP.

14. **Kewajiban Padding Proporsional & Anti-Sesak (Generous Padding & Breathing Room Rule)**:
    - **DILARANG KERAS** membuat elemen antarmuka yang kekurangan padding sehingga terasa sesak, sempit (*cramped*), atau teks mepet pada garis batas (border).
    - **Standar Padding Komponen Form (Form Controls $\ge$ 40px min-height)**:
      - `Input`, `TextField`, `CurrencyInput`, `DatePicker`, `Combobox`, `Select`: `padding: 9px 14px; min-height: 40px; border-radius: 8px;` (horizontal padding minimal 12–14px).
      - `Textarea`: `padding: 12px 14px; min-height: 80px;`.
      - Opsi Dropdown (`.select-option-item`, `.option-item`): `padding: 9px 14px;` dengan gap `4px`.
      - Trigger Icon / Arrow: diberi padding samping minimal `12px-14px` agar tidak mepet ke tepi kanan.
    - **Standar Jarak Vertikal Antar-Field Formulir (Field Spacing & Margin $\ge$ 20px–24px & Anti-Campur Aduk)**:
      - Jarak vertikal antar-baris formulir / input controls (`.form-field-stack`, grid input rows, field stack) **WAJIB minimal 20px (gap-5 / 20px–24px)**.
      - **DILARANG KERAS** menggunakan jarak minimalis/terlalu mepet seperti `space-y-2`, `space-y-3`, `gap-2`, atau `gap-3` (12px–14px) yang membuat label field di bawah menempel ketat pada dasar kotak input di baris atasnya sehingga tampak campur aduk dan membingungkan pengguna.
      - Jarak horizontal antar-kolom input dalam 1 baris grid: `gap: 16px` (gap-4).
      - Jarak antara label dengan kotak input di dalam komponen field: `gap: 6px`–`8px`.
      - Gunakan utility terstandar `.form-field-stack` (`display: flex; flex-direction: column; gap: 20px;`) atau `.form-field-grid` (`display: grid; gap: 20px 16px;`).
    - **Standar Padding Modal & Drawer**:
      - `Modal Header`: `padding: 18px 24px;`
      - `Modal Body`: `padding: 24px;`
      - `Modal Footer`: `padding: 16px 24px;`
      - **Wajib Gunakan Slot Footer Terdedikasi (`{#snippet footer()}`)**: Tombol penutup atau aksi modal harus diletakkan pada slot footer terdedikasi agar selalu sticky/tetap di bagian bawah modal dan tidak terpotong atau hilang saat isi modal di-scroll.
    - **Standar Padding Kartu & Subbox**:
      - Kartu Hero & Section Kontainer: `padding: 18px 20px; gap: 14px;`
      - Sub-box metrik & timeline item: `padding: 14px 16px;`
    - **Standar Padding Badge, Status Pill & Code Badge**:
      - Komponen `Badge` / `.badge` / `.pill-badge`: `padding: 4px 12px; font-size: 11.5px; border-radius: 9999px; white-space: nowrap;`. Dilarang keras teks badge terbungkus / wrap ke 2 baris.
      - Code Badge (`.outlet-hero-code-badge`, `.outlet-code-badge`): minimal `height: 44px; min-width: 68px; padding: 0 16px; white-space: nowrap;` untuk badge hero dan `padding: 3.5px 10px; border-radius: 6px; white-space: nowrap;` untuk inline code badge. Dilarang keras menggunakan fixed square kecil seperti `w-12 h-12` yang menyebabkan teks kode seperti `JKT-01` terlipat menjadi 2 baris (`JKT-` dan `01`).
      - Kotak Notifikasi / Callout (`.detail-notice-callout`): `padding: 14px 18px; border-radius: 10px; gap: 12px; font-size: 12.5px; line-height: 1.55;`. Dilarang keras menggunakan padding minimalis seperti `p-2.5` (10px).
    - **Standar Pemisah Garis & Tombol Aksi (Action Bar & Separator Line Spacing)**:
      - Jarak antara konten atas dengan garis pemisah (`border-top`): `margin-top: 22px–24px`.
      - Jarak antara garis pemisah dengan tombol aksi di bawahnya: `padding-top: 18px–20px` (min 18px).
      - Jarak antar tombol aksi horizontal: `gap: 12px`.
      - Wajib gunakan kelas terstandar `.form-action-bar` atau `.section-footer-action`.
      - **DILARANG KERAS** menempelkan tombol mepet garis hanya dengan `pt-1` / `pt-2` / `pt-3` (12px) tanpa margin atas yang membuat tombol tampak terhimpit garis.

15. **Penempatan Aksi Kontekstual pada Halaman Ber-Tab (Contextual Actions Below Tabs)**:
    - Tombol aksi pembuatan entitas spesifik tab (contoh: **Tambah Outlet Baru**, **Tambah Organisasi Induk**, **Buat Grup Baru**) **WAJIB diletakkan di bawah navigasi tab** (pada toolbar filter atau sub-header area kerja tab terkait), **BUKAN di header global paling atas halaman**.
    - Meletakkan tombol aksi di header atas sebelum navigasi tab merusak hierarki UX karena tombol tersebut terputus dari konteks tab yang sedang aktif dan membingungkan pengguna saat berpindah-pindah tab.

---

## 2. Struktur Folder Baku (`frontend/src/lib/`)

```
src/lib/
├── api/
│   ├── contract/          # Tipe DTO, skema validasi, kode galat, registry endpoints
│   ├── client.ts          # ApiClient singleton, driver resolver dinamis, retry GET
│   └── drivers/
│       ├── http/          # Driver fetch riil + token + If-Match + Idempotency-Key
│       └── mock/
│           ├── engine/    # DB in-memory, tx rollback, router, clock, event bus, persist
│           ├── handlers/  # Mock route handlers per bounded context (org, catalog, inv, dll)
│           └── driver.ts  # MockDriver implementasi DataDriver
├── domain/                # Logika bisnis murni / formula bebas I/O (pricing, recipe, HPP, True-Up)
├── services/              # Satu berkas per domain, memanggil API (catalog.service.ts, dll)
├── auth/                  # Sesi Svelte 5, can() permission engine, scope outlet checker
├── config/                # Feature flags, konfigurasi navigasi deklaratif, kamus status
├── ui/                    # Kit komponen UI reusable (forms, data, feedback, navigation, layout)
│   ├── forms/             # Button, Input, NumberInput, Select, Combobox, DatePicker, dll
│   ├── data/              # Table, StatCard, StatusBadge, Timeline, DiffViewer, Chart, FilterBar
│   ├── feedback/          # Toast, Skeleton, EmptyState, ErrorState, ConfirmDialog, StepUpDialog
│   ├── navigation/        # Tabs, Breadcrumb, Drawer, CommandPalette
│   └── layout/            # PageHeader, Shell, Sidebar, Header
├── features/<modul>/      # Tampilan spesifik fitur, dialog alur kerja, & store lokal
│   ├── components/        # Sub-komponen spesifik hanya untuk modul ini
│   └── stores/            # Logic state terpisah (*.svelte.ts), TIDAK di dalam .svelte
└── utils/                 # formatRupiah, formatDateWIB, desimal, konversi satuan
```

---

## 3. Konvensi Svelte 5 (Runes) & Styling

Gunakan fitur modern **Svelte 5 Runes** untuk keterbacaan dan reaktivitas eksplisit:
- **State**: Gunakan `let count = $state(0);` atau `let items = $state<Item[]>([]);`
- **Derived**: Gunakan `let total = $derived(price * qty);`
- **Props**: Gunakan destructuring `$props`:  
  `let { title, isOpen = $bindable(false), onclose }: Props = $props();`
- **Snippet**: Gunakan `{#snippet header()} ... {/snippet}` menggantikan `<slot />`.
- **Tema Desain (Light & Dark Mode Parity)**: Sistem mendukung mode Gelap dan Terang secara dinamis via atribut `data-theme`. Kontras teks minimum 4.5:1 (WCAG AA). Hindari warna generik ad-hoc atau class statis (`bg-white`), selalu gunakan token CSS variables terpusat yang otomatis beradaptasi saat tema berganti.

---

## 4. Alur Kerja Eksekusi Milestone (Standar Pengembangan)

Setiap kali mengerjakan sub-fase atau tugas dari `docs/milestones/MS-xx.md`:
1. **Periksa Kontrak**: Pastikan endpoint terdaftar di `api/contract/endpoints.ts` dan tipe ada di `types.ts`.
2. **Domain Logic Murni**: Tulis kalkulasi bisnis (rumus) di `domain/*.ts` lengkap dengan unit test vektor uji.
3. **Mock Handler**: Implementasikan simulasi backend di `api/drivers/mock/handlers/<domain>.ts`.
4. **Service & State Logic Terpisah**:
   - Buat method pemanggil API di `services/<domain>.service.ts`.
   - Buat state controller & handler reaktif di `features/<domain>/stores/<name>.svelte.ts` (terpisah dari `.svelte`).
5. **Cek Komponen Terlebih Dahulu (Component-First)**:
   - Periksa `src/lib/ui/`.
   - Jika butuh elemen input/data baru, buat komponen reusable di `src/lib/ui/` terlebih dahulu.
6. **Susun Tampilan `.svelte` & Full-Width Responsif 4-Tier Seketika**:
   - Rakit tampilan halaman dengan mengimpor reusable component dari `ui/` dan state dari `stores/*.svelte.ts`.
   - **Wajib Responsif Seketika**: Terapkan langsung aturan Golden Rule 12 (Layar Besar, Agak Besar, Tablet, HP) pada komponen dan layout yang sedang dibangun tanpa menunda penyesuaian mobile/tablet. Pastikan kontainer 100% fluid full-width tanpa overflow horizontal.
   - Terapkan **4 state wajib**: Loading (Skeleton), Empty, Error (+ Retry), dan 403 Forbidden.
7. **Verifikasi Kualitas**: Jalankan `npm run check` (harus 0 errors, 0 warnings).
8. **Perbarui Checklist**: Centang `- [x]` tugas terkait di [`docs/milestones/MS-xx.md`](file:///c:/PROJECT/WEBSITE/hanjo/frontend/docs/milestones/).
