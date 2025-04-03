require("@nomicfoundation/hardhat-toolbox");
require('@nomicfoundation/hardhat-ethers');
require("@nomicfoundation/hardhat-web3-v4");
require('@openzeppelin/hardhat-upgrades')
require('@nomicfoundation/hardhat-verify');
require('dotenv').config();

// Use the private key that corresponds to address 0xd2c1C15160B20d8D48765e49E13f92C7F2fF98E4 (.env) or 0xA9664FDf800930e5E5E879bCf8CE290943F1E30D (old)
const PK = process.env.PK ? `0x${process.env.PK}` : `0x${"32c069bf3d38a060eacdc072eecd4ef63f0fc48895afbacbe185c97037789875"}`

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: 'local',
  networks: {
    base_sepolia: {
      url: 'https://sepolia.base.org',
      accounts: [PK],
      chainId: 84532,
      gasPrice: 1000000000
    },
    testnet: {
      url: 'https://zetachain-testnet.public.blastapi.io',
      accounts: [PK],
      chainId: 7001,
      gasPrice: 10000000000
    },
    base: {
      url: 'https://mainnet.base.org',
      accounts: [PK],
      chainId: 8453,
      gasPrice: 1000000000
    },
    mainnet: {
      url: 'https://zetachain-evm.blockpi.network/v1/rpc/public',
      accounts: [PK],
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
      },
      evmVersion: "london"
    }
  },
  etherscan: {
    apiKey: {
      base_sepolia: process.env.BASESCAN_API_KEY || "",
      testnet: process.env.BLOCKSCOUT_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
      mainnet: process.env.BLOCKSCOUT_API_KEY || ""
    },
    customChains: [
      {
        network: "base_sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      },
      {
        network: "testnet",
        chainId: 7001,
        urls: {
          apiURL: "https://zetachain-testnet.blockscout.com/api",
          browserURL: "https://zetachain-testnet.blockscout.com"
        }
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      },
      {
        network: "mainnet",
        chainId: 7000,
        urls: {
          apiURL: "https://zetachain.blockscout.com/api",
          browserURL: "https://zetachain.blockscout.com"
        }
      }
    ]
  }
}
