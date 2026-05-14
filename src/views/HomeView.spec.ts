import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive, nextTick } from 'vue'
import HomeView from './HomeView.vue'

const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockStore = reactive<{ activeVault: { name: string } | null; selectVault: () => void }>({
  activeVault: null,
  selectVault: vi.fn(),
})
vi.mock('../stores/vault', () => ({
  useVaultStore: () => mockStore,
}))

vi.mock('../components/VaultSelector.vue', () => ({
  default: { template: '<button>Select Vault</button>' },
}))

describe('HomeView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.activeVault = null
  })

  it('renders the vault selector when no vault is active', () => {
    const wrapper = mount(HomeView)
    expect(wrapper.find('button').text()).toMatch(/select vault/i)
  })

  it('redirects to /dashboard when activeVault is set', async () => {
    mount(HomeView)
    mockStore.activeVault = { name: 'My Vault' }
    await nextTick()
    await flushPromises()
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })
})
