import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ProcessingTaskList from './ProcessingTaskList.vue'

describe('ProcessingTaskList - Critical Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('calculates task statuses correctly for audio-preprocessing stage', () => {
    const wrapper = mount(ProcessingTaskList, {
      props: { stage: 'audio-preprocessing' }
    })

    const tasks = (wrapper.vm as any).tasks
    
    // First task (audio-preprocessing) should be in-progress
    expect(tasks[0].status).toBe('in-progress')
    expect(tasks[0].id).toBe('audio-preprocessing')
    expect(tasks[0].label).toBe('Audio Pre-processing')
    
    // All other tasks should be pending
    expect(tasks[1].status).toBe('pending') // loading-models
    expect(tasks[2].status).toBe('pending') // transcribing
    expect(tasks[3].status).toBe('pending') // extracting
    expect(tasks[4].status).toBe('pending') // scoring
  })

  it('calculates task statuses correctly when past audio-preprocessing', () => {
    const wrapper = mount(ProcessingTaskList, {
      props: { stage: 'transcribing' }
    })

    const tasks = (wrapper.vm as any).tasks
    
    // Audio preprocessing and loading models should be completed
    expect(tasks[0].status).toBe('completed') // audio-preprocessing
    expect(tasks[1].status).toBe('completed') // loading-models
    
    // Transcribing should be in-progress
    expect(tasks[2].status).toBe('in-progress') // transcribing
    
    // Remaining tasks should be pending
    expect(tasks[3].status).toBe('pending') // extracting
    expect(tasks[4].status).toBe('pending') // scoring
  })

  it('shows all tasks as completed when stage is done', () => {
    const wrapper = mount(ProcessingTaskList, {
      props: { stage: 'done' }
    })

    const tasks = (wrapper.vm as any).tasks
    
    // All tasks should be completed
    tasks.forEach((task: any) => {
      expect(task.status).toBe('completed')
    })
  })

  it('shows all tasks as pending when stage is idle', () => {
    const wrapper = mount(ProcessingTaskList, {
      props: { stage: 'idle' }
    })

    const tasks = (wrapper.vm as any).tasks
    
    // All tasks should be pending
    tasks.forEach((task: any) => {
      expect(task.status).toBe('pending')
    })
  })

  it('renders correct number of tasks', () => {
    const wrapper = mount(ProcessingTaskList, {
      props: { stage: 'audio-preprocessing' }
    })

    const taskItems = wrapper.findAll('.task-list__item')
    expect(taskItems).toHaveLength(5) // 5 total tasks including audio preprocessing
  })

  it('applies correct CSS classes for task statuses', () => {
    const wrapper = mount(ProcessingTaskList, {
      props: { stage: 'loading-models' }
    })

    const taskItems = wrapper.findAll('.task-list__item')
    
    // First task (audio-preprocessing) should be completed
    expect(taskItems[0].classes()).toContain('task-list__item--completed')
    
    // Second task (loading-models) should be in-progress
    expect(taskItems[1].classes()).toContain('task-list__item--in-progress')
    
    // Remaining tasks should be pending
    expect(taskItems[2].classes()).toContain('task-list__item--pending')
    expect(taskItems[3].classes()).toContain('task-list__item--pending')
    expect(taskItems[4].classes()).toContain('task-list__item--pending')
  })
})
