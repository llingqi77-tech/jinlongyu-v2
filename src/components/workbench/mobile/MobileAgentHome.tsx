import { MobileAgentComposer } from './MobileAgentComposer'
import { MobileAgentThread } from './MobileAgentThread'
import { MobileDashboardSheet } from './MobileDashboardSheet'
import { MobileKpiDetailSheet } from './MobileKpiDetailSheet'
import { MobileQuickActions } from './MobileQuickActions'
import { MobileSalesHotelOverviewSheet } from './MobileSalesHotelOverviewSheet'
import { MobileTaskListSheet } from './MobileTaskListSheet'

export function MobileAgentHome() {
  return (
    <div className="mobile-chat-page">
      <MobileAgentThread />
      <footer className="mobile-chat-footer">
        <MobileQuickActions />
        <MobileAgentComposer />
      </footer>
      <MobileDashboardSheet />
      <MobileKpiDetailSheet />
      <MobileTaskListSheet />
      <MobileSalesHotelOverviewSheet />
    </div>
  )
}
