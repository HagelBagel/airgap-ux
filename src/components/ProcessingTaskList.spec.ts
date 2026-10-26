import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ProcessingTaskList from './ProcessingTaskList.vue'

describe('ProcessingTaskList - Critical Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('calculates task statuses correctly for loading-models stage', () => {
    const wrapper = mount(ProcessingTaskList, {
      props: { stage: 'loading-models' }
    })

    const tasks = (wrapper.vm as any).tasks

    // First task (loading-models) should be in-progress
    expect(tasks[0].status).toBe('in-progress')
    expect(tasks[0].id).toBe('loading-models')
    expect(tasks[0].label).toBe('Loading Models')

    // All other tasks should be pending
    expect(tasks[1].status).toBe('pending') // extracting
    expect(tasks[2].status).toBe('pending') // scoring
  })

  it('calculates task statuses correctly when past loading-models', () => {
    const wrapper = mount(ProcessingTaskList, {
      props: { stage: 'extracting' }
    })

    const tasks = (wrapper.vm as any).tasks

    // Loading models should be completed
    expect(tasks[0].status).toBe('completed') // loading-models

    // Extracting should be in-progress
    expect(tasks[1].status).toBe('in-progress') // extracting

    // Remaining tasks should be pending
    expect(tasks[2].status).toBe('pending') // scoring
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
      props: { stage: 'loading-models' }
    })

    const taskItems = wrapper.findAll('.task-list__item')
    expect(taskItems).toHaveLength(3) // loading models, extracting, scoring
  })

  it('applies correct CSS classes for task statuses', () => {
    const wrapper = mount(ProcessingTaskList, {
      props: { stage: 'extracting' }
    })

    const taskItems = wrapper.findAll('.task-list__item')

    // First task (loading-models) should be completed
    expect(taskItems[0].classes()).toContain('task-list__item--completed')

    // Second task (extracting) should be in-progress
    expect(taskItems[1].classes()).toContain('task-list__item--in-progress')

    // Remaining task should be pending
    expect(taskItems[2].classes()).toContain('task-list__item--pending')
  })
})
