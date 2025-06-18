```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::SolSocialError;

pub fn calculate_creator_share(
    total_revenue: u64,
    creator_share_percentage: u8,
) -> Result<u64> {
    require!(creator_share_percentage <= 100, SolSocialError::InvalidSharePercentage);
    
    let creator_share = total_revenue
        .checked_mul(creator_share_percentage as u64)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_div(100)
        .ok_or(SolSocialError::MathOverflow)?;
    
    Ok(creator_share)
}

pub fn calculate_platform_share(
    total_revenue: u64,
    platform_fee_percentage: u8,
) -> Result<u64> {
    require!(platform_fee_percentage <= 100, SolSocialError::InvalidSharePercentage);
    
    let platform_share = total_revenue
        .checked_mul(platform_fee_percentage as u64)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_div(100)
        .ok_or(SolSocialError::MathOverflow)?;
    
    Ok(platform_share)
}

pub fn calculate_holder_rewards(
    total_revenue: u64,
    creator_share_percentage: u8,
    platform_fee_percentage: u8,
) -> Result<u64> {
    let creator_share = calculate_creator_share(total_revenue, creator_share_percentage)?;
    let platform_share = calculate_platform_share(total_revenue, platform_fee_percentage)?;
    
    let holder_rewards = total_revenue
        .checked_sub(creator_share)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_sub(platform_share)
        .ok_or(SolSocialError::MathOverflow)?;
    
    Ok(holder_rewards)
}

pub fn distribute_revenue_to_creator<'info>(
    creator_token_account: &Account<'info, TokenAccount>,
    vault_token_account: &Account<'info, TokenAccount>,
    vault_authority: &AccountInfo<'info>,
    token_program: &Program<'info, Token>,
    amount: u64,
    vault_authority_bump: u8,
) -> Result<()> {
    let vault_authority_seeds = &[
        b"vault_authority".as_ref(),
        &[vault_authority_bump],
    ];
    let signer_seeds = &[&vault_authority_seeds[..]];

    let transfer_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        Transfer {
            from: vault_token_account.to_account_info(),
            to: creator_token_account.to_account_info(),
            authority: vault_authority.to_account_info(),
        },
        signer_seeds,
    );

    token::transfer(transfer_ctx, amount)?;
    Ok(())
}

pub fn distribute_revenue_to_platform<'info>(
    platform_token_account: &Account<'info, TokenAccount>,
    vault_token_account: &Account<'info, TokenAccount>,
    vault_authority: &AccountInfo<'info>,
    token_program: &Program<'info, Token>,
    amount: u64,
    vault_authority_bump: u8,
) -> Result<()> {
    let vault_authority_seeds = &[
        b"vault_authority".as_ref(),
        &[vault_authority_bump],
    ];
    let signer_seeds = &[&vault_authority_seeds[..]];

    let transfer_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        Transfer {
            from: vault_token_account.to_account_info(),
            to: platform_token_account.to_account_info(),
            authority: vault_authority.to_account_info(),
        },
        signer_seeds,
    );

    token::transfer(transfer_ctx, amount)?;
    Ok(())
}

pub fn calculate_individual_holder_reward(
    total_holder_rewards: u64,
    holder_token_balance: u64,
    total_token_supply: u64,
) -> Result<u64> {
    require!(total_token_supply > 0, SolSocialError::InvalidTokenSupply);
    
    let individual_reward = total_holder_rewards
        .checked_mul(holder_token_balance)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_div(total_token_supply)
        .ok_or(SolSocialError::MathOverflow)?;
    
    Ok(individual_reward)
}

pub fn distribute_holder_rewards<'info>(
    holder_accounts: &[Account<'info, TokenAccount>],
    vault_token_account: &Account<'info, TokenAccount>,
    vault_authority: &AccountInfo<'info>,
    token_program: &Program<'info, Token>,
    total_rewards: u64,
    holder_balances: &[u64],
    total_supply: u64,
    vault_authority_bump: u8,
) -> Result<()> {
    require!(
        holder_accounts.len() == holder_balances.len(),
        SolSocialError::MismatchedArrayLengths
    );

    let vault_authority_seeds = &[
        b"vault_authority".as_ref(),
        &[vault_authority_bump],
    ];
    let signer_seeds = &[&vault_authority_seeds[..]];

    for (i, holder_account) in holder_accounts.iter().enumerate() {
        let holder_balance = holder_balances[i];
        let individual_reward = calculate_individual_holder_reward(
            total_rewards,
            holder_balance,
            total_supply,
        )?;

        if individual_reward > 0 {
            let transfer_ctx = CpiContext::new_with_signer(
                token_program.to_account_info(),
                Transfer {
                    from: vault_token_account.to_account_info(),
                    to: holder_account.to_account_info(),
                    authority: vault_authority.to_account_info(),
                },
                signer_seeds,
            );

            token::transfer(transfer_ctx, individual_reward)?;
        }
    }

    Ok(())
}

pub fn calculate_tip_distribution(
    tip_amount: u64,
    creator_tip_percentage: u8,
    platform_tip_fee: u8,
) -> Result<(u64, u64, u64)> {
    require!(creator_tip_percentage <= 100, SolSocialError::InvalidSharePercentage);
    require!(platform_tip_fee <= 100, SolSocialError::InvalidSharePercentage);
    require!(
        creator_tip_percentage + platform_tip_fee <= 100,
        SolSocialError::InvalidSharePercentage
    );

    let creator_share = calculate_creator_share(tip_amount, creator_tip_percentage)?;
    let platform_share = calculate_platform_share(tip_amount, platform_tip_fee)?;
    let holder_share = tip_amount
        .checked_sub(creator_share)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_sub(platform_share)
        .ok_or(SolSocialError::MathOverflow)?;

    Ok((creator_share, platform_share, holder_share))
}

pub fn process_revenue_distribution<'info>(
    revenue_pool: &mut Account<'info, RevenuePool>,
    creator_profile: &Account<'info, CreatorProfile>,
    vault_token_account: &Account<'info, TokenAccount>,
    creator_token_account: &Account<'info, TokenAccount>,
    platform_token_account: &Account<'info, TokenAccount>,
    vault_authority: &AccountInfo<'info>,
    token_program: &Program<'info, Token>,
    vault_authority_bump: u8,
) -> Result<()> {
    let total_revenue = revenue_pool.pending_revenue;
    require!(total_revenue > 0, SolSocialError::NoRevenueToDistribute);

    let creator_share = calculate_creator_share(
        total_revenue,
        creator_profile.revenue_share_percentage,
    )?;

    let platform_share = calculate_platform_share(
        total_revenue,
        revenue_pool.platform_fee_percentage,
    )?;

    let holder_rewards = calculate_holder_rewards(
        total_revenue,
        creator_profile.revenue_share_percentage,
        revenue_pool.platform_fee_percentage,
    )?;

    // Distribute to creator
    if creator_share > 0 {
        distribute_revenue_to_creator(
            creator_token_account,
            vault_token_account,
            vault_authority,
            token_program,
            creator_share,
            vault_authority_bump,
        )?;
    }

    // Distribute to platform
    if platform_share > 0 {
        distribute_revenue_to_platform(
            platform_token_account,
            vault_token_account,
            vault_authority,
            token_program,
            platform_share,
            vault_authority_bump,
        )?;
    }

    // Update revenue pool state
    revenue_pool.total_distributed = revenue_pool
        .total_distributed
        .checked_add(total_revenue)
        .ok_or(SolSocialError::MathOverflow)?;
    
    revenue_pool.pending_revenue = 0;
    revenue_pool.holder_rewards_pool = revenue_pool
        .holder_rewards_pool
        .checked_add(holder_rewards)
        .ok_or(SolSocialError::MathOverflow)?;

    revenue_pool.last_distribution_timestamp = Clock::get()?.unix_timestamp;

    Ok(())
}

pub fn validate_revenue_distribution_params(
    creator_share_percentage: u8,
    platform_fee_percentage: u8,
) -> Result<()> {
    require!(creator_share_percentage <= 100, SolSocialError::InvalidSharePercentage);
    require!(platform_fee_percentage <= 100, SolSocialError::InvalidSharePercentage);
    require!(
        creator_share_percentage + platform_fee_percentage <= 100,
        SolSocialError::InvalidSharePercentage
    );
    
    Ok(())
}

pub fn calculate_accumulated_rewards(
    holder_balance: u64,
    total_supply: u64,
    rewards_per_token: u64,
    last_claimed_rewards_per_token: u64,
) -> Result<u64> {
    require!(total_supply > 0, SolSocialError::InvalidTokenSupply);
    
    let rewards_per_token_delta = rewards_per_token
        .checked_sub(last_claimed_rewards_per_token)
        .ok_or(SolSocialError::MathOverflow)?;
    
    let accumulated_rewards = holder_balance
        .checked_mul(rewards_per_token_delta)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_div(1_000_000) // Scale factor for precision
        .ok_or(SolSocialError::MathOverflow)?;
    
    Ok(accumulated_rewards)
}

pub fn update_rewards_per_token(
    current_rewards_per_token: u64,
    new_rewards: u64,
    total_supply: u64,
) -> Result<u64> {
    require!(total_supply > 0, SolSocialError::InvalidTokenSupply);
    
    let rewards_per_token_increase = new_rewards
        .checked_mul(1_000_000) // Scale factor for precision
        .ok_or(SolSocialError::MathOverflow)?
        .checked_div(total_supply)
        .ok_or(SolSocialError::MathOverflow)?;
    
    let updated_rewards_per_token = current_rewards_per_token
        .checked_add(rewards_per_token_increase)
        .ok_or(SolSocialError::MathOverflow)?;
    
    Ok(updated_rewards_per_token)
}
```