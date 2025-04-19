#!/bin/bash

# Function to extract contract address from deployment output
extract_address() {
    local output="$1"
    local pattern="$2"
    echo "$output" | grep "$pattern" | awk '{print $NF}' | tr -d '\r'
}

echo "🚀 Starting deployment to Base Mainnet..."
echo "First deploying ProxyAdmin..."
ADMIN_OUTPUT=$(npx hardhat run scripts/deployment/deploy-admin.js --network base 2>&1)
ADMIN_STATUS=$?

if [ $ADMIN_STATUS -ne 0 ]; then
    echo "❌ ProxyAdmin deployment failed:"
    echo "$ADMIN_OUTPUT"
    exit 1
fi

ADMIN_ADDRESS=$(extract_address "$ADMIN_OUTPUT" "ProxyAdmin:")
echo "✅ ProxyAdmin deployment complete"
echo "ProxyAdmin: $ADMIN_ADDRESS"

echo "Now deploying CallbackConnector..."
CALLBACK_OUTPUT=$(npx hardhat run scripts/deployment/deploy-callback.js --network base 2>&1)
CALLBACK_STATUS=$?

if [ $CALLBACK_STATUS -ne 0 ]; then
    echo "❌ CallbackConnector deployment failed:"
    echo "$CALLBACK_OUTPUT"
    exit 1
fi

echo "CallbackConnector output: $CALLBACK_OUTPUT"

CALLBACK_CONNECTOR_ADDRESS=$(extract_address "$CALLBACK_OUTPUT" "CallbackConnector Proxy:")
CALLBACK_IMPLEMENTATION_ADDRESS=$(extract_address "$CALLBACK_OUTPUT" "CallbackConnector Implementation:")
echo "✅ Base Mainnet deployment complete"
echo "CallbackConnector proxy: $CALLBACK_CONNECTOR_ADDRESS"
echo "CallbackConnector implementation: $CALLBACK_IMPLEMENTATION_ADDRESS"

echo "🚀 Starting deployment to ZetaChain mainnet..."
echo "First deploying ProxyAdmin to ZetaChain..."
ZETA_ADMIN_OUTPUT=$(npx hardhat run scripts/deployment/deploy-admin.js --network mainnet 2>&1)
ZETA_ADMIN_STATUS=$?

if [ $ZETA_ADMIN_STATUS -ne 0 ]; then
    echo "❌ ZetaChain ProxyAdmin deployment failed:"
    echo "$ZETA_ADMIN_OUTPUT"
    exit 1
fi

ZETA_ADMIN_ADDRESS=$(extract_address "$ZETA_ADMIN_OUTPUT" "ProxyAdmin:")
echo "✅ ZetaChain ProxyAdmin deployment complete"
echo "ZetaChain ProxyAdmin: $ZETA_ADMIN_ADDRESS"

echo "Now deploying ZetaOrderBook..."
MAINNET_OUTPUT=$(npx hardhat run scripts/deployment/deploy-proxy-orderbook.js --network mainnet 2>&1)
MAINNET_STATUS=$?

if [ $MAINNET_STATUS -ne 0 ]; then
    echo "❌ ZetaChain mainnet deployment failed:"
    echo "$MAINNET_OUTPUT"
    exit 1
fi

# Extract the proxy address using the actual output pattern from deploy-proxy-orderbook.js
ZETA_ORDERBOOK_ADDRESS=$(extract_address "$MAINNET_OUTPUT" "ZetaOrderBook:")
ZETA_ORDERBOOK_IMPLEMENTATION_ADDRESS=$(extract_address "$MAINNET_OUTPUT" "Implementation:")
echo "✅ ZetaChain mainnet deployment complete"
echo "ZetaOrderBook proxy: $ZETA_ORDERBOOK_ADDRESS"
echo "ZetaOrderBook implementation: $ZETA_ORDERBOOK_IMPLEMENTATION_ADDRESS"

echo "🚀 Setting universal contract address on Base Mainnet..."
SET_UNIVERSAL_OUTPUT=$(npx hardhat run scripts/deployment/set-universal-contract.js --network base 2>&1)
SET_UNIVERSAL_STATUS=$?

