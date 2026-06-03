import type { ProcurementPoFormState, SkuHotelSubRow } from '../../../types/shortage'
import {
  DELIVERY_METHOD_LABEL,
  PROCUREMENT_FULFILLMENT_CHOICE_LABEL,
} from '../../../constants/shortageLabels'
import { resolveActualFulfillQty } from '../../../utils/procurementFormDefaults'

type MobileProcurementPoRowProps = {
  row: SkuHotelSubRow
  form: ProcurementPoFormState
  onChange: (patch: Partial<ProcurementPoFormState>) => void
  onVoiceFill?: () => void
  voiceActive?: boolean
  voiceDisabled?: boolean
  readOnly?: boolean
}

export function MobileProcurementPoRow({
  row,
  form,
  onChange,
  onVoiceFill,
  voiceActive,
  voiceDisabled,
  readOnly = false,
}: MobileProcurementPoRowProps) {
  const actualQty = resolveActualFulfillQty(form.fulfillmentMode, row.gap)
  const isUrgent = form.fulfillmentMode === 'urgent'

  return (
    <div className={`procurement-po-row${readOnly ? ' procurement-po-row--readonly' : ''}`}>
      <div className="procurement-po-row__head">
        <strong>{row.hotelName}</strong>
        <div className="procurement-po-row__head-actions">
          {onVoiceFill && !readOnly ? (
            <button
              type="button"
              className={`procurement-po-row__ai-btn${voiceActive ? ' procurement-po-row__ai-btn--active' : ''}`}
              onClick={onVoiceFill}
              disabled={voiceDisabled}
              aria-label={`${row.hotelName} AI 语音填入`}
            >
              🎙
            </button>
          ) : null}
        </div>
      </div>
      <p className="procurement-po-row__addr">{row.deliveryAddress}</p>
      <p className="procurement-po-row__meta">
        需求 {row.gap}
        {row.unit} · DDL {row.requiredDeliveryDate.slice(5)}
      </p>

      <div className="procurement-po-row__field">
        <span>履约方式</span>
        <div className="procurement-po-row__toggle">
          {(['urgent', 'defer'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={
                form.fulfillmentMode === mode
                  ? 'procurement-po-row__opt procurement-po-row__opt--on'
                  : 'procurement-po-row__opt'
              }
              onClick={() => !readOnly && onChange({ fulfillmentMode: mode })}
              disabled={readOnly}
            >
              {PROCUREMENT_FULFILLMENT_CHOICE_LABEL[mode]}
            </button>
          ))}
        </div>
      </div>

      <label className="procurement-po-row__field procurement-po-row__field--readonly">
        <span>实际补货数量</span>
        <input type="text" readOnly value={`${actualQty}${row.unit}`} />
      </label>

      {isUrgent ? (
        <>
          <label
            className={
              readOnly
                ? 'procurement-po-row__field procurement-po-row__field--readonly'
                : 'procurement-po-row__field'
            }
          >
            <span>供应商</span>
            <input
              type="text"
              value={form.supplierName}
              onChange={(e) => onChange({ supplierName: e.target.value })}
              placeholder="上次下单供应商"
              readOnly={readOnly}
            />
          </label>
          <label
            className={
              readOnly
                ? 'procurement-po-row__field procurement-po-row__field--readonly'
                : 'procurement-po-row__field'
            }
          >
            <span>采购价格（元）</span>
            <input
              type="number"
              value={form.price}
              onChange={(e) => onChange({ price: e.target.value })}
              min={1}
              readOnly={readOnly}
            />
          </label>
          <label
            className={
              readOnly
                ? 'procurement-po-row__field procurement-po-row__field--readonly'
                : 'procurement-po-row__field'
            }
          >
            <span>预计交货日期</span>
            <input
              type="date"
              value={form.eta.slice(0, 10)}
              onChange={(e) => onChange({ eta: e.target.value })}
              readOnly={readOnly}
            />
          </label>
          <div className="procurement-po-row__field">
            <span>配送方式</span>
            <div className="procurement-po-row__delivery">
              {(['warehouse', 'direct'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={
                    form.deliveryMethod === m
                      ? 'procurement-po-row__opt procurement-po-row__opt--on'
                      : 'procurement-po-row__opt'
                  }
                  onClick={() => !readOnly && onChange({ deliveryMethod: m })}
                  disabled={readOnly}
                >
                  {DELIVERY_METHOD_LABEL[m]}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
