```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct BuyKeys<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"user", subject.key().as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,
    
    /// CHECK: This is the subject whose keys are being bought
    pub subject: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"keys", subject.key().as_ref(), buyer.key().as_ref()],
        bump,
    )]
    pub key_account: Account<'info, KeyAccount>,
    
    #[account(
        mut,
        seeds = [b"protocol"],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    
    #[account(
        mut,
        associated_token::mint = protocol_config.payment_mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = protocol_config.payment_mint,
        associated_token::authority = subject,
    )]
    pub subject_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = protocol_config.payment_mint,
        associated_token::authority = protocol_config,
    )]
    pub protocol_fee_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn buy_keys(ctx: Context<BuyKeys>, amount: u64) -> Result<()> {
    let user_account = &mut ctx.accounts.user_account;
    let key_account = &mut ctx.accounts.key_account;
    let protocol_config = &ctx.accounts.protocol_config;
    
    require!(amount > 0, SolSocialError::InvalidAmount);
    require!(user_account.is_active, SolSocialError::UserNotActive);
    
    // Calculate current supply and price
    let current_supply = user_account.keys_supply;
    let price = get_price(current_supply, amount)?;
    
    require!(price > 0, SolSocialError::InvalidPrice);
    
    // Calculate fees
    let protocol_fee = price
        .checked_mul(protocol_config.protocol_fee_percent as u64)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_div(10000)
        .ok_or(SolSocialError::MathOverflow)?;
    
    let subject_fee = price
        .checked_mul(protocol_config.subject_fee_percent as u64)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_div(10000)
        .ok_or(SolSocialError::MathOverflow)?;
    
    let total_cost = price
        .checked_add(protocol_fee)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_add(subject_fee)
        .ok_or(SolSocialError::MathOverflow)?;
    
    // Transfer payment from buyer to subject
    let transfer_to_subject_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.buyer_token_account.to_account_info(),
            to: ctx.accounts.subject_token_account.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        },
    );
    token::transfer(transfer_to_subject_ctx, price)?;
    
    // Transfer protocol fee
    if protocol_fee > 0 {
        let transfer_protocol_fee_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer_token_account.to_account_info(),
                to: ctx.accounts.protocol_fee_account.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        );
        token::transfer(transfer_protocol_fee_ctx, protocol_fee)?;
    }
    
    // Transfer subject fee
    if subject_fee > 0 {
        let transfer_subject_fee_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer_token_account.to_account_info(),
                to: ctx.accounts.subject_token_account.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        );
        token::transfer(transfer_subject_fee_ctx, subject_fee)?;
    }
    
    // Update key account
    key_account.amount = key_account.amount
        .checked_add(amount)
        .ok_or(SolSocialError::MathOverflow)?;
    key_account.last_trade_timestamp = Clock::get()?.unix_timestamp;
    
    // Update user account supply
    user_account.keys_supply = user_account.keys_supply
        .checked_add(amount)
        .ok_or(SolSocialError::MathOverflow)?;
    user_account.total_volume = user_account.total_volume
        .checked_add(total_cost)
        .ok_or(SolSocialError::MathOverflow)?;
    user_account.last_activity_timestamp = Clock::get()?.unix_timestamp;
    
    // Update protocol stats
    let protocol_config = &mut ctx.accounts.protocol_config;
    protocol_config.total_volume = protocol_config.total_volume
        .checked_add(total_cost)
        .ok_or(SolSocialError::MathOverflow)?;
    protocol_config.total_fees_collected = protocol_config.total_fees_collected
        .checked_add(protocol_fee)
        .ok_or(SolSocialError::MathOverflow)?;
    
    emit!(KeysBought {
        buyer: ctx.accounts.buyer.key(),
        subject: ctx.accounts.subject.key(),
        amount,
        price,
        protocol_fee,
        subject_fee,
        supply_after: user_account.keys_supply,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

fn get_price(supply: u64, amount: u64) -> Result<u64> {
    if supply == 0 && amount == 1 {
        return Ok(0); // First key is free
    }
    
    let sum1 = if supply == 0 {
        0
    } else {
        supply
            .checked_sub(1)
            .ok_or(SolSocialError::MathOverflow)?
            .checked_mul(supply)
            .ok_or(SolSocialError::MathOverflow)?
            .checked_mul(supply.checked_mul(2).ok_or(SolSocialError::MathOverflow)?.checked_sub(1).ok_or(SolSocialError::MathOverflow)?)
            .ok_or(SolSocialError::MathOverflow)?
            .checked_div(6)
            .ok_or(SolSocialError::MathOverflow)?
    };
    
    let sum2 = supply
        .checked_add(amount)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_sub(1)
        .ok_or(SolSocialError::MathOverflow)?;
    
    let sum2_squared = sum2
        .checked_mul(sum2.checked_add(1).ok_or(SolSocialError::MathOverflow)?)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_mul(sum2.checked_mul(2).ok_or(SolSocialError::MathOverflow)?.checked_add(1).ok_or(SolSocialError::MathOverflow)?)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_div(6)
        .ok_or(SolSocialError::MathOverflow)?;
    
    let price_in_wei = sum2_squared
        .checked_sub(sum1)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_mul(1_000_000) // Convert to micro-lamports for precision
        .ok_or(SolSocialError::MathOverflow)?
        .checked_div(16000)
        .ok_or(SolSocialError::MathOverflow)?;
    
    Ok(price_in_wei)
}

#[event]
pub struct KeysBought {
    pub buyer: Pubkey,
    pub subject: Pubkey,
    pub amount: u64,
    pub price: u64,
    pub protocol_fee: u64,
    pub subject_fee: u64,
    pub supply_after: u64,
    pub timestamp: i64,
}
```