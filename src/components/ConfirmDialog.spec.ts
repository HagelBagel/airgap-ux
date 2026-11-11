import { beforeAll, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialog from './ConfirmDialog.vue'
import { stubDialog } from '../test/stubDialog'

function mountDialog(props: Partial<InstanceType<typeof ConfirmDialog>['$props']> = {}) {
  return mount(ConfirmDialog, {
    props: { open: true, title: 'Delete “Pilot”?', confirmLabel: 'Delete project', ...props },
    slots: { default: '<p>This cannot be undone.</p>' },
    attachTo: document.body,
  })
}

describe('ConfirmDialog', () => {
  beforeAll(stubDialog)

  it('opens as a modal labelled by its title and shows the slot', () => {
    const wrapper = mountDialog()
    const dialog = wrapper.find('dialog')

    expect(dialog.attributes('open')).toBeDefined()
    expect(wrapper.find(`#${dialog.attributes('aria-labelledby')}`).text()).toBe('Delete “Pilot”?')
    expect(wrapper.text()).toContain('This cannot be undone.')
    wrapper.unmount()
  })

  it('opens and closes when the open prop changes', async () => {
    const wrapper = mountDialog({ open: false })
    expect(wrapper.find('dialog').attributes('open')).toBeUndefined()

    await wrapper.setProps({ open: true })
    expect(wrapper.find('dialog').attributes('open')).toBeDefined()

    await wrapper.setProps({ open: false })
    expect(wrapper.find('dialog').attributes('open')).toBeUndefined()
    wrapper.unmount()
  })

  it('emits confirm and cancel from its buttons', async () => {
    const wrapper = mountDialog()

    await wrapper.find('.confirm-dialog__confirm-btn').trigger('click')
    await wrapper.find('.confirm-dialog__cancel-btn').trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    wrapper.unmount()
  })

  it('turns Esc into a cancel event and leaves closing to the parent', async () => {
    const wrapper = mountDialog()
    const event = new Event('cancel', { cancelable: true })

    wrapper.find('dialog').element.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    wrapper.unmount()
  })

  it('cannot be dismissed or confirmed again while busy', async () => {
    const wrapper = mountDialog({ busy: true, busyLabel: 'Deleting…' })

    wrapper.find('dialog').element.dispatchEvent(new Event('cancel', { cancelable: true }))

    expect(wrapper.emitted('cancel')).toBeUndefined()
    expect(wrapper.find('.confirm-dialog__confirm-btn').text()).toBe('Deleting…')
    expect(wrapper.find('.confirm-dialog__confirm-btn').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.confirm-dialog__cancel-btn').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('shows an error as an alert', () => {
    const wrapper = mountDialog({ error: 'Internal Server Error' })

    expect(wrapper.find('[role="alert"]').text()).toBe('Internal Server Error')
    wrapper.unmount()
  })
})
