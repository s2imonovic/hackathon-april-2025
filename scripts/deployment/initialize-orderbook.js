const hre = require("hardhat");
const { getSavedContractProxies, getSavedImplementationAddresses } = require('../helpers/utils');
const { calculateGasPrice } = require('../helpers/ethereum');

async function main() {
    const network = hre.network.name;
    const finalGasPrice = await calculateGasPrice();
    
    // Get addresses from saved contract addresses
    const savedAddresses = getSavedImplementationAddresses();
    const savedProxies = getSavedContractProxies();
    
    // Get the ZetaOrderBook proxy address
    const zetaOrderBookAddress = savedProxies[network]?.['ZetaOrderBook'];
    if (!zetaOrderBookAddress) {
        throw new Error(`ZetaOrderBook proxy not deployed on ${network} yet. Deploy it first.`);
    }
    
    // Get the ZetaOrderBook implementation address
    const zetaOrderBookImplementationAddress = savedAddresses[network]?.['ZetaOrderBook'];
    if (!zetaOrderBookImplementationAddress) {
        throw new Error(`ZetaOrderBook implementation not deployed on ${network} yet. Deploy it first.`);
    }

    console.log("Initializing ZetaOrderBook Implementation...");
    console.log("ZetaOrderBook Implementation address:", zetaOrderBookImplementationAddress);

    // Network-specific addresses
    const gatewayAddress = network === 'testnet'
        ? "0x6c533f7fe93fae114d0954697069df33c9b74fd7"
        : "0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E";
    const pythOracleAddress = network === 'testnet'
        ? "0x0708325268dF9F66270F1401206434524814508b"
        : "0x2880aB155794e7179c9eE2e38200202908C17B43";
    const swapGateway = "0xCad412df586F187E0D303dD8C5f3603d4c350B5f"; // Beam NativeSwapRouter
    const tradePairAddress = network === 'testnet'
        ? "0xcC683A782f4B30c138787CB5576a86AF66fdc31d" // USDC.SEP
        : "0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a"; // USDC.ETH
    const zetaPriceId = "0xb70656181007f487e392bf0d92e55358e9f0da5da6531c7c4ce7828aa11277fe";
    const baseGatewayAddress = network === 'testnet'
        ? "0xc0B74d761ef4EC9e9473f65687d36B9F13DB0dCc" // Base Sepolia Connector
        : "0x48B9AACC350b20147001f88821d31731Ba4C30ed"; // Base Gateway
    const connectedGasZRC20 = "0x1de70f3e971B62A0707dA18100392af14f7fB677"; // ETH.BASE token address

    // Get the CallbackConnector address from Base
    const baseNetwork = network === 'testnet' ? 'base_sepolia' : 'base';
    const callbackConnectorAddress = savedProxies[baseNetwork]?.['CallbackConnector'];
    if (!callbackConnectorAddress) {
        throw new Error(`CallbackConnector proxy not deployed on Base ${baseNetwork} yet. Deploy it first.`);
    }

    // Get the ZetaOrderBook contract instance
    const ZetaOrderBook = await hre.ethers.getContractFactory("ZetaOrderBook");
    const zetaOrderBook = ZetaOrderBook.attach(zetaOrderBookImplementationAddress);

    // Debug: Log the contract interface
    console.log("\nDebug - Contract Interface:");
    console.log("initialize function:", zetaOrderBook.interface.getFunction("initialize"));

    // Initialize the contract
    console.log("\nDebug - Preparing initialization transaction:");
    const signer = await hre.ethers.provider.getSigner();
    console.log("From:", await signer.getAddress());
    console.log("To:", zetaOrderBookImplementationAddress);
    console.log("Data:", zetaOrderBook.interface.encodeFunctionData("initialize", [
        gatewayAddress,
        pythOracleAddress,
        swapGateway,
        tradePairAddress,
        zetaPriceId,
        baseGatewayAddress,
        callbackConnectorAddress,
        connectedGasZRC20
    ]));

    const tx = await zetaOrderBook.initialize(
        gatewayAddress,
        pythOracleAddress,
        swapGateway,
        tradePairAddress,
        zetaPriceId,
        baseGatewayAddress,
        callbackConnectorAddress,
        connectedGasZRC20,
        { gasPrice: finalGasPrice }
    );

    console.log("\nDebug - Transaction object:");
    console.log("Hash:", tx.hash);
    console.log("From:", tx.from);
    console.log("To:", tx.to);
    console.log("Data:", tx.data);
    console.log("Value:", tx.value?.toString() || "0");
    console.log("Nonce:", tx.nonce);
    console.log("GasLimit:", tx.gasLimit?.toString() || "0");
    console.log("GasPrice:", tx.gasPrice?.toString() || "0");
    console.log("MaxFeePerGas:", tx.maxFeePerGas?.toString() || "0");
    console.log("MaxPriorityFeePerGas:", tx.maxPriorityFeePerGas?.toString() || "0");

    console.log("\nDebug - Waiting for transaction receipt...");
    const receipt = await tx.wait();
    console.log("\nDebug - Transaction receipt:");
    console.log("BlockNumber:", receipt.blockNumber);
    console.log("GasUsed:", receipt.gasUsed?.toString() || "0");
    console.log("Status:", receipt.status);
    console.log("Logs:", JSON.stringify(receipt.logs, null, 2));

    console.log("\nZetaOrderBook Implementation initialized successfully!");

    // renounce ownership
    const renounceTx = await zetaOrderBook.renounceOwnership({ gasPrice: finalGasPrice });
    console.log("\nDebug - Renounce ownership transaction:");
    console.log("Hash:", renounceTx.hash);
    console.log("From:", renounceTx.from);
    console.log("To:", renounceTx.to);
    console.log("Data:", renounceTx.data);

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error("\nDebug - Error details:");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        if (error.data) console.error("Error data:", error.data);
        if (error.transaction) console.error("Error transaction:", error.transaction);
        if (error.receipt) console.error("Error receipt:", error.receipt);
        process.exit(1);
    }); 