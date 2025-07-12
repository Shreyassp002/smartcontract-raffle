require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY

module.exports = {
    solidity: {
        compilers: [{ version: "0.8.7" }, { version: "0.6.6" }, { version: "0.8.24" }],
    },
    defaultNetwork: "hardhat",
    networks: {
        sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 11155111,
            blockConfirmations: 6,
        },
        hardhat:{
            chainId: 31337,
            blockConfirmations: 1,
        },
        localHost: {
            url: "http://127.0.0.1:8545/",
            //accounts: hardhat handles this
            chainId: 31337,
        },
    }, 
    namedAccounts: {
        deployer: {
            default: 0,
        },
        player: {
            default: 1,
        },
    },
}
