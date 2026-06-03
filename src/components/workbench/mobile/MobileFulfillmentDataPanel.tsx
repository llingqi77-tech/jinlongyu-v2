import { useEffect, useState } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import type {
  FulfillmentDataPanelState,
  FulfillmentProcessedSkuRow,
  FulfillmentSkuRow,
} from '../../../types/shortage'
import {
  FULFILLMENT_CMD_PREFIX,
  formatFulfillmentSkuSub,
  fulfillmentSkuHeaderLabel,
  isFulfillmentProcessedSkuReadOnly,
  resolveFulfillmentRowSkuId,
} from '../../../utils/mobileFulfillmentData'
import { sendFulfillmentPanelAction } from '../../../utils/mobileAgentDialogue'

type MobileFulfillmentDataPanelProps = {
  panel: FulfillmentDataPanelState
}

type SkuPanelView = 'pending' | 'processed'
type ProcessedHandlingView = 'urgent' | 'defer'

function pickDefaultProcessedHandling(skus: FulfillmentProcessedSkuRow[]): ProcessedHandlingView {
  const urgentCount = skus.filter((s) => s.handlingLabel === '加急').length
  const deferCount = skus.filter((s) => s.handlingLabel === '延期').length
  if (urgentCount > 0) return 'urgent'
  if (deferCount > 0) return 'defer'
  return 'urgent'
}

function SkuCardPending({
  sku,
  onOpenSku,
}: {
  sku: FulfillmentSkuRow
  onOpenSku: (sku: string, procurementEditable: boolean, headerLabel: string) => void
}) {
  return (
    <button
      type="button"
      className="mobile-fulfillment-panel__sku"
      onClick={() => onOpenSku(sku.sku, true, fulfillmentSkuHeaderLabel(true))}
    >
      <div className="mobile-fulfillment-panel__sku-head">
        <span className="mobile-fulfillment-panel__sku-title">{sku.title}</span>
        <span className="mobile-fulfillment-panel__status mobile-fulfillment-panel__status--pending">
          待处理
        </span>
      </div>
      <span className="mobile-fulfillment-panel__sku-sub">
        {formatFulfillmentSkuSub(sku.totalGap, sku.unit, sku.lineCount, sku.unitPrice)}
      </span>
      <span className="mobile-fulfillment-panel__sku-delivery">
        所有 PO 最早交期{' '}
        <span className="mobile-fulfillment-panel__sku-delivery-date">{sku.earliestDelivery}</span>
      </span>
    </button>
  )
}

function SkuCardProcessed({
  sku,
  onOpenSku,
}: {
  sku: FulfillmentProcessedSkuRow
  onOpenSku: (sku: string, procurementEditable: boolean, headerLabel: string) => void
}) {
  return (
    <button
      type="button"
      className="mobile-fulfillment-panel__sku"
      onClick={() =>
        onOpenSku(
          resolveFulfillmentRowSkuId(sku.sku),
          !isFulfillmentProcessedSkuReadOnly(sku.oaLabel),
          fulfillmentSkuHeaderLabel(false, sku.oaLabel)
        )
      }
    >
      <div className="mobile-fulfillment-panel__sku-head">
        <span className="mobile-fulfillment-panel__sku-title">{sku.title}</span>
        <span className="mobile-fulfillment-panel__tags">
          {sku.oaLabel ? (
            <span
              className={`mobile-fulfillment-panel__tag mobile-fulfillment-panel__tag--oa${
                sku.oaLabel === '已驳回'
                  ? ' mobile-fulfillment-panel__tag--oa-rejected'
                  : sku.oaLabel === '已通过'
                    ? ' mobile-fulfillment-panel__tag--oa-approved'
                    : ''
              }`}
            >
              {sku.oaLabel}
            </span>
          ) : null}
        </span>
      </div>
      <span className="mobile-fulfillment-panel__sku-sub">
        {formatFulfillmentSkuSub(sku.totalGap, sku.unit, sku.lineCount, sku.unitPrice)}
      </span>
      <span className="mobile-fulfillment-panel__sku-delivery">
        所有 PO 最早交期{' '}
        <span className="mobile-fulfillment-panel__sku-delivery-date">{sku.earliestDelivery}</span>
      </span>
    </button>
  )
}

