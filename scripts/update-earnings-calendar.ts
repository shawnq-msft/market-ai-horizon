import { companies } from '../data/companies.seed'

async function main() {
  const listed = companies.filter((company) => company.listed)
  console.log(`Earnings calendar update scaffold: ${listed.length} listed companies loaded.`)
  console.log('TODO: connect earnings calendar provider and company IR verification.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
