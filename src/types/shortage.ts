export type WorkbenchRole = 'ops' | 'sales' | 'procurement'

export type PipelineStageKey = 'ops_create' | 'procurement' | 'sales_defer' | 'fulfillment_done'

export type FulfillmentMethod =
  | 'pending'
  | 'direct_ship'
  | 'normal_replenishment'
  | 'defer'
  | 'satisfied'
  | 'substitute'

export type SalesOutboundType = 'order_direct' | 'backorder' | null

export type SignoffStatus = 'pending' | 'signed'

export type ProcurementMode = 'urgent' | 'normal' | 'pending'

export type OaApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected'

export type DeliveryMethod = 'warehouse' | 'direct'

export type ProcurementOutcome = 'pending' | 'satisfied' | 'not_satisfied'

export type ShortageLineStatus =
  | 'new'
  | 'await_procurement'
  | 'await_logistics'
  | 'ready_for_po'
  | 'completed'
  | 'cancelled'

export interface SupplierCandidate {
  id: string
  name: string
}

export interface ShortagePOLine {
  id: string
  sku: string
  productName: string
  spec: string
  quantity: number
  unitPrice: number
  lineAmount: number
  unit: string
  isShortage: boolean
  availableStock: number
  gap: number
  hasInTransitOrder?: boolean
  fulfillmentMethod: FulfillmentMethod
  salesNote: string
  salesOutboundType: SalesOutboundType
  salesOutboundNo: string
  actualFulfillQty: number
  signoffStatus: SignoffStatus
  signoffAt: string
  recommendedSuppliers: SupplierCandidate[]
  selectedSupplierId: string
  supplierName: string
  procurementPrice: number
  lastPurchasePrice: number
  amount: number
  procurementDraftNo: string
  procurementConfirmed: boolean
  oaApprovalStatus: OaApprovalStatus
  oaRequestNo: string
  eta: string
  deliveryMethod: DeliveryMethod | null
  procurementOutcome: ProcurementOutcome
  procurementCategory?: string
  isExpedited: boolean
  expediteFee: number
  procurementMode: ProcurementMode
  status: ShortageLineStatus
  opsPoNumber: string
  /** 采购提交后推送给销售的时间（按品+批次聚合通知） */
  salesProcurementNotifiedAt: string
}

export interface ShortagePO {
  id: string
  customerName: string
  deliveryAddress: string
  orderDepartment: string
  specialNote: string
  requiredDeliveryDate: string
  lines: ShortagePOLine[]
}

export interface SkuHotelSubRow {
  lineId: string
  poId: string
  hotelName: string
  deliveryAddress: string
  gap: number
  unit: string
  requiredDeliveryDate: string
  daysRemaining: number
  fulfillmentMethod: FulfillmentMethod
  supplierName: string
  eta: string
  amount: number
  status: ShortageLineStatus
  procurementConfirmed: boolean
  procurementOutcome: ProcurementOutcome
}

export interface ProcurementSkuGroup {
  sku: string
  productName: string
  spec: string
  unit: string
  totalGap: number
  hotelCount: number
  lineCount: number
  earliestRequiredDate: string
  latestRequiredDate: string
  procurementStatus: 'pending' | 'done'
  hotelRows: SkuHotelSubRow[]
}

export interface SalesHotelLineItem {
  lineId: string
  poId: string
  sku: string
  productName: string
  spec: string
  gap: number
  unit: string
  quantity: number
  requiredDeliveryDate: string
  fulfillmentMethod: FulfillmentMethod
  eta: string
  status: ShortageLineStatus
  procurementOutcome: ProcurementOutcome
}

export interface SalesHotelGroup {
  hotelKey: string
  hotelName: string
  deliveryAddress: string
  shortageLineCount: number
  nearestDeliveryDate: string
  poIds: string[]
  lines: SalesHotelLineItem[]
}

export interface SalesSkuUpdateHotelRow {
  lineId: string
  poId: string
  hotelName: string
  deliveryAddress: string
  gap: number
  unit: string
  requiredDeliveryDate: string
  fulfillmentMethod: FulfillmentMethod
  procurementOutcome: ProcurementOutcome
  eta: string
}

/** 采购更新后推送给销售的一条通知（按品 + 批次） */
export interface SalesSkuUpdateBatch {
  batchKey: string
  sku: string
  productName: string
  spec: string
  notifiedAt: string
  hotelCount: number
  lineCount: number
  hotels: SalesSkuUpdateHotelRow[]
}

/** 一次采购更新内按酒店分组（轮播页） */
export interface SalesSkuUpdateHotelGroup {
  hotelKey: string
  hotelName: string
  deliveryAddress: string
  rows: SalesSkuUpdateHotelRow[]
}

export interface ActivityEvent {
  id: string
  timestamp: string
  actor: string
  type: 'sync' | 'sales' | 'procurement' | 'ops' | 'system' | 'logistics'
  content: string
  ref?: { poId?: string; sku?: string; hotel?: string }
}

