```rust
use anchor_lang::prelude::*;

#[account]
pub struct UserKeys {
    pub owner: Pubkey,
    pub total_supply: u64,
    pub current_price: u64,
    pub holders_count: u32,
    pub trading_fee_collected: u64,
    pub creator_fee_collected: u64,
    pub is_active: bool,
    pub created_at: i64,
    pub last_trade_at: i64,
    pub bump: u8,
}

impl UserKeys {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        8 + // total_supply
        8 + // current_price
        4 + // holders_count
        8 + // trading_fee_collected
        8 + // creator_fee_collected
        1 + // is_active
        8 + // created_at
        8 + // last_trade_at
        1; // bump

    pub fn initialize(&mut self, owner: Pubkey, bump: u8) -> Result<()> {
        self.owner = owner;
        self.total_supply = 0;
        self.current_price = 1_000_000; // 0.001 SOL in lamports
        self.holders_count = 0;
        self.trading_fee_collected = 0;
        self.creator_fee_collected = 0;
        self.is_active = true;
        self.created_at = Clock::get()?.unix_timestamp;
        self.last_trade_at = Clock::get()?.unix_timestamp;
        self.bump = bump;
        Ok(())
    }

    pub fn calculate_price(&self, supply: u64, amount: u64, is_buy: bool) -> Result<u64> {
        if amount == 0 {
            return Ok(0);
        }

        let base_price = 1_000_000; // 0.001 SOL
        let price_increment = 100_000; // 0.0001 SOL per key

        if is_buy {
            let mut total_cost = 0u64;
            for i in 0..amount {
                let current_supply = supply + i;
                let price = base_price + (current_supply * price_increment);
                total_cost = total_cost.checked_add(price).ok_or(ErrorCode::MathOverflow)?;
            }
            Ok(total_cost)
        } else {
            let mut total_return = 0u64;
            for i in 0..amount {
                let current_supply = supply - i - 1;
                let price = base_price + (current_supply * price_increment);
                total_return = total_return.checked_add(price).ok_or(ErrorCode::MathOverflow)?;
            }
            Ok(total_return)
        }
    }

    pub fn get_current_price(&self) -> u64 {
        let base_price = 1_000_000; // 0.001 SOL
        let price_increment = 100_000; // 0.0001 SOL per key
        base_price + (self.total_supply * price_increment)
    }

    pub fn update_after_trade(&mut self, supply_change: i64, is_buy: bool) -> Result<()> {
        if is_buy {
            self.total_supply = self.total_supply.checked_add(supply_change as u64).ok_or(ErrorCode::MathOverflow)?;
            if supply_change > 0 {
                self.holders_count = self.holders_count.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
            }
        } else {
            self.total_supply = self.total_supply.checked_sub(supply_change as u64).ok_or(ErrorCode::MathUnderflow)?;
        }
        
        self.current_price = self.get_current_price();
        self.last_trade_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn add_trading_fee(&mut self, fee: u64) -> Result<()> {
        self.trading_fee_collected = self.trading_fee_collected.checked_add(fee).ok_or(ErrorCode::MathOverflow)?;
        Ok(())
    }

    pub fn add_creator_fee(&mut self, fee: u64) -> Result<()> {
        self.creator_fee_collected = self.creator_fee_collected.checked_add(fee).ok_or(ErrorCode::MathOverflow)?;
        Ok(())
    }
}

#[account]
pub struct UserKeyBalance {
    pub owner: Pubkey,
    pub key_owner: Pubkey,
    pub balance: u64,
    pub last_purchase_price: u64,
    pub total_spent: u64,
    pub total_earned: u64,
    pub purchase_count: u32,
    pub sale_count: u32,
    pub first_purchase_at: i64,
    pub last_trade_at: i64,
    pub bump: u8,
}

impl UserKeyBalance {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        32 + // key_owner
        8 + // balance
        8 + // last_purchase_price
        8 + // total_spent
        8 + // total_earned
        4 + // purchase_count
        4 + // sale_count
        8 + // first_purchase_at
        8 + // last_trade_at
        1; // bump

    pub fn initialize(&mut self, owner: Pubkey, key_owner: Pubkey, bump: u8) -> Result<()> {
        self.owner = owner;
        self.key_owner = key_owner;
        self.balance = 0;
        self.last_purchase_price = 0;
        self.total_spent = 0;
        self.total_earned = 0;
        self.purchase_count = 0;
        self.sale_count = 0;
        self.first_purchase_at = 0;
        self.last_trade_at = Clock::get()?.unix_timestamp;
        self.bump = bump;
        Ok(())
    }

    pub fn add_keys(&mut self, amount: u64, price_paid: u64) -> Result<()> {
        if self.balance == 0 {
            self.first_purchase_at = Clock::get()?.unix_timestamp;
        }
        
        self.balance = self.balance.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
        self.last_purchase_price = price_paid.checked_div(amount).unwrap_or(0);
        self.total_spent = self.total_spent.checked_add(price_paid).ok_or(ErrorCode::MathOverflow)?;
        self.purchase_count = self.purchase_count.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
        self.last_trade_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn remove_keys(&mut self, amount: u64, price_received: u64) -> Result<()> {
        require!(self.balance >= amount, ErrorCode::InsufficientBalance);
        
        self.balance = self.balance.checked_sub(amount).ok_or(ErrorCode::MathUnderflow)?;
        self.total_earned = self.total_earned.checked_add(price_received).ok_or(ErrorCode::MathOverflow)?;
        self.sale_count = self.sale_count.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
        self.last_trade_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn get_profit_loss(&self) -> i64 {
        (self.total_earned as i64) - (self.total_spent as i64)
    }
}

#[account]
pub struct GlobalState {
    pub authority: Pubkey,
    pub trading_fee_bps: u16, // basis points (100 = 1%)
    pub creator_fee_bps: u16, // basis points (100 = 1%)
    pub protocol_fee_bps: u16, // basis points (100 = 1%)
    pub total_keys_created: u64,
    pub total_volume: u64,
    pub total_fees_collected: u64,
    pub is_paused: bool,
    pub bump: u8,
}

impl GlobalState {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        2 + // trading_fee_bps
        2 + // creator_fee_bps
        2 + // protocol_fee_bps
        8 + // total_keys_created
        8 + // total_volume
        8 + // total_fees_collected
        1 + // is_paused
        1; // bump

    pub fn initialize(&mut self, authority: Pubkey, bump: u8) -> Result<()> {
        self.authority = authority;
        self.trading_fee_bps = 500; // 5%
        self.creator_fee_bps = 500; // 5%
        self.protocol_fee_bps = 100; // 1%
        self.total_keys_created = 0;
        self.total_volume = 0;
        self.total_fees_collected = 0;
        self.is_paused = false;
        self.bump = bump;
        Ok(())
    }

    pub fn calculate_fees(&self, amount: u64) -> (u64, u64, u64) {
        let trading_fee = amount.checked_mul(self.trading_fee_bps as u64).unwrap_or(0) / 10000;
        let creator_fee = amount.checked_mul(self.creator_fee_bps as u64).unwrap_or(0) / 10000;
        let protocol_fee = amount.checked_mul(self.protocol_fee_bps as u64).unwrap_or(0) / 10000;
        (trading_fee, creator_fee, protocol_fee)
    }

    pub fn add_volume(&mut self, volume: u64) -> Result<()> {
        self.total_volume = self.total_volume.checked_add(volume).ok_or(ErrorCode::MathOverflow)?;
        Ok(())
    }

    pub fn add_fees(&mut self, fees: u64) -> Result<()> {
        self.total_fees_collected = self.total_fees_collected.checked_add(fees).ok_or(ErrorCode::MathOverflow)?;
        Ok(())
    }

    pub fn increment_keys_created(&mut self) -> Result<()> {
        self.total_keys_created = self.total_keys_created.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
        Ok(())
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Math underflow")]
    MathUnderflow,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Trading is paused")]
    TradingPaused,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Keys not active")]
    KeysNotActive,
}
```