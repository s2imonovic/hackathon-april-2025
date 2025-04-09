const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const ZetaOrderBook = await ethers.getContractFactory("ZetaOrderBook");
  
  // Deploy with proxy
  const zetaOrderBook = await upgrades.deployProxy(ZetaOrderBook, [
    process.env.GATEWAY_ADDRESS,
    process.env.PYTH_ORACLE_ADDRESS,
    process.env.SWAP_ROUTER_ADDRESS,
    process.env.USDC_TOKEN_ADDRESS,
    process.env.ZETA_PRICE_ID,
    process.env.CALLBACK_CHAIN,
    process.env.CALLBACK_ADDRESS,
    process.env.CONNECTED_GAS_ZRC20,
    deployer.address
  ], {
    kind: 'uups',
    initializer: 'initialize',
  });

  await zetaOrderBook.waitForDeployment();
  console.log("ZetaOrderBook deployed to:", await zetaOrderBook.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 