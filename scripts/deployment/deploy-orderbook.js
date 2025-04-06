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
        return `https://base.blockscout.com/address/${address}?tab=contract`;
    } else if (network === 'testnet') {
        return `https://zetachain-testnet.blockscout.com/address/${address}?tab=contract`;
    } else if (network === 'mainnet') {
        return `https://zetachain.blockscout.com/address/${address}?tab=contract`;
    }
    return '';
}

// Helper function to verify contract with retries
async function verifyWithRetries(address, constructorArguments, maxRetries = 3) {
    await sleep(6000); // Wait for the contract to be indexed by Blockscout
    const network = hre.network.name;
    const contractUrl = getContractUrl(network, address);

    console.log(`Trying to verify. View contract at: ${contractUrl}`);
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
                console.log("Waiting 60 seconds before retrying...");
                await sleep(60000);
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

    if (network === 'base_sepolia' || network === 'base') {
        console.log(`\n🚀 Starting CallbackConnector deployment to ${network}...`);
        // Deploy CallbackConnector to Base
        const CallbackConnector = await hre.ethers.getContractFactory("CallbackConnector");

        const gatewayAddress = network === 'base_sepolia' 
            ? "0x0c487a766110c85d301d96e33579c5b317fa4995"  // Base Sepolia Gateway
            : "0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E"; // Base Mainnet Gateway

        const callbackConnector = await CallbackConnector.deploy(
            gatewayAddress, // Base Sepolia Gateway
            hre.ethers.ZeroAddress, // Universal contract address will be set later
            {
                gasPrice: finalGasPrice
            }
        );

        const callbackConnectorAddress = await callbackConnector.getAddress();
        console.log(`✅ CallbackConnector deployed to ${network}: ${callbackConnectorAddress}`);
        saveContractAddress(network, 'CallbackConnector', callbackConnectorAddress);
        saveContractAbi(network, 'CallbackConnector', (await hre.artifacts.readArtifact("CallbackConnector")));

        // Save constructor arguments for verification
        const callbackConnectorArgs = [
            gatewayAddress, // Base Sepolia Gateway
            hre.ethers.ZeroAddress // Universal contract address will be set later
        ];
        fs.writeFileSync(
            path.join(argumentsDir, 'CallbackConnector.json'),
            JSON.stringify(callbackConnectorArgs, null, 2)
        );

        // Wait for contract to be mined
        console.log("Waiting for CallbackConnector to be mined...");
        await callbackConnector.waitForDeployment();

        // TODO: Fix verification. It swears that callbackConnector.target isn't a contract. 
        //    Re-Verification is not needed until the contract changes however.
        // Verify the contract with retries
        // try {
        //     await verifyWithRetries(callbackConnectorAddress, callbackConnectorArgs);
        // } catch (error) {
        //     console.error("Failed to verify CallbackConnector after all retries:", error);
        // }
    } else if (network === 'testnet' || network === 'mainnet') {
        // Get the CallbackConnector address from Base
        console.log("🔍 Fetching CallbackConnector address...");
        const baseNetwork = network === 'testnet' ? 'base_sepolia' : 'base';
        const callbackConnectorAddress = getSavedContractAddresses()[baseNetwork]?.CallbackConnector;
        if (!callbackConnectorAddress) {
            throw new Error(`CallbackConnector address not found for ${baseNetwork}`);
        }
        console.log(`✅ Found CallbackConnector at: ${callbackConnectorAddress}`);

        console.log("📝 Preparing deployment parameters...");
        const gatewayAddress = network === 'testnet' 
            ? "0x0c487a766110c85d301d96e33579c5b317fa4995" 
            : "0x48B9AACC350b20147001f88821d31731Ba4C30ed";
        const pythOracleAddress = network === 'testnet' 
            ? "0x0708325268dF9F66270F1401206434524814508b"
            : "0x2880aB155794e7179c9eE2e38200202908C17B43";
        const swapGateway = "0xCad412df586F187E0D303dD8C5f3603d4c350B5f" // this is actually the Beam NativeSwapRouter. UniswapV2RouterAddress is "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe"; // gas stability pools
        const tradePairAddress = network === 'testnet' 
            ? "0xcC683A782f4B30c138787CB5576a86AF66fdc31d" // USDC.SEP
            : "0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a"; // USDC.ETH
        const zetaPriceId = "0xb70656181007f487e392bf0d92e55358e9f0da5da6531c7c4ce7828aa11277fe";
        const baseGatewayAddress = network === 'testnet' 
            ? "0xc0B74d761ef4EC9e9473f65687d36B9F13DB0dCc" // Base Sepolia Connector
            : "0x48B9AACC350b20147001f88821d31731Ba4C30ed"; // Base Gateway
        const connectedGasZRC20 = "0x1de70f3e971B62A0707dA18100392af14f7fB677"; // ETH.BASE token address
        const ownerAddress = "0xd2c1C15160B20d8D48765e49E13f92C7F2fF98E4"; // Contract owner

        // Deploy ZetaOrderBook to ZetaChain testnet
        const ZetaOrderBook = await hre.ethers.getContractFactory("ZetaOrderBook");
        const constructorArgs = [
            gatewayAddress, // ZetaChain Gateway
            pythOracleAddress, // Pyth Oracle
            swapGateway, // Swap Gateway, NOT UniswapV2 Router anymore
            tradePairAddress, // USDC.SEP or USDC.ETH
            zetaPriceId, // ZETA price ID
            baseGatewayAddress, // Base Gateway
            callbackConnectorAddress, // Deployed callback connector address
            connectedGasZRC20, // ETH.BASE token address for gas fees when reflecting off of Base
            ownerAddress // Contract owner
        ];

        const zetaOrderBook = await ZetaOrderBook.deploy(
            ...constructorArgs,
            {
                gasPrice: finalGasPrice
            }
        );

        const zetaOrderBookAddress = await zetaOrderBook.getAddress();
        console.log(`✅ ZetaOrderBook deployed to ZetaChain ${network}: ${zetaOrderBookAddress}`);
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