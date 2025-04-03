const hre = require("hardhat");
const { saveContractAddress, saveContractAbi, getSavedContractAddresses } = require('../helpers/utils');
const fs = require('fs');
const path = require('path');

// Helper function to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to get contract URL
function getContractUrl(network, address) {
    if (network === 'base_sepolia') {
        return `https://base-sepolia.blockscout.com/address/${address}?tab=contract`;
    } else if (network === 'base') {
        // return `https://basescan.org/address/${address}`;
        return `https://base.blockscout.com/address/${address}?tab=contract`;
    } else if (network === 'testnet') {
        return `https://zetachain-testnet.blockscout.com/address/${address}?tab=contract`;
    } else if (network === 'mainnet') {
        // return `https://explorer.zetachain.com/address/${address}`;
        return `https://zetachain.blockscout.com/address/${address}?tab=contract`;
    }
    return '';
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
    console.log(`\n🔍 Network: ${network}`);
    console.log(`🔑 Using account: ${(await hre.ethers.provider.getSigner()).address}`);
    
    const savedAddresses = getSavedContractAddresses();
    console.log(`📝 Saved addresses:`, JSON.stringify(savedAddresses, null, 2));
    
    // Get current gas price and add 50% buffer
    const gasPrice = await hre.ethers.provider.getFeeData();
    const finalGasPrice = gasPrice.gasPrice * 15n / 10n; // Add 50% buffer
    console.log(`⛽ Base gas price: ${gasPrice.gasPrice} wei`);
    console.log(`⛽ Final gas price with buffer: ${finalGasPrice} wei`);

    // Get account balance
    const balance = await hre.ethers.provider.getBalance((await hre.ethers.provider.getSigner()).address);
    console.log(`💰 Account balance: ${hre.ethers.formatEther(balance)} ETH`);

    // Ensure arguments directory exists
    const argumentsDir = path.join(__dirname, '../../deployments/arguments');
    if (!fs.existsSync(argumentsDir)) {
        fs.mkdirSync(argumentsDir, { recursive: true });
    }

    if (network === 'base_sepolia' || network === 'base') {
        console.log(`\n🚀 Deploying CallbackConnector to ${network}...`);
        // Deploy CallbackConnector to Base
        const CallbackConnector = await hre.ethers.getContractFactory("CallbackConnector");
        const callbackConnector = await CallbackConnector.deploy(
            network === 'base_sepolia' 
                ? "0x0c487a766110c85d301d96e33579c5b317fa4995"  // Base Sepolia Gateway
                : "0x48B9AACC350b20147001f88821d31731Ba4C30ed", // Base Mainnet Gateway
            hre.ethers.ZeroAddress, // Universal contract address will be set later
            {
                gasPrice: finalGasPrice
            }
        );

        console.log(`✅ CallbackConnector deployed to ${network}: `, callbackConnector.target);
        saveContractAddress(network, 'CallbackConnector', callbackConnector.target);
        saveContractAbi(network, 'CallbackConnector', (await hre.artifacts.readArtifact("CallbackConnector")));

        // Save constructor arguments for verification
        const callbackConnectorArgs = [
            network === 'base_sepolia' 
                ? "0x0c487a766110c85d301d96e33579c5b317fa4995"  // Base Sepolia Gateway
                : "0x48B9AACC350b20147001f88821d31731Ba4C30ed", // Base Mainnet Gateway
            hre.ethers.ZeroAddress // Universal contract address
        ];
        fs.writeFileSync(
            path.join(argumentsDir, 'CallbackConnector.json'),
            JSON.stringify(callbackConnectorArgs, null, 2)
        );

        // Wait for contract to be mined
        console.log("⏳ Waiting for CallbackConnector to be mined...");
        await callbackConnector.waitForDeployment();

        // Verify the contract with retries
        try {
            await verifyWithRetries(callbackConnector.target, callbackConnectorArgs);
        } catch (error) {
            console.error("❌ Failed to verify CallbackConnector after all retries:", error);
        }
    } else if (network === 'testnet' || network === 'mainnet') {
        // Get CallbackConnector address from saved addresses
        const baseNetwork = network === 'testnet' ? 'base_sepolia' : 'base';
        const callbackConnectorAddress = savedAddresses[baseNetwork]?.['CallbackConnector'];
        if (!callbackConnectorAddress) {
            throw new Error(`CallbackConnector not deployed on ${baseNetwork} yet. Deploy it first.`);
        }
        console.log(`\n🔍 Using CallbackConnector from ${baseNetwork}: ${callbackConnectorAddress}`);

        console.log(`\n🚀 Deploying ZetaOrderBook to ${network}...`);
        // Deploy ZetaOrderBook to ZetaChain
        const ZetaOrderBook = await hre.ethers.getContractFactory("ZetaOrderBook");
        const constructorArgs = [
            network === 'testnet'
                ? "0x6c533f7fe93fae114d0954697069df33c9b74fd7"  // ZetaChain Testnet Gateway
                : "0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E", // ZetaChain Mainnet Gateway
            network === 'testnet'
                ? "0x0708325268dF9F66270F1401206434524814508b"  // Testnet Pyth Oracle
                : "0x2880aB155794e7179c9eE2e38200202908C17B43", // Mainnet Pyth Oracle
            network === 'testnet'
                ? "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe"  // Testnet UniswapV2 Router
                : "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe", // Mainnet UniswapV2 Router
            network === 'testnet'
                ? "0xcC683A782f4B30c138787CB5576a86AF66fdc31d"  // Testnet USDC
                : "0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a", // Mainnet USDC.ETH
            network === 'testnet'
                ? "0xb70656181007f487e392bf0d92e55358e9f0da5da6531c7c4ce7828aa11277fe"  // Testnet ZETA price ID
                : "0xb70656181007f487e392bf0d92e55358e9f0da5da6531c7c4ce7828aa11277fe", // Mainnet ZETA price ID
            network === 'testnet'
                ? "0xc0B74d761ef4EC9e9473f65687d36B9F13DB0dCc"  // Base Sepolia Connector
                : "0xfc6a3d4D373B522B182E8caDd66ECF140a313E2F", // Base Mainnet Connector
            callbackConnectorAddress
        ];

        console.log(`\n📝 Constructor arguments:`, JSON.stringify(constructorArgs, null, 2));

        const zetaOrderBook = await ZetaOrderBook.deploy(
            ...constructorArgs,
            {
                gasPrice: finalGasPrice
            }
        );

        console.log(`✅ ZetaOrderBook deployed to ${network}: `, zetaOrderBook.target);
        saveContractAddress(network, 'ZetaOrderBook', zetaOrderBook.target);
        saveContractAbi(network, 'ZetaOrderBook', (await hre.artifacts.readArtifact("ZetaOrderBook")));

        // Save constructor arguments for verification
        fs.writeFileSync(
            path.join(argumentsDir, 'ZetaOrderBook.json'),
            JSON.stringify(constructorArgs, null, 2)
        );

        // Wait for contract to be mined
        console.log("⏳ Waiting for ZetaOrderBook to be mined...");
        await zetaOrderBook.waitForDeployment();

        // Verify the contract with retries
        try {
            await verifyWithRetries(zetaOrderBook.target, constructorArgs);
        } catch (error) {
            console.error("❌ Failed to verify ZetaOrderBook after all retries:", error);
        }
    } else {
        throw new Error("Unsupported network");
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error("\n❌ Error details:");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        if (error.data) console.error("Error data:", error.data);
        if (error.transaction) console.error("Error transaction:", error.transaction);
        if (error.receipt) console.error("Error receipt:", error.receipt);
        process.exit(1);
    }); 