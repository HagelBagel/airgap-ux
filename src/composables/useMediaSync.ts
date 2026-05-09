import { ref, onMounted, onUnmounted } from 'vue'

export function useMediaSync(
  wavesurfer: any,
  videoElement: HTMLVideoElement | null
) {
  const isSynced = ref(false)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  
  let syncInterval: number | null = null

  // Master Clock: Listen to Wavesurfer events
  const setupMasterClock = () => {
    if (!wavesurfer) return

    // Listen to Wavesurfer time updates (master clock)
    wavesurfer.on('timeupdate', (time: number) => {
      currentTime.value = time
      // Slave Sync: Update video element time on every audio tick
      if (videoElement) {
        videoElement.currentTime = time
      }
    })

    wavesurfer.on('audioprocess', (time: number) => {
      currentTime.value = time
      // More frequent sync for tighter timing
      if (videoElement) {
        videoElement.currentTime = time
      }
    })

    wavesurfer.on('ready', (dur: number) => {
      duration.value = dur
      console.log('Media sync ready, duration:', dur)
    })

    // Transport Sync: Handle play/pause from Wavesurfer
    wavesurfer.on('play', () => {
      isPlaying.value = true
      // Buffer Guard: Only call video.play() if readyState >= 2
      if (videoElement && videoElement.readyState >= 2) {
        videoElement.play().catch(error => {
          console.error('Video play error in sync:', error)
        })
      }
    })

    wavesurfer.on('pause', () => {
      isPlaying.value = false
      if (videoElement) {
        videoElement.pause()
      }
    })

    // Handle waveform interaction (scrubbing)
    wavesurfer.on('interaction', (time: number) => {
      currentTime.value = time
      // Update videoElement.currentTime immediately on scrub
      if (videoElement) {
        videoElement.currentTime = time
      }
    })

    wavesurfer.on('seek', (time: number) => {
      currentTime.value = time
      if (videoElement) {
        videoElement.currentTime = time
      }
    })
  }

  // Enhanced transport controls with sync
  const play = async () => {
    if (!wavesurfer) return
    
    try {
      // Buffer Guard: Check video ready state before playing
      if (videoElement && videoElement.readyState >= 2) {
        // Sync time positions before playing
        const waveTime = wavesurfer.getCurrentTime()
        videoElement.currentTime = waveTime
        
        // Start Wavesurfer first (master)
        await wavesurfer.play()
        
        // Then video (slave) - will sync via events
        console.log('Media sync play initiated')
      } else {
        console.warn('Video not ready for sync playback (readyState < 2)')
        await wavesurfer.play()
      }
    } catch (error) {
      console.error('Media sync play error:', error)
    }
  }

  const pause = () => {
    if (!wavesurfer) return
    
    try {
      wavesurfer.pause()
      if (videoElement) {
        videoElement.pause()
      }
      console.log('Media sync pause initiated')
    } catch (error) {
      console.error('Media sync pause error:', error)
    }
  }

  const setCurrentTime = (time: number) => {
    if (!wavesurfer) return
    
    try {
      // Update Wavesurfer first (master)
      wavesurfer.seekTo(time / duration.value)
      
      // Then video (slave)
      if (videoElement) {
        videoElement.currentTime = time
      }
      
      currentTime.value = time
      console.log('Media sync seek to:', time)
    } catch (error) {
      console.error('Media sync seek error:', error)
    }
  }

  // Periodic sync to prevent drift
  const startPeriodicSync = () => {
    if (syncInterval) return
    
    syncInterval = window.setInterval(() => {
      if (isPlaying.value && wavesurfer && videoElement) {
        const waveTime = wavesurfer.getCurrentTime()
        const videoTime = videoElement.currentTime
        
        // Sync if drift is more than 50ms
        if (Math.abs(waveTime - videoTime) > 0.05) {
          videoElement.currentTime = waveTime
          console.log('Periodic sync correction:', waveTime - videoTime)
        }
      }
    }, 100) // Check every 100ms
  }

  const stopPeriodicSync = () => {
    if (syncInterval) {
      clearInterval(syncInterval)
      syncInterval = null
    }
  }

  onMounted(() => {
    setupMasterClock()
    startPeriodicSync()
    isSynced.value = true
  })

  onUnmounted(() => {
    stopPeriodicSync()
    isSynced.value = false
  })

  return {
    isSynced,
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    setCurrentTime,
    setupMasterClock,
    startPeriodicSync,
    stopPeriodicSync
  }
}
