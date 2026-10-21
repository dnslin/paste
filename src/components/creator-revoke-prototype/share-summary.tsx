import { FileArchive, Code2 } from 'lucide-react'
import { examples, type Scenario, type ShareKind } from './model'

export function ShareSummary({ kind, scenario = 'current' }: { kind: ShareKind; scenario?: Scenario }) {
  const Icon = kind === 'file' ? FileArchive : Code2
  return <div className="space-y-3">
    <p className="flex items-start gap-2 text-sm font-medium [overflow-wrap:anywhere]"><Icon className="mt-0.5 size-4 shrink-0 text-(--text-secondary)" aria-hidden="true" />{examples[kind].name}</p>
    <p className="text-xs leading-6 text-(--text-secondary)">有效期：{scenario === 'expired' ? '2026/10/20 18:00（已过期）' : '2026/10/22 18:00（北京时间）'}<br />{scenario === 'expired' ? '领取已结束' : scenario === 'exhausted' ? `剩余 0 次${kind === 'text' ? '查看' : '下载'}机会` : examples[kind].limit} · 无密码</p>
  </div>
}
