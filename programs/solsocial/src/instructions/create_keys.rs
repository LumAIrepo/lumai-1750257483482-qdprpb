```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateKeys<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + UserKeys::INIT_SPACE,
        seeds = [b"user_keys", creator.key().as_ref()],
        bump
    )]
    pub user_keys: Account<'info, UserKeys>,

    #[account(
        init,
        payer = creator,
        space = 8 + BondingCurve::INIT_SPACE,
        seeds = [b"bonding_curve", user_keys.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = bonding_curve,
        seeds = [b"key_token", user_keys.key().as_ref()],
        bump
    )]
    pub key_token_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = key_token_mint,
        associated_token::authority = creator
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = key_token_mint,
        associated_token::authority = bonding_curve
    )]
    pub curve_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<CreateKeys>, name: String) -> Result<()> {
    require!(name.len() <= 32, SolSocialError::NameTooLong);
    require!(name.len() > 0, SolSocialError::NameEmpty);

    let user_keys = &mut ctx.accounts.user_keys;
    let bonding_curve = &mut ctx.accounts.bonding_curve;
    let global_state = &ctx.accounts.global_state;

    // Initialize user keys account
    user_keys.creator = ctx.accounts.creator.key();
    user_keys.name = name;
    user_keys.total_supply = 0;
    user_keys.holders_count = 0;
    user_keys.created_at = Clock::get()?.unix_timestamp;
    user_keys.bump = ctx.bumps.user_keys;

    // Initialize bonding curve
    bonding_curve.user_keys = user_keys.key();
    bonding_curve.key_token_mint = ctx.accounts.key_token_mint.key();
    bonding_curve.total_supply = 0;
    bonding_curve.sol_reserves = 0;
    bonding_curve.token_reserves = 1_000_000_000_000; // 1M tokens with 6 decimals
    bonding_curve.creator_fee_collected = 0;
    bonding_curve.protocol_fee_collected = 0;
    bonding_curve.is_active = true;
    bonding_curve.bump = ctx.bumps.bonding_curve;

    // Calculate initial key price (creator gets first key for free)
    let initial_supply = 1_000_000; // 1 key with 6 decimals
    
    // Mint initial key to creator
    let seeds = &[
        b"bonding_curve",
        user_keys.key().as_ref(),
        &[bonding_curve.bump]
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = token::MintTo {
        mint: ctx.accounts.key_token_mint.to_account_info(),
        to: ctx.accounts.creator_token_account.to_account_info(),
        authority: bonding_curve.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    
    token::mint_to(cpi_ctx, initial_supply)?;

    // Update supplies
    bonding_curve.total_supply = initial_supply;
    bonding_curve.token_reserves = bonding_curve.token_reserves.checked_sub(initial_supply)
        .ok_or(SolSocialError::ArithmeticError)?;
    
    user_keys.total_supply = initial_supply;
    user_keys.holders_count = 1;

    // Emit event
    emit!(KeysCreated {
        creator: ctx.accounts.creator.key(),
        user_keys: user_keys.key(),
        bonding_curve: bonding_curve.key(),
        key_token_mint: ctx.accounts.key_token_mint.key(),
        name: user_keys.name.clone(),
        initial_supply,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct KeysCreated {
    pub creator: Pubkey,
    pub user_keys: Pubkey,
    pub bonding_curve: Pubkey,
    pub key_token_mint: Pubkey,
    pub name: String,
    pub initial_supply: u64,
    pub timestamp: i64,
}
```