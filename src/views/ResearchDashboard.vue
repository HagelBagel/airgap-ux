<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useResearchStore, MOCK_MODE } from '../stores/useResearchStore'
import { processAudio } from '../services/audio/audioPreprocessor'
import { useWavesurferSync } from '../composables/useWavesurferSync'
import FileDropzone from '../components/upload/FileDropzone.vue'
import ResearchWorkbench from '../components/ResearchWorkbench.vue'
import ProcessingStatus from '../components/ProcessingStatus.vue'
import AppSettings from '../components/AppSettings.vue'
import VideoPlayer from '../components/VideoPlayer.vue'
import WaveformTimeline from '../components/WaveformTimeline.vue'

const store = useResearchStore()

// ── Settings dialog state ────────────────────────────────────────────────────
const isSettingsOpen = ref(false)

// ── Video player state ───────────────────────────────────────────────────────
const videoUrl = ref<string | null>(null)
const videoPlayerRef = ref<InstanceType<typeof VideoPlayer> | null>(null)
const waveformRef = ref<InstanceType<typeof WaveformTimeline> | null>(null)

// ── Audio state for wavesurfer and transcription ─────────────────────────────
const audioUrl = ref<string | null>(null)

// ── Audio processing controls ───────────────────────────────────────────────────
// const audioGain = ref(1.5) // Default 50% boost

// ── Derived UI state ──────────────────────────────────────────────────────────

const isIdle     = computed(() => store.processingStage === 'idle')
const hasResults = computed(() =>
  (store.currentProject?.jobCards?.length ?? 0) > 0,
)



// ── Media Sync state ───────────────────────────────────────────────────────
const wavesurferSync = ref<ReturnType<typeof useWavesurferSync> | null>(null)

// Safe computed properties for template access
const isWavesurferSyncReady = computed(() => wavesurferSync.value !== null)
const isPlaying = computed(() => wavesurferSync.value?.isPlaying ?? false)
const currentTime = computed(() => wavesurferSync.value?.currentTime ?? 0)
const duration = computed(() => wavesurferSync.value?.duration ?? 0)

// Watch for both components to be ready, then initialize sync
watch([videoPlayerRef, waveformRef], ([videoPlayer, waveform]) => {
  if (videoPlayer && waveform && waveform.wavesurfer && videoPlayer.videoElement) {
    console.log('Initializing Wavesurfer-as-master sync')
    wavesurferSync.value = useWavesurferSync(waveform.wavesurfer, videoPlayer.videoElement)
  }
})

// ── Actions ───────────────────────────────────────────────────────────────────

async function onFilesSelected(files: File[]): Promise<void> {
  // V1: single-file pipeline. Multiple-file averaging is a future milestone.
  const file = files[0]
  console.log('📁 File selected:', file.name, file.type, file.size);
  
  try {
    // Process audio for transcription and wavesurfer (works for both audio and video files)
    console.log('🔄 Starting audio processing for transcription');
    const cleanBlob = await processAudio(file)
    console.log('✅ Clean blob received, size:', cleanBlob.size, 'type:', cleanBlob.type);
    
    // Set audio URL for wavesurfer (always use processed audio)
    const cleanAudioUrl = URL.createObjectURL(cleanBlob)
    audioUrl.value = cleanAudioUrl
    console.log('🎵 Audio URL set to processed blob for wavesurfer');
    
    // Send the cleanBlob to the store for transcription (accuracy will improve)
    console.log('📤 Sending clean blob to store...');
    await store.processMedia(cleanBlob, file.name)
    console.log('✅ Store processing complete');
    
    // Set video URL based on file type
    if (file.type.startsWith('video/')) {
      console.log('🎬 Video file detected - using original for player');
      videoUrl.value = URL.createObjectURL(file)
      console.log('🎬 Video URL set to original file');
    } else if (file.type.startsWith('audio/')) {
      console.log('🎵 Audio file detected - using processed for player');
      videoUrl.value = cleanAudioUrl
      console.log('🎵 Video URL set to processed blob (audio file)');
    } else {
      // Default fallback for unknown file types
      console.log('📄 Unknown file type - using processed for player');
      videoUrl.value = cleanAudioUrl
      console.log('📄 Video URL set to processed blob (fallback)');
    }
  } catch (error) {
    console.error('❌ Failed to process audio:', error)
    // Fallback to original file if processing fails
    console.log('🔄 Falling back to original file');
    const fallbackUrl = URL.createObjectURL(file)
    videoUrl.value = fallbackUrl
    audioUrl.value = fallbackUrl
    await store.processMedia(file)
  }
}

