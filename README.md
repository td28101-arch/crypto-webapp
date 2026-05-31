# crypto-webapp

Interactive crypto dashboard for a buildathon/demo submission.

## Features
- Interactive Market / Features / White Papers / About menus
- Live market table, search, watchlist buttons
- Portfolio simulator with localStorage
- Price alerts
- Converter
- Trend radar
- Risk scanner
- News/research feed with silent fallback
- Trading plan panel and wallet connect
- API keys are kept out of browser code

## Deploy
1. Push this folder to GitHub.
2. Deploy on Netlify.
3. Add environment variables in Netlify only, not in GitHub.

Required optional variables:
- `SOSOVALUE_API_KEY`
- `SOSOVALUE_BASE_URL`
- `SODEX_NETWORK`
- `SODEX_API_KEY_NAME`
- `SODEX_API_PRIVATE_KEY`
- `SODEX_CHAIN_ID`

The app still works if private providers fail because it falls back silently to public market data.
