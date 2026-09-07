import { fetchInvestorDataset } from '@/lib/investor-provider'

export const dynamic = 'force-static'
export const revalidate = 3600

export async function GET() {
  return Response.json(await fetchInvestorDataset())
}