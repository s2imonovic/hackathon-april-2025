const hre = require("hardhat");
const { getSavedContractAddresses } = require('../helpers/utils');

async function main() {
    const network = hre.network.name;
    console.log(`\n🔍 Network: ${network}`);
    console.log(`🔑 Using account: ${(await hre.ethers.provider.getSigner()).address}`);

    // Get contract addresses
    const savedAddresses = getSavedContractAddresses();
    const callbackConnectorAddress = savedAddresses[network]?.CallbackConnector;
    const zetaOrderBookAddress = savedAddresses[network === 'base_sepolia' ? 'testnet' : 'mainnet']?.['ZetaOrderBookIzumi'];

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

    // We do not approve ZETA on BASE from the deployer address, because it is the contract that should spend its own funds.
    // const BASE_ZETA_ADDRESS = "0x7FB8E2aE4A5923BBd8e1513945914b5AB69cdA2a";
    // const zetaToken = await hre.ethers.getContractAt("IERC20", BASE_ZETA_ADDRESS);
    
    // // Check ZETA balance
    // const zetaAmount = hre.ethers.utils.parseEther("0.5");
    // const zetaBalance = await zetaToken.balanceOf(await hre.ethers.provider.getSigner().getAddress());
    // console.log(`💰 ZETA balance on BASE: ${hre.ethers.utils.formatEther(zetaBalance)} ZETA`);
    
    // console.log("\n🚀 Approve ZETA gas fees on BASE...");
    // const approveTx = await zetaToken.approve(callbackConnectorAddress, zetaAmount, {
    //     gasPrice: finalGasPrice
    // });
    // await approveTx.wait();
    // console.log("✅ ZETA approval on BASE successful");

    // const transferTx = await zetaToken.transfer(callbackConnectorAddress, zetaAmount, {
    //     gasPrice: finalGasPrice
    // });
    // await transferTx.wait();
    // console.log("✅ ZETA transfer successful");

    console.log("\n✨ All setup complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 