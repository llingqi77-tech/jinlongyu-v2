import { useMemo, useState, type ReactNode } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import type { SalesHotelDataPanelState, SalesHotelLineItem } from '../../../types/shortage'
import { groupByHotel } from '../../../utils/shortageAggregations'
import { formatSkuProductTitle } from '../../../utils/productDisplay'
import {
  SALES_HOTEL_CMD_PREFIX,
  splitSalesHotelLines,
  type SalesHotelChannel,
} from '../../../utils/mobileSalesHotelData'
import { formatSalesDeferLineDetail } from '../../../utils/salesNoticeDisplay'
import { sendSalesHotelPanelAction } from '../../../utils/mobileAgentDialogue'

type MobileSalesHotelDataPanelProps = {
  panel: SalesHotelDataPanelState
}

const CHANNEL_SECTIONS: {
  key: SalesHotelChannel
  label: string
  tone: 'pending' | 'defer' | 'urgent'
}[] = [
  { key: 'pending', label: '待处理', tone: 'pending' },
  { key: 'defer', label: '延期', tone: 'defer' },
  { key: 'urgent', label: '加急', tone: 'urgent' },
]

function formatHotelPanelLineDetail(line: SalesHotelLineItem, tone: SalesHotelChannel): ReactNode {
  const delivery = line.requiredDeliveryDate.slice(5)
  if (tone === 'defer') {
    const deferDetail = formatSalesDeferLineDetail(line)
    return (
      <>
        缺 {line.gap}
        {line.unit} · 交期 {deferDetail.deliveryLabel}，采购预计{' '}
        <span
          className={deferDetail.etaLate ? 'mobile-sales-hotel-panel__eta--late' : undefined}
        >
          {deferDetail.etaLabel}
        </span>{' '}
        到货
      </>
    )
  }
  if (tone === 'urgent' && line.eta?.trim()) {
    return (
      <>
        缺 {line.gap}
        {line.unit} · 交期 {delivery} · 采购预计 {line.eta.slice(5)} 到货
      </>
    )
  }
  return (
    <>
      缺 {line.gap}
      {line.unit} · 交期 {delivery}
    </>
  )
}

function HotelLineItem({ line, tone }: { line: SalesHotelLineItem; tone: SalesHotelChannel }) {
  return (
    <li className="mobile-sales-hotel-panel__line">
      <div className="mobile-sales-hotel-panel__line-head">
        <strong>{formatSkuProductTitle(line.productName, line.spec)}</strong>
      </div>
      <span className="mobile-sales-hotel-panel__line-detail">
        {formatHotelPanelLineDetail(line, tone)}
      </span>
    </li>
  )
}

function HotelChannelSection({
  label,
  lines,
  tone,
}: {
  label: string
  lines: SalesHotelLineItem[]
  tone: 'pending' | 'defer' | 'urgent'
}) {
  if (lines.length === 0) return null
  return (
    <section
      className={`mobile-sales-hotel-panel__section mobile-sales-hotel-panel__section--${tone}`}
    >
      <h3 className="mobile-sales-hotel-panel__section-title">
        {label}
        <span className="mobile-sales-hotel-panel__section-count">{lines.length}</span>
      </h3>
      <ul className="mobile-sales-hotel-panel__line-list">
        {lines.map((line) => (
          <HotelLineItem key={line.lineId} line={line} tone={tone} />
        ))}
      </ul>
    </section>
  )
}

function HotelInlineExpand({ hotelKey }: { hotelKey: string }) {
  const orders = useShortageStore((s) => s.orders)
  const group = useMemo(
    () => groupByHotel(orders).find((g) => g.hotelKey === hotelKey) ?? null,
    [orders, hotelKey]
  )

  if (!group) return null

  const { pendingLines, deferLines, urgentLines } = splitSalesHotelLines(group)
  const linesByChannel: Record<SalesHotelChannel, SalesHotelLineItem[]> = {
    pending: pendingLines,
    defer: deferLines,
    urgent: urgentLines,
  }

  return (
    <div className="mobile-sales-hotel-panel__expand">
      {CHANNEL_SECTIONS.map((section) => (
        <HotelChannelSection
          key={section.key}
          label={section.label}
          lines={linesByChannel[section.key]}
          tone={section.tone}
        />
      ))}
    </div>
  )
}

