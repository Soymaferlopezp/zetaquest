require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    // === ZetaChain Mainnet ===
    zetachain_mainnet: {
      chainId: 7000,
      url: process.env.RPC_ZETA_MAINNET || "https://zetachain-evm.blockpi.network/v1/rpc/public",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },

    // ZetaChain Athens (testnet)
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

    // Ethereum Sepolia
    sepolia: {
      chainId: 11155111,
      url: process.env.RPC_SEPOLIA || "https://rpc.ankr.com/eth_sepolia",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

// --- TASK: deploy:badge ---
task("deploy:badge", "Deploys ZetaQuestMainnetBadge to selected network")
  .setAction(async (_, hre) => {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const Factory = await hre.ethers.getContractFactory("ZetaQuestMainnetBadge");
    const c = await Factory.deploy();
    await c.waitForDeployment();

    console.log("ZetaQuestMainnetBadge deployed at:", await c.getAddress());
  });

