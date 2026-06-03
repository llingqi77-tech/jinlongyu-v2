import { useShortageStore } from '../../../store/shortageStore'
import { MobileAgentHome } from './MobileAgentHome'
import { MobileProcurementSkuPage } from './MobileProcurementSkuPage'
import { MobileRolePickScreen } from './MobileRolePickScreen'

export function MobileWorkbenchContent() {
  const phase = useShortageStore((s) => s.mobileOnboardingPhase)
  const procurementActiveSku = useShortageStore((s) => s.procurementActiveSku)

  if (phase === 'role_pick') return <MobileRolePickScreen />
  if (procurementActiveSku) return <MobileProcurementSkuPage sku={procurementActiveSku} />
  return <MobileAgentHome />
}
