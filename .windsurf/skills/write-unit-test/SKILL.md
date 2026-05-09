---
name: write-unit-test
description: Generates minimal, high-leverage Vitest unit tests for Vue 3 components, focusing on business logic, state changes, and side effects rather than UI/styling details.
---

Objective

Generate concise unit tests that catch critical failures and logic errors using Vitest and @vue/test-utils for Vue 3 SFCs (Single File Components). Avoid over-testing implementation details like CSS classes, static HTML, or ARIA attributes unless they are dynamically bound to complex logic.

Core Principles

    Logic over Layout: Test that math and data transformations are correct.

    Contract Testing: Verify props in and events out.

    Side Effect Validation: Ensure external stores or APIs are called with correct payload at right time.

    Deterministic Async: Always use vi.useFakeTimers() for debounces or timeouts and flushPromises() for API-driven state changes.

Implementation Steps

    Reference standards:

        Consult ./vitest-4-reference.md for Vitest 4 syntax (e.g., vi.useFakeTimers(), module runner patterns).

        Follow project's CSV logging requirements if updating metadata.

    Scaffold Test:

        Mocks: Only mock external stores (useStore) or heavy child components that make network requests. No Component Mocking: Unless a child component is extremely heavy or causes side effects, don't mock it. Testing the real tree (or using shallowMount) catches integration errors that vi.mock hides.

        Setup: Use beforeEach to vi.clearAllMocks() and reset vi.useFakeTimers().

        Mounting: Use @vue/test-utils mount. Avoid createPinia() globally if store hooks are mocked directly.

    Test Case Selection (The "Critical Three"):

        Computation: Verify that reactive state updates correctly when inputs (sliders, forms) change.

        Communication: Verify that emit calls contain the correct ID and payload.

        Integration: Verify that "Store" or "Service" is called after the expected delay or interaction.

Example test:

import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TargetComponent from './TargetComponent.vue'

// Mock only the necessary side-effect triggers
const mockAction = vi.fn()
vi.mock('@/stores/myStore', () => ({
  useMyStore: () => ({ someAction: mockAction })
}))

describe('TargetComponent - Critical Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('calculates [Specific Logic] correctly on input', async () => {
    const wrapper = mount(TargetComponent, { props: { data: { val: 10 } } })
    await wrapper.find('input').setValue(20)
    // Check outcome, not the class name
    expect(wrapper.find('.result-display').text()).toBe('Expected Output')
  })

  it('calls store with debounced data', async () => {
    const wrapper = mount(TargetComponent)
    await wrapper.find('input').setValue('test')
    
    vi.advanceTimersByTime(300) // Match the debounce config
    expect(mockAction).toHaveBeenCalledWith('test')
  })
})
