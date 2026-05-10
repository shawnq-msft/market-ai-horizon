export type LayerId =
  | 'cloud-apps'
  | 'models-data'
  | 'compute-infra'
  | 'semis-packaging'
  | 'semi-equipment-materials'
  | 'power-raw-materials'
  | 'investment-vehicles'

export type Market = 'US' | 'HK' | 'CN' | 'TW' | 'JP' | 'KR' | 'EU' | 'ETF' | 'Private'

export type PositionType =
  | 'direct-business'
  | 'supplier'
  | 'customer'
  | 'investor'
  | 'etf-holding'
  | 'private-company'

export type ValuationMetric =
  | 'PE'
  | 'Forward PE'
  | 'PS'
  | 'EV/Sales'
  | 'EV/EBITDA'
  | 'P/B'
  | 'AUM'
  | 'NAV Premium'
  | 'Private'

export type ValuationLabel = 'Cheap' | 'Fair' | 'Rich' | 'Very Rich' | 'Private'

export type DataQuality = 'seed' | 'estimated' | 'api' | 'verified'

export type Layer = {
  id: LayerId
  nameZh: string
  nameEn: string
  description: string
  themes: Theme[]
}

export type Theme = {
  id: string
  layerId: LayerId
  nameZh: string
  nameEn: string
  description: string
}

export type ThemeExposure = {
  themeId: string
  layerId: LayerId
  relevance: number
  purity: number
  revenueExposure?: number
  capexSensitivity?: number
  positionType?: PositionType
  evidence: string
}

export type Company = {
  id: string
  nameEn: string
  nameZh?: string
  ticker?: string
  exchange?: string
  market: Market
  country?: string
  listed: boolean
  primaryLayer: LayerId
  primaryTheme: string
  segment: string
  tagZh: string
  tagEn: string
  themeExposures: ThemeExposure[]
  relatedPrivateCompanies?: string[]
  relatedListedCompanies?: string[]
  aiRelevanceScore: number
  revenueElasticityScore: number
  capexLinkageScore?: number
  purityScore: number
  price?: number
  marketCapUsdBn?: number
  weekChangePct?: number
  monthChangePct?: number
  ytdChangePct?: number
  retailHeatScore?: number
  mainFundFlowScore?: number
  valuationMetric?: ValuationMetric
  valuationValue?: number
  valuationScore: number
  valuationLabel: ValuationLabel
  nextEarningsDate?: string
  earningsConfirmed?: boolean
  riskFlags: string[]
  dataQuality: DataQuality
  updatedAt: string
}

export type ViewMode = 'cards' | 'treemap' | 'heatmap'
export type HeatMetric = 'valuation' | 'weekly' | 'purity' | 'quality' | 'momentum' | 'aiValue' | 'elasticity' | 'capex' | 'retailHeat' | 'mainFund'
export type SortKey = 'relevance' | 'purity' | 'weekly' | 'valuation' | 'marketCap' | 'earnings' | 'quality' | 'momentum' | 'aiValue' | 'elasticity' | 'capex' | 'retailHeat' | 'mainFund'
