import { companies } from '../data/companies.seed'

async function main() {
  const exposures = companies.reduce((sum, company) => sum + company.themeExposures.length, 0)
  console.log(`Theme classification scaffold: ${companies.length} companies and ${exposures} exposures loaded.`)
  console.log('TODO: refresh theme relevance, purity, risk flags, and private-company mappings from verified sources.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
