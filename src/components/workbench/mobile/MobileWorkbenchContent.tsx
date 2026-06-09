import { useShortageStore } from '../../../store/shortageStore'
import { MobileAgentHome } from './MobileAgentHome'
import { MobileProcurementSkuPage } from './MobileProcurementSkuPage'
import { MobileRolePickScreen } from './MobileRolePickScreen'
import { MobileSalesHistoryPage } from './MobileSalesHistoryPage'

export function MobileWorkbenchContent() {
  const phase = useShortageStore((s) => s.mobileOnboardingPhase)
  const procurementActiveSku = useShortageStore((s) => s.procurementActiveSku)
  const salesHistoryOpen = useShortageStore((s) => s.salesHistoryOpen)
  const role = useShortageStore((s) => s.role)

  if (phase === 'role_pick') return <MobileRolePickScreen />
  if (role === 'sales' && salesHistoryOpen) return <MobileSalesHistoryPage />
  if (procurementActiveSku) return <MobileProcurementSkuPage sku={procurementActiveSku} />
  return <MobileAgentHome />
}
