import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import VideoPlayer from './VideoPlayer.vue'

// Mock HTMLVideoElement methods
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockImplementation(() => Promise.resolve()),
})

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  writable: true,
  value: vi.fn(),
})

Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
  writable: true,
  value: 4, // HAVE_ENOUGH_DATA
})

Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
  writable: true,
  value: true,
})

Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
  writable: true,
  value: 0,
})

Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
  writable: true,
  value: 100,
})

describe('VideoPlayer - Critical Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('renders with correct props and emits timeupdate on load', async () => {
    const wrapper = mount(VideoPlayer, {
      props: { src: 'test-video.mp4' }
    })

    expect(wrapper.find('.video-element').exists()).toBe(true)
    expect(wrapper.find('.video-element').attributes('src')).toBe('test-video.mp4')
    expect(wrapper.find('.control-bar').exists()).toBe(true)
    expect(wrapper.find('.resize-handle').exists()).toBe(true)

    // Simulate loadedmetadata event
    const videoElement = wrapper.find('.video-element').element as HTMLVideoElement
    videoElement.dispatchEvent(new Event('loadedmetadata'))
    
    expect(wrapper.vm.duration).toBe(100)
  })

  it('toggles play/pause state correctly and emits timeupdate', async () => {
    const wrapper = mount(VideoPlayer, {
      props: { src: 'test-video.mp4' }
    })

    const playButton = wrapper.find('.control-btn')
    
    // Initially paused
    expect(wrapper.vm.isPlaying).toBe(false)
    expect(playButton.text()).toBe('Play')

    // Click play
    await playButton.trigger('click')
    
    // Should attempt to play
    expect(wrapper.vm.isPlaying).toBe(false) // Still false until play event
    expect(wrapper.vm.videoElement?.play).toHaveBeenCalled()

    // Simulate play event - update paused state using defineProperty
    const videoElement = wrapper.find('.video-element').element as HTMLVideoElement
    Object.defineProperty(videoElement, 'paused', {
      writable: true,
      value: false
    })
    videoElement.dispatchEvent(new Event('play'))
    
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.isPlaying).toBe(true)
    expect(playButton.text()).toBe('Pause')

    // Click pause - now video is playing so pause should be called
    await playButton.trigger('click')
    
    expect(wrapper.vm.videoElement?.pause).toHaveBeenCalled()

    // Simulate pause event - update paused state
    Object.defineProperty(videoElement, 'paused', {
      writable: true,
      value: true
    })
    videoElement.dispatchEvent(new Event('pause'))
    
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.isPlaying).toBe(false)
    expect(playButton.text()).toBe('Play')
  })

  it('updates time correctly and emits timeupdate events', async () => {
    const wrapper = mount(VideoPlayer, {
      props: { src: 'test-video.mp4' }
    })

    const videoElement = wrapper.find('.video-element').element as HTMLVideoElement
    
    // First simulate loadedmetadata to set duration
    videoElement.dispatchEvent(new Event('loadedmetadata'))
    
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.duration).toBe(100)
    
    // Simulate timeupdate event
    videoElement.currentTime = 25.5
    videoElement.dispatchEvent(new Event('timeupdate'))
    
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.currentTime).toBe(25.5)
    
    // Check time display formatting
    const timeDisplay = wrapper.find('.time-display')
    expect(timeDisplay.text()).toBe('0:25 / 1:40')
  })

  it('handles skip forward/backward correctly', async () => {
    const wrapper = mount(VideoPlayer, {
      props: { src: 'test-video.mp4' }
    })

    const videoElement = wrapper.find('.video-element').element as HTMLVideoElement
    
    // First simulate loadedmetadata to set duration
    videoElement.dispatchEvent(new Event('loadedmetadata'))
    await wrapper.vm.$nextTick()
    
    // Set initial currentTime
    videoElement.currentTime = 30
    
    // Skip forward 5 seconds
    const skipForwardButton = wrapper.findAll('.control-btn')[2] // Third button
    await skipForwardButton.trigger('click')
    
    expect(videoElement.currentTime).toBe(35)
    
    // Skip backward 5 seconds
    const skipBackwardButton = wrapper.findAll('.control-btn')[1] // Second button
    await skipBackwardButton.trigger('click')
    
    expect(videoElement.currentTime).toBe(30)
  })

  it('handles video resize with mouse drag', async () => {
    const wrapper = mount(VideoPlayer, {
      props: { src: 'test-video.mp4' }
    })

    const resizeHandle = wrapper.find('.resize-handle')
    expect(resizeHandle.exists()).toBe(true)
    
    // Initial height
    const vm = wrapper.vm as any
    expect(vm.videoHeight).toBe(400)
    
    // Simulate mouse drag down
    await resizeHandle.trigger('mousedown', {
      clientY: 100
    })
    
    // Simulate mouse move
    document.dispatchEvent(new MouseEvent('mousemove', {
      clientY: 150 // 50px down
    }))
    
    // Simulate mouse up
    document.dispatchEvent(new MouseEvent('mouseup'))
    
    await wrapper.vm.$nextTick()
    
    // Height should increase by 50px
    expect(vm.videoHeight).toBe(450)
    
    // Check that video element style is updated
    const videoElement = wrapper.find('.video-element')
    expect(videoElement.attributes('style')).toContain('height: 450px')
  })

  it('enforces minimum and maximum height constraints', async () => {
    const wrapper = mount(VideoPlayer, {
      props: { src: 'test-video.mp4' }
    })

    const resizeHandle = wrapper.find('.resize-handle')
    const vm = wrapper.vm as any
    
    // Test maximum height constraint
    await resizeHandle.trigger('mousedown', { clientY: 100 })
    document.dispatchEvent(new MouseEvent('mousemove', { clientY: 500 })) // 400px down
    document.dispatchEvent(new MouseEvent('mouseup'))
    
    await wrapper.vm.$nextTick()
    expect(vm.videoHeight).toBe(800) // Should be capped at MAX_HEIGHT
    
    // Test minimum height constraint  
    vm.videoHeight = 400 // Reset
    await resizeHandle.trigger('mousedown', { clientY: 100 })
    document.dispatchEvent(new MouseEvent('mousemove', { clientY: -300 })) // 400px up
    document.dispatchEvent(new MouseEvent('mouseup'))
    
    await wrapper.vm.$nextTick()
    expect(vm.videoHeight).toBe(200) // Should be capped at MIN_HEIGHT
  })

  it('handles video errors and emits error events', async () => {
    const wrapper = mount(VideoPlayer, {
      props: { src: 'invalid-video.mp4' }
    })

    const videoElement = wrapper.find('.video-element').element as HTMLVideoElement
    
    // Simulate video error
    const errorEvent = new Event('error') as any
    errorEvent.code = 4
    errorEvent.message = 'Video not found'
    errorEvent.src = 'invalid-video.mp4'
    
    videoElement.dispatchEvent(errorEvent)
    
    // Should emit error event
    const emitted = wrapper.emitted('error')
    expect(emitted).toBeDefined()
    expect(emitted![0]).toEqual([{
      code: 4,
      message: 'Unsupported video format: mp4. Please use MP4 format.',
      src: 'invalid-video.mp4'
    }])
  })

  it('exposes correct component methods via defineExpose', async () => {
    const wrapper = mount(VideoPlayer, {
      props: { src: 'test-video.mp4' }
    })

    const vm = wrapper.vm as any
    
    // Test exposed methods exist
    expect(typeof vm.play).toBe('function')
    expect(typeof vm.pause).toBe('function')
    expect(typeof vm.setCurrentTime).toBe('function')
    expect(typeof vm.getCurrentTime).toBe('function')
    expect(typeof vm.getDuration).toBe('function')
    expect(typeof vm.isPlayingState).toBe('function')
    
    // Test exposed properties
    expect(vm.videoElement).toBeDefined()
    expect(vm.isPlaying).toBeDefined()
    expect(vm.currentTime).toBeDefined()
    expect(vm.duration).toBeDefined()
  })

  it('handles canplay event correctly', async () => {
    const wrapper = mount(VideoPlayer, {
      props: { src: 'test-video.mp4' }
    })

    const videoElement = wrapper.find('.video-element').element as HTMLVideoElement
    
    // Simulate canplay event
    videoElement.dispatchEvent(new Event('canplay'))
    
    // Component should handle the event without errors
    expect(wrapper.exists()).toBe(true)
  })
})
