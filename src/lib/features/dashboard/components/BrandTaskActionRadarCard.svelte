<script lang="ts">
	/**
	 * BrandTaskActionRadarCard.svelte
	 * Tugas Brand Manager (Diurutkan berdasarkan urgensi & dikelompokkan per outlet)
	 *
	 * Sesuai Golden Rule 13 & User Directives:
	 * 1. Tampilan depan kartu ringkas & informatif (Judul, Pemohon/Gerai, single action "Lihat").
	 * 2. Tanpa penumpukan tombol aksi langsung di baris depan.
	 * 3. Detail rincian & aksi (Setujui, Tolak, Transfer, Kurasi) berada di Modal Dialog interaktif.
	 */
	import DashboardCardFrame from './DashboardCardFrame.svelte';
	import { formatRupiah } from '../../../utils/format.js';
	import Badge from '../../../components/data/Badge.svelte';
	import Icon from '../../../components/data/Icon.svelte';

	interface BrandTask {
		id: string;
		type: 'transfer' | 'proposal' | 'expense' | 'eod' | 'opname';
		title: string;
		outlet: string;
		desc: string;
		badge: string;
		badgeVariant: 'warning' | 'info' | 'danger' | 'success';
		amount?: string;
		requester?: string;
		actionLabel: string;
	}

	const initialTasks: BrandTask[] = [
		{
			id: 'tsk-1',
			type: 'transfer',
			title: 'Transfer Stok: Fresh Milk (+15 L)',
			outlet: 'Jodi Dago ➔ Jodi Gubeng',
			desc: 'Dago mengalami surplus Fresh Milk, sedangkan Gubeng diprediksi habis pukul 15:00 WIB. Pemindahan antar gerai mencegah pembelian darurat dengan harga eceran tinggi.',
			badge: 'Transfer Stok',
			badgeVariant: 'warning',
			requester: 'Sistem Prediksi ERP',
			actionLabel: 'Setujui Transfer'
		},
		{
			id: 'tsk-2',
			type: 'proposal',
			title: 'Usulan Menu: Avocado Cold Brew',
			outlet: 'Jodi Senopati',
			desc: 'Varian seasonal summer racikan barista gerai. Butuh kurasi rasa, kecocokan profil brand, & kalkulasi HPP oleh Brand Manager sebelum diajukan ke HQ Admin.',
			badge: 'Kurasi Resep',
			badgeVariant: 'info',
			requester: 'Budi Santoso (SM Senopati)',
			actionLabel: 'Kurasi Resep'
		},
		{
			id: 'tsk-3',
			type: 'expense',
			title: 'Belanja Luar Kas Kecil (Es Batu Darurat)',
			outlet: 'Jodi Senopati',
			desc: 'Pembelian 5 kantong es batu kristal karena mesin es sedang maintenance siang tadi. Telah diverifikasi oleh Store Manager.',
			badge: 'Otorisasi Kas',
			badgeVariant: 'warning',
			amount: '85000.00',
			requester: 'Budi Santoso',
			actionLabel: 'Setujui'
		},
		{
			id: 'tsk-4',
			type: 'eod',
			title: 'Laporan Tutup Hari (EOD) Belum Masuk',
			outlet: 'Jodi Gubeng',
			desc: 'Checklist tutup kas laci fisik dan sinkronisasi POS shift malam belum dimulai oleh tim gerai.',
			badge: 'Tutup Hari',
			badgeVariant: 'danger',
			requester: 'Dimas Anggara (SM Gubeng)',
			actionLabel: 'Ingatkan Kasir'
		},
		{
			id: 'tsk-5',
			type: 'opname',
			title: 'Jadwal Stock Opname Malam Ini',
			outlet: 'Jodi Dago',
			desc: 'Audit fisik harian untuk Biji Kopi House Blend & Sirup Caramel sebelum tutup gerai untuk menjaga akurasi HPP.',
			badge: 'Opname Audit',
			badgeVariant: 'info',
			requester: 'Siti Rahma (SM Dago)',
			actionLabel: 'Buka Form'
		}
	];

	let tasks = $state<BrandTask[]>(initialTasks);
	let completedTaskIds = $state<Set<string>>(new Set());
	let toastMessage = $state<string | null>(null);

	// State modal detail tindakan
	let detailModalTask = $state<BrandTask | null>(null);

	const activeTasks = $derived(tasks.filter((t) => !completedTaskIds.has(t.id)));

	function completeTask(task: BrandTask, actionType: string) {
		completedTaskIds.add(task.id);
		toastMessage = `Tindakan berhasil: ${task.title} (${actionType})`;
		if (detailModalTask?.id === task.id) {
			detailModalTask = null;
		}
		setTimeout(() => {
			if (toastMessage) toastMessage = null;
		}, 3500);
	}
</script>

<DashboardCardFrame
	cardKey="action_center"
	customContent={true}
	title="Tugas & Otorisasi Brand Manager"
	icon="bolt"
	subtitle="Tindakan urgen dikelompokkan per gerai: kurasi resep, transfer stok, belanja kas & EOD"
	badgeText="{activeTasks.length} Tindakan Menunggu"
	badgeVariant={activeTasks.length > 0 ? 'warning' : 'success'}
	colSpan="col-12 col-lg-5"
>
	<!-- Toast Notifikasi Hasil Aksi -->
	{#if toastMessage}
		<div class="dash-banner dash-banner-success flex items-center justify-between py-2 px-3 mb-2 animate-fadeIn">
			<div class="flex items-center gap-2">
				<Icon name="check-circle" size={15} />
				<span class="text-xs font-semibold">{toastMessage}</span>
			</div>
			<button type="button" class="text-xs text-muted hover:text-main" onclick={() => (toastMessage = null)}>✕</button>
		</div>
	{/if}

	<!-- Scrollable Task List -->
	<div class="alert-items-scroll">
		{#if activeTasks.length === 0}
			<div class="p-6 text-center text-muted">
				<Icon name="check-circle" size={24} class="mb-2 text-primary mx-auto" />
				<p class="text-xs m-0 font-semibold" style="color: var(--text-main);">Seluruh tugas brand selesai!</p>
				<p class="text-[11px] text-muted m-0 mt-1">Tidak ada otorisasi atau rekomendasi stok yang tertunda.</p>
			</div>
		{:else}
			<div class="flex flex-col gap-2">
				{#each activeTasks as task}
					<div
						class="dash-subbox flex items-center justify-between gap-3 p-2.5"
						style="border-left: 3px solid {task.type === 'transfer' ? '#3b82f6' : task.type === 'expense' ? '#f59e0b' : task.type === 'eod' ? '#ef4444' : '#10b981'};"
					>
						<!-- Ringkasan Rapi: Judul, Pemohon, Gerai -->
						<div class="flex flex-col gap-0.5 min-w-0 flex-1">
							<div class="flex items-center gap-2 flex-wrap">
								<Badge variant={task.badgeVariant} text={task.badge} size="sm" />
								<span class="font-bold text-xs truncate" style="color: var(--text-main);" title={task.title}>
									{task.title}
								</span>
							</div>
							<div class="text-[11px] flex items-center gap-1.5 flex-wrap" style="color: var(--text-muted);">
								<span>{task.outlet}</span>
								<span>&bull;</span>
								<span>Pemohon: <strong style="color: var(--text-main);">{task.requester || 'Store Manager'}</strong></span>
								{#if task.amount}
									<span>&bull;</span>
									<span class="mono font-semibold" style="color: var(--pill-warning-text);">{formatRupiah(task.amount)}</span>
								{/if}
							</div>
						</div>

						<!-- Aksi Tunggal: Hanya "Lihat" (Golden Rule 13) -->
						<div class="flex items-center flex-shrink-0">
							<button
								type="button"
								class="btn-view-direct"
								onclick={() => (detailModalTask = task)}
								title="Buka rincian tugas dan otorisasi"
							>
								<Icon name="eye" size={13} />
								<span>Lihat</span>
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</DashboardCardFrame>

<!-- Modal Detail Tugas & Otorisasi Brand Manager (Progressive Disclosure) -->
{#if detailModalTask}
	<div
		class="contact-modal-backdrop animate-fadeIn"
		role="presentation"
		onclick={() => (detailModalTask = null)}
		onkeydown={(e) => e.key === 'Escape' && (detailModalTask = null)}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="contact-modal-box max-w-lg w-full"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			style="max-width: 520px;"
		>
			<!-- Modal Header -->
			<div class="flex items-center justify-between pb-3 mb-3 border-b" style="border-color: var(--border-panel);">
				<div class="flex items-center gap-2.5">
					<div
						class="w-9 h-9 rounded-xl flex items-center justify-center font-bold flex-shrink-0"
						style="background: var(--pill-{detailModalTask.badgeVariant}-bg); color: var(--pill-{detailModalTask.badgeVariant}-text); border: 1px solid var(--pill-{detailModalTask.badgeVariant}-border);"
					>
						<Icon name="bolt" size={18} />
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h3 class="text-sm font-bold m-0" style="color: var(--text-main);">{detailModalTask.title}</h3>
							<Badge variant={detailModalTask.badgeVariant} text={detailModalTask.badge} size="sm" />
						</div>
						<span class="text-xs text-muted">
							Gerai: <strong style="color: var(--text-main);">{detailModalTask.outlet}</strong>
						</span>
					</div>
				</div>
				<button
					type="button"
					class="text-sm text-muted hover:text-main p-1.5 cursor-pointer rounded-lg hover:bg-panel"
					onclick={() => (detailModalTask = null)}
				>
					✕
				</button>
			</div>

			<!-- Modal Body: Penjelasan & Konteks Lengkap -->
			<div class="flex flex-col gap-3 py-1 text-xs">
				<div class="dash-subbox p-3 flex flex-col gap-1.5">
					<span class="font-bold" style="color: var(--text-main);">Deskripsi Tindakan:</span>
					<p class="m-0 leading-relaxed" style="color: var(--text-muted);">
						{detailModalTask.desc}
					</p>
				</div>

				<div class="grid grid-cols-2 gap-2.5">
					<div class="dash-subbox p-2.5 flex flex-col gap-0.5">
						<span class="text-[11px]" style="color: var(--text-subtle);">Pemohon / PIC</span>
						<span class="font-bold" style="color: var(--text-main);">{detailModalTask.requester || 'Store Manager'}</span>
					</div>
					<div class="dash-subbox p-2.5 flex flex-col gap-0.5">
						<span class="text-[11px]" style="color: var(--text-subtle);">
							{detailModalTask.amount ? 'Nominal Pengeluaran' : 'Status Urgensi'}
						</span>
						<span class="font-bold mono" style="color: {detailModalTask.amount ? 'var(--pill-warning-text)' : 'var(--brand-primary)'};">
							{detailModalTask.amount ? formatRupiah(detailModalTask.amount) : 'Perlu Tindakan Hari Ini'}
						</span>
					</div>
				</div>
			</div>

			<!-- Modal Footer: Tombol Aksi Kontekstual -->
			<div class="flex items-center justify-between pt-3 mt-3 border-t text-xs" style="border-color: var(--border-panel);">
				<button
					type="button"
					class="btn-reject-direct py-2 px-3.5"
					onclick={() => (detailModalTask = null)}
				>
					Tutup
				</button>

				<div class="flex items-center gap-2">
					{#if detailModalTask.type === 'expense'}
						<button
							type="button"
							class="btn-reject-direct py-2 px-3.5"
							onclick={() => completeTask(detailModalTask!, 'Ditolak')}
						>
							Tolak
						</button>
						<button
							type="button"
							class="btn-approve-direct py-2 px-4"
							onclick={() => completeTask(detailModalTask!, 'Disetujui')}
						>
							<Icon name="check" size={13} />
							<span>Setujui Kas Kecil</span>
						</button>
					{:else if detailModalTask.type === 'transfer'}
						<button
							type="button"
							class="btn-approve-direct py-2 px-4"
							style="background: var(--brand-primary); border-color: var(--brand-primary);"
							onclick={() => completeTask(detailModalTask!, 'Transfer Disetujui')}
						>
							<Icon name="check" size={13} />
							<span>Setujui Transfer (+15 L)</span>
						</button>
					{:else if detailModalTask.type === 'proposal'}
						<a
							href="/menu#recipes"
							class="btn-approve-direct py-2 px-4"
							style="background: var(--brand-primary); border-color: var(--brand-primary);"
							onclick={() => completeTask(detailModalTask!, 'Menuju Kurasi')}
						>
							<Icon name="pencil-square" size={13} />
							<span>Buka Katalog Kurasi Resep</span>
						</a>
					{:else if detailModalTask.type === 'eod'}
						<button
							type="button"
							class="btn-approve-direct py-2 px-4"
							style="background: var(--pill-danger-text); border-color: var(--pill-danger-border);"
							onclick={() => completeTask(detailModalTask!, 'Pengingat Terkirim')}
						>
							<Icon name="bell" size={13} />
							<span>Kirim Pengingat Kasir</span>
						</button>
					{:else}
						<a
							href="/inventory"
							class="btn-approve-direct py-2 px-4"
							onclick={() => completeTask(detailModalTask!, 'Form Opname')}
						>
							<Icon name="clipboard-document-check" size={13} />
							<span>Buka Lembar Opname</span>
						</a>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
