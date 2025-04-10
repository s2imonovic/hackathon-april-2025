const hre = require("hardhat");

const { saveContractAddress, getSavedContractAddresses, saveContractAbi, saveContractProxies, getSavedContractProxies} = require('../helpers/utils');
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

    const CallbackConnector = await hre.ethers.getContractFactory("CallbackConnector");
    const callbackConnector = await CallbackConnector.deploy({gasPrice: finalGasPrice});
    console.log("CallbackConnector contract deployed to: ", callbackConnector.target);
    saveContractAddress(hre.network.name, 'CallbackConnector', callbackConnector.target);
    saveContractAbi(hre.network.name, 'CallbackConnector', (await hre.artifacts.readArtifact("CallbackConnector")));

    await delay(delayLength);

    let data = encodeData(['address', 'address'], [gatewayAddress, proxies['ZetaOrderBook']])

    const proxyFactory =  await hre.ethers.getContractFactory("@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy");
    const proxy = await proxyFactory.deploy(
        callbackConnector.target,
        ownerAddress,
        data,
        {gasPrice: finalGasPrice}
    );
    console.log("CallbackConnector: " + proxy.target);
    saveContractProxies(hre.network.name, 'CallbackConnector', proxy.target);
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });