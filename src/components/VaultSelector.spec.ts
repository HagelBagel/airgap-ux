import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import VaultSelector from './VaultSelector.vue'

const mockSelectVault = vi.fn()
vi.mock('../stores/vault', () => ({
  useVaultStore: () => ({ selectVault: mockSelectVault })
}))

describe('VaultSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a Select Vault button', () => {
    const wrapper = mount(VaultSelector)
    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.text()).toMatch(/select vault/i)
  })

  it('calls selectVault on the store when the button is clicked', async () => {
    const wrapper = mount(VaultSelector)
    await wrapper.find('button').trigger('click')
    expect(mockSelectVault).toHaveBeenCalledTimes(1)
  })
})