export function MobileFulfillmentDataPanel({ panel }: MobileFulfillmentDataPanelProps) {
  const role = useShortageStore((s) => s.role)
  const openProcurementSkuPage = useShortageStore((s) => s.openProcurementSkuPage)
  const handleOpenSku = (
    skuId: string,
    procurementEditable: boolean,
    headerLabel: string
  ) => {
    const readOnly = role !== 'procurement' || !procurementEditable
    openProcurementSkuPage(skuId, { readOnly, headerLabel })
  }
  const [view, setView] = useState<SkuPanelView>('pending')
  const [processedHandling, setProcessedHandling] = useState<ProcessedHandlingView>('urgent')

  const processedSkus = panel.level === 'skus' ? panel.processedSkus : []
  const urgentProcessed = processedSkus.filter((s) => s.handlingLabel === '加急')
  const deferProcessed = processedSkus.filter((s) => s.handlingLabel === '延期')

  useEffect(() => {
    if (panel.level !== 'skus') return
    setView(panel.pendingSkus.length > 0 ? 'pending' : 'processed')
    setProcessedHandling(pickDefaultProcessedHandling(panel.processedSkus))
  }, [panel])

  useEffect(() => {
    if (view !== 'processed') return
    setProcessedHandling(pickDefaultProcessedHandling(processedSkus))
  }, [view, processedSkus])

  if (panel.level === 'categories') {
    return (
      <div className="mobile-fulfillment-panel" role="group" aria-label="缺货品履约数据">
        <ul className="mobile-fulfillment-panel__list">
          {panel.categories.map((row) => (
            <li key={row.key}>
              <button
                type="button"
                className="mobile-fulfillment-panel__row"
                onClick={() =>
                  sendFulfillmentPanelAction(row.label, `${FULFILLMENT_CMD_PREFIX}cat:${row.key}`)
                }
              >
                <span className="mobile-fulfillment-panel__row-label">{row.label}</span>
                <span className="mobile-fulfillment-panel__row-meta">
                  共 {row.totalSkuCount} · 待处理 {row.pendingSkuCount}
                </span>
                <span className="mobile-fulfillment-panel__chevron" aria-hidden>
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const activeProcessedList =
    processedHandling === 'urgent' ? urgentProcessed : deferProcessed
  const activeList = view === 'pending' ? panel.pendingSkus : activeProcessedList
  const hasAny = panel.pendingSkus.length > 0 || processedSkus.length > 0

  return (
    <div className="mobile-fulfillment-panel" role="group" aria-label={`${panel.categoryLabel}缺货明细`}>
      <button
        type="button"
        className="mobile-fulfillment-panel__back"
        onClick={() => sendFulfillmentPanelAction('返回品类', `${FULFILLMENT_CMD_PREFIX}back`)}
      >
        ‹ 返回品类
      </button>
      {hasAny ? (
        <div className="mobile-fulfillment-panel__view-tabs" role="tablist" aria-label="处理状态">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'pending'}
            className={`mobile-fulfillment-panel__view-tab${
              view === 'pending' ? ' mobile-fulfillment-panel__view-tab--active' : ''
            }`}
            onClick={() => setView('pending')}
          >
            待处理
            {panel.pendingSkus.length > 0 ? (
              <span className="mobile-fulfillment-panel__view-count">{panel.pendingSkus.length}</span>
            ) : null}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'processed'}
            className={`mobile-fulfillment-panel__view-tab${
              view === 'processed' ? ' mobile-fulfillment-panel__view-tab--active' : ''
            }`}
            onClick={() => setView('processed')}
          >
            已处理
            {processedSkus.length > 0 ? (
              <span className="mobile-fulfillment-panel__view-count">{processedSkus.length}</span>
            ) : null}
          </button>
        </div>
      ) : null}
      {view === 'processed' && processedSkus.length > 0 ? (
        <div
          className="mobile-fulfillment-panel__handling-tabs"
          role="tablist"
          aria-label="履约方式"
        >
          <button
            type="button"
            role="tab"
            aria-selected={processedHandling === 'urgent'}
            className={`mobile-fulfillment-panel__handling-tab${
              processedHandling === 'urgent' ? ' mobile-fulfillment-panel__handling-tab--active' : ''
            }`}
            onClick={() => setProcessedHandling('urgent')}
          >
            加急
            {urgentProcessed.length > 0 ? (
              <span className="mobile-fulfillment-panel__view-count">{urgentProcessed.length}</span>
            ) : null}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={processedHandling === 'defer'}
            className={`mobile-fulfillment-panel__handling-tab${
              processedHandling === 'defer' ? ' mobile-fulfillment-panel__handling-tab--active' : ''
            }`}
            onClick={() => setProcessedHandling('defer')}
          >
            延期
            {deferProcessed.length > 0 ? (
              <span className="mobile-fulfillment-panel__view-count">{deferProcessed.length}</span>
            ) : null}
          </button>
        </div>
      ) : null}
      {!hasAny ? (
        <p className="mobile-fulfillment-panel__empty">该品类在近 3 日交期内暂无缺货。</p>
      ) : activeList.length === 0 ? (
        <p className="mobile-fulfillment-panel__empty">
          {view === 'pending'
            ? '该品类暂无待处理品项。'
            : processedSkus.length === 0
              ? '该品类暂无已提交 OA 的品项。'
              : `该品类暂无${processedHandling === 'urgent' ? '加急' : '延期'}已处理品项。`}
        </p>
      ) : (
        <ul className="mobile-fulfillment-panel__list">
          {view === 'pending'
            ? panel.pendingSkus.map((sku) => (
                <li key={sku.sku}>
                  <SkuCardPending sku={sku} onOpenSku={handleOpenSku} />
                </li>
              ))
            : activeProcessedList.map((sku) => (
                <li key={sku.sku}>
                  <SkuCardProcessed sku={sku} onOpenSku={handleOpenSku} />
                </li>
              ))}
        </ul>
      )}
    </div>
  )
}
