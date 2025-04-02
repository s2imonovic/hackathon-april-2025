#!/bin/bash

# Function to extract contract address from deployment output
extract_address() {
    local output="$1"
    local pattern="$2"
    echo "$output" | grep "$pattern" | awk '{print $NF}' | tr -d '\r'
}

echo "🚀 Starting deployment to Base Sepolia..."
BASE_OUTPUT=$(npx hardhat run scripts/deployment/deploy-orderbook.js --network base_sepolia 2>&1)
BASE_STATUS=$?

if [ $BASE_STATUS -ne 0 ]; then
    echo "❌ Base Sepolia deployment failed:"
    echo "$BASE_OUTPUT"
    exit 1
fi

CALLBACK_CONNECTOR_ADDRESS=$(extract_address "$BASE_OUTPUT" "CallbackConnector deployed to Base Sepolia:")
echo "✅ Base Sepolia deployment complete"

echo "🚀 Starting deployment to ZetaChain testnet..."
TESTNET_OUTPUT=$(npx hardhat run scripts/deployment/deploy-orderbook.js --network testnet 2>&1)
TESTNET_STATUS=$?

if [ $TESTNET_STATUS -ne 0 ]; then
    echo "❌ ZetaChain testnet deployment failed:"
    echo "$TESTNET_OUTPUT"
    exit 1
fi

ZETA_ORDERBOOK_ADDRESS=$(extract_address "$TESTNET_OUTPUT" "ZetaOrderBook deployed to ZetaChain testnet:")
echo "✅ ZetaChain testnet deployment complete"

echo "🚀 Setting universal contract address on Base Sepolia..."
SET_UNIVERSAL_OUTPUT=$(npx hardhat run scripts/deployment/set-universal-contract.js --network base_sepolia 2>&1)
SET_UNIVERSAL_STATUS=$?

if [ $SET_UNIVERSAL_STATUS -ne 0 ]; then
    echo "❌ Failed to set universal contract address:"
    echo "$SET_UNIVERSAL_OUTPUT"
    exit 1
fi

echo "✅ Deployment complete!"
echo "📝 Contract Addresses:"
echo "CallbackConnector (Base Sepolia): $CALLBACK_CONNECTOR_ADDRESS"
echo "ZetaOrderBook (ZetaChain testnet): $ZETA_ORDERBOOK_ADDRESS" 