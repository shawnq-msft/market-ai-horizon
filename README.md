# Market AI Horizon

Next.js / React dashboard for the AI value chain, company fundamentals, and market signals.

## Development

- Install dependencies with `npm install`.
- Start the development server with `npm run dev`.
- Validate with `npm test`, `npm run typecheck`, and `npm run build`.

## Smart Money Sensor

Smart Money Sensor tracks **investor statements, explicitly personal transactions, fund transactions, fund holdings, and periodic holding changes** as separate record types. It is not a price/volume score.

- Investor directory: `/investors`; individual profiles: `/investors/tom-lee` and `/investors/cathie-wood`. Additional investor names await user confirmation.
- Company pages show only precisely mapped records; the dashboard follows current company filters. Investor pages include other securities with an explicit unmapped label, rather than false company links.
- ARK official latest trade XLS is parsed as **fund trades**, never Cathie Wood personal trades. The file is unofficial/unreconciled, excludes IPO and ETF creation/redemption transactions, may be incomplete, and is overwritten by later disclosures. No complete transaction archive is claimed.
- ARKK, ARKQ and ARKW official CSV holdings show shares, USD market value and percentage-point fund weight. Other listed ARK funds currently have trade notifications only. Market value is not cost; fund weights are not summed across funds. Private/untickered securities retain their source identity without guessing company links.
- Personal remarks require reviewed, stock-specific source text. `data/investors.ts` contains the curated record collection, currently empty because no remarks were verified during setup. Tom Lee fund sources and personal transactions are not connected yet. Empty records do not imply no ownership or trading.
- Holding changes are a separate supported category; no 13F feed is currently connected, and no transaction date or price is inferred from changes between reporting periods.
- Event/report-period date, publication date (when actually known), retrieval time, source and actor are distinct. Sources and individual coverage limits are visible in the UI.
- `/api/investors/activity.json` refreshes hourly in server mode. On GitHub Pages it is a build-time JSON snapshot, updated on redeployment. Partial failures are clearly marked; no fabricated fallback data is generated.
- Official URLs and fund relationships are configured in `data/investors.ts`; parsing and exact ticker mapping are in `lib/investor-provider.ts`. XLSX parsing is server-side only. Add reviewed comments with `kind: 'comment'`, the actual speaker, exact company ID, event date, evidence type, original source and a short paraphrase; do not substitute team research for personal remarks.

## 个股K线图 / Stock candlesticks

Open a company or its **K线** link. Listed companies load up to one year of daily OHLCV from `/api/companies/[id]/history.json`.

- Daily/weekly candles; 1M, 3M, 6M, 1Y windows relative to the latest available trading day.
- Volume histogram, MA5/MA20, crosshair OHLC, pan/zoom, and accessible recent-data table.
- MA windows follow the selected bar interval and use earlier loaded bars as warmup.
- Weekly bars aggregate by exchange-local calendar week; first/last weeks may be incomplete.
- CMF20 uses `(2 × close − high − low) / (high − low)` weighted by volume over 20 daily bars. Flat candles contribute zero. Values beyond ±0.10 are labeled stronger buying/selling pressure.
- RVOL compares the latest daily volume with the **preceding** 20-day average. An unfinished session can understate RVOL.
- Missing volume is not treated as zero. Insufficient histories show “数据不足”.

### Provider and limitations

Yahoo Finance supplies historical OHLC (split-adjusted, not dividend-adjusted), quote currency and exchange timezone. The API normalizes Shanghai `.SH` to `.SS`, Hong Kong tickers, and primary tickers in dual listings; existing `.TW`, `.TWO`, `.T`, `.KS` and other symbols are retained. It only accepts company IDs from the existing dataset, not arbitrary URLs or tickers.

No API key is required. Outbound HTTPS access to Yahoo Finance is required. The public endpoint may be delayed, rate-limited, unavailable, or lack a particular listing; it is not a guaranteed production market-data service. Requests time out after 12 seconds. The UI displays the last trading date and retrieval time. It **never substitutes simulated candles** on failure. Errors provide retry and an external quote link. Private companies make no client history request.

### Server and GitHub Pages deployment

- **Local/server:** `npm run dev`, or `npm run build` followed by `npm start`. History paths are generated on demand. Successful upstream data revalidates after 15 minutes; responses request 60-second browser / 15-minute shared caching.
- **GitHub Pages:** Existing Actions deployment is retained. When `GITHUB_ACTIONS=true`, the build statically exports each company's history as a `.json` file alongside the site under the repository base path. History is a **build-time snapshot**, refreshed on redeployment, not a live API. Failed symbols export an explicit unavailable message without breaking the rest of the site. Retrying reloads the deployed snapshot; it does not contact Yahoo directly.
- Set `STATIC_EXPORT=true` to validate the static export locally without the GitHub Pages base path. Static build output remains in `out`.
- Run tests without the static-export environment flags to test server HTTP status behavior.

The chart's price-volume indicators are separate from investor disclosures; they do not identify investors or institutions. Neither dataset constitutes investment advice.

Charts use [TradingView Lightweight Charts™](https://www.tradingview.com/) under Apache-2.0, with visible attribution.