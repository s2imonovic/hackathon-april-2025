const hre = require("hardhat");

const { saveContractProxies} = require('../helpers/utils');
const { calculateGasPrice } = require('../helpers/ethereum');
const delay = ms => new Promise(res => setTimeout(res, ms));
const delayLength = 6000;

async function main() {
    await hre.run('compile');

    const finalGasPrice = await calculateGasPrice();
    const network = hre.network.name;

    const ProxyAdmin = await hre.ethers.getContractFactory("@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin");
    const proxyAdmin = await ProxyAdmin.deploy(
        '0xEbA816378707e47f18320e672603c7790058a936',
        {gasPrice: finalGasPrice}
    );
    console.log("ProxyAdmin contract deployed to: ", proxyAdmin.target);
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