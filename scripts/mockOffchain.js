const { ethers, network, deployments } = require("hardhat")

async function mockVrfForExistingPlayers() {
    console.log("🎯 Mock VRF for Existing Players - Using frontend entries...")

    try {
        // Get contracts
        const raffleDeployment = await deployments.get("Raffle")
        const raffle = await ethers.getContractAt("Raffle", raffleDeployment.address)

        const vrfCoordinatorV2PlusMockDeployment = await deployments.get("VRFCoordinatorV2_5Mock")
        const vrfCoordinatorV2PlusMock = await ethers.getContractAt(
            "VRFCoordinatorV2_5Mock",
            vrfCoordinatorV2PlusMockDeployment.address,
        )

        console.log("📍 Raffle:", raffleDeployment.address)
        console.log("📍 VRF Mock:", vrfCoordinatorV2PlusMockDeployment.address)

        // Check current status
        const initialState = await raffle.getRaffleState()
        const playersCount = await raffle.getNumberOfPlayers()
        const contractBalance = await ethers.provider.getBalance(raffle.target || raffle.address)

        console.log(`🎰 Current raffle state: ${initialState} (0=OPEN, 1=CALCULATING)`)
        console.log(`👥 Current players: ${playersCount}`)
        console.log(`💰 Contract balance: ${ethers.formatEther(contractBalance)} ETH`)

        if (playersCount === 0n) {
            console.log("❌ No players in raffle! Enter through frontend first.")
            return
        }

        // Show existing players
        console.log("\n👥 Existing players:")
        for (let i = 0; i < playersCount; i++) {
            try {
                const player = await raffle.getPlayer(i)
                console.log(`  ${i}: ${player}`)
            } catch (e) {
                console.log(`  ${i}: Unable to fetch player`)
            }
        }

        // If raffle is OPEN, we need to trigger upkeep
        if (initialState === 0n) {
            console.log("\n⏰ Raffle is OPEN, need to trigger upkeep...")

            // Check if enough time has passed
            const interval = await raffle.getInterval()
            console.log(`📅 Raffle interval: ${interval} seconds`)

            // Fast forward time if needed
            console.log("⏰ Fast forwarding time...")
            await network.provider.send("evm_increaseTime", [Number(interval) + 1])
            await network.provider.send("evm_mine", [])
            console.log("✅ Time advanced")

            // Check upkeep
            const { upkeepNeeded } = await raffle.checkUpkeep("0x")
            console.log(`🎯 Upkeep needed: ${upkeepNeeded}`)

            if (!upkeepNeeded) {
                console.log("❌ Upkeep still not needed. Check conditions:")
                console.log("- Is raffle OPEN?", (await raffle.getRaffleState()) === 0n)
                console.log("- Has players?", (await raffle.getNumberOfPlayers()) > 0)
                console.log("- Has balance?", contractBalance > 0)
                return
            }

            // Perform upkeep
            console.log("🎲 Performing upkeep...")
            const performTx = await raffle.performUpkeep("0x")
            const performReceipt = await performTx.wait(1)
            console.log("✅ Upkeep performed")

            // Extract requestId
            let requestId
            for (const log of performReceipt.logs) {
                try {
                    const parsed = raffle.interface.parseLog(log)
                    if (parsed && parsed.name === "RequestedRaffleWinner") {
                        requestId = parsed.args.requestId
                        console.log(`🆔 VRF Request ID: ${requestId}`)
                        break
                    }
                } catch (e) {
                    // Continue searching
                }
            }

            if (!requestId) {
                console.log("❌ Couldn't extract requestId from transaction")
                return
            }

            // Fund subscription
            console.log("💰 Funding VRF subscription...")
            const subscriptionId = await raffle.getSubscriptionId()
            await vrfCoordinatorV2PlusMock.fundSubscription(
                subscriptionId,
                ethers.parseEther("100"),
            )
            console.log("✅ Subscription funded")

            // Fulfill VRF request
            console.log("🎲 Fulfilling VRF request...")
            const raffleAddress = raffle.target || raffle.address
            const fulfillTx = await vrfCoordinatorV2PlusMock.fulfillRandomWords(
                requestId,
                raffleAddress,
            )
            await fulfillTx.wait(1)
            console.log("✅ VRF request fulfilled")
        } else if (initialState === 1n) {
            console.log("⚠️  Raffle is already CALCULATING - there should be a pending VRF request")
            console.log("💡 Trying to fulfill with requestId 1 (common case)...")

            try {
                // Fund subscription first
                const subscriptionId = await raffle.getSubscriptionId()
                await vrfCoordinatorV2PlusMock.fundSubscription(
                    subscriptionId,
                    ethers.parseEther("100"),
                )

                // Try to fulfill with requestId 1
                const raffleAddress = raffle.target || raffle.address
                const fulfillTx = await vrfCoordinatorV2PlusMock.fulfillRandomWords(
                    1,
                    raffleAddress,
                )
                await fulfillTx.wait(1)
                console.log("✅ VRF request fulfilled with requestId 1")
            } catch (error) {
                console.log("❌ Failed to fulfill with requestId 1:", error.message)
                console.log(
                    "💡 You might need to check the actual requestId from the transaction logs",
                )
                return
            }
        }

        // Check results
        console.log("\n🎉 Checking results...")
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const winner = await raffle.getRecentWinner()
        const finalState = await raffle.getRaffleState()
        const finalPlayers = await raffle.getNumberOfPlayers()
        const finalBalance = await ethers.provider.getBalance(raffle.target || raffle.address)

        console.log("🏆 FINAL RESULTS:")
        console.log(`🥇 Winner: ${winner}`)
        console.log(`📊 Final state: ${finalState} (should be 0=OPEN for new round)`)
        console.log(`👥 Players remaining: ${finalPlayers}`)
        console.log(`💰 Contract balance: ${ethers.formatEther(finalBalance)} ETH`)

        if (winner !== "0x0000000000000000000000000000000000000000") {
            console.log("🎊 SUCCESS! Winner selected from frontend players!")
        } else {
            console.log("❓ No winner declared - something went wrong")
        }
    } catch (error) {
        console.error("❌ Error:", error.message)

        if (error.message.includes("Raffle__NotOpen")) {
            console.log("💡 Raffle is not open - it might already be calculating")
        }
        if (error.message.includes("Raffle__UpkeepNotNeeded")) {
            console.log("💡 Upkeep conditions not met")
        }
        if (error.message.includes("InsufficientBalance")) {
            console.log("💡 VRF subscription needs more funding")
        }
    }
}

mockVrfForExistingPlayers()
    .then(() => {
        console.log("✅ Mock VRF completed!")
        process.exit(0)
    })
    .catch((error) => {
        console.error("💥 Fatal error:", error)
        process.exit(1)
    })
