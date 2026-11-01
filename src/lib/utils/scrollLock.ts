/**
 * Global Scroll Lock Utility for Modals, Drawers & Overlays
 *
 * Mencegah background / halaman utama ikut bergeser (scrolling) saat modal atau drawer terbuka.
 * Menggunakan counter ref-count agar aman terhadap modal bertumpuk (nested dialogs).
 */

let activeLockCount = 0;
let originalBodyOverflow = '';
let originalBodyPaddingRight = '';

export function lockScroll(): void {
	if (typeof window === 'undefined' || typeof document === 'undefined') return;

	if (activeLockCount === 0) {
		originalBodyOverflow = document.body.style.overflow;
		originalBodyPaddingRight = document.body.style.paddingRight;

		// Hitung lebar scrollbar sistem untuk menghindari pergeseran layout (layout shift)
		const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

		document.body.style.overflow = 'hidden';
		if (scrollbarWidth > 0) {
			document.body.style.paddingRight = `${scrollbarWidth}px`;
		}
	}

	activeLockCount++;
}

export function unlockScroll(): void {
	if (typeof window === 'undefined' || typeof document === 'undefined') return;

	activeLockCount = Math.max(0, activeLockCount - 1);

	if (activeLockCount === 0) {
		document.body.style.overflow = originalBodyOverflow;
		document.body.style.paddingRight = originalBodyPaddingRight;
	}
}

