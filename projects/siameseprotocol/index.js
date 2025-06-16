const { getFullnodeUrl, SuiClient } = require('@mysten/sui/client');

// Configuration - Update these with your actual values
const config = {
  PACKAGE_ID: "0x7ca0d6c4ab8189b5bc47b3826bbb5f345999f990c9e41711934cddea6eb4648b", // Replace with your actual package ID
  STAKING_POOL_ID: "0x28580c0858af4b903bcd6190c30202c7f38e71cdb80089619627dc2d4e66aceb", // Replace with your actual staking pool ID
  SUI_SYSTEM_STATE: "0x0000000000000000000000000000000000000000000000000000000000000005",
  API_BASE_URL: "YOUR_API_BASE_URL" // Replace with your actual API URL
};

// Initialize Sui client
const fullNodeUrl = getFullnodeUrl('mainnet');
const client = new SuiClient({ url: fullNodeUrl });

// Method 1: Fetch TVL from your backend API
async function getTVLFromAPI() {
  try {
    const response = await fetch(`${config.API_BASE_URL}/pool/stats`);
    const data = await response.json();
    
    if (data && data.totalStaked) {
      // Convert to number and return in USD (you might need SUI price conversion)
      const totalStakedSUI = parseFloat(data.totalStaked);
      
      // Fetch SUI price from CoinGecko
      const priceResponse = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd'
      );
      const priceData = await priceResponse.json();
      const suiPrice = priceData.sui?.usd || 0;
      
      return totalStakedSUI * suiPrice;
    }
    return 0;
  } catch (error) {
    console.error('Error fetching TVL from API:', error);
    return 0;
  }
}

// Method 2: Fetch TVL directly from smart contract
async function getTVLFromContract() {
  try {
    if (!config.STAKING_POOL_ID || config.STAKING_POOL_ID === "YOUR_POOL_ID_HERE") {
      console.error('STAKING_POOL_ID not configured');
      return 0;
    }

    // Get pool object from Sui blockchain
    const poolObj = await client.getObject({
      id: config.STAKING_POOL_ID,
      options: { showContent: true }
    });
    
    if (poolObj.data?.content?.fields) {
      const fields = poolObj.data.content.fields;
      
      // Extract total staked amount from contract
      const totalStakedMist = fields.total_staked || 0;
      const totalStakedSUI = parseInt(totalStakedMist) / 1_000_000_000; // Convert from MIST to SUI
      
      // Fetch SUI price from CoinGecko
      const priceResponse = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd'
      );
      const priceData = await priceResponse.json();
      const suiPrice = priceData.sui?.usd || 0;
      
      return totalStakedSUI * suiPrice;
    }
    return 0;
  } catch (error) {
    console.error('Error fetching TVL from contract:', error);
    return 0;
  }
}

// Method 3: Alternative - Query all staking objects (if you track individual stakes)
async function getTVLFromStakingObjects() {
  try {
    // This method would work if you have a way to query all staking positions
    // You might need to adapt this based on your contract structure
    
    // Example: Query events or objects related to staking
    const events = await client.queryEvents({
      query: {
        MoveModule: {
          package: config.PACKAGE_ID,
          module: 'staking_pool'
        }
      },
      limit: 1000, // Adjust as needed
      order: 'descending'
    });
    
    // Process events to calculate total staked amount
    let totalStaked = 0;
    
    // This is a simplified example - you'd need to process actual deposit/withdraw events
    // and calculate the net staked amount
    
    return totalStaked;
  } catch (error) {
    console.error('Error fetching TVL from staking objects:', error);
    return 0;
  }
}

// Main TVL function for DeFiLlama
async function tvl() {
  try {
    // Try multiple methods to get TVL, prioritizing the most reliable one
    let tvlUSD = 0;
    
    // Method 1: Try API first (fastest and most reliable if your backend is up)
    try {
      tvlUSD = await getTVLFromAPI();
      if (tvlUSD > 0) {
        console.log(`TVL from API: $${tvlUSD.toFixed(2)}`);
        return { sui: tvlUSD };
      }
    } catch (error) {
      console.log('API method failed, trying contract method');
    }
    
    // Method 2: Fallback to contract query
    tvlUSD = await getTVLFromContract();
    if (tvlUSD > 0) {
      console.log(`TVL from contract: $${tvlUSD.toFixed(2)}`);
      return { sui: tvlUSD };
    }
    
    // Method 3: Last resort - query staking objects (uncomment if needed)
    // tvlUSD = await getTVLFromStakingObjects();
    
    console.log(`Final TVL: $${tvlUSD.toFixed(2)}`);
    return { sui: tvlUSD };
    
  } catch (error) {
    console.error('Error in TVL calculation:', error);
    return { sui: 0 };
  }
}

// DeFiLlama adapter export
module.exports = {
  timetravel: false, // Set to true if you support historical data
  misrepresentedTokens: false,
  methodology: "Counts the total amount of SUI staked in the Siamese staking pool",
  start: 1672531200, // Unix timestamp of when your protocol started (update this)
  sui: {
    tvl,
  },
};

// For testing purposes - uncomment to test locally
/*
async function test() {
  console.log('Testing TVL calculation...');
  const result = await tvl();
  console.log('TVL Result:', result);
}

// test();
*/
