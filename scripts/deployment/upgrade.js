const { ethers, upgrades } = require("hardhat");

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error("PROXY_ADDRESS environment variable not set");
  }

  const ZetaOrderBook = await ethers.getContractFactory("ZetaOrderBook");
  
  console.log("Upgrading ZetaOrderBook...");
  await upgrades.upgradeProxy(proxyAddress, ZetaOrderBook);
  console.log("ZetaOrderBook upgraded");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 