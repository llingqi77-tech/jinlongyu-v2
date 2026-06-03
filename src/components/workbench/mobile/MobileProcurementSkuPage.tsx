import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import type { ProcurementPoFormState } from '../../../types/shortage'
import { getProcurementSkuGroup } from '../../../utils/shortageAggregations'
import {
  buildAiBulkFillForms,
  buildAiSinglePoFillForm,
  findBulkCoverSupplier,
  findSupplierForGap,
  formatAiFillSummary,
  formatAiSinglePoFillSummary,
  getDemoProcurementVoiceTranscript,
  getDemoSinglePoVoiceTranscript,
} from '../../../utils/procurementAiFill'
import { createPoFormState, resolveActualFulfillQty } from '../../../utils/procurementFormDefaults'
import {
  buildPoFormStateFromOrders,
  buildProcurementOaPoOverlayModel,
  resolvePreviewOaRequestNo,
} from '../../../utils/procurementOaPreview'
import { MobileProcurementOaPoOverlay } from './MobileProcurementOaPoOverlay'
import { MobileProcurementPoRow } from './MobileProcurementPoRow'
import { MobileVoiceListeningBar } from './MobileVoiceListeningBar'

type MobileProcurementSkuPageProps = {
  sku: string
}

type VoiceTarget = 'bulk' | string

