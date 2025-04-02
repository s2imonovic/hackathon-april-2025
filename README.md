# ZetaOrderBook

A cross-chain orderbook implementation using ZetaChain for cross-chain messaging.

## Prerequisites

- Node.js v18 or later
- npm or yarn
- Hardhat
- A Base Sepolia RPC URL
- A ZetaChain testnet RPC URL
- A Blockscout API key for contract verification

## Environment Setup

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Fill in your environment variables in `.env`:
```
PRIVATE_KEY=your_private_key_here
BASESEPOLIA_RPC_URL=your_base_sepolia_rpc_url_here
TESTNET_RPC_URL=your_zetachain_testnet_rpc_url_here
BLOCKSCOUT_API_KEY=your_blockscout_api_key_here
```

## Deployment Process

1. Deploy to both networks using the deployment script:
```bash
./scripts/deployment/deploy-testnet.sh
```

This script will:
- Deploy the CallbackConnector to Base Sepolia
- Deploy the ZetaOrderBook to ZetaChain testnet
- Set the universal contract address on Base Sepolia
- Verify all contracts on Blockscout
- Display the deployed contract addresses

2. Verify the deployment:
- Check the Blockscout explorer for both networks
- Verify the universal contract address is set correctly
- Test the cross-chain messaging functionality

## Contract Addresses

After deployment, the contract addresses will be saved in `deployed-addresses.json` and displayed in the console output.

## Development

1. Install dependencies:
```bash
npm install
```

2. Compile contracts:
```bash
npx hardhat compile
```

3. Run tests:
```bash
npx hardhat test
```

## Architecture

The system consists of two main contracts:
- `ZetaOrderBook`: Deployed on ZetaChain testnet, handles order management
- `CallbackConnector`: Deployed on Base Sepolia, handles cross-chain messaging

Cross-chain communication is facilitated through ZetaChain's messaging system.

## Features

- Create buy and sell orders for ZETA/USDC
- Automatic order execution based on Pyth price feeds
- Cross-chain price checking via CallbackConnector
- Order cancellation functionality
- Integration with ZetaSwap for token swaps

## License

UNLICENSED
