const hre = require("hardhat");
const { saveImplementationAddress, saveConstructorArguments } = require('../helpers/utils');
const { calculateGasPrice } = require('../helpers/ethereum');

async function main() {
    await hre.run('compile');

    const finalGasPrice = await calculateGasPrice();
    const network = hre.network.name;

    // Deploy the implementation contract
    const ZetaOrderBook = await hre.ethers.getContractFactory("ZetaOrderBook");
    const zetaOrderBook = await ZetaOrderBook.deploy({gasPrice: finalGasPrice});
    console.log("New implementation deployed to: ", zetaOrderBook.target);
    
    // Save the implementation address
    saveImplementationAddress(network, 'ZetaOrderBook', zetaOrderBook.target);
    
    // Save empty constructor arguments for the implementation contract
    saveConstructorArguments(network, 'ZetaOrderBook', []);
    console.log("Implementation constructor arguments saved: []");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 