function reset(): void {
  // Clean up URLs if they exist
  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value)
    videoUrl.value = null
  }
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
    audioUrl.value = null
  }
  
  store.resetProject()
}

function handleVideoTimeUpdate(): void {
  // Time updates are now handled by useWavesurferSync composable
}

function handleWaveformTimeUpdate(): void {
  // Time updates are now handled by useWavesurferSync composable
}

function handleWaveformReady(duration: number): void {
  // Handle waveform ready event - sync will be initialized by watcher
  console.log('Waveform ready, duration:', duration)
}

// Master Play/Pause control using wavesurferSync composable
async function toggleMasterPlay(): Promise<void> {
  if (!wavesurferSync.value) {
    console.error('Wavesurfer sync not ready')
    return
  }

  try {
    if (wavesurferSync.value.isPlaying) {
      wavesurferSync.value.pause()
    } else {
      await wavesurferSync.value.play()
    }
  } catch (error) {
    console.error('Master playback error:', error)
  }
}

// Format time helper
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

</script>

<template>
  <div class="dashboard">

    <!-- ── Top bar ─────────────────────────────────────────────────────────── -->
    <header class="dashboard__header">
      <div class="dashboard__brand">
        <h1 class="dashboard__title">Sovereign JTBD</h1>
        <div class="dashboard__subtitle">Jobs-to-be-Done Research Assistant</div>
      </div>
      
      <div class="dashboard__controls">
        
      </div>
      
      <div class="dashboard__actions">
        <button
          class="dashboard__btn"
          @click="isSettingsOpen = true"
        >
          <svg class="dashboard__btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24M1.54 1.54l4.24 4.24M20.46 20.46l-4.24-4.24M1.54 20.46l4.24-4.24"></path>
          </svg>
          Settings
        </button>

        <button
          v-if="store.currentProject"
          class="dashboard__reset-btn"
          type="button"
          @click="reset"
        >
          ↺ New Project
        </button>
      </div>
    </header>

    <!-- ── Main content ────────────────────────────────────────────────────── -->
    <main class="dashboard__body">

      <!-- Processing status strip + Sovereign Badge -->
      <ProcessingStatus
        :stage="store.processingStage"
        :load-progress="store.loadProgress"
        :progress-detail="store.processingDetail"
        :used-fallback="store.usedFallback"
        :started-at="store.processingStartedAt"
        :allow-calibration-learning="!MOCK_MODE"
      />

      <!-- Video Player: shown when video is uploaded -->
      <section v-if="videoUrl" class="dashboard__section">
        <VideoPlayer 
          ref="videoPlayerRef"
          :src="videoUrl" 
          :waveform="audioUrl ? waveformRef : null"
          @timeupdate="handleVideoTimeUpdate" 
        />
      </section>

      <!-- Master Media Controls: shown when both video and audio are ready -->
      <section v-if="videoUrl && audioUrl && isWavesurferSyncReady" class="dashboard__section">
        <div class="media-controls">
          <button class="master-play-btn" @click="toggleMasterPlay">
            {{ isPlaying ? '⏸ Pause' : '▶ Play' }}
          </button>
          <div class="time-display">
            {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
          </div>
        </div>
      </section>

      <!-- Waveform Timeline: shown when audio is processed -->
      <section v-if="audioUrl && !isIdle" class="dashboard__section">
        <WaveformTimeline 
          ref="waveformRef"
          :url="audioUrl" 
          :media-element="videoPlayerRef?.videoElement ?? null"
          @timeupdate="handleWaveformTimeUpdate"
          @ready="handleWaveformReady"
        />
      </section>

      <!-- Drop zone: only shown when idle -->
      <section v-if="isIdle" class="dashboard__section">
        <FileDropzone @files-selected="onFilesSelected" />
      </section>

      <!-- Error state -->
      <section v-if="store.processingStage === 'error'" class="dashboard__section">
        <div class="dashboard__error" role="alert">
          <svg class="dashboard__error-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
          </svg>
          <p class="dashboard__error-text">{{ store.error }}</p>
          <button class="dashboard__error-retry" type="button" @click="reset">
            Try again
          </button>
        </div>
      </section>
      
      
      <!-- Results grid: stays visible after processing is done -->      
      <section v-if="hasResults" class="dashboard__section">
        <ResearchWorkbench :transcriptBlocks="store.currentProject?.segments ?? []" />
      </section>

      <!-- Empty state after successful processing with no results -->
      <section
        v-if="store.processingStage === 'done' && !hasResults"
        class="dashboard__section"
      >
        <div class="dashboard__empty">
          <p>No outcomes could be extracted from this recording.</p>
          <p class="dashboard__empty-hint">Try a longer interview, or check the transcript in the store.</p>
          <button class="dashboard__reset-btn" type="button" @click="reset">
            Try another file
          </button>
        </div>
      </section>

    </main>
  </div>

  <!-- Settings Dialog -->
  <AppSettings :is-open="isSettingsOpen" @close="isSettingsOpen = false" />
</template>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────────── */
.dashboard {
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr;
}

/* ── Header ──────────────────────────────────────────────────────────────────── */
.dashboard__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.dashboard__brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.dashboard__logo {
  width: 28px;
  height: 28px;
  color: var(--color-accent);
}

.dashboard__title {
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--color-text);
}