export interface FulfillmentKpis {
  actualQty: number
  totalGap: number
  signedSkuCount: number
  totalSkuCount: number
}

export interface RoleTaskItem {
  id: string
  lineId: string
  poId: string
  sku: string
  title: string
  sub: string
  stage: PipelineStageKey
  requiredDeliveryDate?: string
  gap?: number
  unit?: string
  stageLabel?: string
  urgencyScore?: number
  customerName?: string
  productName?: string
  deliveryAddress?: string
}

export type MobileAgentPhase = 'idle' | 'awaiting_task_input' | 'confirming'

export type MobileOnboardingPhase = 'role_pick' | 'ready'

export type MobileChatMessageKind =
  | 'text'
  | 'welcome_card'
  | 'task_confirm'
  | 'system'
  | 'order_info'
  | 'supplier_options'

export interface MobileSupplierOption {
  index: number
  name: string
  suggestedPrice: number
  lastPurchasePrice: number
}

export interface MobileOrderInfoDetail {
  hotelName: string
  hotelAddress: string
  productName: string
  spec: string
  gap: number
  unit: string
  unitPrice: number
  totalAmount: number
  deliveryDate: string
  remark: string
}

export interface MobileChatAction {
  id: string
  label: string
  message: string
}

export interface MobileChatMessageMeta {
  kpis?: MobileHomeKpis
  tasks?: RoleTaskItem[]
  orderDetails?: MobileOrderInfoDetail[]
  taskProgress?: string
  taskIndex?: number
  fulfillmentMethodLabel?: string
  fulfillmentFieldLabel?: string
  fulfillmentDetail?: string
  orderStatus?: 'active' | 'completed'
  suppliers?: MobileSupplierOption[]
  actions?: MobileChatAction[]
}

export interface MobileChatMessage {
  id: string
  side: 'user' | 'agent'
  content: string
  kind?: MobileChatMessageKind
  meta?: MobileChatMessageMeta
  timestamp: string
  stream?: boolean
}

export interface MobileHomeKpis {
  shortageLineCount: number
  procurementSubmittedCount: number
  logisticsClosedCount: number
  totalGap: number
}

export type MobileKpiKind = 'shortage' | 'submitted' | 'logistics'

export interface KpiSkuPoRow {
  lineId: string
  poId: string
  hotelName: string
  deliveryAddress: string
  gap: number
  unit: string
  requiredDeliveryDate: string
  status: ShortageLineStatus
  procurementOutcome: ProcurementOutcome
  fulfillmentMethod: FulfillmentMethod
  supplierName: string
  eta: string
  oaApprovalStatus: OaApprovalStatus
}

export interface KpiSkuGroup {
  sku: string
  productName: string
  spec: string
  unit: string
  lineCount: number
  totalGap: number
  oaApprovalStatus?: OaApprovalStatus
  poRows: KpiSkuPoRow[]
}

export interface KpiClosedPoLine {
  lineId: string
  sku: string
  productName: string
  spec: string
  gap: number
  unit: string
  signoffStatus: SignoffStatus
  signoffAt: string
}

export interface KpiClosedPoGroup {
  poId: string
  customerName: string
  deliveryAddress: string
  requiredDeliveryDate: string
  trackingNo: string
  lines: KpiClosedPoLine[]
}

export type TaskFlowKind = 'procurement'

export type WorkbenchOverlayView = 'ops_chat' | TaskFlowKind

export interface MethodMixItem {
  method: FulfillmentMethod
  label: string
  count: number
  percent: number
}

export interface OpsCreateSummary {
  poSynced: number
  poParsed: number
  shortageLineCount: number
  skuCount: number
  hotelCount: number
  totalGapQty: number
}

export interface FulfillmentDoneSummary {
  hotelCount: number
  orderCount: number
  completedLineCount: number
  methodMix: MethodMixItem[]
}

export interface SubmitProcurementPayload {
  outcome: 'satisfied' | 'not_satisfied'
  supplierName?: string
  price?: number
  eta?: string
  deliveryMethod?: DeliveryMethod
}

export interface SubmitProcurementSkuBatchRow {
  lineId: string
  fulfillmentMode: 'urgent' | 'defer'
  supplierName?: string
  price?: number
  eta?: string
  deliveryMethod?: DeliveryMethod
  actualFulfillQty: number
}

export interface SubmitProcurementSkuBatchPayload {
  sku: string
  rows: SubmitProcurementSkuBatchRow[]
}

export type ProcurementPoFormState = {
  fulfillmentMode: 'urgent' | 'defer' | null
  supplierName: string
  price: string
  eta: string
  deliveryMethod: DeliveryMethod
}

/** 角色选择页「OA 提醒通知」预览场景 */
export type ProcurementOaPreviewOutcome = 'approved' | 'rejected'
