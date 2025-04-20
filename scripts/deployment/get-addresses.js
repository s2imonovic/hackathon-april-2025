const hre = require("hardhat");
const { getSavedContractProxies } = require('../helpers/utils');

async function main() {
    const network = hre.network.name;
    const savedAddresses = getSavedContractProxies();
    
    if (!savedAddresses[network]) {
        console.error(`No saved addresses found for network: ${network}`);
        process.exit(1);
    }
    
    console.log("ProxyAdmin:", savedAddresses[network].ProxyAdmin);
    console.log("ZetaOrderBook:", savedAddresses[network].ZetaOrderBook);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 