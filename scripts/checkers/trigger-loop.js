const hre = require("hardhat");
const { getSavedContractAddresses, getSavedContractProxies } = require('../helpers/utils');
const { calculateGasPrice } = require("../helpers/ethereum");

async function main() {
    await hre.run('compile');

    const finalGasPrice = await calculateGasPrice();
    const network = hre.network.name;
    const contracts = getSavedContractAddresses()[network];
    const proxies = getSavedContractProxies()[network];

    // Get contract instances
    const orderBook = await hre.ethers.getContractAt("ZetaOrderBookIzumi", contracts["ZetaOrderBookIzumi"]);
    
    // Check USDC balance for ZetaOrderBook
    const usdcToken = await orderBook.usdcToken();
    const usdcContract = await hre.ethers.getContractAt("IZRC20", usdcToken);
    const usdcBalance = await usdcContract.balanceOf(orderBook.target);
    console.log("ZetaOrderBook USDC balance:", hre.ethers.formatUnits(usdcBalance, 6));

    // Get gas token and fee for Base chain
    const gasLimit = 200000;
    // For Base chain, we need ETH.BASE ZRC-20 ETH as the gas token
    const zrc20Eth = "0x1de70f3e971B62A0707dA18100392af14f7fB677"; // ETH.BASE Mainnet
    const zrc20EthContract = await hre.ethers.getContractAt("IZRC20", zrc20Eth);
    const [gasZRC20, gasFee] = await zrc20EthContract.withdrawGasFeeWithGasLimit(gasLimit);
    const gasTokenContract = await hre.ethers.getContractAt("IZRC20", gasZRC20);
    const gasTokenBalance = await gasTokenContract.balanceOf(orderBook.target);
    const gateway = await orderBook.gateway();
    const gasTokenAllowance = await gasTokenContract.allowance(orderBook.target, gateway);

    console.log("Gas token for Base:", gasZRC20);
    console.log("Required gas fee:", hre.ethers.formatEther(gasFee));
    console.log("Gas token balance:", hre.ethers.formatEther(gasTokenBalance));
    console.log("Gas token allowance for gateway:", hre.ethers.formatEther(gasTokenAllowance));

    // Check if balances are sufficient
    if (gasTokenBalance < gasFee) {
        console.error("Insufficient ZRC-20 ETH balance in ZetaOrderBook for cross-chain call");
        return;
    }

    if (gasTokenAllowance < gasFee) {
        console.error("Insufficient ZRC-20 ETH allowance for gateway in ZetaOrderBook");
        return;
    }

    console.log("Triggering infinite loop...");
    
    // Method 1: Check all orders and trigger loop
    const tx = await orderBook.checkAllOrdersAndTriggerLoop({
        gasPrice: finalGasPrice
    });
    
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    await tx.wait();
    console.log("Loop triggered successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 