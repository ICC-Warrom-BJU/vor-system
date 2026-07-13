import { useEffect } from 'react'

/**
 * Tutup modal ketika tombol Escape ditekan.
 * Aman dipanggil sebelum early-return `if (!isOpen) return null` karena
 * urutan pemanggilan hook tetap konsisten di setiap render.
 */
export function useEscToClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])
}
