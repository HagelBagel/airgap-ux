# Vitest 4 + Vue 3 Reference Cheat-sheet

### 1. The Basics (SFC Component Test)
```typescript
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import UserProfile from './UserProfile.vue'

describe('UserProfile.vue', () => {
  it('renders correctly with props', () => {
    const wrapper = mount(UserProfile, {
      props: { username: 'JohnDoe' }
    })
    expect(wrapper.find('[data-testid="name"]').text()).toBe('JohnDoe')
  })
})
```

### 2. Modern Mocking (Vitest 4 Syntax)
Vitest 4 improved the `vi.spyOn` behavior for constructors and module spies.
*   **Module Mocking:** `vi.mock()` calls are hoisted to the top of the file.
*   **Spying on Exports:**
```typescript
import * as api from './api'
const spy = vi.spyOn(api, 'fetchUser')
// Vitest 4: Spies on constructors no longer require manual 'new' handling
```
*   **Mocking Implementation:**
```typescript
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    name: 'Mock User',
    isLoggedIn: true,
    login: vi.fn()
  })
}))
```

### 3. Asynchronous Vue Testing
Always use `await` with interactions to allow the DOM to update.
```typescript
it('updates UI on button click', async () => {
  const wrapper = mount(MyComponent)
  await wrapper.find('button').trigger('click') // Triggering is async
  
  // Use flushPromises for complex async (like API calls in onMounted)
  import { flushPromises } from '@vue/test-utils'
  await flushPromises()
  
  expect(wrapper.text()).toContain('Success')
})
```

### 4. Advanced: Scoped Fixtures (New in 4.x)
Vitest 4 allows you to define fixtures with `file` or `worker` scopes, which is great for database connections or expensive setups.
```typescript
import { test as base } from 'vitest'

const test = base.extend({
  database: async ({}, use) => {
    const db = await connectDB()
    await use(db) // Test runs here
    await db.close() // Cleanup after test
  }
})
```

### 5. Common Matchers & Assertions
| Matcher | Description |
| :--- | :--- |
| `expect(wrapper.exists()).toBe(true)` | Check if component/element is in DOM |
| `expect(wrapper.emitted()).toHaveProperty('submit')` | Check for Vue events |
| `expect(wrapper.attributes('disabled')).toBeDefined()` | Check HTML attributes |
| `expect(vi.fn()).toHaveBeenCalledWith(...)` | Spy verification |
| `expect(value).toMatchSnapshot()` | UI structural stability |

### 6. Configuration Tips (Vitest 4)
*   **`maxWorkers`**: Replaces `maxThreads`/`maxForks` for better resource management.
*   **`projects`**: Replaces `workspace` for monorepo setups.
*   **`onCleanup`**: New pattern for registering teardown logic within `test.extend`.

---

### How to use this with your Skill
Add this line to your `write-unit-test.skill` file:

> "When generating tests, refer to the syntax patterns defined in `./vitest-4-reference.md` to ensure compatibility with the project's testing environment."

