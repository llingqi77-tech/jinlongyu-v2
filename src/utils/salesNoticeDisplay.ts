import type { SalesHotelLineItem, SalesSkuUpdateHotelRow } from '../types/shortage'

type SalesLineLike = Pick<
  SalesHotelLineItem | SalesSkuUpdateHotelRow,
  'procurementOutcome' | 'fulfillmentMethod' | 'eta'
>

export function salesLineBadge(line: SalesLineLike): { label: string; className: string } {
  if (line.procurementOutcome === 'not_satisfied' || line.fulfillmentMethod === 'defer') {
    return { label: '延期', className: 'sales-defer-card__badge sales-defer-card__badge--defer' }
  }
  if (line.procurementOutcome === 'satisfied' || line.fulfillmentMethod === 'satisfied') {
    return { label: '加急', className: 'sales-defer-card__badge sales-defer-card__badge--urgent' }
  }
  return {
    label: '待采购处理',
    className: 'sales-defer-card__badge sales-defer-card__badge--pending',
  }
}

export function salesLineDetail(line: SalesLineLike): string {
  if (line.procurementOutcome === 'not_satisfied') return '采购无法满足'
  if (line.eta && (line.procurementOutcome === 'satisfied' || line.fulfillmentMethod === 'satisfied')) {
    return `采购预计 ${line.eta.slice(5)} 到货`
  }
  if (line.procurementOutcome === 'satisfied' || line.fulfillmentMethod === 'satisfied') {
    return '加急履约中'
  }
  return '待采购处理'
}

export function formatSalesNotifiedTime(iso: string): string {
  if (!iso || iso === '1970-01-01T00:00:00.000Z') return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
