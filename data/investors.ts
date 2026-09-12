import type { Investor, InvestorFund, InvestorRecord } from '@/lib/investor-types'
import { reviewedHoldingSnapshots } from './investor-holdings'

// Profiles requested by the user; actual reporting entities remain separately attributed.
export const investors: Investor[] = [
  {
    id: 'tom-lee', name: 'Tom Lee', nameZh: '汤姆·李', organization: 'Fundstrat',
    entityType: 'person', holdingsCoverage: 'unavailable',
    role: '联合创始人 / 研究主管',
    description: '跟踪明确署名的个股公开观点。宏观评论、公司新闻与其他 Fundstrat 分析师观点不会自动归为 Tom Lee 的个股发言。',
    coverageNote: '个股发言待核实录入；个人交易与关联基金持仓尚未接入。暂无记录不表示没有持仓或交易。',
    sources: [{ label: 'Fundstrat 官方介绍', url: 'https://fundstrat.com/' }, { label: '官方媒体索引', url: 'https://fundstrat.com/media/in-the-news' }],
  },
  {
    id: 'cathie-wood', name: 'Cathie Wood', nameZh: '凯茜·伍德', organization: 'ARK Investment Management',
    entityType: 'person', holdingsCoverage: 'live',
    role: '创始人 / 首席投资官',
    description: '个人公开观点与 ARK 投资团队管理的基金分开归属。基金持仓、交易披露不代表 Cathie Wood 个人账户或由她亲自下单。',
    coverageNote: '已接入 ARK 官方交易通知，以及 ARKK / ARKQ / ARKW / ARKF / ARKG / ARKX 六只主动股票 ETF 官方持仓；不代表 ARK 全部产品或个人资产。个人发言需逐条核实，个人账户交易未接入。',
    sources: [{ label: 'ARK 官方介绍', url: 'https://www.ark-funds.com/about' }, { label: 'ARK 官方交易通知及限制', url: 'https://www.ark-funds.com/trade-notifications' }],
  },
  {
    id: 'warren-buffett', name: 'Warren Buffett', nameZh: '巴菲特', organization: 'Berkshire Hathaway Inc.',
    entityType: 'person', holdingsCoverage: 'reviewed-partial', role: '伯克希尔关联投资人',
    description: '展示 Berkshire Hathaway 的机构申报，不代表巴菲特个人持仓或其本人决策。',
    coverageNote: '已核实 2026-06-30 部分 13F 股票持仓；不是完整组合，不是实时仓位。GOOG 不合并到 GOOGL。',
    sources: [{ label: 'Berkshire SEC 13F', url: 'https://www.sec.gov/Archives/edgar/data/1067983/000119312526352200/0001193125-26-352200-index.html' }],
  },
  {
    id: 'nancy-pelosi', name: 'Nancy Pelosi', nameZh: '佩洛西', organization: '美国众议院财务申报',
    entityType: 'person', holdingsCoverage: 'reviewed-partial', role: '家庭年度资产申报（所有人未核实）',
    description: '展示以 Nancy Pelosi 名义提交的年度资产申报，不把家庭资产视作她本人持仓，也不从交易通知推算余额。',
    coverageNote: '二手来源核实部分股票资产；具体所有人未知，数量未知，仅披露金额区间。2025-12-31 为按年度申报规则确定的估值日；未直接核实 PDF 页眉，不代表当前持有。',
    sources: [{ label: '众议院年度原始申报', url: 'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10075701.pdf' }, { label: '年度资产二手解析', url: 'https://congress.wiki/map/disclosures/10075701' }],
  },
  {
    id: 'nvidia', name: 'NVIDIA', nameZh: '英伟达', organization: 'NVIDIA Corporation',
    entityType: 'company', holdingsCoverage: 'reviewed-partial', role: '公司投资组合 / 13F 申报主体',
    description: '英伟达公司的证券持仓，不是黄仁勋或其他高管的个人投资。',
    coverageNote: '已核实 2026-06-30 部分 13F 股票持仓；不覆盖全部非上市投资、战略合作或投资承诺。',
    sources: [{ label: 'NVIDIA SEC 13F', url: 'https://www.sec.gov/Archives/edgar/data/1045810/000104581026000065/0001045810-26-000065-index.html' }],
  },
  {
    id: 'donald-trump', name: 'Donald Trump', nameZh: '特朗普', organization: '美国行政部门财务申报',
    entityType: 'person', holdingsCoverage: 'unavailable', role: '个人／家庭财务申报',
    description: '仅收录能核实归属和报告期的资产披露；不把特朗普媒体公司的资产或政治关联推断为个人持股。',
    coverageNote: '已定位 2026 年度报告，但尚未核实逐项持仓，筛选结果为空不表示零持仓。',
    sources: [{ label: 'OGE 官方披露入口', url: 'https://www.oge.gov/web/oge.nsf/Officials%20Individual%20Disclosures%20Search%20Collection?OpenForm' }, { label: '2026 年度报告索引（CREW）', url: 'https://www.citizensforethics.org/reports-investigations/crew-reports/president-trumps-2026-personal-financial-disclosure/' }],
  },
  {
    id: 'duan-yongping', name: 'Duan Yongping', nameZh: '段永平', organization: 'H&H International Investment, LLC',
    entityType: 'person', holdingsCoverage: 'reviewed-partial', role: '关联 H&H 机构申报',
    description: '展示 H&H International Investment 申报的机构持仓，不表示段永平全部资产或个人账户。',
    coverageNote: '已核实 2026-06-30 部分 13F 股票持仓；关联关系参见 DATAROMA，实际申报主体为 H&H。',
    sources: [{ label: 'H&H SEC 13F', url: 'https://www.sec.gov/Archives/edgar/data/1759760/000175976026000007/0001759760-26-000007-index.html' }, { label: 'DATAROMA H&H / Duan Yongping', url: 'https://www.dataroma.com/m/holdings.php?m=HH' }],
  },
  {
    id: 'bridgewater', name: 'Bridgewater Associates', nameZh: '桥水', organization: 'Bridgewater Associates, LP',
    entityType: 'institution', holdingsCoverage: 'reviewed-partial', role: '投资管理机构',
    description: '桥水机构申报持仓，不是 Ray Dalio 的个人投资组合。',
    coverageNote: '已核实 2026-06-30 部分 13F 股票，数量来自 13f.info 二手解析；不表示完整组合。',
    sources: [{ label: 'Bridgewater SEC 13F', url: 'https://www.sec.gov/Archives/edgar/data/1350694/000135069426000003/0001350694-26-000003-index.html' }, { label: '13f.info 报告解析', url: 'https://13f.info/13f/000135069426000003-bridgewater-associates-lp-q2-2026' }],
  },
  {
    id: 'alphabet', name: 'Alphabet / Google', nameZh: '谷歌', organization: 'Alphabet Inc.',
    entityType: 'company', holdingsCoverage: 'reviewed-partial', role: '公司合并 13F 申报',
    description: 'Alphabet 合并申报，逐项保留 Google LLC 或 GV 的管理人归属；不重复叠加子公司组合。',
    coverageNote: '已核实 2026-06-30 部分股票持仓，不等同于 Alphabet / GV / CapitalG 的全部投资。',
    sources: [{ label: 'Alphabet SEC 13F', url: 'https://www.sec.gov/Archives/edgar/data/1652044/000165204426000073/0001652044-26-000073-index.html' }],
  },
  {
    id: 'soros', name: 'Soros Fund Management', nameZh: '索罗斯', organization: 'Soros Fund Management LLC',
    entityType: 'institution', holdingsCoverage: 'reviewed-partial', role: '索罗斯基金管理机构',
    description: '机构申报股票，不代表 George Soros 个人持仓；期权和普通股不会合并。',
    coverageNote: '已核实 2026-06-30 部分 13F 普通股持仓，未将 put/call 期权名义股数加入。',
    sources: [{ label: 'Soros SEC 13F', url: 'https://www.sec.gov/Archives/edgar/data/1029160/000090266426003507/0000902664-26-003507-index.html' }],
  },
  {
    id: 'peter-thiel', name: 'Peter Thiel', nameZh: '彼得·蒂尔', organization: 'Thiel Macro LLC',
    entityType: 'person', holdingsCoverage: 'reviewed-partial', role: '关联 Thiel Macro 申报',
    description: '仅展示 Thiel Macro LLC 的申报，不将 Founders Fund、私人公司投资或个人资产混为一谈。',
    coverageNote: '已核实 2026-06-30 Thiel Macro 的八项申报股票；看板仅展示能精确匹配的公司。不是 Peter Thiel 全部资产。',
    sources: [{ label: 'Thiel Macro SEC 13F', url: 'https://www.sec.gov/Archives/edgar/data/1562087/000131586326000593/0001315863-26-000593-index.html' }],
  },
]

