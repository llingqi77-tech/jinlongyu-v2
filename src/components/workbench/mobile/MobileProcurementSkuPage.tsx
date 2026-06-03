import { useEffect, useMemo, useRef, useState } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import type { ProcurementPoFormState } from '../../../types/shortage'
import {
  getProcurementSkuGroupForPage,
  getProcurementSkuOaBucket,
} from '../../../utils/shortageAggregations'
import { formatSkuProductTitle } from '../../../utils/productDisplay'
import {
  createPoFormState,
  isProcurementPoFormReadyToMirror,
  pickProcurementPoMirrorFields,
  resolveActualFulfillQty,
} from '../../../utils/procurementFormDefaults'
import {
  buildPoFormStateFromOrders,
  buildProcurementOaPoOverlayModel,
  resolvePreviewOaRequestNo,
} from '../../../utils/procurementOaPreview'
import { MobileProcurementOaPoOverlay } from './MobileProcurementOaPoOverlay'
import { MobileProcurementPoRow } from './MobileProcurementPoRow'

type MobileProcurementSkuPageProps = {
  sku: string
}

export function MobileProcurementSkuPage({ sku }: MobileProcurementSkuPageProps) {
  const orders = useShortageStore((s) => s.orders)
  const procurementOaPreview = useShortageStore((s) => s.procurementOaPreview)
  const procurementSkuReadOnly = useShortageStore((s) => s.procurementSkuReadOnly)
  const closeProcurementSkuPage = useShortageStore((s) => s.closeProcurementSkuPage)
  const submitProcurementSkuBatch = useShortageStore((s) => s.submitProcurementSkuBatch)
  const setToast = useShortageStore((s) => s.setToast)

  const oaPreviewApproved = procurementOaPreview === 'approved'
  const oaPreviewRejected = procurementOaPreview === 'rejected'
  const oaPreviewMode = procurementOaPreview != null

  const group = useMemo(() => getProcurementSkuGroupForPage(orders, sku), [orders, sku])

  const oaBucket = useMemo(
    () => (group ? getProcurementSkuOaBucket(group, orders) : 'none'),
    [group, orders]
  )

  const formReadOnly = oaPreviewApproved || procurementSkuReadOnly

  const poRowsByDdl = useMemo(() => {
    if (!group) return []
    return [...group.hotelRows].sort(
      (a, b) =>
        a.requiredDeliveryDate.localeCompare(b.requiredDeliveryDate) ||
        a.lineId.localeCompare(b.lineId)
    )
  }, [group])

  const unitPrice = useMemo(() => {
    const line = orders.flatMap((o) => o.lines).find((l) => l.sku === sku)
    return line?.unitPrice ?? 68
  }, [orders, sku])

  const [forms, setForms] = useState<Record<string, ProcurementPoFormState>>({})
  const [submitSuccessOpen, setSubmitSuccessOpen] = useState(false)
  const [oaOverlayDismissed, setOaOverlayDismissed] = useState(false)
  const seededSkuRef = useRef<string | null>(null)

  /** 仅进入新品项页时初始化；orders 后台更新不再覆盖已填表单 */
  useEffect(() => {
    if (!group) {
      setForms({})
      seededSkuRef.current = null
      return
    }
    if (seededSkuRef.current === sku) return
    seededSkuRef.current = sku
    const seedFromOrders =
      oaPreviewMode || procurementSkuReadOnly || oaBucket === 'rejected'
    const map = seedFromOrders
      ? buildPoFormStateFromOrders(group, orders)
      : (() => {
          const next: Record<string, ProcurementPoFormState> = {}
          for (const row of group.hotelRows) {
            next[row.lineId] = createPoFormState(row, sku, unitPrice)
          }
          return next
        })()
    setForms(map)
    setOaOverlayDismissed(false)
  }, [group, sku, unitPrice, oaPreviewMode, procurementSkuReadOnly, oaBucket, orders])

  const oaOverlayModel = useMemo(() => {
    if (!group || !procurementOaPreview) return null
    return buildProcurementOaPoOverlayModel(
      group,
      forms,
      procurementOaPreview,
      resolvePreviewOaRequestNo(orders, sku)
    )
  }, [group, forms, procurementOaPreview, orders, sku])

  if (!group) {
    return (
      <div className="mobile-procurement-page">
        <header className="mobile-procurement-page__header">
          <button type="button" className="mobile-workbench-header__back" onClick={closeProcurementSkuPage}>
            ‹
          </button>
          <h1 className="mobile-procurement-page__title">缺货处理</h1>
        </header>
        <p className="mobile-procurement-page__empty">该品项已处理或不存在。</p>
      </div>
    )
  }

  const showOaOverlay = oaPreviewMode && oaOverlayModel != null && !oaOverlayDismissed
  const oaReopenLabel = oaPreviewApproved ? '查看采购订单' : '查看原采购订单'

  const firstPoLineId = poRowsByDdl[0]?.lineId

  const patchForm = (lineId: string, patch: Partial<ProcurementPoFormState>) => {
    if (formReadOnly) return
    setForms((prev) => {
      const row = group.hotelRows.find((r) => r.lineId === lineId)
      if (!row) return prev
      const base = prev[lineId] ?? createPoFormState(row, sku, unitPrice)
      const updated: Record<string, ProcurementPoFormState> = {
        ...prev,
        [lineId]: { ...base, ...patch },
      }

      if (
        lineId === firstPoLineId &&
        poRowsByDdl.length > 1 &&
        isProcurementPoFormReadyToMirror(updated[lineId])
      ) {
        const mirror = pickProcurementPoMirrorFields(updated[lineId])
        for (const other of poRowsByDdl.slice(1)) {
          const otherBase =
            updated[other.lineId] ??
            createPoFormState(other, sku, unitPrice)
          updated[other.lineId] = { ...otherBase, ...mirror }
        }
      }

      return updated
    })
  }

  const handleSubmit = () => {
    const rows = group.hotelRows.map((row) => {
      const form = forms[row.lineId]
      if (!form?.fulfillmentMode) return null
      return {
        lineId: row.lineId,
        fulfillmentMode: form.fulfillmentMode,
        supplierName: form.supplierName,
        price: Number(form.price),
        eta: form.eta,
        deliveryMethod: form.deliveryMethod,
        logisticsTrackingNo:
          form.fulfillmentMode === 'urgent' && form.deliveryMethod === 'direct'
            ? form.logisticsTrackingNo.trim()
            : undefined,
        actualFulfillQty: resolveActualFulfillQty(form.fulfillmentMode, row.gap),
      }
    })

    if (rows.some((r) => r == null)) {
      setToast('请为每个 PO 选择履约方式')
      return
    }

    const ok = submitProcurementSkuBatch({
      sku: group.sku,
      rows: rows.filter((r): r is NonNullable<typeof r> => r != null),
    })
    if (ok) setSubmitSuccessOpen(true)
  }

  const dismissSubmitSuccess = () => {
    setSubmitSuccessOpen(false)
    closeProcurementSkuPage()
  }

  return (
    <div
      className={`mobile-procurement-page${oaPreviewMode ? ' mobile-procurement-page--oa-preview' : ''}${oaPreviewRejected ? ' mobile-procurement-page--oa-rejected' : ''}${showOaOverlay ? ' mobile-procurement-page--oa-open' : ''}${oaPreviewRejected ? ' mobile-procurement-page--has-footer' : ''}`}
    >
      <header className="mobile-procurement-page__header">
        <button
          type="button"
          className="mobile-workbench-header__back"
          onClick={closeProcurementSkuPage}
          aria-label="返回"
        >
          ‹
        </button>
        <div className="mobile-procurement-page__head-text">
          <h1 className="mobile-procurement-page__title">
            {formatSkuProductTitle(group.productName, group.spec)}
          </h1>
          <p className="mobile-procurement-page__meta">
            共缺 {group.totalGap}
            {group.unit} · {group.lineCount} 个 PO · 北京市
          </p>
        </div>
      </header>

      <div className="mobile-procurement-page__body">
        {formReadOnly ? (
          <p className="mobile-procurement-page__hint mobile-procurement-page__hint--readonly">
            {oaPreviewApproved || oaBucket === 'approved'
              ? 'OA 已通过，采购订单已生成，以下信息仅供查看'
              : 'OA 审批中，以下信息仅供查看'}
          </p>
        ) : (
          <p className="mobile-procurement-page__hint">
            {oaPreviewRejected || oaBucket === 'rejected'
              ? '请根据驳回原因修改各 PO 后重新提交 OA'
              : '需为每个 PO 选择履约方式并填写后提交'}
          </p>
        )}
        {poRowsByDdl.map((row) => (
          <MobileProcurementPoRow
            key={row.lineId}
            row={row}
            sku={sku}
            form={forms[row.lineId] ?? createPoFormState(row, sku, unitPrice)}
            onChange={(patch) => patchForm(row.lineId, patch)}
            readOnly={formReadOnly}
          />
        ))}
      </div>

      {oaPreviewMode && oaOverlayModel ? (
        showOaOverlay ? (
          <div className="mobile-procurement-page__oa-layer" aria-hidden={false}>
            <button
              type="button"
              className="mobile-procurement-page__oa-scrim"
              onClick={() => setOaOverlayDismissed(true)}
              aria-label="收起采购订单浮窗"
            />
            <div className="mobile-procurement-page__oa-float">
              <MobileProcurementOaPoOverlay
                model={oaOverlayModel}
                onDismiss={() => setOaOverlayDismissed(true)}
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="mobile-procurement-page__oa-reopen"
            onClick={() => setOaOverlayDismissed(false)}
          >
            {oaReopenLabel}
          </button>
        )
      ) : null}

      {!formReadOnly ? (
        <footer className="mobile-procurement-page__footer">
          <button type="button" className="procurement-sku-card__submit" onClick={handleSubmit}>
            确认并提交到采购订单与OA流程
          </button>
        </footer>
      ) : null}

      {submitSuccessOpen ? (
        <div
          className="mobile-procurement-success-dialog mobile-procurement-success-dialog--compact"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="mobile-procurement-success-title"
        >
          <button
            type="button"
            className="mobile-procurement-success-dialog__backdrop"
            onClick={dismissSubmitSuccess}
            aria-label="关闭"
          />
          <div className="mobile-procurement-success-dialog__panel">
            <p id="mobile-procurement-success-title" className="mobile-procurement-success-dialog__title">
              已提交成功
            </p>
            <button
              type="button"
              className="mobile-procurement-success-dialog__btn"
              onClick={dismissSubmitSuccess}
            >
              知道了
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
