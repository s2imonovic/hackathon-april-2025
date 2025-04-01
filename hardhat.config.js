require("@nomicfoundation/hardhat-toolbox");
require('@nomicfoundation/hardhat-ethers');
require("@nomicfoundation/hardhat-web3-v4");
require('@openzeppelin/hardhat-upgrades')
require('dotenv').config();

const PK = `0x${"32c069bf3d38a060eacdc072eecd4ef63f0fc48895afbacbe185c97037789875"}`

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: 'local',
  networks: {
    testnet: {
      url: 'https://zetachain-testnet.public.blastapi.io',
      accounts: [process.env.PK || PK],
      chainId: 7001,
      gasPrice: 10000000000
    },
    mainnet: {
      url: 'https://zetachain-evm.blockpi.network/v1/rpc/public',
      accounts: [process.env.PK || PK],
      chainId: 7000,
      gasPrice: 10000000
    },
    local: {
      url: 'http://localhost:8545'
    },
    hardhat: {
      blockGasLimit: 10995116277750
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
}