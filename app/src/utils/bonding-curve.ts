```typescript
import { BN } from '@coral-xyz/anchor';

// Constants for bonding curve calculations
export const CURVE_CONSTANTS = {
  // Base price in lamports (0.001 SOL)
  BASE_PRICE: new BN(1_000_000),
  // Price increase factor (1.1x per token)
  PRICE_MULTIPLIER: 1.1,
  // Maximum supply for bonding curve
  MAX_SUPPLY: new BN(1_000_000),
  // Decimals for token
  TOKEN_DECIMALS: 6,
  // Fee percentage (2.5%)
  FEE_PERCENTAGE: 0.025,
  // Minimum price floor
  MIN_PRICE: new BN(100_000), // 0.0001 SOL
};

export interface PriceCalculation {
  price: BN;
  totalCost: BN;
  fee: BN;
  netCost: BN;
  pricePerToken: number;
  marketCap: BN;
}

export interface CurveState {
  currentSupply: BN;
  totalSupply: BN;
  reserveBalance: BN;
  currentPrice: BN;
  marketCap: BN;
}

/**
 * Calculate the price for buying a specific amount of tokens
 * Uses exponential bonding curve: price = basePrice * (multiplier ^ supply)
 */
export function calculateBuyPrice(
  currentSupply: BN,
  amount: BN,
  basePrice: BN = CURVE_CONSTANTS.BASE_PRICE
): PriceCalculation {
  let totalCost = new BN(0);
  let currentPrice = new BN(0);
  
  // Calculate integral of exponential curve
  for (let i = 0; i < amount.toNumber(); i++) {
    const tokenIndex = currentSupply.add(new BN(i));
    const price = calculatePriceAtSupply(tokenIndex, basePrice);
    totalCost = totalCost.add(price);
    currentPrice = price;
  }
  
  const fee = totalCost.mul(new BN(CURVE_CONSTANTS.FEE_PERCENTAGE * 10000)).div(new BN(10000));
  const netCost = totalCost.add(fee);
  const pricePerToken = currentPrice.toNumber() / Math.pow(10, 9); // Convert to SOL
  const marketCap = calculateMarketCap(currentSupply.add(amount), basePrice);
  
  return {
    price: currentPrice,
    totalCost,
    fee,
    netCost,
    pricePerToken,
    marketCap,
  };
}

/**
 * Calculate the price for selling a specific amount of tokens
 */
export function calculateSellPrice(
  currentSupply: BN,
  amount: BN,
  basePrice: BN = CURVE_CONSTANTS.BASE_PRICE
): PriceCalculation {
  if (currentSupply.lt(amount)) {
    throw new Error('Cannot sell more tokens than current supply');
  }
  
  let totalRevenue = new BN(0);
  let currentPrice = new BN(0);
  
  // Calculate integral of exponential curve (in reverse)
  for (let i = 0; i < amount.toNumber(); i++) {
    const tokenIndex = currentSupply.sub(new BN(i + 1));
    const price = calculatePriceAtSupply(tokenIndex, basePrice);
    totalRevenue = totalRevenue.add(price);
    currentPrice = price;
  }
  
  const fee = totalRevenue.mul(new BN(CURVE_CONSTANTS.FEE_PERCENTAGE * 10000)).div(new BN(10000));
  const netRevenue = totalRevenue.sub(fee);
  const pricePerToken = currentPrice.toNumber() / Math.pow(10, 9); // Convert to SOL
  const marketCap = calculateMarketCap(currentSupply.sub(amount), basePrice);
  
  return {
    price: currentPrice,
    totalCost: totalRevenue,
    fee,
    netCost: netRevenue,
    pricePerToken,
    marketCap,
  };
}

/**
 * Calculate price at a specific supply level
 */
export function calculatePriceAtSupply(
  supply: BN,
  basePrice: BN = CURVE_CONSTANTS.BASE_PRICE
): BN {
  if (supply.lte(new BN(0))) {
    return basePrice;
  }
  
  // Exponential curve: price = basePrice * (1.1 ^ supply)
  const supplyNumber = supply.toNumber();
  const multiplier = Math.pow(CURVE_CONSTANTS.PRICE_MULTIPLIER, supplyNumber);
  const price = basePrice.mul(new BN(Math.floor(multiplier * 1000))).div(new BN(1000));
  
  // Ensure minimum price
  return BN.max(price, CURVE_CONSTANTS.MIN_PRICE);
}

/**
 * Calculate current market cap
 */
export function calculateMarketCap(
  currentSupply: BN,
  basePrice: BN = CURVE_CONSTANTS.BASE_PRICE
): BN {
  if (currentSupply.lte(new BN(0))) {
    return new BN(0);
  }
  
  const currentPrice = calculatePriceAtSupply(currentSupply, basePrice);
  return currentPrice.mul(currentSupply);
}

/**
 * Calculate price impact for a trade
 */
export function calculatePriceImpact(
  currentSupply: BN,
  tradeAmount: BN,
  isBuy: boolean,
  basePrice: BN = CURVE_CONSTANTS.BASE_PRICE
): number {
  const currentPrice = calculatePriceAtSupply(currentSupply, basePrice);
  
  let newPrice: BN;
  if (isBuy) {
    newPrice = calculatePriceAtSupply(currentSupply.add(tradeAmount), basePrice);
  } else {
    newPrice = calculatePriceAtSupply(currentSupply.sub(tradeAmount), basePrice);
  }
  
  const priceDiff = newPrice.sub(currentPrice).abs();
  const impact = priceDiff.mul(new BN(10000)).div(currentPrice).toNumber() / 100;
  
  return Math.min(impact, 100); // Cap at 100%
}

/**
 * Get curve state information
 */
export function getCurveState(
  currentSupply: BN,
  reserveBalance: BN,
  basePrice: BN = CURVE_CONSTANTS.BASE_PRICE
): CurveState {
  const currentPrice = calculatePriceAtSupply(currentSupply, basePrice);
  const marketCap = calculateMarketCap(currentSupply, basePrice);
  
  return {
    currentSupply,
    totalSupply: CURVE_CONSTANTS.MAX_SUPPLY,
    reserveBalance,
    currentPrice,
    marketCap,
  };
}

/**
 * Calculate slippage for a trade
 */
export function calculateSlippage(
  expectedPrice: BN,
  actualPrice: BN
): number {
  if (expectedPrice.eq(new BN(0))) return 0;
  
  const slippage = actualPrice.sub(expectedPrice).abs()
    .mul(new BN(10000))
    .div(expectedPrice)
    .toNumber() / 100;
    
  return Math.min(slippage, 100); // Cap at 100%
}

/**
 * Format price for display
 */
export function formatPrice(price: BN, decimals: number = 9): string {
  const priceNumber = price.toNumber() / Math.pow(10, decimals);
  
  if (priceNumber < 0.001) {
    return priceNumber.toExponential(3);
  } else if (priceNumber < 1) {
    return priceNumber.toFixed(6);
  } else if (priceNumber < 1000) {
    return priceNumber.toFixed(4);
  } else {
    return priceNumber.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}

/**
 * Format market cap for display
 */
export function formatMarketCap(marketCap: BN): string {
  const mcNumber = marketCap.toNumber() / Math.pow(10, 9); // Convert to SOL
  
  if (mcNumber < 1000) {
    return `${mcNumber.toFixed(2)} SOL`;
  } else if (mcNumber < 1000000) {
    return `${(mcNumber / 1000).toFixed(2)}K SOL`;
  } else {
    return `${(mcNumber / 1000000).toFixed(2)}M SOL`;
  }
}

/**
 * Calculate APY based on trading volume and fees
 */
export function calculateAPY(
  dailyVolume: BN,
  totalSupply: BN,
  userBalance: BN
): number {
  if (totalSupply.eq(new BN(0)) || userBalance.eq(new BN(0))) return 0;
  
  const dailyFees = dailyVolume.mul(new BN(CURVE_CONSTANTS.FEE_PERCENTAGE * 10000)).div(new BN(10000));
  const userShare = userBalance.mul(new BN(10000)).div(totalSupply).toNumber() / 10000;
  const dailyReward = dailyFees.toNumber() * userShare;
  const userBalanceNumber = userBalance.toNumber();
  
  if (userBalanceNumber === 0) return 0;
  
  const dailyReturn = dailyReward / userBalanceNumber;
  const apy = Math.pow(1 + dailyReturn, 365) - 1;
  
  return Math.min(apy * 100, 10000); // Cap at 10000%
}

/**
 * Validate trade parameters
 */
export function validateTrade(
  currentSupply: BN,
  amount: BN,
  isBuy: boolean,
  maxSlippage: number = 5
): { isValid: boolean; error?: string } {
  if (amount.lte(new BN(0))) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }
  
  if (isBuy) {
    const newSupply = currentSupply.add(amount);
    if (newSupply.gt(CURVE_CONSTANTS.MAX_SUPPLY)) {
      return { isValid: false, error: 'Exceeds maximum supply' };
    }
  } else {
    if (amount.gt(currentSupply)) {
      return { isValid: false, error: 'Cannot sell more than current supply' };
    }
  }
  
  const priceImpact = calculatePriceImpact(currentSupply, amount, isBuy);
  if (priceImpact > maxSlippage) {
    return { 
      isValid: false, 
      error: `Price impact (${priceImpact.toFixed(2)}%) exceeds maximum slippage (${maxSlippage}%)` 
    };
  }
  
  return { isValid: true };
}

/**
 * Calculate optimal trade size to minimize price impact
 */
export function calculateOptimalTradeSize(
  currentSupply: BN,
  maxPriceImpact: number,
  isBuy: boolean,
  basePrice: BN = CURVE_CONSTANTS.BASE_PRICE
): BN {
  let low = new BN(1);
  let high = isBuy ? CURVE_CONSTANTS.MAX_SUPPLY.sub(currentSupply) : currentSupply;
  let optimal = new BN(1);
  
  while (low.lte(high)) {
    const mid = low.add(high).div(new BN(2));
    const impact = calculatePriceImpact(currentSupply, mid, isBuy, basePrice);
    
    if (impact <= maxPriceImpact) {
      optimal = mid;
      low = mid.add(new BN(1));
    } else {
      high = mid.sub(new BN(1));
    }
  }
  
  return optimal;
}
```