const hre = require("hardhat");
const { getSavedContractAddresses } = require('../helpers/utils');

async function main() {
    console.log("🔍 Starting verification process...");
    
    const network = hre.network.name;
    console.log(`\n🔍 Network: ${network}`);
    
    // Get the deployed contract address
    console.log("📝 Loading saved addresses...");
    const savedAddresses = getSavedContractAddresses();
    const zetaOrderBookAddress = savedAddresses[network]?.ZetaOrderBookIzumi;
    
    if (!zetaOrderBookAddress) {
        throw new Error(`ZetaOrderBookIzumi address not found for ${network}`);
    }
    console.log(`✅ Found ZetaOrderBookIzumi at: ${zetaOrderBookAddress}`);
    
    // Get the CallbackConnector address from Base
    console.log("🔍 Fetching CallbackConnector address...");
    const baseNetwork = network === 'testnet' ? 'base_sepolia' : 'base';
    const callbackConnectorAddress = savedAddresses[baseNetwork]?.CallbackConnector;
    if (!callbackConnectorAddress) {
        throw new Error(`CallbackConnector address not found for ${baseNetwork}`);
    }
    console.log(`✅ Found CallbackConnector at: ${callbackConnectorAddress}`);
    
    // Prepare deployment parameters
    console.log("📝 Preparing verification parameters...");
    const gatewayAddress = network === 'testnet' 
        ? "0x0c487a766110c85d301d96e33579c5b317fa4995" 
        : "0x48B9AACC350b20147001f88821d31731Ba4C30ed";
    
    const deploymentParams = [
        gatewayAddress,
        "0x02F55D53DcE23B4AA962CC68b0f685f26143Bdb2", // Swap (Izumi)
        network === 'testnet' 
            ? "0xcC683A782f4B30c138787CB5576a86AF66fdc31d" 
            : "0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a", // USDC.ETH
        network === 'testnet'
            ? "0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD"  // Testnet ETH.BASE ZRC20
            : "0x1de70f3e971B62A0707dA18100392af14f7fB677", // Destination Network Gas Token (Mainnet ETH.BASE ZRC20)
        callbackConnectorAddress, // hre.ethers.AbiCoder.defaultAbiCoder().encode(["address"], [callbackConnectorAddress]),
        "0x1502d025BfA624469892289D45C0352997251728", // LimitOrderManager
        "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf" // WZETA
    ];
    
    console.log(`\n📝 Verification Parameters:`, JSON.stringify(deploymentParams, null, 2));
    
    // Verify contract
    console.log("\n🔍 Starting contract verification...");
    await verifyWithRetries(zetaOrderBookAddress, deploymentParams, "ZetaOrderBookIzumi");
}

// Helper function to verify contract with retries
async function verifyWithRetries(address, constructorArguments, contractName, maxRetries = 10) {
    const network = hre.network.name;
    const contractUrl = getContractUrl(network, address);

    // Skip verification if no API key is set
    if (!process.env.BASESCAN_API_KEY && !process.env.BLOCKSCOUT_API_KEY) {
        console.log("⚠️  No API key found. Skipping verification.");
        console.log(`View contract at: ${contractUrl}`);
        return;
    }

    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`Verifying contract (attempt ${i + 1}/${maxRetries})...`);
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
                console.log(`${error.message}`);
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
    if (network === 'base_sepolia') {
        return `https://base-sepolia.blockscout.com/address/${address}?tab=contract`;
    } else if (network === 'base') {
        return `https://basescan.org/address/${address}`;
    } else if (network === 'testnet') {
        return `https://zetachain-testnet.blockscout.com/address/${address}?tab=contract`;
    } else if (network === 'mainnet') {
        return `https://zetachain.blockscout.com/address/${address}?tab=contract`;
    }
    return '';
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 
