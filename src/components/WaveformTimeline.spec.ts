import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import WaveformTimeline from './WaveformTimeline.vue'

const handlers: Record<string, ((value?: number) => void)[]> = {}

const mockWaveSurferCreate = vi.fn()

vi.mock('wavesurfer.js', () => ({
  default: {
    create: (...args: unknown[]) => mockWaveSurferCreate(...args),
  },
}))

vi.mock('wavesurfer.js/dist/plugins/regions.js', () => ({
  default: {
    create: () => ({
      clearRegions: vi.fn(),
      addRegion: vi.fn(),
    }),
  },
}))

describe('WaveformTimeline media sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(handlers).forEach((key) => {
      delete handlers[key]
    })

    mockWaveSurferCreate.mockImplementation((config: { media?: HTMLMediaElement }) => {
      const duration = 120
      const media = config.media ?? null

      return {
        on: (event: string, cb: (value?: number) => void) => {
          handlers[event] ??= []
          handlers[event].push(cb)
        },
        load: vi.fn(),
        destroy: vi.fn(),
        clearRegions: vi.fn(),
        addRegion: vi.fn(),
        getDuration: () => duration,
        getCurrentTime: () => (media ? media.currentTime : 0),
        isPlaying: () => false,
        play: vi.fn(),
        pause: vi.fn(),
        seekTo: (progress: number) => {
          if (!media) return
          media.currentTime = progress * duration
          handlers.timeupdate?.forEach((cb) => cb(media.currentTime))
        },
      }
    })
  })

  it('binds to media and updates video currentTime when waveform seeks', async () => {
    const video = document.createElement('video')
    video.currentTime = 0

    const wrapper = mount(WaveformTimeline, {
      props: {
        url: 'blob:test-video',
        mediaElement: video,
      },
    })

    expect(mockWaveSurferCreate).toHaveBeenCalledTimes(1)
    const createConfig = mockWaveSurferCreate.mock.calls[0][0] as { media?: HTMLMediaElement }
    expect(createConfig.media).toBe(video)

    ;(wrapper.vm as unknown as { setCurrentTime: (time: number) => void }).setCurrentTime(30)

    expect(video.currentTime).toBe(30)

    wrapper.unmount()
  })
})