const holdingsBase = 'https://assets.ark-funds.com/fund-documents/funds-etf-csv/'
const arkFunds: InvestorFund[] = [
  ['ARKK', 'ARK Innovation ETF', 'ARK_INNOVATION_ETF_ARKK_HOLDINGS.csv'],
  ['ARKQ', 'ARK Autonomous Technology & Robotics ETF', 'ARK_AUTONOMOUS_TECH._&_ROBOTICS_ETF_ARKQ_HOLDINGS.csv'],
  ['ARKW', 'ARK Next Generation Internet ETF', 'ARK_NEXT_GENERATION_INTERNET_ETF_ARKW_HOLDINGS.csv'],
  ['ARKF', 'ARK Blockchain & Fintech Innovation ETF', 'ARK_BLOCKCHAIN_&_FINTECH_INNOVATION_ETF_ARKF_HOLDINGS.csv'],
  ['ARKG', 'ARK Genomic Revolution ETF', 'ARK_GENOMIC_REVOLUTION_ETF_ARKG_HOLDINGS.csv'],
  ['ARKX', 'ARK Space & Defense Innovation ETF', 'ARK_SPACE_&_DEFENSE_INNOVATION_ETF_ARKX_HOLDINGS.csv'],
].map(([id, name, file]) => ({
  id, name, investorId: 'cathie-wood',
  holdingsUrl: file ? `${holdingsBase}${file}` : undefined,
  sourceUrl: `https://www.ark-funds.com/funds/${id.toLowerCase()}`,
  relationship: 'ARK 管理基金；Cathie Wood 为 ARK CIO，并非个人账户',
}))

export const investorFunds: InvestorFund[] = [...arkFunds, ...reviewedHoldingSnapshots.map((snapshot) => ({
  id: snapshot.portfolioId, investorId: snapshot.investorId, name: snapshot.actor,
  sourceUrl: snapshot.sourceUrl, relationship: snapshot.actor,
  coverageNote: `人工核实持仓 · 截至 ${snapshot.asOf} · ${snapshot.note}`,
}))]

// Add only reviewed, source-linked stock statements or explicitly personal disclosures.
// No synthetic quotes, inferred personal trades, or macro-to-stock extrapolation.
export const reviewedInvestorRecords: InvestorRecord[] = []