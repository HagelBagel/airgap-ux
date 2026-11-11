<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import type { Project } from '../services/api/projectsApi'
import { useProjectsStore } from '../stores/useProjectsStore'

const NAME_MAX_LENGTH = 200

const projects = useProjectsStore()

const newName = ref('')
const isCreating = ref(false)
const createError = ref<string | null>(null)

/** The Project the confirmation dialog asks about; null when it is closed. */
const pendingDelete = ref<Project | null>(null)
const isDeleting = ref(false)
const deleteError = ref<string | null>(null)
const heading = ref<HTMLHeadingElement | null>(null)

onMounted(() => {
  // Refresh on every visit so the list reflects changes from elsewhere.
  void projects.load()
})

async function createProject(): Promise<void> {
  const name = newName.value.trim()
  if (name.length === 0) {
    createError.value = 'Give the project a name.'
    return
  }
  isCreating.value = true
  createError.value = null
  try {
    await projects.create(name)
    newName.value = ''
  } catch (e) {
    createError.value = e instanceof Error ? e.message : String(e)
  } finally {
    isCreating.value = false
  }
}

function askToDelete(project: Project): void {
  pendingDelete.value = project
  deleteError.value = null
}

function cancelDelete(): void {
  pendingDelete.value = null
}

async function confirmDelete(): Promise<void> {
  const project = pendingDelete.value
  if (!project) return
  isDeleting.value = true
  deleteError.value = null
  try {
    await projects.remove(project.id)
    pendingDelete.value = null
    // The Delete button that had focus is gone with its row; without this,
    // focus would fall back to <body>.
    await nextTick()
    heading.value?.focus()
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : String(e)
  } finally {
    isDeleting.value = false
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}
</script>

<template>
  <div class="project-list">
    <header class="project-list__header">
      <h1 class="project-list__title">AirGap UX</h1>
      <div class="project-list__subtitle">Jobs-to-be-Done Research Assistant</div>
    </header>

    <main class="project-list__body">
      <h2 ref="heading" class="project-list__heading" tabindex="-1">Projects</h2>

      <form class="project-list__form" novalidate @submit.prevent="createProject">
        <label class="project-list__label" for="new-project-name">New project name</label>
        <div class="project-list__form-row">
          <input
            id="new-project-name"
            v-model="newName"
            class="project-list__input"
            type="text"
            :maxlength="NAME_MAX_LENGTH"
            autocomplete="off"
            :aria-invalid="createError !== null"
            :aria-describedby="createError ? 'new-project-error' : undefined"
          />
          <button class="project-list__create-btn" type="submit" :disabled="isCreating">
            {{ isCreating ? 'Creating…' : 'Create project' }}
          </button>
        </div>
        <p v-if="createError" id="new-project-error" class="project-list__form-error" role="alert">
          {{ createError }}
        </p>
      </form>

      <p v-if="projects.status === 'loading' && projects.projects.length === 0" class="project-list__status">
        Loading projects…
      </p>

      <div v-else-if="projects.status === 'error'" class="project-list__load-error" role="alert">
        <p>Could not load projects: {{ projects.error }}</p>
        <button class="project-list__retry-btn" type="button" @click="projects.load()">Try again</button>
      </div>

      <p v-else-if="projects.projects.length === 0" class="project-list__empty">
        No projects yet. Create one to start analysing interviews.
      </p>

      <ul v-else class="project-list__items">
        <li v-for="project in projects.projects" :key="project.id" class="project-list__item">
          <RouterLink class="project-list__link" :to="`/projects/${project.id}`">
            <span class="project-list__name">{{ project.name }}</span>
            <span class="project-list__date">Created {{ formatDate(project.createdAt) }}</span>
          </RouterLink>
          <button
            class="project-list__delete-btn"
            type="button"
            :aria-label="`Delete project ${project.name}`"
            @click="askToDelete(project)"
          >
            Delete
          </button>
        </li>
      </ul>
    </main>

    <ConfirmDialog
      :open="pendingDelete !== null"
      :title="`Delete “${pendingDelete?.name ?? ''}”?`"
      confirm-label="Delete project"
      busy-label="Deleting…"
      :busy="isDeleting"
      :error="deleteError"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    >
      <p>
        This permanently deletes the project and everything in it: transcripts, quotes, tags, insights and job
        cards.
      </p>
      <p><strong>This can't be undone.</strong></p>
    </ConfirmDialog>
  </div>
</template>

<style scoped>
.project-list {
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr;
}

.project-list__header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.project-list__title {
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--color-text);
}

.project-list__subtitle {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.project-list__body {
  padding: var(--space-8) var(--space-6);
  max-width: 720px;
  width: 100%;
  margin-inline: auto;
  display: grid;
  gap: var(--space-6);
  align-content: start;
}

.project-list__heading {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-text);

  &:focus {
    outline: none;
  }
}

.project-list__form {
  display: grid;
  gap: var(--space-2);
}

.project-list__label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
}

.project-list__form-row {
  display: flex;
  gap: var(--space-3);
}

.project-list__input {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font: inherit;
  font-size: var(--text-sm);
  background: var(--color-surface);
  color: var(--color-text);

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
  }
}

.project-list__create-btn,
.project-list__retry-btn {
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-accent);
  transition:
    background var(--duration-fast),
    color var(--duration-fast);

  &:hover:not(:disabled) {
    background: var(--color-accent);
    color: var(--c-white);
  }

  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
}

.project-list__form-error {
  font-size: var(--text-sm);
  color: var(--c-amber-700);
}

.project-list__status,
.project-list__empty {
  padding: var(--space-8);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  text-align: center;
  color: var(--color-text-muted);
}

.project-list__load-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--c-amber-200);
  border-radius: var(--radius-lg);
  background: var(--c-amber-100);
  color: var(--c-amber-700);
  font-size: var(--text-sm);
}

.project-list__items {
  list-style: none;
  display: grid;
  gap: var(--space-2);
  padding: 0;
}

/* The row is the card; the link fills it and the Delete button sits beside
   the link (a button cannot go inside a link). */
.project-list__item {
  display: flex;
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: border-color var(--duration-fast);

  &:has(.project-list__link:hover, .project-list__link:focus-visible) {
    border-color: var(--color-accent);
  }
}

.project-list__link {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
  color: var(--color-text);
  text-decoration: none;

  &:focus-visible {
    outline: none;
  }
}

.project-list__delete-btn {
  flex-shrink: 0;
  margin-inline-end: var(--space-3);
  padding: var(--space-1) var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  transition:
    background var(--duration-fast),
    color var(--duration-fast),
    border-color var(--duration-fast);

  &:hover,
  &:focus-visible {
    border-color: var(--c-red-200);
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }

  &:focus-visible {
    outline: 2px solid var(--color-danger);
    outline-offset: 1px;
  }
}

.project-list__name {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.project-list__date {
  flex-shrink: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>
