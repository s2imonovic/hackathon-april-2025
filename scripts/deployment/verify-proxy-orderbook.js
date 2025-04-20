const hre = require("hardhat");
const { 
    getSavedContractProxies, 
    getSavedImplementationAddresses,
    getSavedConstructorArguments
} = require('../helpers/utils');

async function main() {
    console.log("🔍 Starting verification process...");
    
    const network = hre.network.name;
    console.log(`\n🔍 Network: ${network}`);
    
    // Get the deployed contract address
    console.log("📝 Loading saved addresses...");
    const savedProxies = getSavedContractProxies();
    const zetaOrderBookAddress = savedProxies[network]?.ZetaOrderBook;
    const TransparentUpgradeableProxyAddress = savedProxies[network]?.ZetaOrderBook;
    
    if (!zetaOrderBookAddress) {
        throw new Error(`ZetaOrderBook address not found for ${network}`);
    }
    console.log(`✅ Found ZetaOrderBook proxy at: ${zetaOrderBookAddress}`);
    // if (!TransparentUpgradeableProxyAddress) {
    //     throw new Error(`TransparentUpgradeableProxy address not found for ${network}`);
    // }
    // console.log(`✅ Found TransparentUpgradeableProxy at: ${TransparentUpgradeableProxyAddress}`);

    // Get the saved constructor arguments for this network
    const savedConstructorArgs = getSavedConstructorArguments();
    let proxyConstructorArgs = savedConstructorArgs[network]?.ZetaOrderBookProxy;
    // let transparentUpgradeableProxyConstructorArgs = savedConstructorArgs[network]?.ZetaOrderBookProxy;

    console.log(`✅ Using saved constructor arguments for proxy contract: ${JSON.stringify(proxyConstructorArgs)}`);
    // console.log(`✅ Using saved constructor arguments for transparent upgradeable proxy contract: ${JSON.stringify(transparentUpgradeableProxyConstructorArgs)}`);
    // Verify contract
    console.log("\n🔍 Starting Proxy contract verification...");
    console.log(`🔍 VERIFICATION DETAILS:`);
    console.log(`🔍 Contract Address: ${zetaOrderBookAddress}`);
    console.log(`🔍 Constructor Arguments: ${JSON.stringify(proxyConstructorArgs)}`);
    console.log(`🔍 Contract Name: ZetaOrderBook Proxy`);
    
    await verifyWithRetries(zetaOrderBookAddress, proxyConstructorArgs, "ZetaOrderBook Proxy");

    // console.log("\n🔍 Starting TransparentUpgradeableProxy contract verification...");
    // console.log(`🔍 VERIFICATION DETAILS:`);
    // console.log(`🔍 Contract Address: ${TransparentUpgradeableProxyAddress}`);
    // console.log(`🔍 Constructor Arguments: ${JSON.stringify(transparentUpgradeableProxyConstructorArgs)}`);
    // console.log(`🔍 Contract Name: TransparentUpgradeableProxy`);

    // await verifyWithRetries(TransparentUpgradeableProxyAddress, transparentUpgradeableProxyConstructorArgs, "TransparentUpgradeableProxy");
    
    // Get the implementation address
    const savedImplementations = getSavedImplementationAddresses();
    const implementationAddress = savedImplementations[network]?.ZetaOrderBook;
    
    if (!implementationAddress) {
        throw new Error(`ZetaOrderBook implementation address not found for ${network}`);
    }
    console.log(`✅ Found implementation at: ${implementationAddress}`);
    
    // For the implementation contract, we need to use empty constructor arguments
    // since the ZetaOrderBook has an empty constructor
    const constructorArgs = [];
    console.log(`✅ Using empty constructor arguments for implementation contract`);
    
    // Verify contract
    console.log("\n🔍 Starting contract verification...");
    console.log(`🔍 VERIFICATION DETAILS:`);
    console.log(`🔍 Contract Address: ${implementationAddress}`);
    console.log(`🔍 Constructor Arguments: ${JSON.stringify(constructorArgs)}`);
    console.log(`🔍 Contract Name: ZetaOrderBook`);
    
    await verifyWithRetries(implementationAddress, constructorArgs, "ZetaOrderBook");
}

// Helper function to verify contract with retries
async function verifyWithRetries(address, constructorArguments, contractName, maxRetries = 10) {
    const network = hre.network.name;
    const contractUrl = getContractUrl(network, address);

    // Skip verification if no API key is set
    if (!process.env.BLOCKSCOUT_API_KEY) {
        console.log("⚠️  No API key found. Skipping verification.");
        console.log(`View contract at: ${contractUrl}`);
        return;
    }

    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`Verifying contract (attempt ${i + 1}/${maxRetries})...`);
            console.log(`🔍 Attempting to verify address: ${address}`);
            console.log(`🔍 With constructor arguments: ${JSON.stringify(constructorArguments)}`);
            
            await hre.run("verify:verify", {
                address,
                constructorArguments,
            });
            console.log("Contract verified successfully");
            console.log(`View contract at: ${contractUrl}`);
            return;
        } catch (error) {
            if (error.message.includes("already verified")) {
                console.log("Contract is already verified");
                console.log(`View contract at: ${contractUrl}`);
                return;
            }
            
            // Check for rate limit error (429)
            if (error.message.includes("429") || error.message.includes("rate limit")) {
                const delay = Math.min(30 * Math.pow(2, i), 150); // Exponential backoff with 2.5 min cap
                console.log(`Rate limited. Waiting ${delay} seconds before retry...`);
                
                // Visual progress indicator
                const startTime = Date.now();
                const endTime = startTime + (delay * 1000);
                const progressBarLength = 20;
                
                while (Date.now() < endTime) {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(1, elapsed / (delay * 1000));
                    const filledLength = Math.floor(progress * progressBarLength);
                    const emptyLength = progressBarLength - filledLength;
                    
                    const filledBar = '█'.repeat(filledLength);
                    const emptyBar = '░'.repeat(emptyLength);
                    const percentage = Math.floor(progress * 100);
                    
                    process.stdout.write(`\r⏳ Waiting: [${filledBar}${emptyBar}] ${percentage}%`);
                    await sleep(1000);
                }
                process.stdout.write('\n');
                continue;
            }
            
            console.error(`Verification attempt ${i + 1} failed:`, error.message);
            if (i < maxRetries - 1) {
                console.log("Waiting 7 seconds before retrying...");
                await sleep(7000);
            }
        }
    }
    throw new Error(`Failed to verify contract after ${maxRetries} attempts`);
}

// Helper function to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to get contract URL
function getContractUrl(network, address) {
    if (network === 'testnet') {
        return `https://explorer.testnet.zetachain.com/address/${address}?tab=contract`;
    } else if (network === 'mainnet') {
        return `https://explorer.zetachain.com/address/${address}?tab=contract`;
    }
    return '';
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 