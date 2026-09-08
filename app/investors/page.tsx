import Link from 'next/link'
import { investors } from '@/data/investors'
import { SmartMoneySensor } from '@/components/SmartMoneySensor'

export default function InvestorsPage() {
  return <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-8"><div className="mx-auto max-w-6xl space-y-5">
    <Link href="/" className="text-sm text-cyan-300">← 返回产业链全景图</Link>
    <header className="py-4"><p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Smart Money Sensor</p><h1 className="mt-2 text-3xl font-semibold">投资人与机构</h1><p className="mt-3 text-sm text-slate-400">追踪公开观点、账户买卖及披露持仓。个人、家庭、基金与公司分别归属；人工核实快照不代表完整或实时组合。</p></header>
    <div className="grid gap-4 md:grid-cols-2">{investors.map((investor) => <Link key={investor.id} href={`/investors/${investor.id}`} className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-cyan-950/30 p-5 transition hover:border-cyan-600"><p className="text-xs text-cyan-300">{investor.organization}</p><h2 className="mt-2 text-xl font-semibold">{investor.name} <span className="text-sm text-slate-400">{investor.nameZh}</span></h2><p className="mt-1 text-xs text-slate-500">{investor.role}</p><p className="mt-4 text-sm leading-6 text-slate-300">{investor.description}</p><p className="mt-3 text-xs leading-5 text-amber-200/80">{investor.coverageNote}</p><span className="mt-4 inline-block text-xs text-cyan-300">查看发言、基金交易与持仓 →</span></Link>)}</div>
    <SmartMoneySensor />
  </div></main>
}