export function MobileProcurementSkuPage({ sku }: MobileProcurementSkuPageProps) {
  const orders = useShortageStore((s) => s.orders)
  const procurementOaPreview = useShortageStore((s) => s.procurementOaPreview)
  const closeProcurementSkuPage = useShortageStore((s) => s.closeProcurementSkuPage)
  const submitProcurementSkuBatch = useShortageStore((s) => s.submitProcurementSkuBatch)
  const setToast = useShortageStore((s) => s.setToast)

  const oaPreviewApproved = procurementOaPreview === 'approved'
  const oaPreviewRejected = procurementOaPreview === 'rejected'
  const oaPreviewMode = procurementOaPreview != null

  const group = useMemo(() => getProcurementSkuGroup(orders, sku), [orders, sku])

  const unitPrice = useMemo(() => {
    const line = orders.flatMap((o) => o.lines).find((l) => l.sku === sku)
    return line?.unitPrice ?? 68
  }, [orders, sku])

  const [forms, setForms] = useState<Record<string, ProcurementPoFormState>>({})
  const [submitSuccessOpen, setSubmitSuccessOpen] = useState(false)
  const [oaOverlayDismissed, setOaOverlayDismissed] = useState(false)
  const [voiceTarget, setVoiceTarget] = useState<VoiceTarget | null>(null)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const streamTimerRef = useRef<number | null>(null)
  const finishTimerRef = useRef<number | null>(null)
  const seededSkuRef = useRef<string | null>(null)

  const voiceListening = voiceTarget != null

  /** 仅进入新品项页时初始化；orders 后台更新不再覆盖已填表单 */
  useEffect(() => {
    if (!group) {
      setForms({})
      seededSkuRef.current = null
      return
    }
    if (seededSkuRef.current === sku) return
    seededSkuRef.current = sku
    const map = oaPreviewMode
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
  }, [group, sku, unitPrice, oaPreviewMode, orders])

  const clearVoiceTimers = useCallback(() => {
    if (streamTimerRef.current != null) {
      window.clearInterval(streamTimerRef.current)
      streamTimerRef.current = null
    }
    if (finishTimerRef.current != null) {
      window.clearTimeout(finishTimerRef.current)
      finishTimerRef.current = null
    }
  }, [])

  useEffect(() => () => clearVoiceTimers(), [clearVoiceTimers])

  const finishVoiceFill = useCallback(
    (target: VoiceTarget) => {
      if (!group) return
      clearVoiceTimers()
      setVoiceTarget(null)
      setVoiceTranscript('')

      if (target === 'bulk') {
        const result = buildAiBulkFillForms(group, sku, unitPrice)
        if (!result) {
          setToast('未找到库存充足的供应商，请手动填写')
          return
        }
        setForms(result.forms)
        setToast(formatAiFillSummary(group, result.supplier))
        return
      }

      const row = group.hotelRows.find((r) => r.lineId === target)
      if (!row) return

      const result = buildAiSinglePoFillForm(row, sku, unitPrice)
      if (!result) {
        setToast(`未找到可覆盖 ${row.gap}${row.unit} 的供应商，请手动填写`)
        return
      }
      setForms((prev) => ({ ...prev, [row.lineId]: result.form }))
      setToast(formatAiSinglePoFillSummary(row, result.supplier))
    },
    [clearVoiceTimers, group, setToast, sku, unitPrice]
  )

  const startVoiceListening = useCallback(
    (target: VoiceTarget) => {
      if (!group || voiceListening) return

      let fullText = '帮我填写采购方案'
      if (target === 'bulk') {
        const supplier = findBulkCoverSupplier(sku, group.totalGap, unitPrice)
        fullText = supplier
          ? getDemoProcurementVoiceTranscript(group, supplier.name, supplier.unitPrice)
          : '帮我查一下有没有供应商能覆盖全部缺货'
      } else {
        const row = group.hotelRows.find((r) => r.lineId === target)
        if (row) {
          const supplier = findSupplierForGap(sku, row.gap, unitPrice)
          fullText = supplier
            ? getDemoSinglePoVoiceTranscript(row, supplier.name, supplier.unitPrice)
            : `${row.hotelName}有没有供应商能供货`
        }
      }

      clearVoiceTimers()
      setVoiceTarget(target)
      setVoiceTranscript('')

      let index = 0
      streamTimerRef.current = window.setInterval(() => {
        index += 1
        setVoiceTranscript(fullText.slice(0, index))
        if (index >= fullText.length) {
          if (streamTimerRef.current != null) {
            window.clearInterval(streamTimerRef.current)
            streamTimerRef.current = null
          }
          finishTimerRef.current = window.setTimeout(() => {
            finishVoiceFill(target)
          }, 400)
        }
      }, 70)
    },
    [clearVoiceTimers, finishVoiceFill, group, sku, unitPrice, voiceListening]
  )

  const handleVoiceStop = () => {
    if (voiceTarget) finishVoiceFill(voiceTarget)
  }

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

  const patchForm = (lineId: string, patch: Partial<ProcurementPoFormState>) => {
    if (oaPreviewApproved) return
    setForms((prev) => {
      const row = group.hotelRows.find((r) => r.lineId === lineId)
      if (!row) return prev
      const base = prev[lineId] ?? createPoFormState(row, sku, unitPrice)
      return { ...prev, [lineId]: { ...base, ...patch } }
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
        eta: form.fulfillmentMode === 'urgent' ? form.eta : undefined,
        deliveryMethod: form.deliveryMethod,
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
      className={`mobile-procurement-page${voiceListening ? ' mobile-procurement-page--voice' : ''}${oaPreviewMode ? ' mobile-procurement-page--oa-preview' : ''}${oaPreviewRejected ? ' mobile-procurement-page--oa-rejected' : ''}${showOaOverlay ? ' mobile-procurement-page--oa-open' : ''}${oaPreviewRejected ? ' mobile-procurement-page--has-footer' : ''}`}
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
          <h1 className="mobile-procurement-page__title">{group.productName}</h1>
          <p className="mobile-procurement-page__meta">
            {group.spec} · 共缺 {group.totalGap}
            {group.unit} · {group.hotelCount} 家客户 · 北京市
          </p>
        </div>
      </header>

      <div className="mobile-procurement-page__body">
        {!oaPreviewApproved ? (
          <div className="mobile-procurement-page__hint-row">
            <p className="mobile-procurement-page__hint">
              {oaPreviewRejected
                ? '请根据驳回原因修改各 PO 后重新提交 OA'
                : '需全部填写后提交审批；右侧可整批语音填入，各 PO 也可单独语音填入'}
            </p>
            {!oaPreviewMode ? (
              <button
                type="button"
                className="mobile-procurement-page__ai-btn"
                onClick={() => startVoiceListening('bulk')}
                disabled={voiceListening}
              >
                <span className="mobile-procurement-page__ai-icon" aria-hidden>
                  🎙
                </span>
                AI语音填入
              </button>
            ) : null}
          </div>
        ) : (
          <p className="mobile-procurement-page__hint mobile-procurement-page__hint--readonly">
            OA 已通过，采购订单已生成，以下信息仅供查看
          </p>
        )}
        {group.hotelRows.map((row) => (
          <MobileProcurementPoRow
            key={row.lineId}
            row={row}
            form={
              forms[row.lineId] ??
              createPoFormState(row, sku, unitPrice)
            }
            onChange={(patch) => patchForm(row.lineId, patch)}
            onVoiceFill={oaPreviewApproved ? undefined : () => startVoiceListening(row.lineId)}
            voiceActive={voiceTarget === row.lineId}
            voiceDisabled={voiceListening && voiceTarget !== row.lineId}
            readOnly={oaPreviewApproved}
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

      {voiceListening ? (
        <MobileVoiceListeningBar transcript={voiceTranscript} onStop={handleVoiceStop} />
      ) : !oaPreviewApproved ? (
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
