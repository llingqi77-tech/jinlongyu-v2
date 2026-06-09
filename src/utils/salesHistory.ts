import type {
  HistoryFulfillmentKind,
  HistoryOrder,
  HistoryOrderFilter,
  HistoryOrderStatus,
  HistoryOrderSummary,
} from '../types/shortage'
import { MOCK_SALES_HISTORY_ORDERS } from '../mocks/salesHistoryOrders'

export const HISTORY_STATUS_LABEL: Record<HistoryOrderStatus, string> = {
  completed: '已完成',
  partial: '部分完成',
  deferred: '未完成',
}

export const HISTORY_KIND_LABEL: Record<HistoryFulfillmentKind, string> = {
  direct: '直发',
  replenish: '正常补货',
  urgent: '加急',
  defer: '延期',
}

export function getHistoryOrderStatus(order: HistoryOrder): HistoryOrderStatus {
  const hasDefer = order.lines.some((l) => l.kind === 'defer')
  const allSigned = order.lines.every((l) => l.signed)
  if (hasDefer) return 'deferred'
  if (allSigned) return 'completed'
  return 'partial'
}

export function getHistoryCities(): string[] {
  return [...new Set(MOCK_SALES_HISTORY_ORDERS.map((o) => o.city))]
}

export function getHistoryHotels(city: string | null): string[] {
  const source = city
    ? MOCK_SALES_HISTORY_ORDERS.filter((o) => o.city === city)
    : MOCK_SALES_HISTORY_ORDERS
  return [...new Set(source.map((o) => o.hotelName))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

export function filterHistoryOrders(filter: HistoryOrderFilter): HistoryOrder[] {
  return MOCK_SALES_HISTORY_ORDERS.filter((o) => {
    if (filter.city && o.city !== filter.city) return false
    if (filter.hotel && o.hotelName !== filter.hotel) return false
    if (filter.start && o.deliveryDate < filter.start) return false
    if (filter.end && o.deliveryDate > filter.end) return false
    return true
  })
}

export function summarizeHistoryOrders(orders: HistoryOrder[]): HistoryOrderSummary {
  let completedCount = 0
  let deferredCount = 0
  let lineCount = 0
  let signedLineCount = 0
  for (const o of orders) {
    const status = getHistoryOrderStatus(o)
    if (status === 'completed') completedCount += 1
    if (status === 'deferred') deferredCount += 1
    lineCount += o.lines.length
    signedLineCount += o.lines.filter((l) => l.signed).length
  }
  return {
    orderCount: orders.length,
    completedCount,
    deferredCount,
    cityCount: new Set(orders.map((o) => o.city)).size,
    hotelCount: new Set(orders.map((o) => o.hotelName)).size,
    lineCount,
    signedLineCount,
    fulfillRate: lineCount > 0 ? Math.round((signedLineCount / lineCount) * 100) : 0,
  }
}

/** 默认筛选区间：最近 30 天（含今日） */
export function getDefaultHistoryFilter(): HistoryOrderFilter {
  const today = new Date()
  const fmt = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)
  return { city: null, hotel: null, start: fmt(start), end: fmt(today) }
}