function SalesHotelOverviewPanel({
  panel,
}: {
  panel: Extract<SalesHotelDataPanelState, { level: 'overview' }>
}) {
  const [expandedHotelKey, setExpandedHotelKey] = useState<string | null>(null)

  const toggleHotel = (hotelKey: string) => {
    setExpandedHotelKey((prev) => (prev === hotelKey ? null : hotelKey))
  }

  return (
    <div className="mobile-sales-hotel-panel" role="group" aria-label="按酒店数据总览">
      <div className="mobile-sales-hotel-panel__stats" aria-label="今日缺货概览">
        <div className="mobile-sales-hotel-panel__stat">
          <span className="mobile-sales-hotel-panel__stat-value">{panel.skuCount}</span>
          <span className="mobile-sales-hotel-panel__stat-label">今日缺货品</span>
        </div>
        <div className="mobile-sales-hotel-panel__stat">
          <span className="mobile-sales-hotel-panel__stat-value">{panel.hotelCount}</span>
          <span className="mobile-sales-hotel-panel__stat-label">涉及酒店</span>
        </div>
      </div>
      {panel.hotels.length === 0 ? (
        <p className="mobile-sales-hotel-panel__empty">今日暂无缺货记录。</p>
      ) : (
        <ul className="mobile-sales-hotel-panel__list">
          {panel.hotels.map((row) => {
            const isOpen = expandedHotelKey === row.hotelKey
            return (
              <li
                key={row.hotelKey}
                className={`mobile-sales-hotel-panel__item${isOpen ? ' mobile-sales-hotel-panel__item--open' : ''}`}
              >
                <button
                  type="button"
                  className={`mobile-sales-hotel-panel__row${isOpen ? ' mobile-sales-hotel-panel__row--open' : ''}`}
                  aria-expanded={isOpen}
                  onClick={() => toggleHotel(row.hotelKey)}
                >
                  <span className="mobile-sales-hotel-panel__row-text">
                    <span className="mobile-sales-hotel-panel__row-label">{row.hotelName}</span>
                    <span className="mobile-sales-hotel-panel__row-addr">{row.deliveryAddress}</span>
                    <span className="mobile-sales-hotel-panel__row-meta">
                      {row.pendingCount > 0 ? <span>{row.pendingCount} 待处理</span> : null}
                      {row.deferCount > 0 ? (
                        <span className="mobile-sales-hotel-panel__row-meta--defer">
                          {row.deferCount} 延期
                        </span>
                      ) : null}
                      {row.urgentCount > 0 ? <span>{row.urgentCount} 加急</span> : null}
                    </span>
                  </span>
                  <span
                    className={`mobile-sales-hotel-panel__chevron${isOpen ? ' mobile-sales-hotel-panel__chevron--open' : ''}`}
                    aria-hidden
                  >
                    ›
                  </span>
                </button>
                {isOpen ? <HotelInlineExpand hotelKey={row.hotelKey} /> : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function MobileSalesHotelDataPanel({ panel }: MobileSalesHotelDataPanelProps) {
  if (panel.level === 'overview') {
    return <SalesHotelOverviewPanel panel={panel} />
  }

  const linesByChannel: Record<SalesHotelChannel, SalesHotelLineItem[]> = {
    pending: panel.pendingLines,
    defer: panel.deferLines,
    urgent: panel.urgentLines,
  }

  return (
    <div className="mobile-sales-hotel-panel" role="group" aria-label={`${panel.hotelName}缺货明细`}>
      <button
        type="button"
        className="mobile-sales-hotel-panel__back"
        onClick={() => sendSalesHotelPanelAction('返回酒店列表', `${SALES_HOTEL_CMD_PREFIX}back`)}
      >
        ‹ 返回酒店列表
      </button>
      <header className="mobile-sales-hotel-panel__hotel-head">
        <h3 className="mobile-sales-hotel-panel__hotel-title">{panel.hotelName}</h3>
        <p className="mobile-sales-hotel-panel__hotel-addr">{panel.deliveryAddress}</p>
      </header>
      {CHANNEL_SECTIONS.map((section) => (
        <HotelChannelSection
          key={section.key}
          label={section.label}
          lines={linesByChannel[section.key]}
          tone={section.tone}
        />
      ))}
    </div>
  )
}
