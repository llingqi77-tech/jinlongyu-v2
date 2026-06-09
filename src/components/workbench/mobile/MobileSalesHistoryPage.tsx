import { useMemo, useState } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import type { HistoryOrder, HistoryOrderFilter } from '../../../types/shortage'
import { formatSkuProductTitle } from '../../../utils/productDisplay'
import {
  HISTORY_KIND_LABEL,
  HISTORY_STATUS_LABEL,
  filterHistoryOrders,
  getDefaultHistoryFilter,
  getHistoryCities,
  getHistoryHotels,
  getHistoryOrderStatus,
  summarizeHistoryOrders,
} from '../../../utils/salesHistory'

function HistoryOrderCard({ order }: { order: HistoryOrder }) {
  const status = getHistoryOrderStatus(order)
  const signedCount = order.lines.filter((l) => l.signed).length
  return (
    <li className="sales-history-card">
      <div className="sales-history-card__head">
        <div className="sales-history-card__title-wrap">
          <span className="sales-history-card__hotel">{order.hotelName}</span>
        </div>
        <span className={`sales-history-card__status sales-history-card__status--${status}`}>
          {HISTORY_STATUS_LABEL[status]}
        </span>
      </div>
      <div className="sales-history-card__meta">
        <span>收货日期 {order.deliveryDate.slice(5)}</span>
        <span>·</span>
        <span>
          {order.lines.length} 个品 · 已签收 {signedCount}/{order.lines.length}
        </span>
      </div>
      <ul className="sales-history-card__lines">
        {order.lines.map((line, i) => (
          <li key={`${order.id}-${line.sku}-${i}`} className="sales-history-card__line">
            <span className="sales-history-card__line-name">
              {formatSkuProductTitle(line.productName, line.spec)}
            </span>
            <span className="sales-history-card__line-meta">
              {line.qty}
              {line.unit}
              <span className={`sales-history-card__tag sales-history-card__tag--${line.kind}`}>
                {HISTORY_KIND_LABEL[line.kind]}
              </span>
              <span
                className={`sales-history-card__sign${line.signed ? ' sales-history-card__sign--done' : ''}`}
              >
                {line.signed ? '已签收' : '未签收'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </li>
  )
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

const pad2 = (n: number) => String(n).padStart(2, '0')
const toDateKey = (y: number, m: number, d: number) => `${y}-${pad2(m + 1)}-${pad2(d)}`

function buildMonths(monthsBack: number) {
  const today = new Date()
  const list: { year: number; month: number }[] = []
  for (let i = monthsBack; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    list.push({ year: d.getFullYear(), month: d.getMonth() })
  }
  return list
}

function SalesHistoryDatePicker({
  start,
  end,
  onClose,
  onConfirm,
}: {
  start: string
  end: string
  onClose: () => void
  onConfirm: (start: string, end: string) => void
}) {
  const [draftStart, setDraftStart] = useState(start)
  const [draftEnd, setDraftEnd] = useState(end)
  const months = useMemo(() => buildMonths(11), [])
  const todayKey = useMemo(() => {
    const t = new Date()
    return toDateKey(t.getFullYear(), t.getMonth(), t.getDate())
  }, [])

  const handleDayTap = (key: string) => {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(key)
      setDraftEnd('')
    } else if (key < draftStart) {
      setDraftStart(key)
    } else {
      setDraftEnd(key)
    }
  }

  return (
    <div className="sales-date-picker" role="dialog" aria-modal="true" aria-label="选择日期段">
      <button type="button" className="sales-date-picker__scrim" aria-label="关闭" onClick={onClose} />
      <div className="sales-date-picker__sheet">
        <header className="sales-date-picker__header">
          <span className="sales-date-picker__title">选择日期</span>
          <button type="button" className="sales-date-picker__close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>

        <div className="sales-date-picker__weekdays">
          {WEEKDAY_LABELS.map((label, i) => (
            <span
              key={label}
              className={`sales-date-picker__weekday${i === 0 || i === 6 ? ' sales-date-picker__weekday--weekend' : ''}`}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="sales-date-picker__scroll">
          {months.map(({ year, month }) => {
            const firstWeekday = new Date(year, month, 1).getDay()
            const daysInMonth = new Date(year, month + 1, 0).getDate()
            const cells: (number | null)[] = []
            for (let i = 0; i < firstWeekday; i++) cells.push(null)
            for (let d = 1; d <= daysInMonth; d++) cells.push(d)

            return (
              <section key={`${year}-${month}`} className="sales-date-picker__month">
                <h3 className="sales-date-picker__month-title">
                  {year}年{month + 1}月
                </h3>
                <div className="sales-date-picker__grid">
                  {cells.map((day, idx) => {
                    if (day == null) {
                      return <span key={`blank-${idx}`} className="sales-date-picker__cell" />
                    }
                    const key = toDateKey(year, month, day)
                    const isStart = key === draftStart
                    const isEnd = key === draftEnd
                    const inRange =
                      Boolean(draftStart && draftEnd) && key > draftStart && key < draftEnd
                    const isFuture = key > todayKey
                    const classNames = ['sales-date-picker__cell', 'sales-date-picker__day']
                    if (isStart) classNames.push('sales-date-picker__day--start')
                    if (isEnd) classNames.push('sales-date-picker__day--end')
                    if (inRange) classNames.push('sales-date-picker__day--in-range')
                    if (isFuture) classNames.push('sales-date-picker__day--disabled')
                    return (
                      <button
                        key={key}
                        type="button"
                        className={classNames.join(' ')}
                        disabled={isFuture}
                        onClick={() => handleDayTap(key)}
                      >
                        <span className="sales-date-picker__day-num">{day}</span>
                        {isStart ? <span className="sales-date-picker__day-tag">起</span> : null}
                        {isEnd ? <span className="sales-date-picker__day-tag">止</span> : null}
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>

        <footer className="sales-date-picker__footer">
          <div className="sales-date-picker__summary">
            <span>起 {draftStart ? draftStart.slice(5) : '--'}</span>
            <span>止 {draftEnd ? draftEnd.slice(5) : '--'}</span>
          </div>
          <button
            type="button"
            className="sales-date-picker__confirm"
            onClick={() => onConfirm(draftStart, draftEnd)}
          >
            确定
          </button>
        </footer>
      </div>
    </div>
  )
}

export function MobileSalesHistoryPage() {
  const closeSalesHistory = useShortageStore((s) => s.closeSalesHistory)
  const [filter, setFilter] = useState<HistoryOrderFilter>(getDefaultHistoryFilter)
  const [dateOpen, setDateOpen] = useState(false)

  const cities = useMemo(() => getHistoryCities(), [])
  const hotels = useMemo(() => getHistoryHotels(filter.city), [filter.city])

  const orders = useMemo(() => filterHistoryOrders(filter), [filter])
  const summary = useMemo(() => summarizeHistoryOrders(orders), [orders])

  const patch = (next: Partial<HistoryOrderFilter>) => setFilter((prev) => ({ ...prev, ...next }))

  const hasDateFilter = Boolean(filter.start || filter.end)
  const dateChipLabel = hasDateFilter
    ? `${filter.start ? filter.start.slice(5) : '起始'} ~ ${filter.end ? filter.end.slice(5) : '至今'}`
    : '收货日期'

  return (
    <div className="mobile-procurement-page">
      <header className="mobile-procurement-page__header">
        <button
          type="button"
          className="mobile-workbench-header__back"
          onClick={closeSalesHistory}
          aria-label="返回"
        >
          ‹
        </button>
        <div className="mobile-procurement-page__head-text">
          <h1 className="mobile-procurement-page__title">历史订单查询</h1>
          <p className="mobile-procurement-page__meta">按城市 / 酒店 / 收货日期查看履约情况</p>
        </div>
      </header>

      <div className="mobile-procurement-page__body">
        <section className="sales-history-filters" aria-label="筛选条件">
          <div className="sales-history-filters__row">
            <select
              className="sales-history-city-select"
              value={filter.city ?? ''}
              onChange={(e) => patch({ city: e.target.value || null, hotel: null })}
              aria-label="城市"
            >
              <option value="">全部城市</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={`sales-history-chip sales-history-chip--date${
                hasDateFilter || dateOpen ? ' sales-history-chip--active' : ''
              }`}
              onClick={() => setDateOpen((v) => !v)}
              aria-expanded={dateOpen}
            >
              <span aria-hidden>📅</span>
              {dateChipLabel}
            </button>
          </div>

          {filter.city !== null ? (
            <label className="sales-history-field">
              <span>酒店</span>
              <select
                value={filter.hotel ?? ''}
                onChange={(e) => patch({ hotel: e.target.value || null })}
              >
                <option value="">全部酒店</option>
                {hotels.map((hotel) => (
                  <option key={hotel} value={hotel}>
                    {hotel}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

        </section>

        <section className="sales-history-summary" aria-label="统计">
          <div className="sales-history-summary__item">
            <strong>{summary.lineCount}</strong>
            <span>缺货行</span>
          </div>
          <div className="sales-history-summary__item">
            <strong>{summary.signedLineCount}</strong>
            <span>已履约</span>
          </div>
          <div className="sales-history-summary__item">
            <strong>{summary.fulfillRate}%</strong>
            <span>履约完成率</span>
          </div>
        </section>

        {orders.length === 0 ? (
          <p className="sales-history-empty">该筛选条件下暂无历史订单。</p>
        ) : (
          <ul className="sales-history-list">
            {orders.map((order) => (
              <HistoryOrderCard key={order.id} order={order} />
            ))}
          </ul>
        )}
      </div>

      {dateOpen ? (
        <SalesHistoryDatePicker
          start={filter.start}
          end={filter.end}
          onClose={() => setDateOpen(false)}
          onConfirm={(start, end) => {
            patch({ start, end })
            setDateOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}
