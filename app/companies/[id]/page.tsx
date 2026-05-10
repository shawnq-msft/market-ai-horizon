import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CompanyDetailPanel } from '@/components/CompanyDetailPanel'
import { companies } from '@/data/companies.seed'
import { getCompanyById } from '@/lib/filters'

export function generateStaticParams() {
  return companies.map((company) => ({ id: company.id }))
}

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const company = getCompanyById(id)

  if (!company) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <Link className="text-sky-300" href="/">返回首页</Link>
        <h1 className="mt-6 text-2xl font-semibold">Company not found</h1>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a,#020617_45%)] px-4 py-5 text-slate-100 md:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <Link className="inline-flex items-center gap-2 text-sm text-sky-300 hover:text-sky-200" href="/">
          <ArrowLeft className="h-4 w-4" /> 返回产业链全景图
        </Link>
        <CompanyDetailPanel company={company} />
      </div>
    </main>
  )
}
