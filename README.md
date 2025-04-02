# ZetaChain Order Book

A decentralized order book implementation on ZetaChain for trading ZETA/USDC pairs.

## Features

- Create buy and sell orders for ZETA/USDC
- Automatic order execution based on Pyth price feeds
- Cross-chain price checking via CallbackConnector
- Order cancellation functionality
- Integration with ZetaSwap for token swaps

## Prerequisites

- Node.js v18+
- Hardhat
- ZetaChain testnet account with ZETA tokens

## Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Copy the environment template and fill in your values:
```bash
cp .env.example .env
```

4. Update the `.env` file with your:
- Private key
- Contract addresses for ZetaChain testnet
- Pyth Oracle address
- ZetaSwap router address
- USDC token address
- ZETA price feed ID
- Callback chain address

## Testing

Run the test suite:
```bash
npx hardhat test
```

## Deployment

Deploy to ZetaChain testnet:
```bash
npx hardhat run scripts/deployment/deploy-orderbook.js --network testnet
```

## Contract Addresses

After deployment, contract addresses will be saved in the `deployments` directory.

## License

UNLICENSED
