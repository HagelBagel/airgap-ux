import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import JobCard from './JobCard.vue'
import type { JobCard as JobCardType } from '../../domain/types'

// Mock only necessary side-effect triggers
const mockUpdateCardScore = vi.fn()
vi.mock('../../stores/useResearchStore', () => ({
  useResearchStore: () => ({ updateCardScore: mockUpdateCardScore })
}))

// No component mocking - testing real tree to catch integration errors

describe('JobCard - Critical Logic', () => {
  let mockCard: JobCardType

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    mockCard = {
      id: 'test-card-1',
      description: 'Test job card description',
      averageImportance: 7,
      averageSatisfaction: 4,
      opportunityScore: 10,
      hasTension: true,
      evidence: [
        {
          speakerId: 'speaker-1',
          text: 'This is important evidence',
          startTime: 10,
          endTime: 15
        }
      ],
      speakerOutcomes: []
    }
  })

  it('calculates opportunity score correctly on input change', async () => {
    const wrapper = mount(JobCard, { props: { card: mockCard } })
    const importanceSlider = wrapper.find('#importance-test-card-1')
    await importanceSlider.setValue(9)

    // Check outcome, not class name
    expect(wrapper.find('.job-card__score-value').text()).toBe('14')
  })

  it('calls store with debounced score updates', async () => {
    const wrapper = mount(JobCard, { props: { card: mockCard } })
    const importanceSlider = wrapper.find('#importance-test-card-1')
    await importanceSlider.setValue(8)
    
    vi.advanceTimersByTime(300) // Match debounce config
    expect(mockUpdateCardScore).toHaveBeenCalledWith(mockCard.id, {
      importance: 8,
      satisfaction: 4
    })
  })

  it('emits selection-change with correct payload', async () => {
    const wrapper = mount(JobCard, { props: { card: mockCard, isSelected: false } })
    const checkbox = wrapper.find('#select-test-card-1')
    await checkbox.setValue(true)
    
    expect(wrapper.emitted('selection-change')?.[0]).toEqual([mockCard.id, true])
  })

  it('emits card-hover events with correct ID', async () => {
    const wrapper = mount(JobCard, { props: { card: mockCard } })
    
    await wrapper.find('.job-card').trigger('mouseenter')
    expect(wrapper.emitted('card-hover')?.[0]).toEqual([mockCard.id])
    
    await wrapper.find('.job-card').trigger('mouseleave')
    expect(wrapper.emitted('card-hover')?.[1]).toEqual([null])
  })

  it('emits card-click with correct ID', async () => {
    const wrapper = mount(JobCard, { props: { card: mockCard } })
    await wrapper.find('.job-card').trigger('click')
    
    expect(wrapper.emitted('card-click')?.[0]).toEqual([mockCard.id])
  })
})
