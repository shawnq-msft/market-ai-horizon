import type { InvestorRecord } from '@/lib/investor-types'

// Manually reviewed disclosures, NOT an automatically refreshed/full 13F feed.
// Each snapshot lists only the verified rows below. Never infer exits from omissions.
type ReviewedSnapshot = {
  investorId: string
  portfolioId: string
  actor: string
  asOf: string
  publishedAt: string
  sourceUrl: string
  sourceName: string
  evidence: InvestorRecord['evidence']
  note: string
  rows: { ticker: string; shares?: number; actor?: string; valueRangeUsd?: { min: number; max: number } }[]
}
const quarter = { asOf: '2026-06-30', publishedAt: '2026-08-14' }
export const holdingsReviewedAt = '2026-09-07'
export const reviewedHoldingSnapshots: ReviewedSnapshot[] = [
  {
    ...quarter, investorId: 'warren-buffett', portfolioId: 'BERKSHIRE-13F', actor: 'Berkshire Hathaway Inc.',
    sourceUrl: 'https://www.dataroma.com/m/holdings.php?m=BRK', sourceName: 'DATAROMA · Berkshire 13F 汇总', evidence: 'secondary-disclosure',
    note: '部分条目；AAPL 数量为二手来源汇总多条管理人持仓。GOOG 与 GOOGL 分开。原始 SEC 文件见主体页。',
    rows: [{ ticker: 'AAPL', shares: 227917808 }, { ticker: 'GOOG', shares: 27188433 }],
  },
  {
    ...quarter, investorId: 'duan-yongping', portfolioId: 'HH-13F', actor: 'H&H International Investment, LLC',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1759760/000175976026000007/xslForm13F_X02/infotable.xml', sourceName: 'SEC · H&H 13F', evidence: 'official-disclosure',
    note: '部分条目；股票代码对照 https://www.dataroma.com/m/holdings.php?m=HH ，SEC 原文以 CUSIP / 股份类别识别。',
    rows: [{ ticker: 'AAPL', shares: 27098707 }, { ticker: 'NVDA', shares: 6280675 }, { ticker: 'TSLA', shares: 3380400 }],
  },
  {
    ...quarter, investorId: 'nvidia', portfolioId: 'NVIDIA-13F', actor: 'NVIDIA Corporation',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1045810/000104581026000065/xslForm13F_X02/information_table.xml', sourceName: 'SEC · NVIDIA 13F', evidence: 'official-disclosure',
    note: '部分公司持仓；代码对照 https://hedgefollow.com/funds/Nvidia 。不是高管账户，不包括所有非上市投资。',
    rows: [{ ticker: 'CRWV', shares: 47213353 }, { ticker: 'COHR', shares: 7788161 }, { ticker: 'INTC', shares: 214776632 }, { ticker: 'NBIS', shares: 1190476 }, { ticker: 'SNPS', shares: 4821717 }],
  },
  {
    ...quarter, investorId: 'bridgewater', portfolioId: 'BRIDGEWATER-13F', actor: 'Bridgewater Associates, LP',
    sourceUrl: 'https://13f.info/13f/000135069426000003-bridgewater-associates-lp-q2-2026', sourceName: '13f.info · Bridgewater 13F 解析', evidence: 'secondary-disclosure',
    note: '仅核实部分普通股，未完整提取 997 项申报；不根据遗漏判定未持有。原始 SEC 文件见主体页。',
    rows: [{ ticker: 'NVDA', shares: 3866195 }, { ticker: 'AMZN', shares: 2025481 }, { ticker: 'AAPL', shares: 364377 }],
  },
  {
    ...quarter, publishedAt: '2026-08-07', investorId: 'alphabet', portfolioId: 'ALPHABET-13F', actor: 'Alphabet Inc. 合并申报',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1652044/000165204426000073/xslForm13F_X02/information_table.xml', sourceName: 'SEC · Alphabet 合并 13F', evidence: 'official-disclosure',
    note: '部分条目；管理人 1 = GV Management Company, L.L.C.，2 = Google LLC。数量使用股份数量列，不使用投票权列。代码对照 https://hedgefollow.com/funds/Alphabet 。',
    rows: [{ ticker: 'ARM', shares: 1960784, actor: 'Alphabet 合并申报 · Google LLC（管理人 2）' }, { ticker: 'ASTS', shares: 8943486, actor: 'Alphabet 合并申报 · Google LLC（管理人 2）' }, { ticker: 'PL', shares: 35248893, actor: 'Alphabet 合并申报 · Google LLC（管理人 2）' }, { ticker: 'GTLB', shares: 2724712, actor: 'Alphabet 合并申报 · GV Management Company（管理人 1）' }],
  },
  {
    ...quarter, investorId: 'soros', portfolioId: 'SOROS-13F', actor: 'Soros Fund Management LLC',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1029160/000090266426003507/xslForm13F_X02/infotable.xml', sourceName: 'SEC · Soros 13F', evidence: 'official-disclosure',
    note: '部分普通股持仓；排除 NVDA put 等期权，不将期权名义股数合并。代码对照 https://hedgefollow.com/funds/Soros+Fund+Management 。',
    rows: [{ ticker: 'AMZN', shares: 1182529 }, { ticker: 'AAPL', shares: 529538 }, { ticker: 'NVDA', shares: 1064635 }],
  },
  {
    ...quarter, investorId: 'peter-thiel', portfolioId: 'THIEL-MACRO-13F', actor: 'Thiel Macro LLC',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1562087/000131586326000593/xslForm13F_X02/thiel2q2026.inftbl.xml', sourceName: 'SEC · Thiel Macro 13F', evidence: 'official-disclosure',
    note: '该份申报八项股票，不代表个人或 Founders Fund 全部组合。代码对照 https://hedgefollow.com/funds/Thiel+Macro+LLC 。',
    rows: [{ ticker: 'AMZN', shares: 495000 }, { ticker: 'AEP', shares: 308617 }, { ticker: 'CMS', shares: 517124 }, { ticker: 'DTE', shares: 264450 }, { ticker: 'FE', shares: 839319 }, { ticker: 'VIST', shares: 1189792 }, { ticker: 'VST', shares: 372755 }, { ticker: 'XE', shares: 200000 }],
  },
  {
    investorId: 'nancy-pelosi', portfolioId: 'PELOSI-ANNUAL-2025', actor: 'Nancy Pelosi 年度家庭申报 · 具体持有人未核实',
    asOf: '2025-12-31', publishedAt: '2026-05-15',
    sourceUrl: 'https://congress.wiki/map/disclosures/10075701', sourceName: 'Congress Wiki · 年度资产二手解析', evidence: 'secondary-disclosure',
    note: '部分 Assets 股票条目（不是 Transactions 或期权）。具体所有人及数量未核实；年末估值日根据 5 USC 13103(d) / 13104(a)(3) 年度规则确定，未直接核实 PDF 页眉。只知金额区间，不取中点当市值。',
    rows: ['GOOGL', 'AMZN', 'AAPL', 'AVGO'].map((ticker) => ({ ticker, valueRangeUsd: { min: 5000001, max: 25000000 } })),
  },
]