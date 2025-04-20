const hre = require("hardhat");

const { 
    saveContractAddress, 
    getSavedContractAddresses, 
    saveContractAbi, 
    saveContractProxies, 
    getSavedContractProxies,
    saveImplementationAddress,
    saveConstructorArguments
} = require('../helpers/utils');
const { web3, ethers, toWeiDenomination, hexify, upgrades, encodeData} = require('../helpers/setup');
const { calculateGasPrice } = require('../helpers/ethereum');
const delay = ms => new Promise(res => setTimeout(res, ms));
const delayLength = 6000;

async function main() {
    await hre.run('compile');

    const finalGasPrice = await calculateGasPrice();
    const network = hre.network.name;
    const contracts = getSavedContractAddresses()[network];
    const proxies = getSavedContractProxies()[network];

    const gatewayAddress = network === 'base_sepolia'
        ? "0x0c487a766110c85d301d96e33579c5b317fa4995"  // Base Sepolia Gateway
        : "0x48B9AACC350b20147001f88821d31731Ba4C30ed"; // Base Mainnet Gateway
    const ownerAddress = "0xd2c1C15160B20d8D48765e49E13f92C7F2fF98E4"; // Contract owner

    console.log("Deploying CallbackConnector implementation contract...");
    const CallbackConnector = await hre.ethers.getContractFactory("CallbackConnector");
    const callbackConnector = await CallbackConnector.deploy({gasPrice: finalGasPrice});
    console.log("CallbackConnector: ", callbackConnector.target);
    
    // Wait for the transaction to be mined
    console.log("Waiting for implementation contract deployment to be mined...");
    await callbackConnector.deploymentTransaction().wait();
    console.log("Implementation contract deployment transaction mined");
    
    // Verify the contract exists at the address
    const code = await hre.ethers.provider.getCode(callbackConnector.target);
    if (code === '0x') {
        throw new Error(`Contract deployment failed - no code at address ${callbackConnector.target}`);
    }
    console.log("Verified contract code exists at implementation address");
    
    // Save the implementation address
    saveImplementationAddress(network, 'CallbackConnector', callbackConnector.target);
    console.log("Implementation: ", callbackConnector.target);
    
    // // Save the contract address (for backward compatibility)
    // saveContractAddress(hre.network.name, 'CallbackConnector', callbackConnector.target);
    
    // Save the contract ABI
    saveContractAbi(hre.network.name, 'CallbackConnector', (await hre.artifacts.readArtifact("CallbackConnector")));

    // Save empty constructor arguments for the implementation contract
    // The CallbackConnector has an empty constructor
    saveConstructorArguments(network, 'CallbackConnector', []);
    console.log("Implementation constructor arguments saved: []");

    await delay(delayLength);

    // Use ethers.ZeroAddress as a placeholder for the ZetaOrderBook address
    // This will be updated later with set-universal-contract.js
    const zetaOrderBookAddress = ethers.ZeroAddress;
    
    let data = encodeData(['address', 'address'], [gatewayAddress, zetaOrderBookAddress])
    
    // Save proxy constructor arguments separately
    const proxyConstructorArgs = [callbackConnector.target, ownerAddress, data];
    saveConstructorArguments(network, 'CallbackConnectorProxy', proxyConstructorArgs);
    console.log("Proxy constructor arguments saved:", JSON.stringify(proxyConstructorArgs));

    console.log("Deploying CallbackConnector proxy...");
    const proxyFactory =  await hre.ethers.getContractFactory("@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy");
    const proxy = await proxyFactory.deploy(
        callbackConnector.target,
        ownerAddress,
        data,
        {gasPrice: finalGasPrice}
    );
    console.log("CallbackConnector proxy deployed to: ", proxy.target);
    
    // Wait for the transaction to be mined
    console.log("Waiting for proxy deployment to be mined...");
    await proxy.deploymentTransaction().wait();
    console.log("Proxy deployment transaction mined");
    
    // Verify the proxy exists at the address
    const proxyCode = await hre.ethers.provider.getCode(proxy.target);
    if (proxyCode === '0x') {
        throw new Error(`Proxy deployment failed - no code at address ${proxy.target}`);
    }
    console.log("Verified proxy code exists at address");
    
    saveContractProxies(hre.network.name, 'CallbackConnector', proxy.target);
    
    // Output the implementation address for the deployment script to capture
    console.log("CallbackConnector Implementation: " + callbackConnector.target);
    console.log("Proxy: " + proxy.target);
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });