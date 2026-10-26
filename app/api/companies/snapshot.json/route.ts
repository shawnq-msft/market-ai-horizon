import { companies } from '@/data/companies.seed'
import { marketSnapshot } from '@/lib/market-snapshot'

export const dynamic = 'force-static'

export function GET() {
  return Response.json(marketSnapshot(companies))
}
