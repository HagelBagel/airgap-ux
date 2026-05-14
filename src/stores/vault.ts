import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface VaultHandle {
  name: string
  handle: FileSystemDirectoryHandle
}

export const useVaultStore = defineStore('vault', () => {
  const activeVault = ref<VaultHandle | null>(null)
  const isSelecting = ref(false)
  const error = ref<string | null>(null)

  async function selectVault() {
    if (!('showDirectoryPicker' in window)) {
      error.value = 'File System Access API is not supported in this browser.'
      return
    }

    try {
      isSelecting.value = true
      error.value = null
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      activeVault.value = { name: handle.name, handle }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled the picker — not an error
      } else {
        error.value = 'Could not access the selected folder.'
      }
    } finally {
      isSelecting.value = false
    }
  }

  return { activeVault, isSelecting, error, selectVault }
})
