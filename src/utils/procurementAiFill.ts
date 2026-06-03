import type { ProcurementPoFormState, ProcurementSkuGroup, SkuHotelSubRow } from '../types/shortage'
import { createPoFormState } from './procurementFormDefaults'
import { getLastPurchasePrice } from './supplierRecommendations'

export interface SupplierInventoryOffer {
  id: string
  name: string
  availableQty: number
  unitPrice: number
}

/** 演示：区域供应商库存（同一采购负责同城酒店） */
export function getSupplierInventoryOffers(
  sku: string,
  totalGap: number,
  unitPrice = 68
): SupplierInventoryOffer[] {
  const basePrice = getLastPurchasePrice(sku, unitPrice)
  return [
    {
      id: `sup-${sku}-bulk`,
      name: '益海嘉里华北供应链',
      availableQty: Math.max(totalGap + 80, 200),
      unitPrice: basePrice,
    },
    {
      id: `sup-${sku}-mid`,
      name: '北京粮油批发中心',
      availableQty: Math.max(Math.floor(totalGap * 0.55), 0),
      unitPrice: basePrice + 1,
    },
    {
      id: `sup-${sku}-small`,
      name: '华北应急调拨仓',
      availableQty: Math.max(Math.floor(totalGap * 0.3), 0),
      unitPrice: basePrice + 2,
    },
  ]
}

export function findBulkCoverSupplier(
  sku: string,
  totalGap: number,
  unitPrice = 68
): SupplierInventoryOffer | null {
  return (
    getSupplierInventoryOffers(sku, totalGap, unitPrice).find((o) => o.availableQty >= totalGap) ??
    null
  )
}

export function findSupplierForGap(
  sku: string,
  gap: number,
  unitPrice = 68
): SupplierInventoryOffer | null {
  return getSupplierInventoryOffers(sku, gap, unitPrice).find((o) => o.availableQty >= gap) ?? null
}

export function buildAiSinglePoFillForm(
  row: SkuHotelSubRow,
  sku: string,
  unitPrice = 68
): { form: ProcurementPoFormState; supplier: SupplierInventoryOffer } | null {
  const supplier = findSupplierForGap(sku, row.gap, unitPrice)
  if (!supplier) return null

  return {
    supplier,
    form: {
      ...createPoFormState(row, sku, unitPrice),
      fulfillmentMode: 'urgent',
      supplierName: supplier.name,
      price: String(supplier.unitPrice),
      deliveryMethod: 'warehouse',
    },
  }
}

export function buildAiBulkFillForms(
  group: ProcurementSkuGroup,
  sku: string,
  unitPrice = 68
): { forms: Record<string, ProcurementPoFormState>; supplier: SupplierInventoryOffer } | null {
  const supplier = findBulkCoverSupplier(sku, group.totalGap, unitPrice)
  if (!supplier) return null

  const forms: Record<string, ProcurementPoFormState> = {}
  for (const row of group.hotelRows) {
    forms[row.lineId] = {
      ...createPoFormState(row, sku, unitPrice),
      fulfillmentMode: 'urgent',
      supplierName: supplier.name,
      price: String(supplier.unitPrice),
      deliveryMethod: 'warehouse',
    }
  }
  return { forms, supplier }
}

export function formatAiSinglePoFillSummary(
  row: SkuHotelSubRow,
  supplier: SupplierInventoryOffer
): string {
  return `AI 已识别：${row.hotelName} 走加急，${supplier.name}（¥${supplier.unitPrice}/单位）`
}

export function formatAiFillSummary(
  group: ProcurementSkuGroup,
  supplier: SupplierInventoryOffer
): string {
  return `AI 已识别：${supplier.name} 库存 ${supplier.availableQty}${group.unit}，已为 ${group.lineCount} 个 PO 填入加急方案（¥${supplier.unitPrice}/单位）`
}

/** 演示：整批语音录入时逐字展示的识别文案 */
export function getDemoProcurementVoiceTranscript(
  group: ProcurementSkuGroup,
  supplierName: string,
  unitPrice: number
): string {
  return `${supplierName}库存够，全部${group.totalGap}${group.unit}走加急，统一价格${unitPrice}块`
}

/** 演示：单个 PO 语音录入时逐字展示的识别文案 */
export function getDemoSinglePoVoiceTranscript(
  row: SkuHotelSubRow,
  supplierName: string,
  unitPrice: number
): string {
  return `${row.hotelName}走加急，${supplierName}，${row.gap}${row.unit}，价格${unitPrice}块`
}
