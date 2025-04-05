const hre = require("hardhat");
const { saveContractAddress, saveContractAbi, getSavedContractAddresses } = require('../helpers/utils');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

// Helper function to calculate contract code hash
async function getContractCodeHash(contractName) {
    const artifact = await hre.artifacts.readArtifact(contractName);
    const code = artifact.deployedBytecode;
    return crypto.createHash('sha256').update(code).digest('hex');
}

// Helper function to check if contract code has changed
async function hasContractCodeChanged(contractName, network) {
    const currentHash = await getContractCodeHash(contractName);
    const hashFile = path.join(__dirname, `../../deployments/hashes/${network}/${contractName}.hash`);
    
    if (!fs.existsSync(hashFile)) {
        return true;
    }
    
    const savedHash = fs.readFileSync(hashFile, 'utf8').trim();
    return currentHash !== savedHash;
}

// Helper function to save contract code hash
async function saveContractCodeHash(contractName, network) {
    const hash = await getContractCodeHash(contractName);
    const hashDir = path.join(__dirname, `../../deployments/hashes/${network}`);
    if (!fs.existsSync(hashDir)) {
        fs.mkdirSync(hashDir, { recursive: true });
    }
    fs.writeFileSync(path.join(hashDir, `${contractName}.hash`), hash);
}

