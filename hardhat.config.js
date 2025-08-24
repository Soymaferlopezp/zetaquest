require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    // ZetaChain Athens
    zetachain_testnet: {
      chainId: 7001,
      url: process.env.RPC_ATHENS || "https://rpc.ankr.com/zetachain_testnet",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // Polygon Amoy
    amoy: {
      chainId: 80002,
      url: process.env.RPC_AMOY || "https://rpc-amoy.polygon.technology/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // BNB Testnet 
    bnb_testnet: {
      chainId: 97,
      url: process.env.RPC_BNB_TESTNET || "https://bsc-testnet.publicnode.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    sepolia: {
      chainId: 11155111,
      url: process.env.RPC_SEPOLIA || "https://rpc.ankr.com/eth_sepolia",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
