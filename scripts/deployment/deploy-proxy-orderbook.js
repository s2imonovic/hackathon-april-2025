const hre = require("hardhat");

// Delete this? const { getSavedContractProxies, saveContractAddress, getSavedContractAddresses, saveContractAbi, saveContractProxies, getSavedContractProxies, saveImplementationAddress, saveConstructorArguments } = require('../helpers/utils');
const { getSavedContractProxy, getSavedContractProxies, saveContractProxies, saveImplementationAddress, saveConstructorArguments } = require('../helpers/utils');
// Delete this? const { web3, ethers, toWeiDenomination, hexify, upgrades, encodeData} = require('../helpers/setup');
const { calculateGasPrice } = require('../helpers/ethereum');
const delay = ms => new Promise(res => setTimeout(res, ms));
const delayLength = 6000;

async function main() {
    await hre.run('compile');

    const finalGasPrice = await calculateGasPrice();
    const network = hre.network.name;

    // Get the owner address from the saved addresses
    const ownerAddress = getSavedContractProxy(network, 'ProxyAdmin');
    if (!ownerAddress) {
        throw new Error(`ProxyAdmin address not found for ${network}`);
    }
    console.log(`✅ Found ProxyAdmin at: ${ownerAddress}`);

    const baseNetwork = network === 'testnet' ? 'base_sepolia' : 'base';
    const callbackConnectorAddress = getSavedContractProxies()[baseNetwork]?.CallbackConnector;
    if (!callbackConnectorAddress) {
        throw new Error(`CallbackConnector proxy address not found for ${baseNetwork}`);
    }
    console.log(`✅ Found CallbackConnector proxy at: ${callbackConnectorAddress}`);

    // Deploy the implementation contract
    const ZetaOrderBook = await hre.ethers.getContractFactory("ZetaOrderBook");
    const zetaOrderBook = await ZetaOrderBook.deploy({gasPrice: finalGasPrice});
    console.log("ZetaOrderBook implementation deployed to: ", zetaOrderBook.target);
    
    // Save the implementation address
    saveImplementationAddress(network, 'ZetaOrderBook', zetaOrderBook.target);
    console.log("Implementation: " + zetaOrderBook.target);
    
    // Save empty constructor arguments for the implementation contract
    // The ZetaOrderBook has an empty constructor
    saveConstructorArguments(network, 'ZetaOrderBook', []);
    console.log("Implementation constructor arguments saved: []");

    await delay(delayLength);

    // Initialize the contract with empty data (will be set later)
    const data = "0x";
    
    // Save proxy constructor arguments separately
    const proxyConstructorArgs = [zetaOrderBook.target, ownerAddress, data];
    saveConstructorArguments(network, 'ZetaOrderBookProxy', proxyConstructorArgs);
    console.log("Proxy constructor arguments saved:", JSON.stringify(proxyConstructorArgs));

    // Deploy the proxy
    const proxyFactory = await hre.ethers.getContractFactory("@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy");
    const proxy = await proxyFactory.deploy(
        zetaOrderBook.target,
        ownerAddress,
        data,
        {gasPrice: finalGasPrice}
    );
    console.log("ZetaOrderBook: " + proxy.target);
    saveContractProxies(network, 'ZetaOrderBook', proxy.target);

    console.log("Verifying ZetaOrderBook Proxy...");
    // verify proxy.target as TransparentUpgradeableProxy
    await verifyWithRetries(proxy.target, proxyConstructorArgs, "ZetaOrderBook Proxy");
}

// Helper function to get contract URL
function getContractUrl(network, address) {
    if (network === 'base_sepolia') {
        return `https://base-sepolia.blockscout.com/address/${address}?tab=contract`;
    } else if (network === 'base') {
        return `https://basescan.org/address/${address}`;
    } else if (network === 'mainnet') {
        return `https://explorer.zetachain.com/address/${address}`;
    }
    return '';
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

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
