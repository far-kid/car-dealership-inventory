import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

configure({ asyncUtilTimeout: 3_000 })

// jsdom lacks the native dialog methods; browser tests exercise focus trapping.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open')
}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  localStorage.clear()
  delete document.documentElement.dataset.theme
  vi.unstubAllGlobals()
})
