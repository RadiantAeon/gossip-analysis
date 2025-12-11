# Validator Analysis Dashboard

A React-based dashboard for visualizing validator data and identity changes over time.

## Features

- Interactive validator data table with sorting and filtering
- Stake distribution visualization by IP address
- Timeline view of identity changes
- Dark mode UI
- Responsive design

## Data

- `active_validators.json` is output from `solana validators -um --output json > active_validators.json`
- `jito_validators.json` is output from `curl -X POST https://kobe.mainnet.jito.network/api/v1/jitosol_validators -H 'Content-Type: application/json' | jq > jito_validators.json`
- `sfdp_participants.json` is output from `curl -X GET https://api.solana.org/api/community/v1/sfdp_participants -H 'Content-Type: application/json' | jq > sfdp_participants.json`
- gossip files in the `gossip_out_directory` are output from `solana gossip`

## Setup

1. Install dependencies:
```bash
cd webapp
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open http://localhost:5173 in your browser

## Development

The dashboard is built with:
- React + TypeScript
- Vite for build tooling
- Material-UI for components
- Recharts for visualizations
- MUI X-Data-Grid for the data table

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.