import type { Investor, InvestorFund, InvestorRecord } from '@/lib/investor-types'

// Only explicitly requested investors are enabled; additional names require confirmation.
export const investors: Investor[] = [
  {
    id: 'tom-lee', name: 'Tom Lee', nameZh: '汤姆·李', organization: 'Fundstrat',
    role: '联合创始人 / 研究主管',
    description: '跟踪明确署名的个股公开观点。宏观评论、公司新闻与其他 Fundstrat 分析师观点不会自动归为 Tom Lee 的个股发言。',
    coverageNote: '个股发言待核实录入；个人交易与关联基金持仓尚未接入。暂无记录不表示没有持仓或交易。',
    sources: [{ label: 'Fundstrat 官方介绍', url: 'https://fundstrat.com/' }, { label: '官方媒体索引', url: 'https://fundstrat.com/media/in-the-news' }],
  },
  {
    id: 'cathie-wood', name: 'Cathie Wood', nameZh: '凯茜·伍德', organization: 'ARK Investment Management',
    role: '创始人 / 首席投资官',
    description: '个人公开观点与 ARK 投资团队管理的基金分开归属。基金持仓、交易披露不代表 Cathie Wood 个人账户或由她亲自下单。',
    coverageNote: '已接入 ARK 官方交易通知，以及 ARKK / ARKQ / ARKW 持仓；其他 ARK 基金仅展示交易文件中实际披露的记录。个人发言需逐条核实，个人账户交易未接入。',
    sources: [{ label: 'ARK 官方介绍', url: 'https://www.ark-funds.com/about' }, { label: 'ARK 官方交易通知及限制', url: 'https://www.ark-funds.com/trade-notifications' }],
  },
]

const holdingsBase = 'https://assets.ark-funds.com/fund-documents/funds-etf-csv/'
export const investorFunds: InvestorFund[] = [
  ['ARKK', 'ARK Innovation ETF', 'ARK_INNOVATION_ETF_ARKK_HOLDINGS.csv'],
  ['ARKQ', 'ARK Autonomous Technology & Robotics ETF', 'ARK_AUTONOMOUS_TECH._&_ROBOTICS_ETF_ARKQ_HOLDINGS.csv'],
  ['ARKW', 'ARK Next Generation Internet ETF', 'ARK_NEXT_GENERATION_INTERNET_ETF_ARKW_HOLDINGS.csv'],
  ['ARKF', 'ARK Fintech Innovation ETF', ''],
  ['ARKG', 'ARK Genomic Revolution ETF', ''],
  ['ARKX', 'ARK Space Exploration & Innovation ETF', ''],
].map(([id, name, file]) => ({
  id, name, investorId: 'cathie-wood',
  holdingsUrl: file ? `${holdingsBase}${file}` : undefined,
  sourceUrl: `https://www.ark-funds.com/funds/${id.toLowerCase()}`,
  relationship: 'ARK 管理基金；Cathie Wood 为 ARK CIO，并非个人账户',
}))

// Add only reviewed, source-linked stock statements or explicitly personal disclosures.
// No synthetic quotes, inferred personal trades, or macro-to-stock extrapolation.
export const reviewedInvestorRecords: InvestorRecord[] = []