const hre = require("hardhat");
const { saveContractAddress, saveContractAbi, getSavedContractAddresses } = require('../helpers/utils');
const fs = require('fs');
const path = require('path');

// Helper function to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to get contract URL
function getContractUrl(network, address) {
    const baseUrl = network === 'base_sepolia' 
        ? 'https://base-sepolia.blockscout.com/address'
        : 'https://zetachain-testnet.blockscout.com/address';
    return `${baseUrl}/${address}?tab=contract`;
}

// Helper function to verify contract with retries
async function verifyWithRetries(address, constructorArguments, maxRetries = 3) {
    const network = hre.network.name;
    const contractUrl = getContractUrl(network, address);

    // Skip verification if no API key is set
    if (!process.env.BLOCKSCOUT_API_KEY) {
        console.log("⚠️  No Blockscout API key found. Skipping verification.");
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
            // Check if the error indicates the contract is already verified
            if (error.message.includes("already verified")) {
                console.log("Contract is already verified");
                console.log(`View contract at: ${contractUrl}`);
                return;
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
    // Force compilation
    await hre.run('compile', { force: true });

    const network = hre.network.name;
    const savedAddresses = getSavedContractAddresses();
    
    // Get current gas price and add 50% buffer
    const gasPrice = await hre.ethers.provider.getFeeData();
    const finalGasPrice = gasPrice.gasPrice * 15n / 10n; // Add 50% buffer

    // Ensure arguments directory exists
    const argumentsDir = path.join(__dirname, '../../deployments/arguments');
    if (!fs.existsSync(argumentsDir)) {
        fs.mkdirSync(argumentsDir, { recursive: true });
    }

    if (network === 'base_sepolia') {
        // Deploy CallbackConnector to Base Sepolia
        const CallbackConnector = await hre.ethers.getContractFactory("CallbackConnector");
        const callbackConnector = await CallbackConnector.deploy(
            "0x0c487a766110c85d301d96e33579c5b317fa4995", // Base Sepolia Gateway
            hre.ethers.ZeroAddress, // Universal contract address will be set later
            {
                gasPrice: finalGasPrice
            }
        );

        console.log("CallbackConnector deployed to Base Sepolia: ", callbackConnector.target);
        saveContractAddress(network, 'CallbackConnector', callbackConnector.target);
        saveContractAbi(network, 'CallbackConnector', (await hre.artifacts.readArtifact("CallbackConnector")));

        // Save constructor arguments for verification
        const callbackConnectorArgs = [
            "0x0c487a766110c85d301d96e33579c5b317fa4995", // Base Sepolia Gateway
            hre.ethers.ZeroAddress // Universal contract address
        ];
        fs.writeFileSync(
            path.join(argumentsDir, 'CallbackConnector.json'),
            JSON.stringify(callbackConnectorArgs, null, 2)
        );

        // Wait for contract to be mined
        console.log("Waiting for CallbackConnector to be mined...");
        await callbackConnector.waitForDeployment();

        // Verify the contract with retries
        try {
            await verifyWithRetries(callbackConnector.target, callbackConnectorArgs);
        } catch (error) {
            console.error("Failed to verify CallbackConnector after all retries:", error);
        }
    } else if (network === 'testnet') {
        // Get CallbackConnector address from saved addresses
        const callbackConnectorAddress = savedAddresses['base_sepolia']?.['CallbackConnector'];
        if (!callbackConnectorAddress) {
            throw new Error("CallbackConnector not deployed on Base Sepolia yet. Deploy it first.");
        }

        // Deploy ZetaOrderBook to ZetaChain testnet
        const ZetaOrderBook = await hre.ethers.getContractFactory("ZetaOrderBook");
        const constructorArgs = [
            "0x6c533f7fe93fae114d0954697069df33c9b74fd7", // ZetaChain Gateway
            "0x0708325268dF9F66270F1401206434524814508b", // Pyth Oracle
            "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe", // UniswapV2 Router
            "0x4bC32034caCcc9B7e02536945eDbC286bACbA073", // USDC.ARBSEP
            "0xb70656181007f487e392bf0d92e55358e9f0da5da6531c7c4ce7828aa11277fe", // ZETA price ID
            "0xc0B74d761ef4EC9e9473f65687d36B9F13DB0dCc", // Base Sepolia Connector
            callbackConnectorAddress
        ];

        const zetaOrderBook = await ZetaOrderBook.deploy(
            ...constructorArgs,
            {
                gasPrice: finalGasPrice
            }
        );

        console.log("ZetaOrderBook deployed to ZetaChain testnet: ", zetaOrderBook.target);
        saveContractAddress(network, 'ZetaOrderBook', zetaOrderBook.target);
        saveContractAbi(network, 'ZetaOrderBook', (await hre.artifacts.readArtifact("ZetaOrderBook")));

        // Save constructor arguments for verification
        fs.writeFileSync(
            path.join(argumentsDir, 'ZetaOrderBook.json'),
            JSON.stringify(constructorArgs, null, 2)
        );

        // Wait for contract to be mined
        console.log("Waiting for ZetaOrderBook to be mined...");
        await zetaOrderBook.waitForDeployment();

        // Verify the contract with retries
        try {
            await verifyWithRetries(zetaOrderBook.target, constructorArgs);
        } catch (error) {
            console.error("Failed to verify ZetaOrderBook after all retries:", error);
        }
    } else {
        throw new Error("Unsupported network");
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 