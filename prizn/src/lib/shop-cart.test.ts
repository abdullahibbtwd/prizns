import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addToCart,
  clearCart,
  getCart,
  getCartCount,
  setCartQty,
} from './shop-cart'

describe('shop-cart', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts empty', () => {
    expect(getCart()).toEqual([])
    expect(getCartCount()).toBe(0)
  })

  it('adds and merges quantities', () => {
    addToCart('prod-1', 1)
    addToCart('prod-1', 2)
    expect(getCart()).toEqual([{ productId: 'prod-1', qty: 3 }])
    expect(getCartCount()).toBe(3)
  })

  it('respects max quantity per product', () => {
    addToCart('prod-1', 10, 5)
    expect(getCart()).toEqual([{ productId: 'prod-1', qty: 5 }])
  })

  it('updates quantity via setCartQty and removes at zero', () => {
    addToCart('prod-1', 2)
    setCartQty('prod-1', 4)
    expect(getCart()).toEqual([{ productId: 'prod-1', qty: 4 }])

    setCartQty('prod-1', 0)
    expect(getCart()).toEqual([])
  })

  it('dispatches a cart update event on write', () => {
    const listener = vi.fn()
    window.addEventListener('prizni-shop-cart', listener)
    addToCart('prod-2', 1)
    expect(listener).toHaveBeenCalled()
    window.removeEventListener('prizni-shop-cart', listener)
  })

  it('ignores invalid persisted cart data', () => {
    localStorage.setItem('prizni-shop-cart', '{not-json')
    expect(getCart()).toEqual([])
  })

  it('clears the cart', () => {
    addToCart('prod-1', 1)
    clearCart()
    expect(getCart()).toEqual([])
  })
})
