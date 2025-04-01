const hre = require("hardhat");

const { saveContractAddress, saveContractAbi} = require('../helpers/utils');
const { web3, ethers, toWeiDenomination} = require('../helpers/setup');
const { calculateGasPrice } = require('../helpers/ethereum');

async function main() {
    await hre.run('compile');

    const finalGasPrice = await calculateGasPrice();

    const Lock = await hre.ethers.getContractFactory("Lock");
    const lock = await Lock.deploy(
        7,
        {
            gasPrice: finalGasPrice,
            value: ethers.parseEther("1.0")
        }
    );

    console.log("Lock contract deployed to: ", lock.target);
    saveContractAddress(hre.network.name, 'Lock', lock.target);
    saveContractAbi(hre.network.name, 'Lock', (await hre.artifacts.readArtifact("Lock")));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });