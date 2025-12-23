import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ethers } from 'ethers';

// Chain configurations
// NOTE: Sepolia testnet, ETH Mainnet and Base Mainnet are enabled. Unichain is disabled in the UI.
const CHAIN_CONFIG = {
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/QnTJicdL-OSJilaE2y4wVXLy_XuFKmJB',
    explorerUrl: 'https://sepolia.etherscan.io',
    routerAddress: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008',
    factoryAddress: '0x7E0987E5b3a30e3f2828572Bb659A548460a3003',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
  },
  // Ethereum Mainnet - Uniswap V2
  mainnet: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/QnTJicdL-OSJilaE2y4wVXLy_XuFKmJB',
    explorerUrl: 'https://etherscan.io',
    routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
  },
  // Base Mainnet - Uniswap V2
  base: {
    chainId: 8453,
    name: 'Base Mainnet',
    rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/QnTJicdL-OSJilaE2y4wVXLy_XuFKmJB',
    explorerUrl: 'https://basescan.org',
    routerAddress: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
    factoryAddress: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
  },
  // Unichain Sepolia - Currently disabled in UI
  unichain: {
    chainId: 1301,
    name: 'Unichain Sepolia',
    rpcUrl: 'https://sepolia.unichain.org',
    explorerUrl: 'https://sepolia.uniscan.xyz',
    routerAddress: '0x0000000000000000000000000000000000000000',
    factoryAddress: '0x0000000000000000000000000000000000000000',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
  }
};

// Contract ABIs
const ROUTER_ABI = [
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function getAmountsIn(uint amountOut, address[] memory path) public view returns (uint[] memory amounts)',
  'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)',
  'function factory() external pure returns (address)'
];

const FACTORY_ABI = [
  'function createPair(address tokenA, address tokenB) external returns (address pair)',
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
  'event PairCreated(address indexed token0, address indexed token1, address pair, uint)'
];

const PAIR_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'event Sync(uint112 reserve0, uint112 reserve1)'
];

const ERC20_ABI = [
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function balanceOf(address account) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)'
];

