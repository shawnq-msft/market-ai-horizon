import { companies } from '@/data/companies.seed'
import { fetchStockHistory, historySymbol } from '@/lib/stock-history'

// GitHub Pages exports a real .json file for every known company. In server mode,
// paths are generated on demand and successful upstream requests revalidate.
export const dynamic = 'force-static'

const staticExport = process.env.GITHUB_ACTIONS === 'true' || process.env.STATIC_EXPORT === 'true'

export function generateStaticParams() {
  return staticExport ? companies.map((company) => ({ id: company.id })) : []
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const company = companies.find((item) => item.id === id)
  if (!company) return Response.json({ error: '公司不存在 / Company not found' }, { status: 404 })
  if (!historySymbol(company)) {
    return Response.json({ error: '未上市公司暂无公开交易 K 线 / No public trading history' }, { status: staticExport ? 200 : 422 })
  }
  try {
    return Response.json(await fetchStockHistory(company), {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=900' },
    })
  } catch {
    if (staticExport) console.warn(`[history] ${company.id}: provider unavailable; exporting explicit unavailable state`)
    return Response.json({ error: staticExport
      ? '本次部署未能获取该股票历史行情；请查看外部行情，或重新部署以刷新快照。'
      : '暂时无法获取历史行情，可能是数据源限流、网络故障或该股票无可用数据。请稍后重试。' }, {
      status: staticExport ? 200 : 502,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}