.dashboard__controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.dashboard__eta-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  user-select: none;
}

.dashboard__eta-checkbox {
  accent-color: var(--color-accent);
}

.dashboard__eta-runs {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.dashboard__eta-reset {
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  transition:
    border-color var(--duration-fast),
    color var(--duration-fast);
}

.dashboard__eta-reset:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.dashboard__eta-reset:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.dashboard__mock-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  background: var(--c-forest-50);
  color: var(--c-forest-700);
  border: 1px solid var(--c-forest-200);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}


.dashboard__mock-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c-forest-500);
  /* Slow pulse to draw attention without being distracting */
  animation: pulse 2.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.dashboard__reset-btn {
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-muted);
  transition:
    border-color var(--duration-fast),
    color        var(--duration-fast);
}

.dashboard__reset-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.dashboard__settings-btn {
  background: none;
  border: none;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dashboard__settings-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

/* ── Body ────────────────────────────────────────────────────────────────────── */
.dashboard__body {
  padding: var(--space-8) var(--space-6);
  max-width: 1200px;
  width: 100%;
  margin-inline: auto;
  display: grid;
  gap: var(--space-8);
  align-content: start;
}

.dashboard__section {
  display: grid;
  gap: var(--space-4);
}

/* ── Error state ─────────────────────────────────────────────────────────────── */
.dashboard__error {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-lg);
  color: #991b1b;
}

.dashboard__error-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #dc2626;
}

.dashboard__error-text {
  flex: 1;
  font-size: var(--text-sm);
}

.dashboard__error-retry {
  padding: var(--space-1) var(--space-3);
  border: 1px solid #fca5a5;
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 600;
  color: #991b1b;
  background: var(--c-white);
  transition: background var(--duration-fast);
}

.dashboard__error-retry:hover {
  background: #fef2f2;
}



/* ── Master Media Controls ───────────────────────────────────────────────────── */
.media-controls {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.master-play-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  background: var(--color-accent);
  color: var(--c-white);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--duration-fast);
}

.master-play-btn:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
}

.master-play-btn:active {
  transform: translateY(0);
}

.media-controls .time-display {
  color: var(--color-text-muted);
  font-family: 'Courier New', monospace;
  font-size: var(--text-sm);
  font-weight: 500;
  min-width: 100px;
  text-align: center;
}

/* ── Empty state ─────────────────────────────────────────────────────────────── */
.dashboard__empty {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-8);
  text-align: center;
  color: var(--color-text-muted);
}

.dashboard__empty-hint {
  font-size: var(--text-sm);
}
</style>
