# Decentralized Raffle Smart Contract

![Solidity](https://img.shields.io/badge/Solidity-0.8.18+-363636?style=for-the-badge&logo=solidity) ![Hardhat](https://img.shields.io/badge/Hardhat-2.0+-FFF04D?style=for-the-badge&logo=hardhat&logoColor=black) ![Chainlink](https://img.shields.io/badge/Chainlink-VRF%20v2.5-375BD2?style=for-the-badge&logo=chainlink) ![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia-627EEA?style=for-the-badge&logo=ethereum) 

![Web3](https://img.shields.io/badge/Web3-Decentralized-9945FF?style=flat-square) ![Smart Contract](https://img.shields.io/badge/Smart%20Contract-Raffle-blue?style=flat-square) ![Provably Fair](https://img.shields.io/badge/Provably-Fair-success?style=flat-square) ![Automated](https://img.shields.io/badge/Chainlink-Automated-orange?style=flat-square) ![Gas Optimized](https://img.shields.io/badge/Gas-Optimized-brightgreen?style=flat-square)

A provably fair, decentralized raffle contract built with Solidity using Chainlink VRF v2.5 for randomness and Chainlink Keepers for automation.

## 🎯 Overview

This smart contract implements a decentralized raffle system where:
- Players can enter by paying an entrance fee
- A random winner is selected using Chainlink VRF v2.5
- The raffle automatically restarts after a winner is picked
- Chainlink Keepers trigger the winner selection automatically

## ✨ Features

- **🎲 Provably Fair**: Uses Chainlink VRF v2.5 for verifiable randomness
- **🤖 Automated**: Chainlink Keepers automatically trigger winner selection
- **🌐 Decentralized**: No central authority controls the outcome
- **👁️ Transparent**: All transactions are recorded on the blockchain
- **⛽ Gas Efficient**: Optimized contract design

## 📋 Prerequisites

- Node.js (v16 or higher)
- Yarn package manager
- MetaMask or similar Web3 wallet
- Sepolia testnet ETH (for testing)
- Chainlink VRF subscription (for testnet deployment)
- LINK tokens (for VRF subscription and Keepers upkeep funding)

## 🚀 Installation

1. Clone the repository:
```bash
git clone https://github.com/Shreyassp002/smartcontract-raffle.git
cd smartcontract-raffle
```

2. Install dependencies:
```bash
yarn install
```

3. Set up environment variables (see Environment Setup section)

## 🔧 Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Sepolia RPC URL - Get from Alchemy, Infura, or similar provider
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Private key of your deployer account (DO NOT share this!)
PRIVATE_KEY=your_private_key_here

# Etherscan API key for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

### Getting Required Keys:

1. **Sepolia RPC URL**: 
   - Create account on [Alchemy](https://www.alchemy.com/) or [Infura](https://infura.io/)
   - Create a new project and get the endpoint URL

2. **Private Key**:
   - Export from MetaMask: Account menu → Account details → Export private key
   - **Warning**: Only use a test account, never your main account

3. **Etherscan API Key**:
   - Create account on [Etherscan](https://etherscan.io/)
   - Go to API section and create a new API key

## 🔗 Chainlink VRF Setup

### For Testnet Deployment:

1. **Create VRF Subscription**:
   - Go to [Chainlink VRF](https://vrf.chain.link/)
   - Create a new subscription and fund it with LINK tokens(min 13)
   - Note down your subscription ID

2. **Update Helper Config**:
   - Add your subscription ID to `helper-hardhat-config.js`
   - The subscription ID should be included in the network configuration

### Helper Config Structure

The `helper-hardhat-config.js` file should include:

```javascript
const networkConfig = {
    11155111: {
        name: "sepolia",
        vrfCoordinatorV2_5: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
        entranceFee: ethers.utils.parseEther("0.01"),
        gasLane: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
        subscriptionId: "YOUR_SUBSCRIPTION_ID_HERE", // Add your subscription ID
        callbackGasLimit: "500000",
        interval: "30", // 30 seconds
    },
    31337: {
        name: "hardhat",
        entranceFee: ethers.utils.parseEther("0.01"),
        gasLane: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
        callbackGasLimit: "500000",
        interval: "30", // 30 seconds
    },
}
```

## 📁 Project Structure

```
SmartContract-Lottery/
├── contracts/
│   ├── Raffle.sol              # Main raffle contract
│   └── test/
│       └── VRFCoordinatorV2_5Mock.sol  # Mock for testing
├── deploy/
│   ├── 00-deploy-mocks.js      # Deploy mocks for local testing
│   └── 01-deploy-raffle.js     # Deploy main raffle contract
├── test/
│   ├── unit/
│   │   └── Raffle.test.js      # Unit tests for local development
│   └── staging/
│       └── Raffle.staging.test.js  # Integration tests for testnets
├── utils/
│   └── verify.js               # Contract verification utility
├── helper-hardhat-config.js    # Network configuration (includes VRF sub ID)
└── hardhat.config.js          # Hardhat configuration
```

## 💻 Usage

### Development (Local Testing)

1. **Start local Hardhat network**:
```bash
yarn hardhat node
```

2. **Deploy contracts to local network**:
```bash
yarn hardhat deploy
```

3. **Run unit tests**:
```bash
yarn hardhat test
```

4. **Run tests with gas reporting**:
```bash
REPORT_GAS=true yarn hardhat test
```

### Testnet Deployment (Sepolia)

**Important**: Before deploying to Sepolia, ensure you have:
- Updated `helper-hardhat-config.js` with your VRF subscription ID
- Funded your VRF subscription with LINK tokens

#### Step-by-Step Deployment Process:

1. **Deploy to Sepolia**:
```bash
yarn hardhat deploy --network sepolia
```

2. **Add contract as VRF consumer**:
   - Go to [Chainlink VRF](https://vrf.chain.link/)
   - Find your subscription and add your deployed contract address as a consumer
   - Add your deployed contract address as a consumer

3. **Register Chainlink Keepers Upkeep**:
   - Go to [Chainlink Keepers](https://keepers.chain.link/) and register new upkeep
   -  Use contract address, set gas limit to 500,000, fund with 13+ LINK

4. **Verify contract on Etherscan**:
```bash
yarn hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

5. **Run staging tests**:
```bash
yarn hardhat test --network sepolia
```

## 📡 Contract Interaction

### Key Functions

- `enterRaffle()`: Enter the raffle by paying entrance fee
- `getEntranceFee()`: Get the current entrance fee
- `getRecentWinner()`: Get the address of the most recent winner
- `getRaffleState()`: Check if raffle is open or calculating
- `getNumberOfPlayers()`: Get current number of players

## 🧪 Testing

### Unit Tests (Local)
```bash
# Run all unit tests
yarn hardhat test

# Run specific test file
yarn hardhat test test/unit/Raffle.test.js

# Run with coverage
yarn hardhat coverage
```

### Integration Tests (Testnet)
```bash
# Run staging tests on Sepolia
yarn hardhat test --network sepolia

# Run specific staging test
yarn hardhat test test/staging/Raffle.staging.test.js --network sepolia
```

## ⚙️ Configuration

### Network Configuration

The contract is configured for:
- **Sepolia Testnet**: For development and testing
- **Hardhat Local**: For unit testing

### Chainlink Configuration

- **VRF v2.5**: For provably fair randomness
- **Keepers**: For automated upkeep (must be registered after deployment)
- **Entrance Fee**: 0.01 ETH (configurable)
- **Interval**: 30 seconds between draws ⏰
- **Subscription ID**: Must be configured in helper-hardhat-config.js
- **Upkeep Registration**: Required for automated winner selection

## 📦 Dependencies

### Core Dependencies
- `@chainlink/contracts`: Chainlink smart contracts
- `hardhat`: Ethereum development framework
- `ethers`: Ethereum library
- `dotenv`: Environment variable management

### Testing Dependencies
- `chai`: Assertion library
- `@nomicfoundation/hardhat-chai-matchers`: Modern Chai matchers
- `hardhat-deploy`: Deployment framework

### Development Tools
- `hardhat-gas-reporter`: Gas usage reporting
- `solhint`: Solidity linter
- `prettier`: Code formatting
- `solidity-coverage`: Test coverage

## 📜 Scripts

```bash
# Install dependencies
yarn install

# Compile contracts
yarn hardhat compile

# Deploy to local network
yarn hardhat deploy

# Deploy to Sepolia
yarn hardhat deploy --network sepolia

# Run unit tests
yarn hardhat test

# Run staging tests
yarn hardhat test --network sepolia

# Start local node
yarn hardhat node

# Check contract size
yarn hardhat size-contracts

# Generate coverage report
yarn hardhat coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Repositories

- **Frontend**: [raffle-frontend](https://github.com/your-username/raffle-frontend) - Next.js frontend for the raffle dApp

## 📞 Support

For support and questions:
- Open an issue in this repository
- Check the frontend repository for UI-related issues
- Review the troubleshooting section above

---

**Built with ❤️ using Solidity, Hardhat, and Chainlink**d
