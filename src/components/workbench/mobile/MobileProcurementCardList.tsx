import { useMemo, useState } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import {
  getPendingProcurementGroups,
  getProcurementSkuOaBucket,
  getProcurementSkuOaLabel,
  sortProcurementSkuGroups,
  type ProcurementListSort,
  type ProcurementSkuOaBucket,
} from '../../../utils/shortageAggregations'
import type { ProcurementSkuGroup } from '../../../types/shortage'

const OA_TABS: { id: ProcurementSkuOaBucket; label: string }[] = [
  { id: 'none', label: '新任务' },
  { id: 'rejected', label: '已驳回' },
  { id: 'pending', label: '审批中' },
  { id: 'approved', label: '已通过' },
]

export function MobileProcurementCardList() {
  const orders = useShortageStore((s) => s.orders)
  const sort = useShortageStore((s) => s.procurementListSort) ?? 'delivery'
  const openProcurementSkuPage = useShortageStore((s) => s.openProcurementSkuPage)
  const [oaTab, setOaTab] = useState<ProcurementSkuOaBucket>('none')

  const sortByOa = sort === 'oa'

  const groups = useMemo(() => {
    const pending = getPendingProcurementGroups(orders)
    const list = sortByOa
      ? pending.filter((g) => getProcurementSkuOaBucket(g, orders) === oaTab)
      : pending
    return sortProcurementSkuGroups(list, orders, sort)
  }, [orders, sort, oaTab, sortByOa])

  const activeTabLabel = OA_TABS.find((t) => t.id === oaTab)?.label ?? ''

  return (
    <section className="mobile-task-list-section" aria-label="任务清单">
      <h2 className="mobile-task-list-section__title">任务清单</h2>
      {sortByOa ? (
        <div className="mobile-task-list-section__tabs" role="tablist" aria-label="OA 状态">
          {OA_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={oaTab === tab.id}
              className={`mobile-task-list-section__tab${oaTab === tab.id ? ' mobile-task-list-section__tab--active' : ''}`}
              onClick={() => setOaTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}
      {groups.length === 0 ? (
        <p className="mobile-shortage-home__empty">
          {sortByOa ? `${activeTabLabel}暂无待处理品项。` : '今日暂无待处理缺货品项。'}
        </p>
      ) : (
        <ol className="mobile-home-task-list">
          {groups.map((g, index) => (
            <ProcurementTaskListItem
              key={g.sku}
              group={g}
              index={index}
              sort={sort}
              orders={orders}
              onOpen={() => openProcurementSkuPage(g.sku)}
            />
          ))}
        </ol>
      )}
    </section>
  )
}

function ProcurementTaskListItem({
  group,
  index,
  sort,
  orders,
  onOpen,
}: {
  group: ProcurementSkuGroup
  index: number
  sort: ProcurementListSort
  orders: ReturnType<typeof useShortageStore.getState>['orders']
  onOpen: () => void
}) {
  const deliveryDate = group.earliestRequiredDate.slice(5)
  const oaBucket = sort === 'oa' ? getProcurementSkuOaBucket(group, orders) : null
  const oaLabel = oaBucket != null ? getProcurementSkuOaLabel(oaBucket) : null

  return (
    <li>
      <button
        type="button"
        className="mobile-home-task-list__item mobile-home-task-list__item--urgent"
        onClick={onOpen}
      >
        <span className="mobile-home-task-list__index" aria-hidden>
          {index + 1}
        </span>
        <span className="mobile-home-task-list__body">
          <span className="mobile-home-task-list__title">{group.productName}</span>
          <span className="mobile-home-task-list__sub">
            {group.spec} · 共缺 {group.totalGap}
            {group.unit} · {group.lineCount} 个 PO
            {sort === 'oa' ? ` · 最早交期 ${deliveryDate}` : ''}
          </span>
          {sort === 'delivery' ? (
            <span className="mobile-home-task-list__delivery" aria-label={`最早交期 ${deliveryDate}`}>
              最早交期 <span className="mobile-home-task-list__delivery-date">{deliveryDate}</span>
            </span>
          ) : null}
          {oaLabel && oaBucket ? (
            <span
              className={`mobile-home-task-list__oa mobile-home-task-list__oa--${oaBucket}`}
              aria-label={oaLabel}
            >
              {oaLabel}
            </span>
          ) : null}
        </span>
        <span className="mobile-home-task-list__chevron" aria-hidden>
          ›
        </span>
      </button>
    </li>
  )
}