if [ $SET_UNIVERSAL_STATUS -ne 0 ]; then
    echo "❌ Failed to set universal contract address:"
    echo "$SET_UNIVERSAL_OUTPUT"
    exit 1
fi

echo "🚀 Verifying contracts on Base Mainnet..."
echo "Verifying ProxyAdmin..."
VERIFY_ADMIN_OUTPUT=$(npx hardhat run scripts/deployment/verify-admin.js --network base 2>&1)
VERIFY_ADMIN_STATUS=$?

if [ $VERIFY_ADMIN_STATUS -ne 0 ]; then
    echo "⚠️ ProxyAdmin verification had issues:"
    echo "$VERIFY_ADMIN_OUTPUT"
    # Don't exit here, as verification issues shouldn't stop the deployment
else
    echo "✅ ProxyAdmin verification complete"
fi

echo "Verifying CallbackConnector..."
VERIFY_CALLBACK_OUTPUT=$(npx hardhat run scripts/deployment/verify-callback-connector.js --network base 2>&1)
VERIFY_CALLBACK_STATUS=$?

if [ $VERIFY_CALLBACK_STATUS -ne 0 ]; then
    echo "⚠️ CallbackConnector verification had issues:"
    echo "$VERIFY_CALLBACK_OUTPUT"
    # Don't exit here, as verification issues shouldn't stop the deployment
else
    echo "✅ CallbackConnector verification complete"
fi

echo "🚀 Verifying contracts on ZetaChain mainnet..."
echo "Verifying ProxyAdmin..."
VERIFY_ZETA_ADMIN_OUTPUT=$(npx hardhat run scripts/deployment/verify-admin.js --network mainnet 2>&1)
VERIFY_ZETA_ADMIN_STATUS=$?

if [ $VERIFY_ZETA_ADMIN_STATUS -ne 0 ]; then
    echo "⚠️ ZetaChain ProxyAdmin verification had issues:"
    echo "$VERIFY_ZETA_ADMIN_OUTPUT"
    # Don't exit here, as verification issues shouldn't stop the deployment
else
    echo "✅ ZetaChain ProxyAdmin verification complete"
fi

echo "Verifying ZetaOrderBook..."
VERIFY_OUTPUT=$(npx hardhat run scripts/deployment/verify-proxy-orderbook.js --network mainnet 2>&1)
VERIFY_STATUS=$?

if [ $VERIFY_STATUS -ne 0 ]; then
    echo "⚠️ ZetaOrderBook verification had issues:"
    echo "$VERIFY_OUTPUT"
    # Don't exit here, as verification issues shouldn't stop the deployment
else
    echo "✅ ZetaOrderBook verification complete"
fi

echo "🚀 Initializing ZetaOrderBook on ZetaChain mainnet..."
INITIALIZE_OUTPUT=$(npx hardhat run scripts/deployment/initialize-orderbook.js --network mainnet 2>&1)
INITIALIZE_STATUS=$?

if [ $INITIALIZE_STATUS -ne 0 ]; then
    echo "❌ ZetaOrderBook initialization failed:"
    echo "$INITIALIZE_OUTPUT"
    exit 1
fi

echo "✅ ZetaOrderBook initialization complete"

echo "✅ Deployment complete!"
echo "📝 Contract Addresses:"
echo "ProxyAdmin (Base Mainnet): $ADMIN_ADDRESS"
echo "CallbackConnector Proxy (Base Mainnet): $CALLBACK_CONNECTOR_ADDRESS"
echo "CallbackConnector Implementation (Base Mainnet): $CALLBACK_IMPLEMENTATION_ADDRESS"
echo "ProxyAdmin (ZetaChain mainnet): $ZETA_ADMIN_ADDRESS"
echo "ZetaOrderBook Proxy (ZetaChain mainnet): $ZETA_ORDERBOOK_ADDRESS"
echo "ZetaOrderBook Implementation (ZetaChain mainnet): $ZETA_ORDERBOOK_IMPLEMENTATION_ADDRESS" 
