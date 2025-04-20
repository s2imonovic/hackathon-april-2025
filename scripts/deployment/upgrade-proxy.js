const hre = require("hardhat");
const { upgrades } = require("hardhat");
const { getSavedContractProxies, saveImplementationAddress } = require('../helpers/utils');

async function main() {
    // get the proxy address from the saved addresses
    const savedAddresses = getSavedContractProxies();
    const network = hre.network.name;

    const proxyAddress = savedAddresses[network].ZetaOrderBook;
    const ZetaOrderBook = await hre.ethers.getContractFactory("ZetaOrderBook");
    const zetaOrderBook = await upgrades.upgradeProxy(proxyAddress, ZetaOrderBook);
    await zetaOrderBook.waitForDeployment();

    // sleep for 15 seconds to ensure the proxy upgrade is completed on the RPC nodes
    await new Promise(resolve => setTimeout(resolve, 15000));

    const implementationAddress = await upgrades.erc1967.getImplementationAddress(await zetaOrderBook.getAddress());
    console.log("ZetaOrderBook proxy:", proxyAddress);
    console.log("New ZetaOrderBook implementation:", implementationAddress);

    // Save the implementation address
    saveImplementationAddress(network, 'ZetaOrderBook', implementationAddress);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });