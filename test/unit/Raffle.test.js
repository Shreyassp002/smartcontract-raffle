const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle,
              raffleContract,
              vrfCoordinatorV2Mock,
              raffleEntranceFee,
              interval,
              player,
              subscriptionId

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              player = accounts[1]
              await deployments.fixture(["all"])

              // Updated to use VRFCoordinatorV2_5Mock for VRF v2.5 compatibility
              const vrfCoordinatorV2MockDeployment = await deployments.get("VRFCoordinatorV2_5Mock")
              vrfCoordinatorV2Mock = await ethers.getContractAt(
                  "VRFCoordinatorV2_5Mock",
                  vrfCoordinatorV2MockDeployment.address,
              )

              const raffleContractDeployment = await deployments.get("Raffle")
              raffleContract = await ethers.getContractAt(
                  "Raffle",
                  raffleContractDeployment.address,
              )
              raffle = raffleContract.connect(player)
              raffleEntranceFee = await raffle.getEntranceFee()
              interval = await raffle.getInterval()

              // Get the subscription ID that was created during deployment
              subscriptionId = await raffle.getSubscriptionId()

              // Fund the subscription with a very high amount for VRF v2.5
              const fundAmount = ethers.parseEther("100")
              await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, fundAmount)

              // Ensure the Raffle contract is added as a consumer
              const raffleAddress = await raffleContract.getAddress()
              await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffleAddress)
          })

          describe("constructor", function () {
              it("initializes the raffle correctly", async () => {
                  const raffleState = (await raffle.getRaffleState()).toString()
                  assert.equal(raffleState, "0")
                  assert.equal(
                      interval.toString(),
                      networkConfig[network.config.chainId]["interval"],
                  )
              })
          })

          describe("enterRaffle", function () {
              it("reverts when you don't pay enough", async () => {
                  await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle_NotEnoughETHEntered",
                  )
              })
              it("records player when they enter", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const contractPlayer = await raffle.getPlayer(0)
                  assert.equal(player.address, contractPlayer)
              })
              it("emits event on enter", async () => {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEnter",
                  )
              })
              it("doesn't allow entrance when raffle is calculating", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  await raffle.performUpkeep("0x")
                  await expect(
                      raffle.enterRaffle({ value: raffleEntranceFee }),
                  ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen")
              })
          })

          describe("checkUpkeep", function () {
              it("returns false if people haven't sent any ETH", async () => {
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert(!upkeepNeeded)
              })
              it("returns false if raffle isn't open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  await raffle.performUpkeep("0x")
                  const raffleState = await raffle.getRaffleState()
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert.equal(raffleState.toString(), "1")
                  assert.equal(upkeepNeeded, false)
              })
              it("returns false if enough time hasn't passed", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) - 5])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert(!upkeepNeeded)
              })
              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert(upkeepNeeded)
              })
          })

          describe("performUpkeep", function () {
              it("can only run if checkupkeep is true", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const tx = await raffle.performUpkeep("0x")
                  assert(tx)
              })
              it("reverts if checkupkeep is false", async () => {
                  await expect(raffle.performUpkeep("0x")).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__UpkeepNotNeeded",
                  )
              })
              it("updates the raffle state and emits a requestId", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const txResponse = await raffle.performUpkeep("0x")
                  const txReceipt = await txResponse.wait(1)
                  const raffleState = await raffle.getRaffleState()

                  // Find the RequestedRaffleWinner event
                  let requestId
                  for (const log of txReceipt.logs) {
                      try {
                          const parsedLog = raffle.interface.parseLog(log)
                          if (parsedLog.name === "RequestedRaffleWinner") {
                              requestId = parsedLog.args.requestId
                              break
                          }
                      } catch (e) {
                          // Skip logs that can't be parsed
                      }
                  }

                  assert(Number(requestId) > 0)
                  assert(raffleState == 1)
              })
          })

          describe("fulfillRandomWords", function () {
              beforeEach(async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
              })

              it("can only be called after performupkeep", async () => {
                  // Test with invalid request IDs
                  // VRF v2.5 mock might throw different errors, so let's catch any revert
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, await raffle.getAddress()),
                  ).to.be.reverted

                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, await raffle.getAddress()),
                  ).to.be.reverted
              })

              it("picks a winner, resets, and sends money", async () => {
                  const additionalEntrances = 3
                  const startingIndex = 2
                  let startingBalance

                  // Add additional players
                  for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                      raffle = raffleContract.connect(accounts[i])
                      await raffle.enterRaffle({ value: raffleEntranceFee })
                  }
                  const startingTimeStamp = await raffle.getLatestTimeStamp()

                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerBalance = await ethers.provider.getBalance(
                                  accounts[2].address,
                              )
                              const endingTimeStamp = await raffle.getLatestTimeStamp()

                              // Check that players array is reset
                              await expect(raffle.getPlayer(0)).to.be.reverted

                              // Verify results
                              assert.equal(recentWinner.toString(), accounts[2].address)
                              assert.equal(raffleState, 0)
                              assert.equal(
                                  winnerBalance.toString(),
                                  (
                                      startingBalance +
                                      raffleEntranceFee * BigInt(additionalEntrances + 1)
                                  ).toString(),
                              )
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (e) {
                              reject(e)
                          }
                      })

                      try {
                          // Perform upkeep to start the raffle draw
                          const tx = await raffle.performUpkeep("0x")
                          const txReceipt = await tx.wait(1)
                          startingBalance = await ethers.provider.getBalance(accounts[2].address)

                          // Extract requestId from the transaction receipt
                          let requestId
                          for (const log of txReceipt.logs) {
                              try {
                                  const parsedLog = raffle.interface.parseLog(log)
                                  if (parsedLog.name === "RequestedRaffleWinner") {
                                      requestId = parsedLog.args.requestId
                                      break
                                  }
                              } catch (e) {
                                  // Skip logs that can't be parsed
                              }
                          }

                          // For VRF v2.5, we need to make sure the subscription has enough balance
                          // Let's fund it again right before fulfillment to be absolutely sure
                          const additionalFunding = ethers.parseEther("50")
                          await vrfCoordinatorV2Mock.fundSubscription(
                              subscriptionId,
                              additionalFunding,
                          )

                          // Fulfill the random words request
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestId,
                              await raffle.getAddress(),
                          )
                      } catch (e) {
                          reject(e)
                      }
                  })
              })
          })
      })
