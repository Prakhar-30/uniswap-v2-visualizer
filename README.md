# Uniswap V2 Visualizer

A modern, feature-rich decentralized application (dApp) interface for interacting with Uniswap V2 protocol. This application provides an intuitive interface for token swaps, liquidity provision, and advanced pair visualization with price history and trend predictions.

## Features

### 🔄 Token Swaps
- Swap tokens on Sepolia, Base, and Unichain Sepolia networks
- Real-time price quotes with automatic updates
- Token balance display and validation
- Automatic token approval handling
- Slippage protection (1% default)

### 📊 Advanced Visualization
- Real-time pair reserve monitoring
- Historical price charts with multiple timeframes (15m, 30m, 1h, 6h, 24h)
- Linear regression-based trend predictions
- Interactive charts with detailed tooltips
- Live data loading with progress indicators

### 💧 Liquidity Management
- Create new token pairs
- Add liquidity to existing pairs
- Automatic pair creation if needed
- Balance validation and approval management

### 🎨 Modern UI/UX
- Clean, responsive design with Tailwind CSS
- Dark mode support with system preference detection
- Smooth animations and transitions
- Real-time loading states and error handling
- Mobile-friendly interface

## Supported Networks

- **Sepolia Testnet** - Ethereum testnet
- **Base Mainnet** - Coinbase's L2 network
- **Unichain Sepolia** - Unichain testnet

## Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **Ethers.js v5** - Ethereum interaction library
- **Recharts** - Data visualization
- **Tailwind CSS** - Utility-first CSS framework
- **MetaMask** - Web3 wallet integration

## Prerequisites

Before running this project, make sure you have:

- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager
- **MetaMask** browser extension installed
- Test ETH on Sepolia (get from [Sepolia Faucet](https://sepoliafaucet.com/))

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd uniswap-v2-visualizer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will open automatically at `http://localhost:3000`

## Building for Production

To create a production build:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Usage Guide

### Connecting Your Wallet

1. Click the **"Connect Wallet"** button in the header
2. Select the network you want to use from the dropdown
3. Approve the connection in MetaMask
4. If needed, the app will prompt you to switch networks or add the network to MetaMask

### Swapping Tokens

1. Navigate to the **"Swap"** tab
2. Enter the token addresses for the tokens you want to swap
3. Enter the amount you want to swap in the "From" field
4. The app will automatically fetch a quote for the output amount
5. Review the quote and click **"Swap"**
6. Approve the token spending in MetaMask (first time only)
7. Confirm the swap transaction in MetaMask

### Visualizing Pairs

1. Navigate to the **"Visualize"** tab
2. Enter a Uniswap V2 pair address
3. Click **"Analyze"** to load pair data
4. View token reserves, current price, and other metrics
5. Select a timeframe (15m, 30m, 1h, 6h, 24h) to load historical price data
6. The chart will display actual prices and trend predictions

### Creating Pairs & Adding Liquidity

1. Navigate to the **"Create"** tab
2. Enter the addresses for Token A and Token B
3. Enter the amounts you want to provide for each token
4. Click **"Create Pair & Add Liquidity"**
5. The app will:
   - Create the pair if it doesn't exist
   - Approve both tokens
   - Add liquidity to the pair
6. After completion, you'll be redirected to the Visualize tab with your new pair

## Theme Support

The application supports three theme modes:

- **Light Mode** - Traditional light theme
- **Dark Mode** - Easy on the eyes dark theme
- **System Default** - Automatically matches your OS theme preference

Click the theme toggle button (top-right corner) to cycle through themes. Your preference is saved locally.

## Project Structure

```
uniswap-v2-visualizer/
├── src/
│   ├── components/
│   │   └── UniswapV2Interface.jsx  # Main component
│   ├── App.jsx                      # App wrapper with theme support
│   ├── main.jsx                     # React entry point
│   └── index.css                    # Global styles with Tailwind
├── public/                           # Static assets
├── index.html                        # HTML template
├── vite.config.js                   # Vite configuration
├── tailwind.config.js               # Tailwind configuration
├── postcss.config.js                # PostCSS configuration
├── package.json                     # Dependencies and scripts
└── README.md                        # This file
```

## Configuration

### RPC URLs

The app uses the following RPC endpoints by default:

- **Sepolia**: Alchemy RPC (included)
- **Base**: Public Base RPC
- **Unichain Sepolia**: Public Unichain RPC

To use your own RPC endpoints, edit the `CHAIN_CONFIG` object in `src/components/UniswapV2Interface.jsx`.

### Contract Addresses

Default Uniswap V2 contract addresses are configured for each network. Update these in the `CHAIN_CONFIG` if needed.

## Features in Detail

### Real-time Quote Fetching

The app automatically fetches quotes as you type, with debouncing to avoid excessive API calls. Quotes include slippage protection and liquidity checks.

### Price History & Predictions

- Historical prices are fetched from blockchain data
- Linear regression is applied to the last 10 data points
- Trend predictions are displayed as dotted lines
- All predictions include disclaimers

### Error Handling

Comprehensive error handling for:
- Network issues
- Insufficient balances
- Insufficient liquidity
- Transaction rejections
- Gas estimation failures
- Invalid addresses

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Environment Variables

No environment variables are required. All configuration is in the code for transparency and ease of use.

## Security Considerations

⚠️ **Important Security Notes:**

- This app is for educational and testing purposes
- Always verify contract addresses before interacting
- Never share your private keys or seed phrases
- Use testnet funds when testing
- Review all transactions before confirming
- The trend predictions are for informational purposes only, not financial advice

## Troubleshooting

### MetaMask Not Connecting

1. Make sure MetaMask is installed and unlocked
2. Try refreshing the page
3. Check that you're on a supported network

### Transaction Failing

1. Ensure you have enough ETH for gas fees
2. Check token balances
3. Verify liquidity exists for the trading pair
4. Try increasing slippage tolerance

### Chart Not Loading

1. Verify the pair address is correct
2. Check that the pair has historical data
3. Try a different timeframe
4. Ensure your RPC connection is stable

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is open source and available under the MIT License.

## Disclaimer

This software is provided "as is", without warranty of any kind. Use at your own risk. The developers are not responsible for any losses incurred through the use of this application.

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation
- Review the code comments for implementation details

---

Built with ❤️ using React, Vite, and Ethers.js
