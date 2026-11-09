import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useResearchStore } from './useResearchStore'
import type { SpeakerSegment } from '../domain/types'
import type { WorkerInMessage, WorkerOutMessage } from '../workers/messages'

vi.mock('../featureFlags', () => ({ MOCK_MODE: false }))

class MockWorker {
  static instances: MockWorker[] = []
  onmessage: ((_event: MessageEvent<WorkerOutMessage>) => void) | null = null
  onerror: ((_event: ErrorEvent) => void) | null = null
  postMessage = vi.fn<(_msg: WorkerInMessage) => void>()
  terminate = vi.fn()

  constructor() {
    MockWorker.instances.push(this)
  }

  emit(msg: WorkerOutMessage): void {
    this.onmessage?.({ data: msg } as MessageEvent<WorkerOutMessage>)
  }
}

const segments: SpeakerSegment[] = [
  { speakerId: 'Speaker_01', text: 'Approvals take days.', startTime: 0, endTime: 3 },
]

describe('useResearchStore.analyzeSegments', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    MockWorker.instances = []
    vi.stubGlobal('Worker', MockWorker)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads models first and queues segments until MODELS_READY', () => {
    const store = useResearchStore()

    store.analyzeSegments(segments, 'Interview 1')

    const worker = MockWorker.instances[0]!
    expect(worker.postMessage).toHaveBeenCalledTimes(1)
    expect(worker.postMessage).toHaveBeenCalledWith({
      type: 'LOAD_MODELS',
      payload: { mockMode: false },
    })
    expect(store.processingStage).toBe('loading-models')
    expect(store.currentProject?.name).toBe('Interview 1')
    expect(store.currentProject?.segments).toEqual(segments)

    worker.emit({ type: 'MODELS_READY', payload: { mockMode: false } })

    expect(worker.postMessage).toHaveBeenLastCalledWith({
      type: 'RUN_JTBD_ANALYSIS',
      payload: { segments, mockMode: false },
    })
  })

  it('sends segments straight away when models are already loaded', () => {
    const store = useResearchStore()
    store.analyzeSegments(segments, 'Interview 1')
    const worker = MockWorker.instances[0]!
    worker.emit({ type: 'MODELS_READY', payload: { mockMode: false } })
    worker.postMessage.mockClear()

    store.analyzeSegments(segments, 'Interview 2')

    expect(MockWorker.instances).toHaveLength(1)
    expect(worker.postMessage).toHaveBeenCalledTimes(1)
    expect(worker.postMessage).toHaveBeenCalledWith({
      type: 'RUN_JTBD_ANALYSIS',
      payload: { segments, mockMode: false },
    })
  })

  it('stores job cards and marks the run done on ANALYSIS_COMPLETE', () => {
    const store = useResearchStore()
    store.analyzeSegments(segments, 'Interview 1')
    const worker = MockWorker.instances[0]!

    worker.emit({
      type: 'ANALYSIS_COMPLETE',
      payload: {
        usedFallback: true,
        jobCards: [{
          id: 'jc-1',
          description: 'Get approvals faster',
          averageImportance: 9,
          averageSatisfaction: 2,
          opportunityScore: 16,
          hasTension: false,
          evidence: [segments[0]!],
          speakerOutcomes: [],
        }],
      },
    })

    expect(store.processingStage).toBe('done')
    expect(store.usedFallback).toBe(true)
    expect(store.currentProject?.jobCards).toHaveLength(1)
  })

  it('does not send queued segments after a reset', () => {
    const store = useResearchStore()
    store.analyzeSegments(segments, 'Interview 1')
    const worker = MockWorker.instances[0]!

    store.resetProject()
    worker.emit({ type: 'MODELS_READY', payload: { mockMode: false } })

    expect(worker.terminate).toHaveBeenCalled()
    expect(worker.postMessage).toHaveBeenCalledTimes(1) // only LOAD_MODELS
  })
})

describe('useResearchStore.createManualCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds evidence without inventing timestamps', () => {
    const store = useResearchStore()

    store.createManualCard('Approvals take days.', 'Speaker_01')

    const card = store.currentProject!.jobCards[0]!
    expect(card.evidence).toEqual([{ speakerId: 'Speaker_01', text: 'Approvals take days.' }])
    expect(card.speakerOutcomes[0]!.evidence).toEqual(card.evidence)
  })
})

describe('useResearchStore.openProject', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    MockWorker.instances = []
    vi.stubGlobal('Worker', MockWorker)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('names the analysis after the open Project', () => {
    const store = useResearchStore()
    store.openProject({ id: 'p1', name: 'Onboarding' })

    store.analyzeSegments(segments, 'ignored')

    expect(store.currentProject).toMatchObject({ id: 'p1', name: 'Onboarding' })
  })

  it('keeps the analysis when the same Project is opened again', () => {
    const store = useResearchStore()
    store.openProject({ id: 'p1', name: 'Onboarding' })
    store.analyzeSegments(segments, 'ignored')

    store.openProject({ id: 'p1', name: 'Onboarding' })

    expect(store.currentProject?.segments).toEqual(segments)
    expect(MockWorker.instances[0]!.terminate).not.toHaveBeenCalled()
  })

  it('resets the analysis when a different Project is opened', () => {
    const store = useResearchStore()
    store.openProject({ id: 'p1', name: 'Onboarding' })
    store.analyzeSegments(segments, 'ignored')

    store.openProject({ id: 'p2', name: 'Pilot' })

    expect(store.currentProject).toBeNull()
    expect(store.processingStage).toBe('idle')
    expect(MockWorker.instances[0]!.terminate).toHaveBeenCalled()
  })
})
