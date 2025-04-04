const hre = require("hardhat");
const { getSavedContractAddresses } = require('../helpers/utils');

async function main() {
    console.log("🔍 Starting verification process...");
    
    const network = hre.network.name;
    console.log(`\n🔍 Network: ${network}`);
    
    // Get the deployed contract address
    console.log("📝 Loading saved addresses...");
    const savedAddresses = getSavedContractAddresses();
    const callbackConnectorAddress = savedAddresses[network]?.CallbackConnector;
    
    if (!callbackConnectorAddress) {
        throw new Error(`CallbackConnector address not found for ${network}`);
    }
    console.log(`✅ Found CallbackConnector at: ${callbackConnectorAddress}`);
    
    // Prepare verification parameters
    console.log("📝 Preparing verification parameters...");
    const gatewayAddress = network === 'base_sepolia' 
        ? "0x0c487a766110c85d301d96e33579c5b317fa4995"  // Base Sepolia Gateway
        : "0x48B9AACC350b20147001f88821d31731Ba4C30ed"; // Base Mainnet Gateway
    
    const deploymentParams = [
        gatewayAddress,
        hre.ethers.ZeroAddress // Universal contract address will be set later
    ];
    
    console.log("\n📋 Verification Parameters:");
    console.log("1. Gateway Address:", gatewayAddress);
    console.log("2. Universal Contract Address:", hre.ethers.ZeroAddress);
    
    // Verify contract
    console.log("\n🔍 Starting contract verification...");
    await verifyWithRetries(callbackConnectorAddress, deploymentParams, "CallbackConnector");
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
    }
    return '';
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 