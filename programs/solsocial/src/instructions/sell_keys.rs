```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
pub struct SellKeys<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"user", seller.key().as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,
    
    #[account(
        mut,
        seeds = [b"subject", subject.key().as_ref()],
        bump = subject_account.bump,
    )]
    pub subject_account: Account<'info, UserAccount>,
    
    /// CHECK: This is the subject whose keys are being sold
    pub subject: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"keys", subject.key().as_ref(), seller.key().as_ref()],
        bump = key_holding.bump,
        constraint = key_holding.amount > 0 @ SolSocialError::InsufficientKeys,
    )]
    pub key_holding: Account<'info, KeyHolding>,
    
    #[account(
        mut,
        associated_token::mint = sol_mint,
        associated_token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = sol_mint,
        associated_token::authority = subject,
    )]
    pub subject_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = sol_mint,
        associated_token::authority = protocol_fee_destination,
    )]
    pub protocol_fee_account: Account<'info, TokenAccount>,
    
    /// CHECK: This is the protocol fee destination
    pub protocol_fee_destination: AccountInfo<'info>,
    
    /// CHECK: This is the SOL mint
    pub sol_mint: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn sell_keys(ctx: Context<SellKeys>, amount: u64) -> Result<()> {
    let seller = &ctx.accounts.seller;
    let user_account = &mut ctx.accounts.user_account;
    let subject_account = &mut ctx.accounts.subject_account;
    let key_holding = &mut ctx.accounts.key_holding;
    
    require!(amount > 0, SolSocialError::InvalidAmount);
    require!(key_holding.amount >= amount, SolSocialError::InsufficientKeys);
    
    // Calculate the current supply before selling
    let supply = subject_account.key_supply;
    require!(supply > 0, SolSocialError::NoKeysInCirculation);
    
    // Calculate sell price using bonding curve
    let sell_price = get_sell_price(supply, amount)?;
    
    // Calculate fees
    let protocol_fee = sell_price
        .checked_mul(PROTOCOL_FEE_PERCENT)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_div(10000)
        .ok_or(SolSocialError::MathOverflow)?;
    
    let subject_fee = sell_price
        .checked_mul(SUBJECT_FEE_PERCENT)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_div(10000)
        .ok_or(SolSocialError::MathOverflow)?;
    
    let seller_proceeds = sell_price
        .checked_sub(protocol_fee)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_sub(subject_fee)
        .ok_or(SolSocialError::MathOverflow)?;
    
    // Update key holding
    key_holding.amount = key_holding.amount
        .checked_sub(amount)
        .ok_or(SolSocialError::MathOverflow)?;
    
    // Update subject's key supply
    subject_account.key_supply = subject_account.key_supply
        .checked_sub(amount)
        .ok_or(SolSocialError::MathOverflow)?;
    
    // Update trading volume
    subject_account.trading_volume = subject_account.trading_volume
        .checked_add(sell_price)
        .ok_or(SolSocialError::MathOverflow)?;
    
    // Transfer seller proceeds
    if seller_proceeds > 0 {
        let transfer_instruction = Transfer {
            from: ctx.accounts.protocol_fee_account.to_account_info(),
            to: ctx.accounts.seller_token_account.to_account_info(),
            authority: ctx.accounts.protocol_fee_destination.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        );
        
        token::transfer(cpi_ctx, seller_proceeds)?;
    }
    
    // Transfer subject fee
    if subject_fee > 0 {
        let transfer_instruction = Transfer {
            from: ctx.accounts.protocol_fee_account.to_account_info(),
            to: ctx.accounts.subject_token_account.to_account_info(),
            authority: ctx.accounts.protocol_fee_destination.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        );
        
        token::transfer(cpi_ctx, subject_fee)?;
    }
    
    // Update user's total keys held
    user_account.total_keys_held = user_account.total_keys_held
        .checked_sub(amount)
        .ok_or(SolSocialError::MathOverflow)?;
    
    // Update user's total volume
    user_account.total_volume = user_account.total_volume
        .checked_add(sell_price)
        .ok_or(SolSocialError::MathOverflow)?;
    
    // Emit sell event
    emit!(KeysSold {
        seller: seller.key(),
        subject: ctx.accounts.subject.key(),
        amount,
        price: sell_price,
        protocol_fee,
        subject_fee,
        supply: subject_account.key_supply,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    // Close key holding account if amount is zero
    if key_holding.amount == 0 {
        key_holding.close(seller.to_account_info())?;
    }
    
    Ok(())
}

fn get_sell_price(supply: u64, amount: u64) -> Result<u64> {
    require!(supply >= amount, SolSocialError::InsufficientSupply);
    
    if supply == 0 || amount == 0 {
        return Ok(0);
    }
    
    let mut total_price = 0u64;
    
    for i in 0..amount {
        let current_supply = supply
            .checked_sub(i)
            .ok_or(SolSocialError::MathOverflow)?;
        
        // Bonding curve: price = (supply - 1)^2 / 16000
        let price_per_key = if current_supply > 1 {
            let supply_minus_one = current_supply
                .checked_sub(1)
                .ok_or(SolSocialError::MathOverflow)?;
            
            supply_minus_one
                .checked_mul(supply_minus_one)
                .ok_or(SolSocialError::MathOverflow)?
                .checked_div(16000)
                .ok_or(SolSocialError::MathOverflow)?
        } else {
            0
        };
        
        total_price = total_price
            .checked_add(price_per_key)
            .ok_or(SolSocialError::MathOverflow)?;
    }
    
    Ok(total_price)
}

#[event]
pub struct KeysSold {
    pub seller: Pubkey,
    pub subject: Pubkey,
    pub amount: u64,
    pub price: u64,
    pub protocol_fee: u64,
    pub subject_fee: u64,
    pub supply: u64,
    pub timestamp: i64,
}

const PROTOCOL_FEE_PERCENT: u64 = 500; // 5%
const SUBJECT_FEE_PERCENT: u64 = 500; // 5%
```