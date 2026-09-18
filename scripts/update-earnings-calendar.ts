import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import { companies } from '../data/companies.seed'
import { updateSeedProperties } from './seed-source'

export function parseEarningsDate(payload: unknown, today: string) {
  const data = (payload as { data?: { reportText?: string; announcement?: string } } | null)?.data
  if (typeof data?.reportText !== 'string') return undefined
  const match = data.reportText.match(/(?:report earnings on|report earnings for)\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i)
  if (!match) return undefined
  const date = `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`
  const parsed = new Date(`${date}T00:00:00Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < today) return undefined
  return { date, confirmed: false }
}

async function main() {
  const today = new Date().toISOString().slice(0, 10)
  const sourcePath = fileURLToPath(new URL('../data/companies.seed.ts', import.meta.url))
  let source = await readFile(sourcePath, 'utf8')
  let refreshed = 0
  let expired = 0
  const failures: string[] = []
  for (const company of companies) {
    if (company.nextEarningsDate && company.nextEarningsDate < today) {
      source = updateSeedProperties(source, company.id, { earnings: undefined, earningsConfirmed: 'false' })
      expired += 1
    }
    if (!company.listed || company.market !== 'US' || !company.ticker) continue
    const symbol = company.ticker.split('/')[0].trim()
    const url = `https://api.nasdaq.com/api/analyst/${encodeURIComponent(symbol)}/earnings-date`
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { 'user-agent': 'Mozilla/5.0', accept: 'application/json' } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const earnings = parseEarningsDate(await response.json(), today)
      if (!earnings) throw new Error('No usable upcoming date')
      source = updateSeedProperties(source, company.id, {
        earnings: JSON.stringify(earnings.date), earningsConfirmed: 'false',
        earningsSourceUrl: JSON.stringify(url), earningsUpdatedAt: JSON.stringify(today),
      })
      refreshed += 1
    } catch (error) {
      failures.push(`${company.id}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  await writeFile(sourcePath, source)
  console.log(`Earnings: ${refreshed} upcoming US dates refreshed (unconfirmed estimates); ${expired} expired next dates cleared.`)
  console.log('Other markets require verified calendar sources. Existing future dates are preserved on failure.')
  for (const failure of failures) console.log(`Skipped ${failure}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
