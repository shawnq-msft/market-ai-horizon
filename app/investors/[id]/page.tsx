import Link from 'next/link'
import { notFound } from 'next/navigation'
import { investorFunds, investors } from '@/data/investors'
import { SmartMoneySensor } from '@/components/SmartMoneySensor'

export function generateStaticParams() {
  return investors.map((investor) => ({ id: investor.id }))
}

export default async function InvestorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const investor = investors.find((item) => item.id === id)
  if (!investor) notFound()
  const funds = investorFunds.filter((fund) => fund.investorId === id)
  return <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-8"><div className="mx-auto max-w-6xl space-y-5">
    <nav className="flex gap-5 text-sm text-cyan-300"><Link href="/investors">← 投资人目录</Link><Link href="/">产业链看板</Link></nav>
    <header className="rounded-3xl border border-cyan-900/60 bg-gradient-to-br from-cyan-950/50 to-slate-900 p-6"><p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{investor.organization}</p><h1 className="mt-2 text-3xl font-semibold">{investor.name}</h1><p className="mt-2 text-sm text-slate-400">{investor.nameZh} · {investor.role}</p><p className="mt-4 text-sm leading-6 text-slate-300">{investor.description}</p><p className="mt-3 text-xs leading-5 text-amber-200">{investor.coverageNote}</p><div className="mt-4 flex flex-wrap gap-4">{investor.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 hover:underline">{source.label} ↗</a>)}</div></header>
    <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5"><h2 className="text-lg font-semibold">关联基金与归属</h2>{funds.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{funds.map((fund) => <a key={fund.id} href={fund.sourceUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-800 bg-slate-950 p-3 hover:border-cyan-700"><h3 className="text-sm font-semibold text-violet-200">{fund.id}</h3><p className="mt-1 text-xs text-slate-300">{fund.name}</p><p className="mt-2 text-[11px] text-slate-500">{fund.relationship}</p><p className="mt-2 text-[11px] text-cyan-300">{fund.holdingsUrl ? '持仓快照 + 官方交易通知' : '仅交易通知；持仓暂未接入'}</p></a>)}</div> : <p className="mt-3 text-sm text-slate-400">关联基金持仓／交易源尚未接入，不据此推断该投资人无基金或无持仓。</p>}</section>
    <SmartMoneySensor investorId={id} />
  </div></main>
}