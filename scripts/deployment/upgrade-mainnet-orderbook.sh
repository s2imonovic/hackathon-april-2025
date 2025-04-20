#!/bin/bash

# Function to extract contract address from deployment output
extract_address() {
    local output="$1"
    local pattern="$2"
    echo "$output" | grep "$pattern" | awk '{print $NF}' | tr -d '\r'
}

# Function to wait for a specified time
wait_for() {
    local seconds=$1
    echo "Waiting for $seconds seconds..."
    sleep $seconds
}

echo "🚀 Starting upgrade of ZetaOrderBook on ZetaChain mainnet..."

# Get the ProxyAdmin address from the saved addresses
PROXY_ADMIN_ADDRESS=$(npx hardhat run scripts/deployment/get-addresses.js --network mainnet 2>&1 | grep "ProxyAdmin:" | awk '{print $NF}')
if [ -z "$PROXY_ADMIN_ADDRESS" ]; then
    echo "❌ Failed to get ProxyAdmin address"
    exit 1
fi
echo "✅ Found ProxyAdmin at: $PROXY_ADMIN_ADDRESS"

# Get the ZetaOrderBook proxy address
ZETA_ORDERBOOK_ADDRESS=$(npx hardhat run scripts/deployment/get-addresses.js --network mainnet 2>&1 | grep "ZetaOrderBook:" | awk '{print $NF}')
if [ -z "$ZETA_ORDERBOOK_ADDRESS" ]; then
    echo "❌ Failed to get ZetaOrderBook proxy address"
    exit 1
fi
echo "✅ Found ZetaOrderBook proxy at: $ZETA_ORDERBOOK_ADDRESS"

# Deploy the new implementation
echo "Deploying new ZetaOrderBook implementation..."
IMPLEMENTATION_OUTPUT=$(npx hardhat run scripts/deployment/deploy-implementation.js --network mainnet 2>&1)
IMPLEMENTATION_STATUS=$?

if [ $IMPLEMENTATION_STATUS -ne 0 ]; then
    echo "❌ New implementation deployment failed:"
    echo "$IMPLEMENTATION_OUTPUT"
    exit 1
fi

# Wait for the contract to be available on the blockchain
echo "Waiting for contract to be available on the blockchain..."
wait_for 10

# Verify the new implementation
echo "Verifying new implementation..."
VERIFY_OUTPUT=$(npx hardhat run scripts/deployment/verify-implementation.js --network mainnet 2>&1)
VERIFY_STATUS=$?

if [ $VERIFY_STATUS -ne 0 ]; then
    echo "⚠️ Implementation verification had issues:"
    echo "$VERIFY_OUTPUT"
    # Don't exit here, as verification issues shouldn't stop the upgrade
else
    echo "✅ Implementation verification complete"
fi

# Upgrade the proxy to use the new implementation
echo "Upgrading proxy to use new implementation..."
UPGRADE_OUTPUT=$(npx hardhat run scripts/deployment/upgrade-proxy.js --network mainnet 2>&1)
UPGRADE_STATUS=$?

if [ $UPGRADE_STATUS -ne 0 ]; then
    echo "❌ Proxy upgrade failed:"
    echo "$UPGRADE_OUTPUT"
    exit 1
fi

echo "✅ Proxy upgrade complete"

echo "✅ Upgrade complete!"
echo "📝 Contract Addresses:"
echo "ProxyAdmin: $PROXY_ADMIN_ADDRESS"
echo "ZetaOrderBook Proxy: $ZETA_ORDERBOOK_ADDRESS"
echo "New ZetaOrderBook Implementation: $NEW_IMPLEMENTATION_ADDRESS" 
