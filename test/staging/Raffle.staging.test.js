const { assert, expect } = require("chai")
const { getNamedAccounts, ethers, network, deployments } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Tests", function () {
          let raffle, raffleEntranceFee, deployer

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer

              // ✅ get the signer object from the named account
              const signer = await ethers.getSigner(deployer)

              // ✅ get contract address and attach with signer
              const raffleDeployment = await deployments.get("Raffle")
              raffle = await ethers.getContractAt("Raffle", raffleDeployment.address, signer)

              // ✅ now this call will work
              raffleEntranceFee = await raffle.getEntranceFee()
          })

          describe("fulfillRandomWords", function () {
              it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                  // enter the raffle
                  console.log("Setting up test...")
                  const startingTimeStamp = await raffle.getLatestTimeStamp()
                  const accounts = await ethers.getSigners()

                  // ✅ Get starting balance BEFORE setting up the listener
                  const winnerStartingBalance = await ethers.provider.getBalance(
                      accounts[0].address,
                  )
                  let enterRaffleGasCost = 0

                  console.log("Setting up Listener...")
                  await new Promise(async (resolve, reject) => {
                      // setup listener before we enter the raffle
                      // Just in case the blockchain moves REALLY fast
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          try {
                              // add our asserts here
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerEndingBalance = await ethers.provider.getBalance(
                                  accounts[0].address,
                              )
                              const endingTimeStamp = await raffle.getLatestTimeStamp()

                              // Modern Chai matcher for reverted transactions
                              await expect(raffle.getPlayer(0)).to.be.reverted

                              // Use .equal() instead of .toString() comparisons
                              assert.equal(recentWinner, accounts[0].address)
                              assert.equal(raffleState, 0)

                              // ✅ FIXED: Correct balance calculation
                              const balanceChange = winnerEndingBalance - winnerStartingBalance

                              console.log("=== BALANCE DEBUG ===")
                              console.log("Winner address:", accounts[0].address)
                              console.log("Recent winner:", recentWinner)
                              console.log("Starting balance:", winnerStartingBalance.toString())
                              console.log("Ending balance:", winnerEndingBalance.toString())
                              console.log("Balance change:", balanceChange.toString())
                              console.log("Entrance fee:", raffleEntranceFee.toString())
                              console.log("Enter raffle gas cost:", enterRaffleGasCost.toString())

                              // Check contract balance after (should be 0)
                              const contractBalance = await ethers.provider.getBalance(
                                  raffle.target,
                              )
                              console.log("Contract balance after:", contractBalance.toString())

                              console.log("===================")

                              // Check if we're actually the winner
                              assert.equal(
                                  recentWinner,
                                  accounts[0].address,
                                  "We should be the winner",
                              )

                              // Verify raffle mechanics worked
                              assert.equal(
                                  raffleState,
                                  0,
                                  "Raffle should be open after winner is picked",
                              )
                              assert(
                                  endingTimeStamp > startingTimeStamp,
                                  "Timestamp should have increased",
                              )

                              // ✅ FIXED: When the same account enters and wins:
                              // Balance change = prize_received - entrance_fee_paid - gas_costs
                              // Since prize = entrance_fee (single participant), balance change = -gas_costs
                              const expectedBalanceChange = -enterRaffleGasCost
                              const tolerance = ethers.parseEther("0.001") // 0.001 ETH tolerance for gas estimation differences

                              // The balance should decrease by approximately the gas cost
                              const balanceChangeAbs =
                                  balanceChange < 0 ? -balanceChange : balanceChange
                              const expectedChangeAbs =
                                  expectedBalanceChange < 0
                                      ? -expectedBalanceChange
                                      : expectedBalanceChange

                              assert(
                                  balanceChangeAbs >= expectedChangeAbs - tolerance &&
                                      balanceChangeAbs <= expectedChangeAbs + tolerance,
                                  `Balance change ${balanceChange} should be close to expected ${expectedBalanceChange} (negative gas cost)`,
                              )

                              // Alternative: Just check that we only lost gas costs (balance decreased)
                              assert(
                                  balanceChange < 0 && balanceChange > -tolerance,
                                  `Balance should have decreased by gas costs only, got: ${balanceChange}`,
                              )

                              // Contract should have no remaining balance
                              assert.equal(
                                  contractBalance,
                                  0,
                                  "Contract should have no remaining balance",
                              )

                              console.log("✅ Single participant raffle test passed!")
                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                      })

                      // Then entering the raffle
                      console.log("Entering Raffle...")
                      const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                      const txReceipt = await tx.wait(1)
                      const gasUsed = txReceipt.gasUsed
                      const gasPrice = tx.gasPrice
                      const gasCost = gasUsed * gasPrice
                      console.log("Ok, time to wait...")

                      // Store gas cost for use in the assertion
                      enterRaffleGasCost = gasCost

                      // and this code WONT complete until our listener has finished listening!
                  })
              })
          })
      })
