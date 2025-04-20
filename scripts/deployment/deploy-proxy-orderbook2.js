const hre = require("hardhat");
const { upgrades } = require("hardhat");

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

    // Network-specific addresses
    const gatewayAddress = network === 'testnet'
        ? "0x6c533f7fe93fae114d0954697069df33c9b74fd7"
        : "0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E";
    const pythOracleAddress = network === 'testnet'
        ? "0x0708325268dF9F66270F1401206434524814508b"
        : "0x2880aB155794e7179c9eE2e38200202908C17B43";
    const swapGateway = "0xCad412df586F187E0D303dD8C5f3603d4c350B5f"; // Beam NativeSwapRouter
    const tradePairAddress = network === 'testnet'
        ? "0xcC683A782f4B30c138787CB5576a86AF66fdc31d" // USDC.SEP
        : "0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a"; // USDC.ETH
    const zetaPriceId = "0xb70656181007f487e392bf0d92e55358e9f0da5da6531c7c4ce7828aa11277fe";
    const baseGatewayAddress = network === 'testnet'
        ? "0xc0B74d761ef4EC9e9473f65687d36B9F13DB0dCc" // Base Sepolia Connector
        : "0x48B9AACC350b20147001f88821d31731Ba4C30ed"; // Base Gateway
    const connectedGasZRC20 = "0x1de70f3e971B62A0707dA18100392af14f7fB677"; // ETH.BASE token address

    if (!callbackConnectorAddress) {
        throw new Error(`CallbackConnector proxy not deployed on Base ${baseNetwork} yet. Deploy it first.`);
    }

    // deploy using upgrades.deployProxy
    const ZetaOrderBook = await hre.ethers.getContractFactory("ZetaOrderBook");
    const zetaOrderBook = await upgrades.deployProxy(ZetaOrderBook, [
        gatewayAddress,
        pythOracleAddress,
        swapGateway,
        tradePairAddress,
        zetaPriceId,
        baseGatewayAddress,
        callbackConnectorAddress,
        connectedGasZRC20
    ], { 
        initializer: "initialize",
        gasPrice: finalGasPrice
    });
    console.log("Proxied ZetaOrderBook deployed to: ", await zetaOrderBook.getAddress());
    console.log("ZetaOrderBook: ", await zetaOrderBook.getAddress()); // used for higher level script extraction of the address
    
    const data = zetaOrderBook.interface.encodeFunctionData("initialize", [
        gatewayAddress,
        pythOracleAddress,
        swapGateway,
        tradePairAddress,
        zetaPriceId,
        baseGatewayAddress,
        callbackConnectorAddress,
        connectedGasZRC20
    ]);
    await delay(delayLength);
    // Use try catch to attempt three times with a 7 second delay between attempts
    let implementationAddress;
    for (let i = 0; i < 3; i++) {
        try {
            implementationAddress = await upgrades.erc1967.getImplementationAddress(await zetaOrderBook.getAddress());
            break;
        } catch (error) {
            console.log("Error getting implementation address: ", error);
            await delay(delayLength);
        }
    }
    // Use try catch to attempt three times with a 7 second delay between attempts
    //const implementationAddress = await upgrades.erc1967.getImplementationAddress(await zetaOrderBook.getAddress());
    console.log("ProxyAdmin:", await upgrades.erc1967.getAdminAddress(await zetaOrderBook.getAddress()));

    // Save the implementation address
    saveImplementationAddress(network, 'ZetaOrderBook', implementationAddress);
    console.log("Implementation: " + implementationAddress);
    saveContractProxies(network, 'ZetaOrderBook', await zetaOrderBook.getAddress());
    
    // Save empty constructor arguments for the implementation contract
    // The ZetaOrderBook has an empty constructor
    saveConstructorArguments(network, 'ZetaOrderBook', []);
    console.log("Implementation constructor arguments saved: []");

    await delay(delayLength);
    
    // Save proxy constructor arguments separately
    const proxyConstructorArgs = [await zetaOrderBook.getAddress(), ownerAddress, data];
    saveConstructorArguments(network, 'ZetaOrderBookProxy', proxyConstructorArgs);
    console.log("Proxy constructor arguments saved:", JSON.stringify(proxyConstructorArgs));

    // // Deploy the proxy
    // const proxyFactory = await hre.ethers.getContractFactory("@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy");
    // const proxy = await proxyFactory.deploy(
    //     zetaOrderBook.target,
    //     ownerAddress,
    //     data,
    //     {gasPrice: finalGasPrice}
    // );
    // console.log("ZetaOrderBook: " + proxy.target);
    // saveContractProxies(network, 'ZetaOrderBook', proxy.target);

    console.log("Verifying ZetaOrderBook Proxy...");
    // verify proxy.target as TransparentUpgradeableProxy
    await verifyWithRetries(await zetaOrderBook.getAddress(), proxyConstructorArgs, "ZetaOrderBook Proxy");
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
async function verifyWithRetries(address, constructorArguments, contractName, maxRetries = 3) {
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
                address: address,
                constructorArguments: [], // Empty constructor arguments for upgradeable contracts
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
