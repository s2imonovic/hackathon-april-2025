const hre = require("hardhat");
const { getSavedContractAddresses, getSavedContractABI, getSavedContractProxies} = require('../helpers/utils')
const {calculateGasPrice} = require("../helpers/ethereum");

async function main() {
    await hre.run('compile');

    const finalGasPrice = await calculateGasPrice();
    const network = hre.network.name;
    const contracts = getSavedContractAddresses()[network];
    const proxies = getSavedContractProxies()[network];

    let contractInstance = await hre.ethers.getContractAt("Lock", contracts["Lock"]);

    let response = await contractInstance.withdraw();
    console.log(response);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });