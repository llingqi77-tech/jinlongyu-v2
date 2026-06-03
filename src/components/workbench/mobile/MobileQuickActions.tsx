import { sendMobileAgentMessage } from '../../../utils/mobileAgentDialogue'
import { getMobileQuickActions, type MobileQuickActionItem } from '../../../utils/mobileQuickActions'
import { useShortageStore } from '../../../store/shortageStore'
import type { ProcurementListSort } from '../../../utils/shortageAggregations'

function isQuickActionActive(
  action: MobileQuickActionItem,
  procurementListSort: ProcurementListSort
): boolean {
  if (action.kind === 'procurement_sort' && action.procurementSort) {
    return action.procurementSort === procurementListSort
  }
  return false
}

export function MobileQuickActions() {
  const role = useShortageStore((s) => s.role)
  const procurementListSort = useShortageStore((s) => s.procurementListSort) ?? 'delivery'
  const actions = getMobileQuickActions(role)

  return (
    <div className="mobile-quick-actions" role="group" aria-label="快捷操作">
      <div className="mobile-quick-actions__scroll">
        {actions.map((action) => {
          const active = role === 'procurement' && isQuickActionActive(action, procurementListSort)
          return (
          <button
            key={action.id}
            type="button"
            className={`mobile-quick-actions__chip${active ? ' mobile-quick-actions__chip--active' : ''}`}
            aria-pressed={action.kind === 'procurement_sort' ? active : undefined}
            onClick={() => {
              if (action.kind === 'procurement_sort' && action.procurementSort) {
                useShortageStore.getState().setProcurementListSort(action.procurementSort)
              } else if (action.kind === 'sales_hotel_overview') {
                useShortageStore.getState().openMobileSalesHotelOverview()
              } else if (action.kind === 'open_task_list') {
                useShortageStore.getState().openMobileTaskListSheet()
              } else if (action.kind === 'open_dashboard') {
                useShortageStore.getState().openMobileDashboardSheet()
              } else if (action.kind === 'open_kpi_detail' && action.kpiKind) {
                useShortageStore.getState().openMobileKpiDetailSheet(action.kpiKind)
              } else if (action.message) {
                sendMobileAgentMessage(action.message)
              }
            }}
          >
            {action.label}
          </button>
          )
        })}
      </div>
    </div>
  )
}
