const hre = require("hardhat");

const { saveContractAddress, getSavedContractAddresses, saveContractAbi, saveContractProxies, getSavedContractProxies, saveImplementationAddress, saveConstructorArguments } = require('../helpers/utils');
const { web3, ethers, toWeiDenomination, hexify, upgrades, encodeData} = require('../helpers/setup');
const { calculateGasPrice } = require('../helpers/ethereum');
const delay = ms => new Promise(res => setTimeout(res, ms));
const delayLength = 6000;

async function main() {
    await hre.run('compile');

    const finalGasPrice = await calculateGasPrice();
    const network = hre.network.name;

    const ownerAddress = "0xd2c1C15160B20d8D48765e49E13f92C7F2fF98E4"; // Contract owner. TODO: Switch to signer?

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
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
