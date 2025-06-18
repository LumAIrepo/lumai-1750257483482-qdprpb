```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
#[instruction(content: String)]
pub struct CreatePost<'info> {
    #[account(
        init,
        payer = author,
        space = Post::LEN + content.len() + 8,
        seeds = [
            b"post",
            author.key().as_ref(),
            &Clock::get()?.unix_timestamp.to_le_bytes()
        ],
        bump
    )]
    pub post: Account<'info, Post>,

    #[account(
        mut,
        seeds = [b"user_profile", author.key().as_ref()],
        bump = user_profile.bump,
        constraint = user_profile.owner == author.key() @ SolSocialError::UnauthorizedUser
    )]
    pub user_profile: Account<'info, UserProfile>,

    #[account(
        mut,
        seeds = [b"social_token", user_profile.key().as_ref()],
        bump = social_token.bump
    )]
    pub social_token: Account<'info, SocialToken>,

    #[account(
        mut,
        associated_token::mint = social_token.mint,
        associated_token::authority = author
    )]
    pub author_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = social_token.mint,
        associated_token::authority = social_token
    )]
    pub token_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub author: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(ctx: Context<CreatePost>, content: String, media_urls: Vec<String>) -> Result<()> {
    let clock = Clock::get()?;
    
    // Validate content length
    require!(content.len() > 0, SolSocialError::EmptyContent);
    require!(content.len() <= 2000, SolSocialError::ContentTooLong);
    require!(media_urls.len() <= 10, SolSocialError::TooManyMediaFiles);

    // Calculate post creation cost based on content length and media
    let base_cost = 1_000_000; // 0.001 tokens
    let content_cost = (content.len() as u64) * 1000; // 1000 per character
    let media_cost = (media_urls.len() as u64) * 5_000_000; // 0.005 tokens per media file
    let total_cost = base_cost + content_cost + media_cost;

    // Check if user has enough tokens
    require!(
        ctx.accounts.author_token_account.amount >= total_cost,
        SolSocialError::InsufficientTokens
    );

    // Transfer tokens to vault as post creation fee
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.author_token_account.to_account_info(),
            to: ctx.accounts.token_vault.to_account_info(),
            authority: ctx.accounts.author.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, total_cost)?;

    // Initialize post
    let post = &mut ctx.accounts.post;
    post.author = ctx.accounts.author.key();
    post.user_profile = ctx.accounts.user_profile.key();
    post.content = content;
    post.media_urls = media_urls;
    post.timestamp = clock.unix_timestamp;
    post.likes = 0;
    post.shares = 0;
    post.comments = 0;
    post.tips_received = 0;
    post.is_pinned = false;
    post.is_deleted = false;
    post.engagement_score = 0;
    post.bump = ctx.bumps.post;

    // Update user profile stats
    let user_profile = &mut ctx.accounts.user_profile;
    user_profile.posts_count = user_profile.posts_count.checked_add(1).unwrap();
    user_profile.last_post_timestamp = clock.unix_timestamp;

    // Update social token metrics
    let social_token = &mut ctx.accounts.social_token;
    social_token.total_posts = social_token.total_posts.checked_add(1).unwrap();
    social_token.total_volume = social_token.total_volume.checked_add(total_cost).unwrap();

    // Emit post creation event
    emit!(PostCreated {
        post: post.key(),
        author: ctx.accounts.author.key(),
        user_profile: ctx.accounts.user_profile.key(),
        content_preview: if post.content.len() > 100 {
            post.content[..100].to_string()
        } else {
            post.content.clone()
        },
        timestamp: clock.unix_timestamp,
        cost: total_cost,
    });

    Ok(())
}

#[event]
pub struct PostCreated {
    pub post: Pubkey,
    pub author: Pubkey,
    pub user_profile: Pubkey,
    pub content_preview: String,
    pub timestamp: i64,
    pub cost: u64,
}
```