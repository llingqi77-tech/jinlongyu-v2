import type { ProcurementPoFormState, SkuHotelSubRow } from '../types/shortage'
import { getLastPurchasePrice, getLastSupplierForPo } from './supplierRecommendations'

export function createPoFormState(
  row: SkuHotelSubRow,
  sku: string,
  unitPrice = 0
): ProcurementPoFormState {
  return {
    fulfillmentMode: null,
    supplierName: getLastSupplierForPo(sku, row.poId).name,
    price: String(getLastPurchasePrice(sku, unitPrice)),
    eta: row.requiredDeliveryDate,
    deliveryMethod: 'warehouse',
  }
}

export function resolveActualFulfillQty(
  fulfillmentMode: ProcurementPoFormState['fulfillmentMode'],
  demandGap: number
): number {
  if (fulfillmentMode === 'defer') return 0
  if (fulfillmentMode === 'urgent') return demandGap
  return demandGap
}
