import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import JobCardEvidencePanel from './JobCardEvidencePanel.vue'

describe('JobCardEvidencePanel', () => {
  it('shows the timestamp when the evidence has one', async () => {
    const wrapper = mount(JobCardEvidencePanel, {
      props: { evidence: [{ speakerId: 'Anna', text: 'They take days.', startTime: 75, endTime: 80 }] },
    })
    await wrapper.find('.evidence-panel__toggle').trigger('click')

    expect(wrapper.find('.evidence-panel__timestamp').text()).toBe('· 01:15')
  })

  it('hides the timestamp when the evidence has none', async () => {
    const wrapper = mount(JobCardEvidencePanel, {
      props: { evidence: [{ speakerId: 'Anna', text: 'They take days.' }] },
    })
    await wrapper.find('.evidence-panel__toggle').trigger('click')

    expect(wrapper.find('.evidence-panel__speaker').text()).toBe('Anna')
    expect(wrapper.find('.evidence-panel__timestamp').exists()).toBe(false)
  })
})
