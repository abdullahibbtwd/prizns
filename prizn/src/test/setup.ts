import React from 'react'
import '@testing-library/jest-dom/vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && 'count' in opts) return `${key}:${opts.count}`
      if (opts && 'name' in opts) return `${key}:${opts.name}`
      if (opts && 'date' in opts) return `${key}:${opts.date}`
      if (opts && 'title' in opts) return `${key}:${opts.title}`
      return key
    },
    i18n: { language: 'en', exists: () => false, changeLanguage: vi.fn() },
  }),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('div', props, children),
    h1: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('h1', props, children),
    img: (props: Record<string, unknown>) =>
      React.createElement('img', { alt: '', ...props }),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}))

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.restoreAllMocks()
})
