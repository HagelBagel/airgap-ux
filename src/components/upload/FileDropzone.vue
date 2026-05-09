<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'files-selected', files: File[]): void
}>()

const ACCEPTED_TYPES = '.mp4,.mov,.webm,.wav,.mp3,.m4a,.ogg'

const isDragging  = ref(false)
const fileInputEl = ref<HTMLInputElement | null>(null)

function onDrop(e: DragEvent): void {
  isDragging.value = false
  const files = Array.from(e.dataTransfer?.files ?? []).filter(isMediaFile)
  if (files.length) emit('files-selected', files)
}

function onDragEnter(): void { isDragging.value = true  }
function onDragLeave(): void { isDragging.value = false }

function openBrowser(): void {
  fileInputEl.value?.click()
}

function onInputChange(e: Event): void {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  if (files.length) emit('files-selected', files)
  // Reset so the same file can be re-selected after a reset.
  ;(e.target as HTMLInputElement).value = ''
}

function isMediaFile(file: File): boolean {
  return file.type.startsWith('audio/') || file.type.startsWith('video/')
}
</script>

<template>
  <div
    class="dropzone"
    :class="{ 'dropzone--active': isDragging }"
    role="region"
    aria-label="File upload drop zone"
    @dragenter.prevent="onDragEnter"
    @dragleave.prevent="onDragLeave"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <!-- Hidden file input — triggered by the Browse button -->
    <input
      ref="fileInputEl"
      class="dropzone__input"
      type="file"
      :accept="ACCEPTED_TYPES"
      multiple
      aria-hidden="true"
      tabindex="-1"
      @change="onInputChange"
    />

    <div class="dropzone__content">
      <!-- Upload icon -->
      <svg
        class="dropzone__icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>

      <p class="dropzone__title">
        {{ isDragging ? 'Release to process' : 'Drop video or audio here' }}
      </p>
      <p class="dropzone__subtitle">MP4 · MOV · WAV · MP3 · M4A · WebM</p>

      <button
        class="dropzone__browse-btn"
        type="button"
        @click="openBrowser"
      >
        Browse files
      </button>
    </div>
  </div>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-12) var(--space-8);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  cursor: default;
  transition:
    border-color var(--duration-base) var(--ease-out),
    background   var(--duration-base) var(--ease-out);

  &.dropzone--active {
    border-color: var(--color-accent);
    background: var(--color-accent-bg);

    .dropzone__icon {
      color: var(--color-accent);
      transform: translateY(-4px);
    }

    .dropzone__title {
      color: var(--color-accent);
    }
  }
}

.dropzone__input {
  display: none;
}

.dropzone__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  text-align: center;
  pointer-events: none;
}

.dropzone__icon {
  width: 48px;
  height: 48px;
  color: var(--color-text-muted);
  transition:
    color     var(--duration-base) var(--ease-out),
    transform var(--duration-base) var(--ease-out);
}

.dropzone__title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: -0.01em;
  transition: color var(--duration-base) var(--ease-out);
}

.dropzone__subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  letter-spacing: 0.04em;
}

.dropzone__browse-btn {
  pointer-events: all;
  margin-top: var(--space-1);
  padding: var(--space-2) var(--space-5);
  background: var(--color-accent);
  color: var(--c-white);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: 0.02em;
  transition:
    background var(--duration-fast) var(--ease-out),
    transform  var(--duration-fast) var(--ease-out);

  &:hover {
    background: var(--c-forest-800);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}
</style>
