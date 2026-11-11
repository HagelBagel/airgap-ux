<script setup lang="ts">
/**
 * A modal confirmation for destructive actions, built on the native <dialog>.
 * showModal() gives focus trapping, Esc and an inert background for free.
 *
 * The parent owns the state: it sets `open`, and closes the dialog by setting
 * `open` to false on `cancel` or after `confirm` succeeds. While `busy`, the
 * dialog cannot be dismissed, so the user sees how the request ends.
 */
import { onMounted, ref, useId, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    confirmLabel: string
    busyLabel?: string
    busy?: boolean
    /** Shown inside the dialog, e.g. when the request fails. */
    error?: string | null
  }>(),
  { busyLabel: 'Working…', busy: false, error: null },
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const dialog = ref<HTMLDialogElement | null>(null)
const titleId = useId()
const errorId = useId()

function sync(open: boolean): void {
  const el = dialog.value
  if (!el) return
  if (open && !el.open) el.showModal()
  else if (!open && el.open) el.close()
}

onMounted(() => sync(props.open))
watch(() => props.open, sync)

/** Esc fires `cancel` on the dialog; let the parent decide instead of closing here. */
function onNativeCancel(event: Event): void {
  event.preventDefault()
  if (!props.busy) emit('cancel')
}

function onCancelClick(): void {
  if (!props.busy) emit('cancel')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="confirm-dialog"
    :aria-labelledby="titleId"
    :aria-describedby="error ? errorId : undefined"
    @cancel="onNativeCancel"
  >
    <h2 :id="titleId" class="confirm-dialog__title">{{ title }}</h2>

    <div class="confirm-dialog__body">
      <slot />
    </div>

    <p v-if="error" :id="errorId" class="confirm-dialog__error" role="alert">{{ error }}</p>

    <div class="confirm-dialog__actions">
      <!-- Cancel comes first and takes focus, so Enter on open does not destroy anything. -->
      <button class="confirm-dialog__cancel-btn" type="button" autofocus :disabled="busy" @click="onCancelClick">
        Cancel
      </button>
      <button class="confirm-dialog__confirm-btn" type="button" :disabled="busy" @click="emit('confirm')">
        {{ busy ? busyLabel : confirmLabel }}
      </button>
    </div>
  </dialog>
</template>

<style scoped>
.confirm-dialog {
  width: min(28rem, calc(100vw - 2 * var(--space-4)));
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-lg);

  &::backdrop {
    background: rgb(15 23 42 / 0.4);
  }
}

.confirm-dialog__title {
  font-size: var(--text-lg);
  font-weight: 700;
  overflow-wrap: anywhere;
}

.confirm-dialog__body {
  margin-top: var(--space-3);
  font-size: var(--text-sm);
  color: var(--c-slate-700);
  display: grid;
  gap: var(--space-2);
}

.confirm-dialog__error {
  margin-top: var(--space-4);
  padding: var(--space-3);
  border: 1px solid var(--c-red-200);
  border-radius: var(--radius-md);
  background: var(--color-danger-bg);
  color: var(--color-danger);
  font-size: var(--text-sm);
}

.confirm-dialog__actions {
  margin-top: var(--space-6);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

.confirm-dialog__cancel-btn,
.confirm-dialog__confirm-btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
  transition:
    background var(--duration-fast),
    color var(--duration-fast);

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
}

.confirm-dialog__cancel-btn {
  border: 1px solid var(--color-border);
  color: var(--color-text);

  &:hover:not(:disabled) {
    background: var(--c-slate-100);
  }
}

.confirm-dialog__confirm-btn {
  border: 1px solid var(--color-danger);
  background: var(--color-danger);
  color: var(--c-white);

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-danger) 85%, black);
  }
}
</style>
