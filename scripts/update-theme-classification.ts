import { companies } from '../data/companies.seed'
import { layers } from '../data/layers'

async function main() {
  const exposures = companies.reduce((sum, company) => sum + company.themeExposures.length, 0)
  const themes = new Map(layers.flatMap((layer) => layer.themes.map((theme) => [theme.id, layer.id] as const)))
  const errors: string[] = []
  if (new Set(companies.map((company) => company.id)).size !== companies.length) errors.push('Duplicate company IDs')
  for (const company of companies) {
    const ids = new Set<string>()
    for (const exposure of company.themeExposures) {
      if (themes.get(exposure.themeId) !== exposure.layerId) errors.push(`${company.id}: invalid theme/layer ${exposure.themeId}`)
      if (ids.has(exposure.themeId)) errors.push(`${company.id}: duplicate theme ${exposure.themeId}`)
      ids.add(exposure.themeId)
      if (!Number.isFinite(exposure.relevance) || exposure.relevance < 0 || exposure.relevance > 5) errors.push(`${company.id}: invalid relevance`)
      if (!Number.isFinite(exposure.purity) || exposure.purity < 0 || exposure.purity > 100) errors.push(`${company.id}: invalid purity`)
    }
  }
  if (errors.length) throw new Error(errors.join('\n'))
  console.log(`Validated ${companies.length} companies and ${exposures} theme exposures.`)
  console.log('Qualitative theme scores, private valuations and relationships require manual source review; unchanged, not marked freshly verified.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
