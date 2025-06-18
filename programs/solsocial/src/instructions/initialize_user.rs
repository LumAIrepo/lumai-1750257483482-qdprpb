```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
#[instruction(username: String)]
pub struct InitializeUser<'info> {
    #[account(
        init,
        payer = user,
        space = UserProfile::LEN,
        seeds = [b"user_profile", user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,

    #[account(
        init,
        payer = user,
        mint::decimals = 6,
        mint::authority = user_profile,
        seeds = [b"user_token", user.key().as_ref()],
        bump
    )]
    pub user_token_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = user,
        token::mint = user_token_mint,
        token::authority = user_profile,
        seeds = [b"user_token_vault", user.key().as_ref()],
        bump
    )]
    pub user_token_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = user,
        space = SocialStats::LEN,
        seeds = [b"social_stats", user.key().as_ref()],
        bump
    )]
    pub social_stats: Account<'info, SocialStats>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn initialize_user(
    ctx: Context<InitializeUser>,
    username: String,
    display_name: String,
    bio: String,
    avatar_url: String,
    initial_token_supply: u64,
) -> Result<()> {
    require!(username.len() <= 32, SolSocialError::UsernameTooLong);
    require!(display_name.len() <= 64, SolSocialError::DisplayNameTooLong);
    require!(bio.len() <= 280, SolSocialError::BioTooLong);
    require!(avatar_url.len() <= 200, SolSocialError::AvatarUrlTooLong);
    require!(initial_token_supply > 0, SolSocialError::InvalidTokenSupply);
    require!(initial_token_supply <= 1_000_000_000_000, SolSocialError::TokenSupplyTooHigh);

    let user_profile = &mut ctx.accounts.user_profile;
    let social_stats = &mut ctx.accounts.social_stats;
    let clock = Clock::get()?;

    // Initialize user profile
    user_profile.owner = ctx.accounts.user.key();
    user_profile.username = username;
    user_profile.display_name = display_name;
    user_profile.bio = bio;
    user_profile.avatar_url = avatar_url;
    user_profile.token_mint = ctx.accounts.user_token_mint.key();
    user_profile.token_vault = ctx.accounts.user_token_vault.key();
    user_profile.total_token_supply = initial_token_supply;
    user_profile.circulating_supply = 0;
    user_profile.base_price = 1_000_000; // 0.001 SOL in lamports
    user_profile.current_price = 1_000_000;
    user_profile.price_multiplier = 1100; // 1.1x multiplier (basis points)
    user_profile.creator_fee_percentage = 500; // 5% creator fee
    user_profile.protocol_fee_percentage = 250; // 2.5% protocol fee
    user_profile.is_verified = false;
    user_profile.is_active = true;
    user_profile.created_at = clock.unix_timestamp;
    user_profile.updated_at = clock.unix_timestamp;
    user_profile.bump = ctx.bumps.user_profile;

    // Initialize social stats
    social_stats.user = ctx.accounts.user.key();
    social_stats.followers_count = 0;
    social_stats.following_count = 0;
    social_stats.posts_count = 0;
    social_stats.likes_received = 0;
    social_stats.likes_given = 0;
    social_stats.comments_count = 0;
    social_stats.shares_count = 0;
    social_stats.tips_received = 0;
    social_stats.tips_given = 0;
    social_stats.total_earnings = 0;
    social_stats.reputation_score = 100; // Starting reputation
    social_stats.engagement_rate = 0;
    social_stats.last_active = clock.unix_timestamp;
    social_stats.bump = ctx.bumps.social_stats;

    // Mint initial token supply to vault
    if initial_token_supply > 0 {
        let seeds = &[
            b"user_profile",
            ctx.accounts.user.key().as_ref(),
            &[user_profile.bump],
        ];
        let signer = &[&seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.user_token_mint.to_account_info(),
                    to: ctx.accounts.user_token_vault.to_account_info(),
                    authority: user_profile.to_account_info(),
                },
                signer,
            ),
            initial_token_supply,
        )?;
    }

    emit!(UserInitialized {
        user: ctx.accounts.user.key(),
        username: user_profile.username.clone(),
        display_name: user_profile.display_name.clone(),
        token_mint: ctx.accounts.user_token_mint.key(),
        initial_supply: initial_token_supply,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
```