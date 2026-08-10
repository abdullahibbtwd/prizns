const CART_KEY = 'prizni-shop-cart'
const HARD_MAX_QTY = 20

export type CartLine = { productId: string; qty: number }

function clampQty(qty: number, maxQty = HARD_MAX_QTY) {
  const max = Math.max(0, Math.min(HARD_MAX_QTY, Math.floor(maxQty)))
  if (max <= 0) return 0
  return Math.max(1, Math.min(max, Math.floor(qty)))
}

function readRaw(): CartLine[] {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (row): row is CartLine =>
          Boolean(row) &&
          typeof row === 'object' &&
          typeof (row as CartLine).productId === 'string' &&
          typeof (row as CartLine).qty === 'number',
      )
      .map((row) => ({
        productId: row.productId,
        qty: clampQty(row.qty, HARD_MAX_QTY),
      }))
      .filter((row) => row.qty > 0)
  } catch {
    return []
  }
}

function writeRaw(lines: CartLine[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(lines))
  window.dispatchEvent(new CustomEvent('prizni-shop-cart'))
}

export function getCart(): CartLine[] {
  return readRaw()
}

export function getCartCount(): number {
  return readRaw().reduce((sum, line) => sum + line.qty, 0)
}

export function setCartQty(
  productId: string,
  qty: number,
  maxQty = HARD_MAX_QTY,
) {
  const nextQty = Math.floor(qty)
  const lines = readRaw().filter((line) => line.productId !== productId)
  if (nextQty > 0) {
    const capped = clampQty(nextQty, maxQty)
    if (capped > 0) lines.push({ productId, qty: capped })
  }
  writeRaw(lines)
}

export function addToCart(
  productId: string,
  qty = 1,
  maxQty = HARD_MAX_QTY,
) {
  const lines = readRaw()
  const existing = lines.find((line) => line.productId === productId)
  const addBy = Math.max(1, Math.floor(qty))
  if (existing) {
    existing.qty = clampQty(existing.qty + addBy, maxQty)
  } else {
    const capped = clampQty(addBy, maxQty)
    if (capped > 0) lines.push({ productId, qty: capped })
  }
  writeRaw(lines.filter((line) => line.qty > 0))
}

export function clearCart() {
  writeRaw([])
}
