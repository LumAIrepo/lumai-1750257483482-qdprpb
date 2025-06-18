```rust
use anchor_lang::prelude::*;
use std::cmp;

/// Bonding curve utility functions for calculating token prices
/// Based on a quadratic bonding curve formula: price = base_price + (supply^2 / curve_factor)

pub const CURVE_FACTOR: u64 = 1_000_000; // Scaling factor for curve calculations
pub const BASE_PRICE: u64 = 1_000; // Base price in lamports (0.000001 SOL)
pub const MAX_SUPPLY: u64 = 1_000_000_000; // Maximum token supply (1B tokens)
pub const PRICE_PRECISION: u64 = 1_000_000; // 6 decimal places precision

#[derive(Debug, Clone, Copy)]
pub struct BondingCurveParams {
    pub base_price: u64,
    pub curve_factor: u64,
    pub max_supply: u64,
}

impl Default for BondingCurveParams {
    fn default() -> Self {
        Self {
            base_price: BASE_PRICE,
            curve_factor: CURVE_FACTOR,
            max_supply: MAX_SUPPLY,
        }
    }
}

/// Calculate the price for a given supply using quadratic bonding curve
pub fn calculate_price(supply: u64, params: &BondingCurveParams) -> Result<u64> {
    require!(supply <= params.max_supply, SolSocialError::SupplyExceedsMax);
    
    let supply_squared = supply
        .checked_mul(supply)
        .ok_or(SolSocialError::MathOverflow)?;
    
    let curve_component = supply_squared
        .checked_div(params.curve_factor)
        .ok_or(SolSocialError::MathOverflow)?;
    
    let price = params.base_price
        .checked_add(curve_component)
        .ok_or(SolSocialError::MathOverflow)?;
    
    Ok(price)
}

/// Calculate the cost to buy a specific amount of tokens
pub fn calculate_buy_cost(
    current_supply: u64,
    amount: u64,
    params: &BondingCurveParams,
) -> Result<u64> {
    require!(amount > 0, SolSocialError::InvalidAmount);
    require!(
        current_supply.checked_add(amount).unwrap_or(u64::MAX) <= params.max_supply,
        SolSocialError::SupplyExceedsMax
    );
    
    let new_supply = current_supply
        .checked_add(amount)
        .ok_or(SolSocialError::MathOverflow)?;
    
    // Calculate integral of the bonding curve from current_supply to new_supply
    let cost = calculate_integral(current_supply, new_supply, params)?;
    
    Ok(cost)
}

/// Calculate the proceeds from selling a specific amount of tokens
pub fn calculate_sell_proceeds(
    current_supply: u64,
    amount: u64,
    params: &BondingCurveParams,
) -> Result<u64> {
    require!(amount > 0, SolSocialError::InvalidAmount);
    require!(amount <= current_supply, SolSocialError::InsufficientSupply);
    
    let new_supply = current_supply
        .checked_sub(amount)
        .ok_or(SolSocialError::MathOverflow)?;
    
    // Calculate integral of the bonding curve from new_supply to current_supply
    let proceeds = calculate_integral(new_supply, current_supply, params)?;
    
    Ok(proceeds)
}

/// Calculate the integral of the bonding curve between two supply points
/// Integral of (base_price + x^2/curve_factor) from a to b
/// = base_price * (b - a) + (b^3 - a^3) / (3 * curve_factor)
fn calculate_integral(
    from_supply: u64,
    to_supply: u64,
    params: &BondingCurveParams,
) -> Result<u64> {
    require!(to_supply >= from_supply, SolSocialError::InvalidRange);
    
    let supply_diff = to_supply
        .checked_sub(from_supply)
        .ok_or(SolSocialError::MathOverflow)?;
    
    // Linear component: base_price * (to - from)
    let linear_component = params.base_price
        .checked_mul(supply_diff)
        .ok_or(SolSocialError::MathOverflow)?;
    
    // Quadratic component: (to^3 - from^3) / (3 * curve_factor)
    let to_cubed = calculate_cube(to_supply)?;
    let from_cubed = calculate_cube(from_supply)?;
    
    let cube_diff = to_cubed
        .checked_sub(from_cubed)
        .ok_or(SolSocialError::MathOverflow)?;
    
    let curve_divisor = params.curve_factor
        .checked_mul(3)
        .ok_or(SolSocialError::MathOverflow)?;
    
    let quadratic_component = cube_diff
        .checked_div(curve_divisor)
        .ok_or(SolSocialError::MathOverflow)?;
    
    let total_cost = linear_component
        .checked_add(quadratic_component)
        .ok_or(SolSocialError::MathOverflow)?;
    
    Ok(total_cost)
}

/// Calculate x^3 with overflow protection
fn calculate_cube(x: u64) -> Result<u64> {
    let x_squared = x
        .checked_mul(x)
        .ok_or(SolSocialError::MathOverflow)?;
    
    let x_cubed = x_squared
        .checked_mul(x)
        .ok_or(SolSocialError::MathOverflow)?;
    
    Ok(x_cubed)
}

/// Calculate the market cap at a given supply
pub fn calculate_market_cap(supply: u64, params: &BondingCurveParams) -> Result<u64> {
    let price = calculate_price(supply, params)?;
    let market_cap = supply
        .checked_mul(price)
        .ok_or(SolSocialError::MathOverflow)?;
    
    Ok(market_cap)
}

/// Calculate the amount of tokens that can be bought with a given SOL amount
pub fn calculate_tokens_for_sol(
    current_supply: u64,
    sol_amount: u64,
    params: &BondingCurveParams,
) -> Result<u64> {
    require!(sol_amount > 0, SolSocialError::InvalidAmount);
    
    // Binary search to find the maximum tokens that can be bought
    let mut low = 0u64;
    let mut high = cmp::min(
        params.max_supply.saturating_sub(current_supply),
        sol_amount // Upper bound estimate
    );
    
    let mut result = 0u64;
    
    while low <= high {
        let mid = low + (high - low) / 2;
        
        if mid == 0 {
            break;
        }
        
        match calculate_buy_cost(current_supply, mid, params) {
            Ok(cost) => {
                if cost <= sol_amount {
                    result = mid;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }
            Err(_) => {
                high = mid - 1;
            }
        }
    }
    
    Ok(result)
}

/// Calculate price impact for a trade
pub fn calculate_price_impact(
    current_supply: u64,
    trade_amount: u64,
    is_buy: bool,
    params: &BondingCurveParams,
) -> Result<u64> {
    let current_price = calculate_price(current_supply, params)?;
    
    let new_supply = if is_buy {
        current_supply
            .checked_add(trade_amount)
            .ok_or(SolSocialError::MathOverflow)?
    } else {
        current_supply
            .checked_sub(trade_amount)
            .ok_or(SolSocialError::MathOverflow)?
    };
    
    let new_price = calculate_price(new_supply, params)?;
    
    let price_diff = if new_price > current_price {
        new_price - current_price
    } else {
        current_price - new_price
    };
    
    // Calculate percentage impact (scaled by PRICE_PRECISION)
    let impact = price_diff
        .checked_mul(PRICE_PRECISION)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_div(current_price)
        .ok_or(SolSocialError::MathOverflow)?;
    
    Ok(impact)
}

/// Calculate trading fees based on trade size and price impact
pub fn calculate_trading_fee(
    trade_value: u64,
    price_impact: u64,
    base_fee_bps: u64, // Base fee in basis points (100 = 1%)
) -> Result<u64> {
    // Base fee
    let base_fee = trade_value
        .checked_mul(base_fee_bps)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_div(10_000)
        .ok_or(SolSocialError::MathOverflow)?;
    
    // Additional fee based on price impact (to discourage large trades)
    let impact_fee = if price_impact > PRICE_PRECISION / 100 { // > 1% impact
        let excess_impact = price_impact - (PRICE_PRECISION / 100);
        trade_value
            .checked_mul(excess_impact)
            .ok_or(SolSocialError::MathOverflow)?
            .checked_div(PRICE_PRECISION * 10) // 10% of excess impact
            .ok_or(SolSocialError::MathOverflow)?
    } else {
        0
    };
    
    let total_fee = base_fee
        .checked_add(impact_fee)
        .ok_or(SolSocialError::MathOverflow)?;
    
    Ok(total_fee)
}

/// Validate bonding curve parameters
pub fn validate_curve_params(params: &BondingCurveParams) -> Result<()> {
    require!(params.base_price > 0, SolSocialError::InvalidCurveParams);
    require!(params.curve_factor > 0, SolSocialError::InvalidCurveParams);
    require!(params.max_supply > 0, SolSocialError::InvalidCurveParams);
    require!(params.max_supply <= u64::MAX / params.max_supply, SolSocialError::InvalidCurveParams);
    
    Ok(())
}

#[error_code]
pub enum SolSocialError {
    #[msg("Math operation resulted in overflow")]
    MathOverflow,
    #[msg("Invalid amount specified")]
    InvalidAmount,
    #[msg("Supply exceeds maximum allowed")]
    SupplyExceedsMax,
    #[msg("Insufficient supply for operation")]
    InsufficientSupply,
    #[msg("Invalid range specified")]
    InvalidRange,
    #[msg("Invalid bonding curve parameters")]
    InvalidCurveParams,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_price() {
        let params = BondingCurveParams::default();
        
        // Test price at supply 0
        let price_0 = calculate_price(0, &params).unwrap();
        assert_eq!(price_0, BASE_PRICE);
        
        // Test price at supply 1000
        let price_1000 = calculate_price(1000, &params).unwrap();
        assert!(price_1000 > BASE_PRICE);
    }

    #[test]
    fn test_buy_sell_symmetry() {
        let params = BondingCurveParams::default();
        let initial_supply = 10000;
        let trade_amount = 1000;
        
        let buy_cost = calculate_buy_cost(initial_supply, trade_amount, &params).unwrap();
        let sell_proceeds = calculate_sell_proceeds(
            initial_supply + trade_amount,
            trade_amount,
            &params
        ).unwrap();
        
        // Buy cost should be slightly higher than sell proceeds due to curve shape
        assert!(buy_cost >= sell_proceeds);
    }

    #[test]
    fn test_price_impact() {
        let params = BondingCurveParams::default();
        let supply = 100000;
        let trade_amount = 10000;
        
        let impact = calculate_price_impact(supply, trade_amount, true, &params).unwrap();
        assert!(impact > 0);
    }
}
```