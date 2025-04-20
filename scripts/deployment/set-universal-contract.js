const hre = require("hardhat");
const { getSavedContractAddresses, getSavedContractProxies } = require('../helpers/utils');

async function main() {
    const network = hre.network.name;
    
    // Get addresses from saved contract addresses
    const savedAddresses = getSavedContractAddresses();
    const savedProxies = getSavedContractProxies();
    
    // Determine which networks to use based on the current network
    // If we're on base_sepolia, we need to get the ZetaOrderBook from testnet
    // If we're on base, we need to get the ZetaOrderBook from mainnet
    let zetaNetwork, baseNetwork;
    
    if (network === 'base_sepolia') {
        zetaNetwork = 'testnet';
        baseNetwork = 'base_sepolia';
    } else if (network === 'base') {
        zetaNetwork = 'mainnet';
        baseNetwork = 'base';
    } else {
        throw new Error(`Unsupported network: ${network}. This script should be run on base_sepolia or base.`);
    }
    
    // Get the ZetaOrderBook address from ZetaChain
    const zetaOrderBookAddress = savedProxies[zetaNetwork]?.['ZetaOrderBook'];
    if (!zetaOrderBookAddress) {
        throw new Error(`ZetaOrderBook proxy not deployed on ZetaChain ${zetaNetwork} yet. Deploy it first.`);
    }

    // Get the CallbackConnector address from Base
    const callbackConnectorAddress = savedProxies[baseNetwork]?.['CallbackConnector'];
    if (!callbackConnectorAddress) {
        throw new Error(`CallbackConnector proxy not deployed on Base ${baseNetwork} yet. Deploy it first.`);
    }

    console.log("Setting universal contract address...");
    console.log("CallbackConnector address:", callbackConnectorAddress);
    console.log("ZetaOrderBook address:", zetaOrderBookAddress);

    // Get the CallbackConnector contract instance
    const CallbackConnector = await hre.ethers.getContractFactory("CallbackConnector");
    const callbackConnector = CallbackConnector.attach(callbackConnectorAddress);

    // Debug: Log the contract interface
    console.log("\nDebug - Contract Interface:");
    console.log("setUniversalContract function:", callbackConnector.interface.getFunction("setUniversalContract"));
    console.log("universalContract function:", callbackConnector.interface.getFunction("universalContract"));

    // Set the universal contract address
    console.log("\nDebug - Preparing transaction:");
    const signer = await hre.ethers.provider.getSigner();
    console.log("From:", await signer.getAddress());
    console.log("To:", callbackConnectorAddress);
    console.log("Data:", callbackConnector.interface.encodeFunctionData("setUniversalContract", [zetaOrderBookAddress]));

    const tx = await callbackConnector.setUniversalContract(zetaOrderBookAddress);
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

    // Verify the address was set correctly
    console.log("\nDebug - Verifying universal contract address...");
    try {
        const universalContractAddress = await callbackConnector.universalContract();
        console.log("universalContractAddress:", universalContractAddress);
        
        if (universalContractAddress.toLowerCase() !== zetaOrderBookAddress.toLowerCase()) {
            console.warn(`Universal contract address mismatch. Expected: ${zetaOrderBookAddress}, Got: ${universalContractAddress}`);
        } else {
            console.log("Universal contract address verified");
        }
    } catch (error) {
        console.warn("Could not verify universal contract address:", error.message);
        console.warn("Transaction was successful, but verification failed. This might be due to a contract interface mismatch.");
        console.warn("The universal contract address may have been set correctly, but we couldn't verify it.");
    }
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
