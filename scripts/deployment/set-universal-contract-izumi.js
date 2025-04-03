const hre = require("hardhat");
const { getSavedContractAddresses } = require('../helpers/utils');

async function main() {
    const network = hre.network.name;
    console.log(`\n🔍 Network: ${network}`);
    console.log(`🔑 Using account: ${(await hre.ethers.provider.getSigner()).address}`);

    // Get contract addresses
    const savedAddresses = getSavedContractAddresses();
    const callbackConnectorAddress = savedAddresses[network]?.CallbackConnector;
    const zetaOrderBookAddress = savedAddresses[network === 'base_sepolia' ? 'testnet' : 'mainnet']?.['ZetaOrderBook-izumi'];

    if (!callbackConnectorAddress || !zetaOrderBookAddress) {
        throw new Error("Contract addresses not found. Please deploy contracts first.");
    }

    console.log(`📝 CallbackConnector address: ${callbackConnectorAddress}`);
    console.log(`📝 ZetaOrderBook-izumi address: ${zetaOrderBookAddress}`);

    // Get current gas price and add 50% buffer
    const gasPrice = await hre.ethers.provider.getFeeData();
    const finalGasPrice = gasPrice.gasPrice * 15n / 10n; // Add 50% buffer
    console.log(`⛽ Base gas price: ${gasPrice.gasPrice} wei`);
    console.log(`⛽ Final gas price with buffer: ${finalGasPrice} wei`);

    // Set universal contract address
    const CallbackConnector = await hre.ethers.getContractFactory("CallbackConnector");
    const callbackConnector = CallbackConnector.attach(callbackConnectorAddress);
    
    console.log("\n🚀 Setting universal contract address...");
    const tx = await callbackConnector.setUniversalContract(zetaOrderBookAddress, {
        gasPrice: finalGasPrice
    });
    await tx.wait();
    console.log("✅ Universal contract address set successfully");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 