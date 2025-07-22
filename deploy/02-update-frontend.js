const { frontEndContractsFile, frontEndAbiFile } = require("../helper-hardhat-config")
const fs = require("fs")
const { network, ethers, deployments } = require("hardhat")

module.exports = async () => {
    if (process.env.UPDATE_FRONTEND) {
        console.log("Writing to front end...")
        await updateContractAddresses()
        await updateAbi()
        console.log("Front end written!")
    }
}

async function updateAbi() {
    const raffleContractDeployment = await deployments.get("Raffle")
    const raffle = await ethers.getContractAt("Raffle", raffleContractDeployment.address)
    // Updated for ethers v6 - formatJson instead of FormatTypes.json
    fs.writeFileSync(frontEndAbiFile, JSON.stringify(raffle.interface.formatJson()))
}

async function updateContractAddresses() {
    const raffleContractDeployment = await deployments.get("Raffle")
    const raffle = await ethers.getContractAt("Raffle", raffleContractDeployment.address)
    const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))

    const chainId = network.config.chainId.toString()

    if (chainId in contractAddresses) {
        // Fixed: should push to array, not replace it
        if (!contractAddresses[chainId].includes(raffleContractDeployment.address)) {
            contractAddresses[chainId].push(raffleContractDeployment.address)
        }
    } else {
        contractAddresses[chainId] = [raffleContractDeployment.address]
    }

    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
}

module.exports.tags = ["all", "frontend"]
