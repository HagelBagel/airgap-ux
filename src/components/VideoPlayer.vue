<template>
  <div class="video-player">
    <video
      ref="videoElement"
      class="video-element"
      :src="src"         
          :muted="isMuted"
      @timeupdate="handleTimeUpdate"
      @loadedmetadata="handleLoadedMetadata"
      @canplay="handleCanPlay"
      @error="handleError"
    />
    
    <div class="control-bar" >
      <button class="control-btn" @click="togglePlay">
        {{ isPlaying ? 'Pause' : 'Play' }}
      </button>
      
      <button class="control-btn" @click="skipBackward">
        ← 5s
      </button>
      
      <button class="control-btn" @click="skipForward">
        5s →
      </button>
      
      <div class="time-display">
        {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

interface Props {
  src: string
  format?: string
  waveform?: any // WaveformTimeline component instance
}

interface Emits {
  (e: 'timeupdate', timestamp: number): void
  (e: 'error', error: { code?: number; message: string; src?: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const videoElement = ref<HTMLVideoElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const isMuted = ref(false)

const togglePlay = async () => {
  if (!videoElement.value) {
    console.error('Video element not found')
    return
  }
  
  console.log('Toggle play called, paused:', videoElement.value.paused, 'readyState:', videoElement.value.readyState)
  
  try {
    if (videoElement.value.paused) {
      console.log('Attempting to play video...')
      await videoElement.value.play()
      console.log('Video play command sent successfully')
      
      // Sync waveform playback if available
      if (props.waveform && props.waveform.play) {
        console.log('Syncing waveform playback with video')
        props.waveform.play()
      }
      
      // isPlaying will be set by the 'play' event listener
    } else {
      console.log('Pausing video...')
      videoElement.value.pause()
      console.log('Video pause command sent')
      
      // Sync waveform pause if available
      if (props.waveform && props.waveform.pause) {
        console.log('Syncing waveform pause with video')
        props.waveform.pause()
      }
      
      // isPlaying will be set by the 'pause' event listener
    }
  } catch (error) {
    console.error('Video play error:', error)
    // Handle autoplay policy violation
    // The play button state will be managed by event listeners
  }
}

const skipForward = () => {
  if (!videoElement.value) return
  videoElement.value.currentTime = Math.min(videoElement.value.currentTime + 5, duration.value)
}

const skipBackward = () => {
  if (!videoElement.value) return
  videoElement.value.currentTime = Math.max(videoElement.value.currentTime - 5, 0)
}

const handleTimeUpdate = () => {
  if (!videoElement.value) return
  currentTime.value = videoElement.value.currentTime
  emit('timeupdate', currentTime.value)
}

const handleLoadedMetadata = () => {
  if (!videoElement.value) return
  duration.value = videoElement.value.duration
  console.log('Video metadata loaded, duration:', duration.value)
  console.log('Video source info:', {
    currentSrc: videoElement.value.currentSrc,
    src: videoElement.value.src,
    videoWidth: videoElement.value.videoWidth,
    videoHeight: videoElement.value.videoHeight
  })
}

const handleCanPlay = () => {
  console.log('Video can play')
}

const handleError = (error: Event) => {
  const videoElement = error.target as HTMLVideoElement
  console.error('Video error:', {
    error: error,
    errorCode: videoElement.error?.code,
    errorMessage: videoElement.error?.message,
    networkState: videoElement.networkState,
    readyState: videoElement.readyState,
    currentSrc: videoElement.currentSrc,
    src: videoElement.src
  })
  
  // Log specific error codes
  if (videoElement.error) {
    switch (videoElement.error.code) {
      case 1:
        console.error('MEDIA_ERR_ABORTED: User aborted the media playback')
        break
      case 2:
        console.error('MEDIA_ERR_NETWORK: Network error occurred')
        break
      case 3:
        console.error('MEDIA_ERR_DECODE: Media decoding error')
        break
      case 4:
        console.error('MEDIA_ERR_SRC_NOT_SUPPORTED: Media format not supported')
        break
      default:
        console.error('Unknown media error - possibly NS_ERROR_DOM_MEDIA_METADATA_ERR')
        console.log('This error often indicates:')
        console.log('1. Corrupted video file')
        console.log('2. Unsupported video format')
        console.log('3. Invalid blob URL')
        console.log('4. Browser privacy settings blocking media access')
        
        // Try to reload the video with a different approach
        if (videoElement.src && videoElement.src.startsWith('blob:')) {
          console.log('Attempting to reload video with different method...')
          const currentSrc = videoElement.src
          videoElement.src = ''
          setTimeout(() => {
            if (videoElement) {
              videoElement.src = currentSrc
              videoElement.load()
            }
          }, 100)
        }
    }
  }
  
  // Emit error event for parent component
  emit('error', {
    code: videoElement.error?.code,
    message: videoElement.error?.message || 'Unknown video error',
    src: videoElement.currentSrc
  })
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Check if video format is supported
const getVideoFormat = (src: string): string | null => {
  if (!src) return null
  
  // Extract file extension from URL
  const extension = src.split('.').pop()?.toLowerCase()
  return extension || null
}

// Watch for source changes
watch(() => props.src, (newSrc) => {
  console.log('Video source changed:', newSrc)
  const format = getVideoFormat(newSrc)
  console.log('Detected video format:', format)
  
  if (format) {
    // Check browser support for this format
    const video = document.createElement('video')
    const canPlay = video.canPlayType(`video/${format}`)
    console.log(`Browser support for video/${format}:`, canPlay)
    
    if (!canPlay && ['mov', 'mp4', 'webm'].includes(format)) {
      console.warn(`Unsupported video format: ${format}`)
      emit('error', {
        code: 4,
        message: `Unsupported video format: ${format}. Please use MP4 format.`,
        src: newSrc
      })
      return
    }
  }
  
  if (videoElement.value) {
    console.log('Video element exists, loading new source')
  }
}, { immediate: true })

onMounted(() => {
  if (videoElement.value) {
    console.log('VideoPlayer mounted, video element found')
    videoElement.value.addEventListener('play', () => {
      console.log('Video play event fired')
      isPlaying.value = true
    })
    videoElement.value.addEventListener('pause', () => {
      console.log('Video pause event fired')
      isPlaying.value = false
    })
    videoElement.value.addEventListener('loadstart', () => {
      console.log('Video load start')
    })
    videoElement.value.addEventListener('loadeddata', () => {
      console.log('Video data loaded')
    })
  } else {
    console.error('VideoPlayer mounted, but video element not found')
  }
})

onUnmounted(() => {
  if (videoElement.value) {
    videoElement.value.removeEventListener('play', () => isPlaying.value = true)
    videoElement.value.removeEventListener('pause', () => isPlaying.value = false)
  }
})

// Expose methods and state for parent component interaction
defineExpose({
  videoElement,
  isPlaying,
  currentTime,
  duration,
  play: () => videoElement.value?.play(),
  pause: () => videoElement.value?.pause(),
  setCurrentTime: (time: number) => {
    if (videoElement.value) {
      videoElement.value.currentTime = time
    }
  },
  getCurrentTime: () => videoElement.value?.currentTime || 0,
  getDuration: () => videoElement.value?.duration || 0,
  isPlayingState: () => isPlaying.value,
})
</script>

<style scoped>
.video-player {
  width: 100%;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
}

.video-element {
  width: 100%;
  max-height: 500px;
  display: block;
}

.control-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #2a2a2a;
  border-top: 1px solid #3a3a3a;
}

.control-btn {
  padding: 8px 16px;
  background: #3a3a3a;
  color: #ffffff;
  border: 1px solid #4a4a4a;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: #4a4a4a;
  border-color: #5a5a5a;
  transform: translateY(-1px);
}

.control-btn:active {
  transform: translateY(0);
  background: #3a3a3a;
}

.time-display {
  margin-left: auto;
  color: #b0b0b0;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  font-weight: 500;
}

@media (max-width: 640px) {
  .control-bar {
    padding: 12px;
    gap: 8px;
  }
  
  .control-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .time-display {
    font-size: 12px;
  }
}
</style>
