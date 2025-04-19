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

    const gatewayAddress = network === 'testnet'
        ? "0x6c533f7fe93fae114d0954697069df33c9b74fd7"
        : "0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E";
    const pythOracleAddress = network === 'testnet'
        ? "0x0708325268dF9F66270F1401206434524814508b"
        : "0x2880aB155794e7179c9eE2e38200202908C17B43";
    const swapGateway = "0xCad412df586F187E0D303dD8C5f3603d4c350B5f" // this is actually the Beam NativeSwapRouter.
    const tradePairAddress = network === 'testnet'
        ? "0xcC683A782f4B30c138787CB5576a86AF66fdc31d" // USDC.SEP
        : "0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a"; // USDC.ETH
    const zetaPriceId = "0xb70656181007f487e392bf0d92e55358e9f0da5da6531c7c4ce7828aa11277fe";
    const baseGatewayAddress = network === 'testnet'
        ? "0xc0B74d761ef4EC9e9473f65687d36B9F13DB0dCc" // Base Sepolia Connector
        : "0x48B9AACC350b20147001f88821d31731Ba4C30ed"; // Base Gateway
    const connectedGasZRC20 = "0x1de70f3e971B62A0707dA18100392af14f7fB677"; // ETH.BASE token address
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
    
    // Deploy the proxy
    const proxyFactory = await hre.ethers.getContractFactory("@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy");
    const proxy = await proxyFactory.deploy(
        zetaOrderBook.target,
        ownerAddress,
        data,
        {gasPrice: finalGasPrice}
    );
    
  // Save proxy constructor arguments separately
    const proxyConstructorArgs = [zetaOrderBook.target, ownerAddress, data, {gasPrice: finalGasPrice}];
    saveConstructorArguments(network, 'ZetaOrderBookProxy', proxyConstructorArgs);
    console.log("Proxy constructor arguments saved:", JSON.stringify(proxyConstructorArgs));

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
