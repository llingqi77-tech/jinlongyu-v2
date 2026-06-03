import { useShortageStore } from '../../../store/shortageStore'
import { MobileProcurementCardList } from './MobileProcurementCardList'
import { MobileSalesDeferNoticeList } from './MobileSalesDeferNoticeList'
import { MobileHomeKpiStrip } from './MobileHomeKpiStrip'

export function MobileShortageHome() {
  const role = useShortageStore((s) => s.role)

  return (
    <div className="mobile-shortage-home">
      {role === 'ops' ? <MobileHomeKpiStrip /> : null}
      {role === 'procurement' ? <MobileProcurementCardList /> : null}
      {role === 'sales' ? <MobileSalesDeferNoticeList /> : null}
      {role === 'ops' ? (
        <p className="mobile-shortage-home__ops-hint">
          运营可点击「缺货品履约数据」查看缺货处理进度，或继续在对话中查询。
        </p>
      ) : null}
    </div>
  )
}
