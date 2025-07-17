const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

const FUND_AMOUNT = ethers.parseEther("1") // 1 Ether, or 1e18 (10^18) Wei

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    let vrfCoordinatorV2PlusAddress, subscriptionId

    if (developmentChains.includes(network.name)) {
        // For development chains, use the v2.5 mock
        const vrfCoordinatorV2PlusMockDeployment = await deployments.get("VRFCoordinatorV2_5Mock")
        const vrfCoordinatorV2PlusMock = await ethers.getContractAt(
            "VRFCoordinatorV2_5Mock",
            vrfCoordinatorV2PlusMockDeployment.address,
        )
        vrfCoordinatorV2PlusAddress = vrfCoordinatorV2PlusMock.target
        
        // Create subscription - v2.5 mock
        const transactionResponse = await vrfCoordinatorV2PlusMock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)

        // Parse the event properly
        const subscriptionCreatedEvent = transactionReceipt.logs[0]
        const parsedEvent = vrfCoordinatorV2PlusMock.interface.parseLog(subscriptionCreatedEvent)
        subscriptionId = parsedEvent.args.subId // Don't convert to Number, keep as BigInt

        // Fund the subscription with LINK tokens
        await vrfCoordinatorV2PlusMock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        // For live networks, use the v2.5 coordinator address
        vrfCoordinatorV2PlusAddress = networkConfig[chainId]["vrfCoordinatorV2Plus"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    const entranceFee = networkConfig[chainId]["entranceFee"]
    const gasLane = networkConfig[chainId]["gasLane"]
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
    const interval = networkConfig[chainId]["interval"]

    const args = [
        vrfCoordinatorV2PlusAddress,
        subscriptionId,
        gasLane,
        entranceFee,
        callbackGasLimit,
        interval,
    ]

    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    // Add the contract as a consumer to the subscription
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2PlusMockDeployment = await deployments.get("VRFCoordinatorV2_5Mock")
        const vrfCoordinatorV2PlusMock = await ethers.getContractAt(
            "VRFCoordinatorV2_5Mock",
            vrfCoordinatorV2PlusMockDeployment.address,
        )
        await vrfCoordinatorV2PlusMock.addConsumer(subscriptionId, raffle.address)
        log("Consumer added to subscription!")
    }

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(raffle.address, args)
    }
    log("_________________________________")
}

module.exports.tags = ["all", "raffle"]