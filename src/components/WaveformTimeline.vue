<template>
  <div class="waveform-timeline">
    <div ref="waveformContainer" class="waveform-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js'

interface Props {
  url: string
  mediaElement?: HTMLMediaElement | null
  segments?: Array<{
    start: number
    end: number
    speakerId: string
    text?: string
  }>
}

interface Emits {
  (e: 'timeupdate', currentTime: number): void
  (e: 'ready', duration: number): void
  (e: 'interaction', currentTime: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const waveformContainer = ref<HTMLElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const regions = ref<any[]>([])
let wavesurfer: WaveSurfer | null = null
let regionsPlugin: any = null
let hasUserInteracted = ref(false)
let pendingUrl: string | null = null

const destroyWaveSurfer = () => {
  if (!wavesurfer) return
  wavesurfer.destroy()
  wavesurfer = null
  regionsPlugin = null
}

const initializeWaveSurfer = () => {
  if (!waveformContainer.value) return

  // Initialize immediately if mediaElement is provided (sync mode)
  // Otherwise wait for user interaction
  if (!hasUserInteracted.value && !props.mediaElement) {
    console.log('⏳ WaveSurfer: Waiting for user interaction before initialization')
    return
  }

  console.log('🌊 Initializing WaveSurfer...')
  
  // Initialize regions plugin
  regionsPlugin = RegionsPlugin.create()

  wavesurfer = WaveSurfer.create({
    container: waveformContainer.value,
    media: props.mediaElement ?? undefined,
    waveColor: '#d1d5db', // light gray
    progressColor: '#3b82f6', // distinct blue
    height: 128,
    interact: true,
    barWidth: 2,
    barRadius: 3,
    cursorWidth: 1,
    cursorColor: '#6b7280',
    normalize: true,
    plugins: [regionsPlugin],
  })

  // Event listeners
  wavesurfer.on('timeupdate', (time: number) => {
    currentTime.value = time
    emit('timeupdate', time)
  })

  wavesurfer.on('ready', (dur: number) => {
    duration.value = dur
    emit('ready', dur)
    
    // Display speaker regions when waveform is ready
    if (props.segments) {
      displaySpeakerRegions(props.segments)
    }
  })

  wavesurfer.on('interaction', (time: number) => {
    currentTime.value = time
    emit('interaction', time)
  })

  wavesurfer.on('play', () => {
    isPlaying.value = true
  })

  wavesurfer.on('pause', () => {
    isPlaying.value = false
  })

  // Add user interaction listeners to enable audio context
  const enableAudioContext = () => {
    hasUserInteracted.value = true
    console.log('👆 User interaction detected, enabling audio context')
    
    // Initialize WaveSurfer now that user has interacted
    if (!wavesurfer && !props.mediaElement) {
      console.log('🌊 Initializing WaveSurfer after user interaction')
      initializeWaveSurfer()
    }
    
    // Load pending URL if exists
    if (pendingUrl && wavesurfer) {
      console.log('🎵 Loading pending audio after user interaction')
      loadAudioUrl(pendingUrl)
      pendingUrl = null
    }
    
    // Remove listeners after first interaction
    document.removeEventListener('click', enableAudioContext)
    document.removeEventListener('keydown', enableAudioContext)
    document.removeEventListener('touchstart', enableAudioContext)
  }

  // Add event listeners for user interaction
  document.addEventListener('click', enableAudioContext, { once: true })
  document.addEventListener('keydown', enableAudioContext, { once: true })
  document.addEventListener('touchstart', enableAudioContext, { once: true })

  // When mediaElement is provided, WaveSurfer follows the media timeline directly.
  // Fallback to URL loading only when no external media element is attached.
  if (!props.mediaElement && props.url) {
    if (hasUserInteracted.value) {
      loadAudioUrl(props.url)
    } else {
      console.log('⏳ Waiting for user interaction before loading audio')
      pendingUrl = props.url
    }
  }
}

const loadAudioUrl = (url: string) => {
  if (!wavesurfer) return
  
  try {
    console.log('🎵 Loading audio URL:', url.substring(0, 50) + '...')
    wavesurfer.load(url)
  } catch (error) {
    console.error('❌ WaveSurfer load error:', error)
    // Try to load as audio-only if video fails
    if (url && url.includes('blob:')) {
      console.log('🔄 Attempting to load as audio stream...')
      wavesurfer.load(url)
    }
  }
}

// Speaker color mapping
const getSpeakerColor = (speakerId: string): string => {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
  ]
  
  // Generate consistent color based on speaker ID
  const hash = speakerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

// Display speaker regions on waveform
const displaySpeakerRegions = (segments: Array<{ start: number; end: number; speakerId: string; text?: string }>) => {
  if (!regionsPlugin || !segments.length) return
  
  // Clear existing regions
  regionsPlugin.clearRegions()
  regions.value = []
  
  // Add regions for each segment
  segments.forEach((segment, index) => {
    const color = getSpeakerColor(segment.speakerId)
    
    const region = regionsPlugin.addRegion({
      id: `region-${index}`,
      start: segment.start,
      end: segment.end,
      color: color + '40', // Add transparency
      content: segment.speakerId,
      drag: false,
      resize: false,
    })
    
    regions.value.push(region)
  })
}

// Watch for URL changes
watch(
  () => props.url,
  (newUrl) => {
    if (wavesurfer && newUrl && !props.mediaElement) {
      if (hasUserInteracted.value) {
        loadAudioUrl(newUrl)
      } else {
        console.log('⏳ URL updated, waiting for user interaction before loading')
        pendingUrl = newUrl
      }
    }
  },
  { immediate: false }
)

// Recreate WaveSurfer when the bound media element changes.
watch(
  () => props.mediaElement,
  () => {
    destroyWaveSurfer()
    initializeWaveSurfer()
  },
  { immediate: false }
)

// Watch for segments changes
watch(
  () => props.segments,
  (newSegments) => {
    if (newSegments && wavesurfer) {
      displaySpeakerRegions(newSegments)
    }
  },
  { immediate: false, deep: true }
)

onMounted(() => {
  initializeWaveSurfer()
})

onUnmounted(() => {
  destroyWaveSurfer()
})

// Expose methods and state for parent component interaction
defineExpose({
  wavesurfer,
  isPlaying,
  currentTime,
  duration,
  regions,
  displaySpeakerRegions,
  play: () => wavesurfer?.play(),
  pause: () => wavesurfer?.pause(),
  setCurrentTime: (time: number) => {
    if (wavesurfer) {
      const duration = wavesurfer.getDuration()
      if (duration > 0) {
        wavesurfer.seekTo(time / duration)
      }
    }
  },
  getCurrentTime: () => wavesurfer?.getCurrentTime() || 0,
  getDuration: () => wavesurfer?.getDuration() || 0,
  isPlayingState: () => wavesurfer?.isPlaying() || false,
})
</script>

<style scoped>
.waveform-timeline {
  width: 100%;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  padding: 16px;
}

.waveform-container {
  width: 100%;
  height: 128px;
  background: #2a2a2a;
  border-radius: 4px;
  position: relative;
}

/* Dark mode styling for wavesurfer */
.waveform-container :deep(.wavesurfer) {
  background: transparent;
}

.waveform-container :deep(.wavesurfer-waveform) {
  background: transparent;
}

.waveform-container :deep(.wavesurfer-region) {
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid #3b82f6;
}

/* Speaker region labels */
.waveform-container :deep(.wavesurfer-region .wavesurfer-region-content) {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  pointer-events: none;
  user-select: none;
  position: absolute;
  top: 2px;
  left: 2px;
  z-index: 10;
}

@media (max-width: 640px) {
  .waveform-timeline {
    padding: 12px;
  }
  
  .waveform-container {
    height: 96px;
  }
}
</style>
