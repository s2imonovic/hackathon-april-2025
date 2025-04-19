const hre = require("hardhat");

const { 
    saveContractProxies,
    saveConstructorArguments
} = require('../helpers/utils');
const { calculateGasPrice } = require('../helpers/ethereum');
const delay = ms => new Promise(res => setTimeout(res, ms));
const delayLength = 6000;

async function main() {
    await hre.run('compile');

    const finalGasPrice = await calculateGasPrice();
    const network = hre.network.name;

    // Set the owner address to the deployer's address
    const [deployer] = await hre.ethers.getSigners();
    const ownerAddress = deployer.address;

    // Save the constructor arguments before deployment
    const constructorArgs = [ownerAddress];
    saveConstructorArguments(network, 'ProxyAdmin', constructorArgs);
    console.log("ProxyAdmin constructor arguments saved:", JSON.stringify(constructorArgs));

    const ProxyAdmin = await hre.ethers.getContractFactory("@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin");
    const proxyAdmin = await ProxyAdmin.deploy(
        ownerAddress,
        {gasPrice: finalGasPrice}
    );
    console.log("ProxyAdmin: ", proxyAdmin.target);
    saveContractProxies(hre.network.name, 'ProxyAdmin', proxyAdmin.target);

    await delay(delayLength);
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });