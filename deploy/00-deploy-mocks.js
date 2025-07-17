const { network, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

const BASE_FEE = ethers.parseEther("0.25") // 0.25 is the premium. It costs 0.25 LINK
const GAS_PRICE_LINK = 1e9 // link per gas, 0.000000001 LINK per gas
const WEI_PER_UNIT_LINK = 4e15 // Additional parameter for v2.5

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    // If we are on a local development network, we need to deploy mocks!
    if (developmentChains.includes(network.name)) {
        log("Local network detected! Deploying mocks...")

        // Deploy the VRF v2.5 mock
        await deploy("VRFCoordinatorV2_5Mock", {
            from: deployer,
            log: true,
            args: [BASE_FEE, GAS_PRICE_LINK, WEI_PER_UNIT_LINK],
        })

        log("Mocks Deployed!")
    }
}

module.exports.tags = ["all", "mocks"]