const UniswapV2Interface = () => {
  // State management
  const [selectedChain, setSelectedChain] = useState('sepolia');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState('');
  const [activeTab, setActiveTab] = useState('swap');

  // Swap state
  const [tokenIn, setTokenIn] = useState('');
  const [tokenOut, setTokenOut] = useState('');
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [tokenInData, setTokenInData] = useState(null);
  const [tokenOutData, setTokenOutData] = useState(null);
  const [swapLoading, setSwapLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Visualize state
  const [pairAddress, setPairAddress] = useState('');
  const [pairData, setPairData] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [visualizeLoading, setVisualizeLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1m');
  const [historyProgress, setHistoryProgress] = useState(0);

  // Create pair state
  const [tokenA, setTokenA] = useState('');
  const [tokenB, setTokenB] = useState('');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Initialize provider based on selected chain
  useEffect(() => {
    const initProvider = async () => {
      try {
        const config = CHAIN_CONFIG[selectedChain];
        // Use ethers v5 syntax for JsonRpcProvider
        const rpcProvider = new ethers.providers.JsonRpcProvider(config.rpcUrl);

        // Wait for the provider to detect the network
        await rpcProvider.getNetwork();

        setProvider(rpcProvider);
        setError('');
        console.log(`Provider initialized for ${config.name}`);
      } catch (err) {
        console.error('Provider initialization error:', err);
        setError(`Failed to connect to ${CHAIN_CONFIG[selectedChain].name}. Please check your internet connection.`);
      }
    };

    initProvider();
  }, [selectedChain]);

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError('Please install MetaMask to use this dApp');
        return;
      }

      const config = CHAIN_CONFIG[selectedChain];

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      // Switch to the correct chain
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${config.chainId.toString(16)}` }],
        });
      } catch (switchError) {
        // Chain not added, try to add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${config.chainId.toString(16)}`,
              chainName: config.name,
              nativeCurrency: config.nativeCurrency,
              rpcUrls: [config.rpcUrl],
              blockExplorerUrls: [config.explorerUrl]
            }]
          });
        }
      }

      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      const web3Signer = web3Provider.getSigner();

      setSigner(web3Signer);
      setAccount(accounts[0]);
      setError('');
      setSuccessMsg('Wallet connected successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(`Failed to connect wallet: ${err.message}`);
    }
  };

  // Fetch token data
  const fetchTokenData = async (tokenAddress, providerOrSigner) => {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, providerOrSigner);
      const [name, symbol, decimals] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals()
      ]);

      let balance = '0';
      if (signer && account) {
        balance = await tokenContract.balanceOf(account);
      }

      return {
        name,
        symbol,
        decimals: Number(decimals),
        address: tokenAddress,
        balance: ethers.utils.formatUnits(balance, decimals)
      };
    } catch (err) {
      console.error(`Error fetching token data for ${tokenAddress}:`, err);
      throw err;
    }
  };

  // Load token data for swap
  const loadTokenData = async () => {
    if (!tokenIn || !tokenOut || !ethers.utils.isAddress(tokenIn) || !ethers.utils.isAddress(tokenOut)) {
      return;
    }

    try {
      const useProvider = signer || provider;
      const [inData, outData] = await Promise.all([
        fetchTokenData(tokenIn, useProvider),
        fetchTokenData(tokenOut, useProvider)
      ]);
      setTokenInData(inData);
      setTokenOutData(outData);
    } catch (err) {
      setError('Failed to load token data');
    }
  };

  useEffect(() => {
    if (tokenIn && tokenOut && provider) {
      loadTokenData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenIn, tokenOut, signer, account, provider]);

  // Get quote for swap
  const getQuote = async () => {
    if (!amountIn || !tokenInData || !tokenOutData || !provider) return;

    setQuoteLoading(true);
    try {
      const config = CHAIN_CONFIG[selectedChain];
      const routerContract = new ethers.Contract(config.routerAddress, ROUTER_ABI, provider);

      // Clean the amount to match token decimals
      const amountInCleaned = parseFloat(amountIn).toFixed(tokenInData.decimals);
      const amountInWei = ethers.utils.parseUnits(amountInCleaned, tokenInData.decimals);

      // Check if amount is too small
      if (amountInWei.isZero()) {
        setAmountOut('0');
        setQuoteLoading(false);
        return;
      }

      const path = [tokenIn, tokenOut];

      const amounts = await routerContract.getAmountsOut(amountInWei, path);

      // Format output amount
      const amountOutValue = ethers.utils.formatUnits(amounts[1], tokenOutData.decimals);

      setAmountOut(amountOutValue);
    } catch (err) {
      console.error('Error getting quote:', err);

      if (err.message.includes('INSUFFICIENT_LIQUIDITY') || err.message.includes('INSUFFICIENT_INPUT_AMOUNT')) {
        setAmountOut('0');
        // Don't show error here, will show when user tries to swap
      } else {
        setAmountOut('0');
      }
    } finally {
      setQuoteLoading(false);
    }
  };

  useEffect(() => {
    if (amountIn && tokenInData && tokenOutData && provider) {
      const timer = setTimeout(() => {
        getQuote();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountIn, tokenInData, tokenOutData, provider]);

  // Check and approve token
  const checkAndApprove = async (tokenAddress, amount, decimals) => {
    try {
      const config = CHAIN_CONFIG[selectedChain];
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

      // Clean amount to match decimals
      const amountCleaned = parseFloat(amount).toFixed(decimals);
      const amountWei = ethers.utils.parseUnits(amountCleaned, decimals);

      const allowance = await tokenContract.allowance(account, config.routerAddress);

      if (allowance.lt(amountWei)) {
        setSuccessMsg(`Approving ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}...`);

        // Use exact amount for approval to reduce MetaMask warnings
        // Add 10% buffer to avoid requiring re-approval for small price changes
        const approvalAmount = amountWei.mul(110).div(100);

        // Estimate gas for approval
        let gasEstimate;
        try {
          gasEstimate = await tokenContract.estimateGas.approve(config.routerAddress, approvalAmount);
          // Add 20% buffer to gas estimate
          gasEstimate = gasEstimate.mul(120).div(100);
        } catch (e) {
          console.log('Gas estimation failed, using default');
          gasEstimate = ethers.BigNumber.from(100000);
        }

        const approveTx = await tokenContract.approve(config.routerAddress, approvalAmount, {
          gasLimit: gasEstimate
        });
        setSuccessMsg('Waiting for approval confirmation...');

        await approveTx.wait();
        setSuccessMsg('Approval successful!');

        // Wait a bit for the approval to propagate
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (err) {
      console.error('Approval error:', err);

      if (err.message.includes('user rejected') || err.code === 4001) {
        throw new Error('Approval rejected by user');
      } else if (err.message.includes('insufficient funds')) {
        throw new Error('Insufficient ETH for gas fees');
      } else {
        throw new Error(`Approval failed: ${err.message.split('(')[0].trim()}`);
      }
    }
  };

  // Execute swap
  const executeSwap = async () => {
    if (!signer || !tokenInData || !tokenOutData || !amountIn) {
      setError('Please connect wallet and enter valid amounts');
      return;
    }

    // Validate amountIn
    if (isNaN(parseFloat(amountIn)) || parseFloat(amountIn) <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    // Check if user has enough balance
    if (parseFloat(amountIn) > parseFloat(tokenInData.balance)) {
      setError(`Insufficient ${tokenInData.symbol} balance. You have ${parseFloat(tokenInData.balance).toFixed(4)}`);
      return;
    }

    // Validate amountOut
    if (!amountOut || parseFloat(amountOut) <= 0) {
      setError('Unable to get quote. Please try again or check if liquidity exists for this pair.');
      return;
    }

    setSwapLoading(true);
    setError('');

    try {
      const config = CHAIN_CONFIG[selectedChain];

      // Step 1: Approve token
      setSuccessMsg(`Approving ${tokenInData.symbol}...`);
      await checkAndApprove(tokenIn, amountIn, tokenInData.decimals);

      // Step 2: Execute swap
      const routerContract = new ethers.Contract(config.routerAddress, ROUTER_ABI, signer);

      // Parse amounts with proper decimal handling
      let amountInWei;
      let amountOutMin;

      try {
        // Ensure amountIn doesn't have more decimals than token supports
        const amountInCleaned = parseFloat(amountIn).toFixed(tokenInData.decimals);
        amountInWei = ethers.utils.parseUnits(amountInCleaned, tokenInData.decimals);
      } catch (err) {
        setError(`Invalid input amount: Token ${tokenInData.symbol} only supports ${tokenInData.decimals} decimal places`);
        setSwapLoading(false);
        return;
      }

      try {
        // Calculate minimum output with 1% slippage
        const amountOutFloat = parseFloat(amountOut);
        const minOutputFloat = amountOutFloat * 0.99;

        // Ensure amountOut doesn't have more decimals than token supports
        const amountOutCleaned = minOutputFloat.toFixed(tokenOutData.decimals);
        amountOutMin = ethers.utils.parseUnits(amountOutCleaned, tokenOutData.decimals);

        // Check if minimum output is greater than 0
        if (amountOutMin.isZero()) {
          setError('Output amount too small. Try increasing the input amount.');
          setSwapLoading(false);
          return;
        }
      } catch (err) {
        setError(`Invalid output amount: Token ${tokenOutData.symbol} only supports ${tokenOutData.decimals} decimal places`);
        setSwapLoading(false);
        return;
      }

      const path = [tokenIn, tokenOut];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

      setSuccessMsg('Estimating gas...');

      // Estimate gas for the swap
      let gasEstimate;
      try {
        gasEstimate = await routerContract.estimateGas.swapExactTokensForTokens(
          amountInWei,
          amountOutMin,
          path,
          account,
          deadline
        );
        // Add 20% buffer to gas estimate for safety
        gasEstimate = gasEstimate.mul(120).div(100);
      } catch (err) {
        console.log('Gas estimation failed:', err.message);
        // Use a reasonable default if estimation fails
        gasEstimate = ethers.BigNumber.from(250000);
      }

      setSuccessMsg('Swapping tokens...');

      let swapTx;
      try {
        swapTx = await routerContract.swapExactTokensForTokens(
          amountInWei,
          amountOutMin,
          path,
          account,
          deadline,
          {
            gasLimit: gasEstimate
          }
        );
      } catch (err) {
        console.error('Transaction error:', err);

        // Parse common error messages
        if (err.message.includes('insufficient')) {
          setError('Insufficient liquidity for this trade. Try a smaller amount.');
        } else if (err.message.includes('K')) {
          setError('Invalid trade: Would violate constant product formula.');
        } else if (err.message.includes('EXPIRED')) {
          setError('Transaction deadline expired. Please try again.');
        } else if (err.message.includes('user rejected')) {
          setError('Transaction rejected by user.');
        } else if (err.code === 4001) {
          setError('Transaction rejected by user.');
        } else if (err.message.includes('gas')) {
          setError('Transaction would fail. Possible reasons: insufficient liquidity, high slippage, or gas issues.');
        } else {
          setError(`Transaction failed: ${err.message.split('(')[0].trim()}`);
        }

        setSwapLoading(false);
        return;
      }

      setSuccessMsg('Waiting for confirmation...');

      const receipt = await swapTx.wait();
      setSuccessMsg(`Swap successful! Tx: ${receipt.transactionHash.slice(0, 10)}...`);

      // Reload token balances
      setTimeout(async () => {
        try {
          await loadTokenData();
        } catch (err) {
          console.error('Error reloading balances:', err);
        }
      }, 2000);

      // Clear inputs
      setAmountIn('');
      setAmountOut('');

      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Swap error:', err);

      if (err.message.includes('insufficient funds')) {
        setError('Insufficient ETH for gas fees. Please add ETH to your wallet.');
      } else if (!err.message.includes('Transaction')) {
        // Only show generic error if we haven't already set a specific error
        setError(`Swap failed: ${err.message}`);
      }
    } finally {
      setSwapLoading(false);
    }
  };

  // Fetch pair data for visualization
  const fetchPairData = async (skipHistory = false) => {
    if (!pairAddress || !ethers.utils.isAddress(pairAddress)) {
      setError('Please enter a valid pair address');
      return;
    }

    if (!provider) {
      setError('Provider not initialized. Please wait or refresh the page.');
      return;
    }

    setVisualizeLoading(true);
    setError('');
    if (!skipHistory) {
      setPairData(null);
      setPriceHistory([]);
    }

    try {
      // First, check if the address is actually a contract
      const code = await provider.getCode(pairAddress);
      if (code === '0x') {
        setError(`The address ${pairAddress} is not a contract on ${CHAIN_CONFIG[selectedChain].name}. Please verify the address and network.`);
        setVisualizeLoading(false);
        return;
      }

      const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, provider);

      // Try to call token0() to verify it's a valid pair contract
      let token0Address, token1Address;
      try {
        [token0Address, token1Address] = await Promise.all([
          pairContract.token0(),
          pairContract.token1()
        ]);
      } catch (err) {
        console.error('Error calling pair contract methods:', err);
        setError(`The address ${pairAddress} exists but is not a valid Uniswap V2 pair contract on ${CHAIN_CONFIG[selectedChain].name}. Make sure you're on the correct network.`);
        setVisualizeLoading(false);
        return;
      }

      const [token0Data, token1Data] = await Promise.all([
        fetchTokenData(token0Address, provider),
        fetchTokenData(token1Address, provider)
      ]);

      const reserves = await pairContract.getReserves();
      const reserve0 = ethers.utils.formatUnits(reserves.reserve0, token0Data.decimals);
      const reserve1 = ethers.utils.formatUnits(reserves.reserve1, token1Data.decimals);

      const currentPrice = parseFloat(reserve1) / parseFloat(reserve0);

      setPairData({
        token0: { ...token0Data, reserve: parseFloat(reserve0) },
        token1: { ...token1Data, reserve: parseFloat(reserve1) },
        currentPrice,
        pairContract
      });

      if (!skipHistory) {
        await fetchHistoricalPrices(pairContract, token0Data, token1Data, selectedTimeRange);
      }
    } catch (err) {
      console.error('Error fetching pair data:', err);

      // Provide more helpful error messages
      if (err.message.includes('network')) {
        setError(`Network error: Unable to connect to ${CHAIN_CONFIG[selectedChain].name}. Please check your connection and try again.`);
      } else if (err.message.includes('CALL_EXCEPTION')) {
        setError(`Invalid pair contract on ${CHAIN_CONFIG[selectedChain].name}. Please verify the address and ensure you're on the correct network.`);
      } else {
        setError(`Failed to fetch pair data: ${err.message}`);
      }
    } finally {
      setVisualizeLoading(false);
    }
  };

  // Handle time range change
  const handleTimeRangeChange = async (newRange) => {
    setSelectedTimeRange(newRange);
    if (pairData && pairData.pairContract) {
      setVisualizeLoading(true);
      setPriceHistory([]);
      try {
        await fetchHistoricalPrices(
          pairData.pairContract,
          pairData.token0,
          pairData.token1,
          newRange
        );
      } catch (err) {
        console.error('Error changing time range:', err);
      } finally {
        setVisualizeLoading(false);
      }
    }
  };

  const fetchHistoricalPrices = async (pairContract, token0Data, token1Data, timeRange = '1h') => {
    try {
      setHistoryProgress(0);
      setPriceHistory([]); // Clear existing data
      const currentBlock = await provider.getBlockNumber();

      // Optimized time ranges for 12 second blocks (Ethereum/Sepolia)
      const timeRangeConfig = {
        '1m': { blocks: 5, step: 1, label: '1 Minute', dataPoints: 5 },          // 1 min
        '5m': { blocks: 25, step: 1, label: '5 Minutes', dataPoints: 25 },       // 5 mins
        '15m': { blocks: 75, step: 3, label: '15 Minutes', dataPoints: 25 },     // 15 mins
        '30m': { blocks: 150, step: 6, label: '30 Minutes', dataPoints: 25 },    // 30 mins
      };

      const config = timeRangeConfig[timeRange] || timeRangeConfig['1m'];
      const totalBlocks = config.blocks;
      const blockStep = config.step;
      const dataPoints = config.dataPoints;

      const historicalData = [];
      let successfulFetches = 0;

      console.log(`Fetching ${config.label} data...`);

      // Fetch data and update chart in real-time
      for (let i = 0; i < dataPoints; i++) {
        const blockNumber = currentBlock - (totalBlocks - (i * blockStep));
        if (blockNumber < 0) break;

        try {
          const reserves = await pairContract.getReserves({ blockTag: blockNumber });
          const reserve0 = parseFloat(ethers.utils.formatUnits(reserves.reserve0, token0Data.decimals));
          const reserve1 = parseFloat(ethers.utils.formatUnits(reserves.reserve1, token1Data.decimals));

          if (reserve0 > 0 && reserve1 > 0) {
            const price = reserve1 / reserve0;
            const block = await provider.getBlock(blockNumber);
            const timestamp = block.timestamp;
            const date = new Date(timestamp * 1000);

            // Format date based on time range
            let dateLabel;
            if (timeRange === '1m' || timeRange === '5m') {
              dateLabel = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            } else {
              dateLabel = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            }

            const dataPoint = {
              date: dateLabel,
              price: price,
              block: blockNumber,
              timestamp: timestamp
            };

            historicalData.push(dataPoint);

            // Update chart in real-time with current data
            setPriceHistory([...historicalData]);

            successfulFetches++;
          }
        } catch (err) {
          console.log(`Skipping block ${blockNumber}: ${err.message}`);
        }

        // Update progress
        const progress = Math.round(((i + 1) / dataPoints) * 100);
        setHistoryProgress(progress);

        // Small delay to avoid rate limiting
        if (i % 2 === 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`Successfully fetched ${successfulFetches} data points`);

      // Calculate trend prediction using linear regression
      if (historicalData.length >= 5) {
        const predictions = calculateTrendPrediction(historicalData, 2);
        setPriceHistory([...historicalData, ...predictions]);
      }

      setHistoryProgress(100);

      if (successfulFetches === 0) {
        setError('No historical data available for this time range. The pair might be too new.');
      }

      // Clear progress after a delay
      setTimeout(() => setHistoryProgress(0), 1000);
    } catch (err) {
      console.error('Error fetching historical prices:', err);
      setError(`Failed to fetch price history: ${err.message}`);
      setPriceHistory([]);
      setHistoryProgress(0);
    }
  };

  // Linear regression for trend prediction
  const calculateTrendPrediction = (data, forecastPoints = 2) => {
    if (data.length < 2) return [];

    // Use last 10 points for trend calculation
    const recentData = data.slice(-10);
    const n = recentData.length;

    // Calculate linear regression
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    recentData.forEach((point, index) => {
      sumX += index;
      sumY += point.price;
      sumXY += index * point.price;
      sumX2 += index * index;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate predictions
    const predictions = [];
    const lastTimestamp = data[data.length - 1].timestamp;
    const timeStep = (data[data.length - 1].timestamp - data[data.length - 2].timestamp);

    for (let i = 1; i <= forecastPoints; i++) {
      const predictedPrice = slope * (n + i - 1) + intercept;
      const predictedTimestamp = lastTimestamp + (timeStep * i);
      const predictedDate = new Date(predictedTimestamp * 1000);

      let dateLabel;
      if (data[0].date.includes(':') && data[0].date.split(':').length === 3) {
        dateLabel = predictedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } else {
        dateLabel = predictedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }

      predictions.push({
        date: dateLabel,
        price: null, // Actual price is null for predictions
        predictedPrice: predictedPrice > 0 ? predictedPrice : 0,
        block: null,
        timestamp: predictedTimestamp,
        isPrediction: true
      });
    }

    return predictions;
  };

  // Create pair and add liquidity
  const createPairAndAddLiquidity = async () => {
    if (!signer || !tokenA || !tokenB || !amountA || !amountB) {
      setError('Please connect wallet and fill all fields');
      return;
    }

    if (!ethers.utils.isAddress(tokenA) || !ethers.utils.isAddress(tokenB)) {
      setError('Invalid token addresses');
      return;
    }

    if (tokenA.toLowerCase() === tokenB.toLowerCase()) {
      setError('Token A and Token B must be different');
      return;
    }

    // Validate amounts
    if (isNaN(parseFloat(amountA)) || parseFloat(amountA) <= 0) {
      setError('Please enter a valid amount for Token A');
      return;
    }

    if (isNaN(parseFloat(amountB)) || parseFloat(amountB) <= 0) {
      setError('Please enter a valid amount for Token B');
      return;
    }

    setCreateLoading(true);
    setError('');

    try {
      const config = CHAIN_CONFIG[selectedChain];
      const factoryContract = new ethers.Contract(config.factoryAddress, FACTORY_ABI, signer);

      // Fetch token data
      setSuccessMsg('Loading token information...');
      const [tokenAData, tokenBData] = await Promise.all([
        fetchTokenData(tokenA, signer),
        fetchTokenData(tokenB, signer)
      ]);

      // Check balances
      if (parseFloat(amountA) > parseFloat(tokenAData.balance)) {
        setError(`Insufficient ${tokenAData.symbol} balance. You have ${parseFloat(tokenAData.balance).toFixed(4)}`);
        setCreateLoading(false);
        return;
      }

      if (parseFloat(amountB) > parseFloat(tokenBData.balance)) {
        setError(`Insufficient ${tokenBData.symbol} balance. You have ${parseFloat(tokenBData.balance).toFixed(4)}`);
        setCreateLoading(false);
        return;
      }

      // Check if pair exists
      let pairAddr = await factoryContract.getPair(tokenA, tokenB);

      if (pairAddr === ethers.constants.AddressZero) {
        // Step 1: Create pair
        setSuccessMsg('Creating pair...');

        try {
          // Estimate gas for pair creation
          let gasEstimate;
          try {
            gasEstimate = await factoryContract.estimateGas.createPair(tokenA, tokenB);
            gasEstimate = gasEstimate.mul(120).div(100);
          } catch (e) {
            console.log('Gas estimation failed, using default');
            gasEstimate = ethers.BigNumber.from(500000);
          }

          const createTx = await factoryContract.createPair(tokenA, tokenB, {
            gasLimit: gasEstimate
          });
          setSuccessMsg('Waiting for pair creation...');
          const receipt = await createTx.wait();

          // Get pair address from event
          const pairCreatedEvent = receipt.logs.find(
            log => log.topics[0] === ethers.utils.id('PairCreated(address,address,address,uint256)')
          );

          if (pairCreatedEvent && pairCreatedEvent.data) {
            const decoded = ethers.utils.defaultAbiCoder.decode(['address'], pairCreatedEvent.data);
            pairAddr = decoded[0];
          } else {
            // Fallback: query the factory again
            pairAddr = await factoryContract.getPair(tokenA, tokenB);
          }

          setSuccessMsg(`Pair created: ${pairAddr.slice(0, 10)}...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
          console.error('Create pair error:', err);

          if (err.message.includes('user rejected') || err.code === 4001) {
            setError('Pair creation rejected by user');
          } else if (err.message.includes('IDENTICAL_ADDRESSES')) {
            setError('Cannot create pair with identical token addresses');
          } else if (err.message.includes('PAIR_EXISTS')) {
            setError('Pair already exists');
          } else {
            setError(`Failed to create pair: ${err.message.split('(')[0].trim()}`);
          }
          setCreateLoading(false);
          return;
        }
      } else {
        setSuccessMsg('Pair already exists, adding liquidity...');
      }

      // Step 2: Approve both tokens
      try {
        setSuccessMsg(`Approving ${tokenAData.symbol}...`);
        await checkAndApprove(tokenA, amountA, tokenAData.decimals);

        setSuccessMsg(`Approving ${tokenBData.symbol}...`);
        await checkAndApprove(tokenB, amountB, tokenBData.decimals);
      } catch (err) {
        setError(err.message);
        setCreateLoading(false);
        return;
      }

      // Step 3: Add liquidity
      try {
        const routerContract = new ethers.Contract(config.routerAddress, ROUTER_ABI, signer);

        // Clean amounts to match decimals
        const amountACleaned = parseFloat(amountA).toFixed(tokenAData.decimals);
        const amountBCleaned = parseFloat(amountB).toFixed(tokenBData.decimals);

        const amountAWei = ethers.utils.parseUnits(amountACleaned, tokenAData.decimals);
        const amountBWei = ethers.utils.parseUnits(amountBCleaned, tokenBData.decimals);
        const amountAMin = ethers.utils.parseUnits((parseFloat(amountACleaned) * 0.99).toFixed(tokenAData.decimals), tokenAData.decimals);
        const amountBMin = ethers.utils.parseUnits((parseFloat(amountBCleaned) * 0.99).toFixed(tokenBData.decimals), tokenBData.decimals);
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

        setSuccessMsg('Estimating gas...');

        // Estimate gas for adding liquidity
        let gasEstimate;
        try {
          gasEstimate = await routerContract.estimateGas.addLiquidity(
            tokenA,
            tokenB,
            amountAWei,
            amountBWei,
            amountAMin,
            amountBMin,
            account,
            deadline
          );
          // Add 20% buffer to gas estimate
          gasEstimate = gasEstimate.mul(120).div(100);
        } catch (e) {
          console.log('Gas estimation failed, using default');
          gasEstimate = ethers.BigNumber.from(300000);
        }

        setSuccessMsg('Adding liquidity...');
        const liquidityTx = await routerContract.addLiquidity(
          tokenA,
          tokenB,
          amountAWei,
          amountBWei,
          amountAMin,
          amountBMin,
          account,
          deadline,
          {
            gasLimit: gasEstimate
          }
        );

        setSuccessMsg('Waiting for confirmation...');
        const liquidityReceipt = await liquidityTx.wait();
        setSuccessMsg(`Liquidity added! Pair: ${pairAddr}`);

        // Set pair address for visualization
        setPairAddress(pairAddr);

        // Clear inputs
        setTokenA('');
        setTokenB('');
        setAmountA('');
        setAmountB('');

        setTimeout(() => {
          setSuccessMsg('');
          setActiveTab('visualize');
        }, 3000);
      } catch (err) {
        console.error('Add liquidity error:', err);

        if (err.message.includes('user rejected') || err.code === 4001) {
          setError('Add liquidity rejected by user');
        } else if (err.message.includes('INSUFFICIENT_A_AMOUNT') || err.message.includes('INSUFFICIENT_B_AMOUNT')) {
          setError('Insufficient token amounts. The ratio may have changed. Try adjusting your amounts.');
        } else if (err.message.includes('insufficient funds')) {
          setError('Insufficient ETH for gas fees');
        } else {
          setError(`Failed to add liquidity: ${err.message.split('(')[0].trim()}`);
        }
        setCreateLoading(false);
        return;
      }
    } catch (err) {
      console.error('Create pair error:', err);

      if (!error) { // Only set error if not already set
        setError(`Failed: ${err.message}`);
      }
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">🦄</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Uniswap V2 Interface
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Chain Selector */}
              <select
                value={selectedChain}
                onChange={(e) => {
                  if (!account) {
                    setSelectedChain(e.target.value);
                  } else {
                    setError('Please disconnect wallet before switching chains');
                    setTimeout(() => setError(''), 3000);
                  }
                }}
                disabled={account}
                className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white hover:border-pink-400 dark:hover:border-pink-500 focus:outline-none focus:border-pink-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="sepolia">Sepolia Testnet</option>
                <option value="mainnet">Ethereum Mainnet</option>
                <option value="base">Base Mainnet</option>
                <option value="unichain" disabled>Unichain Sepolia (Coming Soon)</option>
              </select>

              {/* Connect Wallet Button */}
              {!account ? (
                <button
                  onClick={connectWallet}
                  className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Connect Wallet
                </button>
              ) : (
                <div className="px-4 py-2 bg-green-100 dark:bg-green-900 border-2 border-green-300 dark:border-green-700 rounded-xl font-mono text-sm dark:text-green-100">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-200 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {successMsg && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 text-green-700 dark:text-green-200 rounded-lg">
            {successMsg}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {['swap', 'visualize', 'create'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-semibold rounded-t-lg transition-all capitalize ${
                activeTab === tab
                  ? 'bg-white dark:bg-gray-800 text-pink-600 dark:text-pink-400 border-b-2 border-pink-600 dark:border-pink-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* SWAP TAB */}
        {activeTab === 'swap' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Swap Tokens</h2>

              {/* Token In */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">From</label>
                <input
                  type="text"
                  placeholder="Token Address"
                  value={tokenIn}
                  onChange={(e) => setTokenIn(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-pink-400 dark:focus:border-pink-500 transition-colors mb-2 dark:bg-gray-700 dark:text-white"
                />
                {tokenInData && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                    {tokenInData.symbol} | Balance: {parseFloat(tokenInData.balance).toFixed(4)}
                  </div>
                )}
                <input
                  type="number"
                  placeholder="0.0"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                  className="w-full px-4 py-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-pink-400 dark:focus:border-pink-500 transition-colors text-2xl font-semibold mt-2 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Swap Arrow */}
              <div className="flex justify-center my-4">
                <button
                  onClick={() => {
                    const temp = tokenIn;
                    setTokenIn(tokenOut);
                    setTokenOut(temp);
                    setAmountIn('');
                    setAmountOut('');
                  }}
                  className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
              </div>

              {/* Token Out */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">To</label>
                <input
                  type="text"
                  placeholder="Token Address"
                  value={tokenOut}
                  onChange={(e) => setTokenOut(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-pink-400 dark:focus:border-pink-500 transition-colors mb-2 dark:bg-gray-700 dark:text-white"
                />
                {tokenOutData && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                    {tokenOutData.symbol} | Balance: {parseFloat(tokenOutData.balance).toFixed(4)}
                  </div>
                )}
                <div className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-2xl font-semibold text-gray-600 dark:text-gray-300 mt-2">
                  {quoteLoading ? 'Loading...' : amountOut || '0.0'}
                </div>
              </div>

              {/* Swap Button */}
              <button
                onClick={executeSwap}
                disabled={swapLoading || !account || !amountIn || !tokenInData || !tokenOutData}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg shadow-lg hover:shadow-xl"
              >
                {swapLoading ? 'Swapping...' : !account ? 'Connect Wallet' : 'Swap'}
              </button>
            </div>
          </div>
        )}

        {/* VISUALIZE TAB */}
        {activeTab === 'visualize' && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Visualize Pair</h2>

            <div className="flex gap-4 mb-4">
              <input
                type="text"
                value={pairAddress}
                onChange={(e) => setPairAddress(e.target.value)}
                placeholder="Enter Pair Address"
                className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-pink-400 dark:focus:border-pink-500 transition-colors dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={() => fetchPairData(false)}
                disabled={visualizeLoading || !provider}
                className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 transition-all"
              >
                {visualizeLoading ? 'Loading...' : 'Analyze'}
              </button>
            </div>

            {/* Info box for finding pair addresses */}
            <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-600 p-4 rounded">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>💡 How to find pair addresses:</strong>
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 ml-4 space-y-1">
                <li>• Create a pair using the "Create" tab and get the pair address</li>
                <li>• Visit {CHAIN_CONFIG[selectedChain].explorerUrl} and search for Uniswap V2 pairs</li>
                <li>• Current network: <strong>{CHAIN_CONFIG[selectedChain].name}</strong></li>
                <li>• Factory address: <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded text-xs">{CHAIN_CONFIG[selectedChain].factoryAddress}</code></li>
              </ul>
            </div>

            {pairData && (
              <div className="space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 rounded-2xl p-6 border-2 border-pink-200 dark:border-pink-700">
                    <h3 className="text-xl font-bold text-pink-800 dark:text-pink-300 mb-4">Token 0</h3>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Name: <span className="font-semibold text-gray-800 dark:text-gray-200">{pairData.token0.name}</span></p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Symbol: <span className="font-semibold text-gray-800 dark:text-gray-200">{pairData.token0.symbol}</span></p>
                      <p className="text-xs font-mono bg-white dark:bg-gray-700 p-2 rounded break-all dark:text-gray-300">{pairData.token0.address}</p>
                      <p className="text-xl font-bold text-pink-700 dark:text-pink-400 mt-3">
                        {pairData.token0.reserve.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl p-6 border-2 border-purple-200 dark:border-purple-700">
                    <h3 className="text-xl font-bold text-purple-800 dark:text-purple-300 mb-4">Token 1</h3>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Name: <span className="font-semibold text-gray-800 dark:text-gray-200">{pairData.token1.name}</span></p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Symbol: <span className="font-semibold text-gray-800 dark:text-gray-200">{pairData.token1.symbol}</span></p>
                      <p className="text-xs font-mono bg-white dark:bg-gray-700 p-2 rounded break-all dark:text-gray-300">{pairData.token1.address}</p>
                      <p className="text-xl font-bold text-purple-700 dark:text-purple-400 mt-3">
                        {pairData.token1.reserve.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl p-6 text-white">
                  <h3 className="text-lg font-semibold mb-2">Current Price</h3>
                  <p className="text-3xl font-bold">
                    1 {pairData.token0.symbol} = {pairData.currentPrice.toFixed(6)} {pairData.token1.symbol}
                  </p>
                </div>

                {/* Time Range Selector */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Price History</h3>
                    <div className="flex gap-2">
                      {['1m', '5m', '15m', '30m'].map((range) => (
                        <button
                          key={range}
                          onClick={() => handleTimeRangeChange(range)}
                          disabled={visualizeLoading}
                          className={`px-3 py-1.5 rounded-lg font-semibold text-sm transition-all ${
                            selectedTimeRange === range
                              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                              : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500'
                          } disabled:opacity-50`}
                        >
                          {range.toUpperCase()}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          if (pairData && pairData.pairContract) {
                            handleTimeRangeChange(selectedTimeRange);
                          }
                        }}
                        disabled={visualizeLoading || !pairData}
                        className="px-3 py-1.5 rounded-lg font-semibold text-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-all flex items-center gap-1"
                        title="Reload chart"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reload
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {historyProgress > 0 && historyProgress < 100 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Loading historical data... ({Math.round((priceHistory.filter(p => !p.isPrediction).length / 25) * 100)}%)</span>
                        <span className="text-sm font-semibold text-pink-600 dark:text-pink-400">{historyProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${historyProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {priceHistory.length > 0 ? (
                    <div className={`transition-all duration-500 ${historyProgress > 0 && historyProgress < 100 ? 'opacity-60 blur-sm' : 'opacity-100 blur-0'}`}>
                      <ResponsiveContainer width="100%" height={450}>
                        <LineChart data={priceHistory} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-600" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10 }}
                            angle={-45}
                            textAnchor="end"
                            height={90}
                            interval="preserveStartEnd"
                            className="dark:fill-gray-300"
                            label={{
                              value: 'Time',
                              position: 'insideBottom',
                              offset: -50,
                              style: { fontSize: 14, fontWeight: 'bold', fill: '#666' }
                            }}
                          />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            domain={['auto', 'auto']}
                            tickFormatter={(value) => value.toFixed(8)}
                            className="dark:fill-gray-300"
                            label={{
                              value: `Price (1 ${pairData.token0.symbol} = ${pairData.token1.symbol})`,
                              angle: -90,
                              position: 'insideLeft',
                              style: { fontSize: 14, fontWeight: 'bold', fill: '#666', textAnchor: 'middle' }
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              padding: '8px'
                            }}
                            formatter={(value, name) => {
                              if (name.includes('Actual')) {
                                return [value ? `${value.toFixed(8)} ${pairData.token1.symbol}` : 'N/A', `1 ${pairData.token0.symbol} =`];
                              } else {
                                return [value ? `${value.toFixed(8)} ${pairData.token1.symbol}` : 'N/A', 'Predicted'];
                              }
                            }}
                            labelFormatter={(label) => `Time: ${label}`}
                          />
                          <Legend
                            wrapperStyle={{ paddingTop: '10px' }}
                            iconType="line"
                          />
                          {/* Actual Price Line */}
                          <Line
                            type="monotone"
                            dataKey="price"
                            stroke="#ec4899"
                            strokeWidth={2.5}
                            dot={false}
                            name={`Price: 1 ${pairData.token0.symbol} = ${pairData.token1.symbol} (Actual)`}
                            animationDuration={300}
                            connectNulls={false}
                          />
                          {/* Predicted Price Line */}
                          <Line
                            type="monotone"
                            dataKey="predictedPrice"
                            stroke="#9333ea"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ fill: '#9333ea', r: 3 }}
                            name="Trend Prediction"
                            animationDuration={300}
                            connectNulls={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      {priceHistory.some(p => p.isPrediction) && (
                        <div className="mt-4 text-xs text-gray-600 dark:text-gray-400 bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-700">
                          <span className="font-semibold text-purple-700 dark:text-purple-300">📊 Trend Prediction:</span> The dotted purple line shows predicted price movement based on linear regression of the last 10 data points. This is a simple trend indicator, not financial advice.
                        </div>
                      )}
                    </div>
                  ) : visualizeLoading ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Loading chart data...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-96">
                      <p className="text-gray-500 dark:text-gray-400">No historical data available yet. Click a time range above to load.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CREATE PAIR TAB */}
        {activeTab === 'create' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8">
              <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Create Pair & Add Liquidity</h2>

              <div className="space-y-6">
                {/* Token A */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Token A Address</label>
                  <input
                    type="text"
                    value={tokenA}
                    onChange={(e) => setTokenA(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-pink-400 dark:focus:border-pink-500 transition-colors dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Token A Amount</label>
                  <input
                    type="number"
                    value={amountA}
                    onChange={(e) => setAmountA(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-pink-400 dark:focus:border-pink-500 transition-colors dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Token B */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Token B Address</label>
                  <input
                    type="text"
                    value={tokenB}
                    onChange={(e) => setTokenB(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-pink-400 dark:focus:border-pink-500 transition-colors dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Token B Amount</label>
                  <input
                    type="number"
                    value={amountB}
                    onChange={(e) => setAmountB(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-pink-400 dark:focus:border-pink-500 transition-colors dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-600 p-4 rounded">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> This will create a new pair if it doesn't exist, or add liquidity to an existing pair.
                    Tokens will be approved automatically before adding liquidity.
                  </p>
                </div>

                <button
                  onClick={createPairAndAddLiquidity}
                  disabled={createLoading || !account}
                  className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg shadow-lg hover:shadow-xl"
                >
                  {createLoading ? 'Processing...' : !account ? 'Connect Wallet' : 'Create Pair & Add Liquidity'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 pb-8 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>Network: {CHAIN_CONFIG[selectedChain].name} | Powered by Uniswap V2</p>
      </footer>
    </div>
  );
};

export default UniswapV2Interface;
