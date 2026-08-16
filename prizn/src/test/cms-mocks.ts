import React from 'react'
import { vi } from 'vitest'

/** Minimal i18n mock — returns keys; supports simple interpolation. */
export function setupCmsI18n() {
  vi.mock('react-i18next', () => ({
    useTranslation: () => ({
      t: (key: string, opts?: Record<string, unknown>) => {
        if (opts && 'count' in opts) return `${key}:${opts.count}`
        if (opts && 'name' in opts) return `${key}:${opts.name}`
        if (opts && 'date' in opts) return `${key}:${opts.date}`
        return key
      },
      i18n: { language: 'en', exists: () => false },
    }),
  }))
}

export const motionMock = {
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
}
