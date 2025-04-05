#!/bin/bash

# Function to extract contract address from deployment output
extract_address() {
    local output="$1"
    local pattern="$2"
    echo "$output" | grep "$pattern" | awk '{print $NF}' | tr -d '\r'
}

echo "🚀 Starting deployment to Base mainnet..."
BASE_OUTPUT=$(npx hardhat run scripts/deployment/deploy-orderbook.js --network base)
echo $BASE_OUTPUT
BASE_STATUS=$?

if [ $BASE_STATUS -ne 0 ]; then
    echo "❌ Base mainnet deployment failed:"
    echo "$BASE_OUTPUT"
    exit 1
fi

CALLBACK_CONNECTOR_ADDRESS=$(extract_address "$BASE_OUTPUT" "CallbackConnector deployed to base:")
echo "✅ Base mainnet deployment complete"

echo "🚀 Starting deployment to ZetaChain mainnet..."
MAINNET_OUTPUT=$(npx hardhat run scripts/deployment/deploy-orderbook.js --network mainnet)
echo $MAINNET_OUTPUT
MAINNET_STATUS=$?

if [ $MAINNET_STATUS -ne 0 ]; then
    echo "❌ ZetaChain mainnet deployment failed:"
    echo "$MAINNET_OUTPUT"
    exit 1
fi

ZETA_ORDERBOOK_ADDRESS=$(extract_address "$MAINNET_OUTPUT" "ZetaOrderBook deployed to ZetaChain mainnet:")
echo "✅ ZetaChain mainnet deployment complete"

echo "🚀 Setting universal contract address on Base mainnet..."
SET_UNIVERSAL_OUTPUT=$(npx hardhat run scripts/deployment/set-universal-contract.js --network base)
SET_UNIVERSAL_STATUS=$?

if [ $SET_UNIVERSAL_STATUS -ne 0 ]; then
    echo "❌ Failed to set universal contract address:"
    echo "$SET_UNIVERSAL_OUTPUT"
    exit 1
fi

echo "✅ Deployment complete!"
echo "📝 Contract Addresses:"
echo "CallbackConnector (Base mainnet): $CALLBACK_CONNECTOR_ADDRESS"
echo "ZetaOrderBook (ZetaChain mainnet): $ZETA_ORDERBOOK_ADDRESS" 