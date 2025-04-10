const hre = require("hardhat");
const { getSavedContractAddresses, getSavedContractProxies } = require('../helpers/utils');

async function main() {
  const network = hre.network.name;
  console.log(`Verifying contracts on network: ${network}`);

  // Get contract addresses
  const zetaOrderBookAddress = getSavedContractAddresses()[network]?.ZetaOrderBook;
  const proxyAddress = getSavedContractProxies()[network]?.ZetaOrderBook;

  if (!zetaOrderBookAddress || !proxyAddress) {
    throw new Error(`Contract addresses not found for ${network}`);
  }

  console.log(`ZetaOrderBook implementation: ${zetaOrderBookAddress}`);
  console.log(`ZetaOrderBook proxy: ${proxyAddress}`);

  // Verify implementation contract
  try {
    console.log("Verifying ZetaOrderBook implementation...");
    await hre.run("verify:verify", {
      address: zetaOrderBookAddress,
      constructorArguments: [],
    });
    console.log("✅ ZetaOrderBook implementation verified");
  } catch (error) {
    console.error("Error verifying implementation:", error.message);
  }

  // Get constructor arguments for proxy
  const gatewayAddress = network === 'testnet'
    ? "0x6c533f7fe93fae114d0954697069df33c9b74fd7"
    : "0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E";
  const pythOracleAddress = network === 'testnet'
    ? "0x0708325268dF9F66270F1401206434524814508b"
    : "0x2880aB155794e7179c9eE2e38200202908C17B43";
  const swapGateway = "0xCad412df586F187E0D303dD8C5f3603d4c350B5f";
  const tradePairAddress = network === 'testnet'
    ? "0xcC683A782f4B30c138787CB5576a86AF66fdc31d"
    : "0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a";
  const zetaPriceId = "0xb70656181007f487e392bf0d92e55358e9f0da5da6531c7c4ce7828aa11277fe";
  const baseGatewayAddress = network === 'testnet'
    ? "0xc0B74d761ef4EC9e9473f65687d36B9F13DB0dCc"
    : "0x48B9AACC350b20147001f88821d31731Ba4C30ed";
  const connectedGasZRC20 = "0x1de70f3e971B62A0707dA18100392af14f7fB677";
  const ownerAddress = "0xd2c1C15160B20d8D48765e49E13f92C7F2fF98E4";

  const baseNetwork = network === 'testnet' ? 'base_sepolia' : 'base';
  const callbackConnectorAddress = getSavedContractAddresses()[baseNetwork]?.CallbackConnector;
  if (!callbackConnectorAddress) {
    throw new Error(`CallbackConnector address not found for ${baseNetwork}`);
  }

  // Verify proxy contract
  try {
    console.log("Verifying ZetaOrderBook proxy...");
    await hre.run("verify:verify", {
      address: proxyAddress,
      constructorArguments: [
        zetaOrderBookAddress,
        ownerAddress,
        hre.ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'address', 'address', 'address', 'bytes32', 'address', 'bytes', 'address'],
          [
            gatewayAddress,
            pythOracleAddress,
            swapGateway,
            tradePairAddress,
            zetaPriceId,
            baseGatewayAddress,
            callbackConnectorAddress,
            connectedGasZRC20
          ]
        )
      ],
    });
    console.log("✅ ZetaOrderBook proxy verified");
  } catch (error) {
    console.error("Error verifying proxy:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 