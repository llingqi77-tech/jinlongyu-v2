import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import type { SalesSkuUpdateBatch, SalesSkuUpdateHotelGroup } from '../../../types/shortage'
import {
  groupSalesProcurementUpdates,
  groupSalesUpdateBatchByHotel,
} from '../../../utils/shortageAggregations'
import {
  formatSalesNotifiedTime,
  salesLineBadge,
  salesLineDetail,
} from '../../../utils/salesNoticeDisplay'

function skuUpdateStats(batch: SalesSkuUpdateBatch): string {
  let deferCount = 0
  let urgentCount = 0
  for (const row of batch.hotels) {
    const badge = salesLineBadge(row)
    if (badge.label === '延期') deferCount += 1
    else if (badge.label === '加急') urgentCount += 1
  }
  const parts: string[] = [`${batch.hotelCount} 家酒店`, `${batch.lineCount} 个 PO`]
  if (deferCount > 0) parts.push(`${deferCount} 延期`)
  if (urgentCount > 0) parts.push(`${urgentCount} 加急`)
  return parts.join(' · ')
}

function SalesSkuUpdateHotelCard({
  group,
  productName,
}: {
  group: SalesSkuUpdateHotelGroup
  productName: string
}) {
  return (
    <article className="sales-sku-update-hotel-card">
      <header className="sales-defer-card__head">
        <span className="sales-defer-card__head-text">
          <span className="sales-defer-card__title">{group.hotelName}</span>
          <span className="sales-defer-card__addr">{group.deliveryAddress}</span>
        </span>
      </header>
      <ul className="sales-defer-card__lines">
        {group.rows.map((row) => {
          const rowBadge = salesLineBadge(row)
          return (
            <li key={row.lineId}>
              <div className="sales-defer-card__line-head">
                <strong>{productName}</strong>
                <span className={rowBadge.className}>{rowBadge.label}</span>
              </div>
              <span className="sales-defer-card__line-detail">
                缺 {row.gap}
                {row.unit} · {salesLineDetail(row)}
              </span>
            </li>
          )
        })}
      </ul>
    </article>
  )
}

function SalesSkuUpdateCard({ batch }: { batch: SalesSkuUpdateBatch }) {
  const hotelGroups = useMemo(() => groupSalesUpdateBatchByHotel(batch), [batch])
  const timeLabel = formatSalesNotifiedTime(batch.notifiedAt)
  const trackRef = useRef<HTMLDivElement>(null)
  const [hotelIndex, setHotelIndex] = useState(0)

  const syncHotelIndex = useCallback(() => {
    const track = trackRef.current
    if (!track || hotelGroups.length === 0) return
    const width = track.clientWidth
    if (width <= 0) return
    const next = Math.round(track.scrollLeft / width)
    setHotelIndex(Math.min(Math.max(next, 0), hotelGroups.length - 1))
  }, [hotelGroups.length])

  useEffect(() => {
    setHotelIndex(0)
    trackRef.current?.scrollTo({ left: 0, behavior: 'auto' })
  }, [batch.batchKey])

  const useHotelCarousel = hotelGroups.length > 1
  const safeHotelIndex = Math.min(hotelIndex, Math.max(hotelGroups.length - 1, 0))

  return (
    <article className="sales-sku-update-card">
      <header className="sales-sku-update-card__head">
        {timeLabel ? (
          <p className="sales-sku-update-card__time">采购更新于 {timeLabel}</p>
        ) : null}
        <p className="sales-sku-update-card__summary">{skuUpdateStats(batch)}</p>
      </header>

      {hotelGroups.length === 0 ? (
        <p className="mobile-shortage-home__empty">暂无关联酒店。</p>
      ) : useHotelCarousel ? (
        <>
          <div
            ref={trackRef}
            className="sales-defer-carousel sales-sku-update-card__carousel"
            role="region"
            aria-roledescription="carousel"
            aria-label={`${batch.productName} 各酒店处理结果`}
            onScroll={syncHotelIndex}
          >
            {hotelGroups.map((g) => (
              <div key={g.hotelKey} className="sales-defer-carousel__slide">
                <SalesSkuUpdateHotelCard group={g} productName={batch.productName} />
              </div>
            ))}
          </div>
          <div className="sales-defer-carousel__dots" aria-hidden>
            {hotelGroups.map((g, i) => (
              <span
                key={g.hotelKey}
                className={`sales-defer-carousel__dot${i === safeHotelIndex ? ' sales-defer-carousel__dot--active' : ''}`}
              />
            ))}
          </div>
        </>
      ) : (
        <SalesSkuUpdateHotelCard group={hotelGroups[0]} productName={batch.productName} />
      )}
    </article>
  )
}

/** 销售首页：每次仅展示最新一条品项更新，品项内酒店左右滑动 */
export function MobileSalesDeferNoticeList() {
  const orders = useShortageStore((s) => s.orders)
  const batches = useMemo(() => groupSalesProcurementUpdates(orders), [orders])
  const batch = batches[0]

  if (!batch) {
    return (
      <p className="mobile-shortage-home__empty">
        暂无采购更新通知。采购处理品项后，将按品项推送关联酒店；可点「按酒店数据总览」查看全部缺货。
      </p>
    )
  }

  const hotelCount = batch.hotelCount
  const panelHint =
    hotelCount > 1 ? `${hotelCount} 家酒店 · 左右滑动切换客户` : ''

  return (
    <div className="sales-sku-update-panel">
      <p className="sales-sku-update-panel__summary">
        本次更新 · {batch.productName}
        {panelHint ? <span className="sales-sku-update-panel__hint">{panelHint}</span> : null}
      </p>
      <SalesSkuUpdateCard batch={batch} />
    </div>
  )
}