// Helper function to verify contract with retries
async function verifyWithRetries(address, constructorArguments, contractName, maxRetries = 5) {
    const network = hre.network.name;
    const contractUrl = getContractUrl(network, address);

    // Skip verification if no API key is set
    if (!process.env.BASESCAN_API_KEY && !process.env.BLOCKSCOUT_API_KEY) {
        console.log("⚠️  No API key found. Skipping verification.");
        console.log(`View contract at: ${contractUrl}`);
        return;
    }

    // Check if verification should be skipped
    const forceFlag = contractName === 'ZetaOrderBookIzumi' 
        ? 'FORCE_ORDERBOOK_CONTRACT_VALIDATION' 
        : 'FORCE_CALLBACK_CONTRACT_VALIDATION';
    
    if (!process.env[forceFlag] && !(await hasContractCodeChanged(contractName, network))) {
        console.log(`ℹ️  Contract ${contractName} code unchanged. Skipping verification.`);
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
            await saveContractCodeHash(contractName, network);
            return;
        } catch (error) {
            console.log(`${error.message}`);
            if (error.message.includes("already verified")) {
                console.log("Contract is already verified");
                console.log(`View contract at: ${contractUrl}`);
                await saveContractCodeHash(contractName, network);
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

async function main() {
    console.log("🔨 Starting deployment process...");
    
    // Force compilation
    console.log("📦 Compiling contracts...");
    await hre.run('compile', { force: true });
    console.log("✅ Compilation complete");

    const network = hre.network.name;
    console.log(`\n🔍 Network: ${network}`);
    console.log(`🔑 Using account: ${(await hre.ethers.provider.getSigner()).address}`);
    
    // Check RPC health
    console.log("🌐 Checking RPC health...");
    try {
        const blockNumber = await hre.ethers.provider.getBlockNumber();
        console.log(`✅ RPC is healthy. Current block: ${blockNumber}`);
    } catch (error) {
        console.error("❌ RPC health check failed:", error.message);
        throw new Error("RPC endpoint is not responding correctly. Please check your RPC configuration.");
    }
    
    console.log("📝 Loading saved addresses...");
    const savedAddresses = getSavedContractAddresses();
    console.log(`📝 Saved addresses:`, JSON.stringify(savedAddresses, null, 2));
    
    // Get current gas price and add buffer
    console.log("⛽ Fetching gas price...");
    let finalGasPrice;
    try {
        const gasPrice = await hre.ethers.provider.getFeeData();
        finalGasPrice = network === 'mainnet' 
            ? gasPrice.gasPrice * 3n // 3x buffer for mainnet
            : gasPrice.gasPrice * 15n / 10n; // 50% buffer for testnet
        console.log(`⛽ Base gas price: ${gasPrice.gasPrice} wei`);
        console.log(`⛽ Final gas price with buffer: ${finalGasPrice} wei`);
    } catch (error) {
        console.error("❌ Failed to fetch gas price:", error.message);
        throw new Error("Unable to get gas price from RPC. Please check your RPC configuration.");
    }

    // Get account balance
    console.log("💰 Checking account balance...");
    try {
        const balance = await hre.ethers.provider.getBalance((await hre.ethers.provider.getSigner()).address);
        console.log(`💰 Account balance: ${hre.ethers.formatEther(balance)} ETH`);
    } catch (error) {
        console.error("❌ Failed to get account balance:", error.message);
        throw new Error("Unable to get account balance from RPC. Please check your RPC configuration.");
    }

    // Ensure arguments directory exists
    console.log("📁 Setting up deployment directories...");
    const argumentsDir = path.join(__dirname, '../../deployments/arguments');
    if (!fs.existsSync(argumentsDir)) {
        fs.mkdirSync(argumentsDir, { recursive: true });
    }

    if (network === 'base_sepolia' || network === 'base') {
        console.log(`\n🚀 Starting CallbackConnector deployment to ${network}...`);
        // Deploy CallbackConnector to Base
        console.log("📦 Creating CallbackConnector contract factory...");
        const CallbackConnector = await hre.ethers.getContractFactory("CallbackConnector");
        
        console.log("📝 Preparing deployment parameters...");
        const gatewayAddress = network === 'base_sepolia' 
            ? "0x0c487a766110c85d301d96e33579c5b317fa4995"  // Base Sepolia Gateway
            : "0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E"; // Base Mainnet Gateway
        
        console.log("🚀 Deploying CallbackConnector...");
        const callbackConnector = await CallbackConnector.deploy(
            gatewayAddress,
            hre.ethers.ZeroAddress, // Universal contract address will be set later
            {
                gasPrice: finalGasPrice
            }
        );
        console.log("⏳ Waiting for deployment confirmation...");
        await callbackConnector.waitForDeployment();
        const callbackConnectorAddress = await callbackConnector.getAddress();
        console.log(`✅ CallbackConnector deployed to ${network}: ${callbackConnectorAddress}`);

        // Save contract address and ABI
        console.log("💾 Saving contract details...");
        saveContractAddress(network, "CallbackConnector", callbackConnectorAddress);
        saveContractAbi("CallbackConnector", CallbackConnector.interface.formatJson());

        // Verify contract
        console.log("🔍 Starting contract verification...");
        await verifyWithRetries(callbackConnectorAddress, [
            gatewayAddress,
            hre.ethers.ZeroAddress
        ], "CallbackConnector");

    } else if (network === 'testnet' || network === 'mainnet') {
        console.log(`\n🚀 Starting ZetaOrderBookIzumi deployment to ${network}...`);
        
        // Get the CallbackConnector address from Base
        console.log("🔍 Fetching CallbackConnector address...");
        const baseNetwork = network === 'testnet' ? 'base_sepolia' : 'base';
        const callbackConnectorAddress = getSavedContractAddresses()[baseNetwork]?.CallbackConnector;
        if (!callbackConnectorAddress) {
            throw new Error(`CallbackConnector address not found for ${baseNetwork}`);
        }
        console.log(`✅ Found CallbackConnector at: ${callbackConnectorAddress}`);

        // Deploy ZetaOrderBookIzumi
        console.log("📦 Creating ZetaOrderBookIzumi contract factory...");
        const ZetaOrderBook = await hre.ethers.getContractFactory("ZetaOrderBookIzumi");
        
        console.log("📝 Preparing deployment parameters...");
        const gatewayAddress = network === 'testnet' 
            ? "0x0c487a766110c85d301d96e33579c5b317fa4995" 
            : "0x48B9AACC350b20147001f88821d31731Ba4C30ed";
        
        const deploymentParams = [
            gatewayAddress,
            // "0x34bc1b87f60e0a30c0e24FD7Abada70436c71406", // Router (izumi quoter 1000 ticks) (is this correct?)
            "0x02F55D53DcE23B4AA962CC68b0f685f26143Bdb2", // Swap (Izumi)
            network === 'testnet' 
                ? "0xcC683A782f4B30c138787CB5576a86AF66fdc31d" 
                : "0x7c8dDa80bbBE1254a7aACf3219EBe1481c6E01d7", // USDT.ETH // : "0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a", // USDC.ETH
            network === 'testnet'
                ? "0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD"  // Testnet ETH.BASE ZRC20
                : "0x1de70f3e971B62A0707dA18100392af14f7fB677", // Destination Network Gas Token (Mainnet ETH.BASE ZRC20)
            callbackConnectorAddress, // hre.ethers.AbiCoder.defaultAbiCoder().encode(["address"], [callbackConnectorAddress]),
            "0x1502d025BfA624469892289D45C0352997251728", // LimitOrderManager
            "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf" // WZETA
        ];
       
        console.log(`\n📝 Deployment Parameters:`, JSON.stringify(deploymentParams, null, 2));

        // console.log("\n📋 Deployment Parameters:");
        // console.log("1. Gateway Address:", gatewayAddress);
        // console.log("2. Router Address:", "0x34bc1b87f60e0a30c0e24FD7Abada70436c71406");
        // console.log("3. USDC Address:", network === 'testnet' 
        //     ? "0xcC683A782f4B30c138787CB5576a86AF66fdc31d" 
        //     : "0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a");
        // console.log("4. ETH.BASE ZRC20 Address:", network === 'testnet'
        //     ? "0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD"
        //     : "0x1de70f3e971B62A0707dA18100392af14f7fB677");
        // // WRONG: console.log("5. Callback Address (encoded):", hre.ethers.AbiCoder.defaultAbiCoder().encode(["address"], [callbackConnectorAddress]));
        // console.log("5. Callback Address:", hre.ethers.AbiCoder.defaultAbiCoder().encode(["address"], [callbackConnectorAddress]));
        // console.log("6. Limit Order Manager:", "0x3EF68D3f7664b2805D4E88381b64868a56f88bC4");
        // console.log("7. WZETA Address:", "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91");
       
        console.log("\n🔍 Verifying parameter validity...");
        try {
            // Verify all addresses are valid
            deploymentParams.forEach((param, index) => {
                if (typeof param === 'string' && param.startsWith('0x')) {
                    try {
                        hre.ethers.getAddress(param);
                        console.log(`✅ Parameter ${index + 1} is a valid address`);
                    } catch (e) {
                        console.error(`❌ Parameter ${index + 1} is not a valid address:`, param);
                    }
                }
            });
        } catch (error) {
            console.error("❌ Error validating parameters:", error.message);
        }
        
        console.log("\n🚀 Deploying ZetaOrderBookIzumi...");
        try {
            // Deploy
            const zetaOrderBook = await ZetaOrderBook.deploy(
                ...deploymentParams,
                {
                    gasPrice: finalGasPrice
                }
            );
            
            console.log("⏳ Waiting for deployment confirmation...");

            // Wait for deployment confirmation and get the contract address
            await zetaOrderBook.waitForDeployment();
            const zetaOrderBookAddress = await zetaOrderBook.getAddress();
            console.log(`✅ zetaOrderBook deployed to ${network}: ${zetaOrderBookAddress}`);
            
            // Save contract address and ABI
            console.log("💾 Saving contract details...");
            saveContractAddress(network, "ZetaOrderBookIzumi", zetaOrderBookAddress);
            saveContractAbi("ZetaOrderBookIzumi", ZetaOrderBook.interface.formatJson());

            // Verify contract
            console.log("🔍 Starting contract verification...");
            await verifyWithRetries(zetaOrderBookAddress, deploymentParams, "ZetaOrderBookIzumi");
        } catch (error) {
            console.error("❌ Deployment failed:", error.message);
            if (error.message.includes("execution reverted")) {
                console.error("The transaction was reverted. This could be due to:");
                console.error("1. Insufficient gas");
                console.error("2. Invalid constructor parameters");
                console.error("3. RPC endpoint issues");
                console.error("Please check your configuration and try again.");
            }
            throw error;
        }
    }
    
    console.log("\n✨ Deployment process completed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 
