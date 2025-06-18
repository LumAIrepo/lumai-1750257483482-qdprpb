```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
#[instruction(interaction_type: u8)]
pub struct InteractPost<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"post", post.creator.as_ref(), &post.post_id.to_le_bytes()],
        bump = post.bump
    )]
    pub post: Account<'info, Post>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + PostInteraction::INIT_SPACE,
        seeds = [b"interaction", user.key().as_ref(), post.key().as_ref()],
        bump
    )]
    pub interaction: Account<'info, PostInteraction>,
    
    #[account(
        mut,
        seeds = [b"profile", post.creator.as_ref()],
        bump = creator_profile.bump
    )]
    pub creator_profile: Account<'info, UserProfile>,
    
    #[account(
        mut,
        seeds = [b"profile", user.key().as_ref()],
        bump = user_profile.bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    #[account(
        mut,
        associated_token::mint = creator_profile.token_mint,
        associated_token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = creator_profile.token_mint,
        associated_token::authority = post.creator
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CommentPost<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"post", post.creator.as_ref(), &post.post_id.to_le_bytes()],
        bump = post.bump
    )]
    pub post: Account<'info, Post>,
    
    #[account(
        init,
        payer = user,
        space = 8 + Comment::INIT_SPACE,
        seeds = [b"comment", user.key().as_ref(), post.key().as_ref(), &post.comment_count.to_le_bytes()],
        bump
    )]
    pub comment: Account<'info, Comment>,
    
    #[account(
        mut,
        seeds = [b"profile", user.key().as_ref()],
        bump = user_profile.bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TipPost<'info> {
    #[account(mut)]
    pub tipper: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"post", post.creator.as_ref(), &post.post_id.to_le_bytes()],
        bump = post.bump
    )]
    pub post: Account<'info, Post>,
    
    #[account(
        mut,
        seeds = [b"profile", post.creator.as_ref()],
        bump = creator_profile.bump
    )]
    pub creator_profile: Account<'info, UserProfile>,
    
    #[account(
        mut,
        seeds = [b"profile", tipper.key().as_ref()],
        bump = tipper_profile.bump
    )]
    pub tipper_profile: Account<'info, UserProfile>,
    
    #[account(
        mut,
        associated_token::mint = creator_profile.token_mint,
        associated_token::authority = tipper
    )]
    pub tipper_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = creator_profile.token_mint,
        associated_token::authority = post.creator
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = tipper,
        space = 8 + Tip::INIT_SPACE,
        seeds = [b"tip", tipper.key().as_ref(), post.key().as_ref(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub tip: Account<'info, Tip>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn like_post(ctx: Context<InteractPost>) -> Result<()> {
    let post = &mut ctx.accounts.post;
    let interaction = &mut ctx.accounts.interaction;
    let user_profile = &mut ctx.accounts.user_profile;
    let creator_profile = &mut ctx.accounts.creator_profile;
    
    require!(!interaction.has_liked, SolSocialError::AlreadyLiked);
    
    // Update interaction state
    interaction.user = ctx.accounts.user.key();
    interaction.post = post.key();
    interaction.has_liked = true;
    interaction.liked_at = Clock::get()?.unix_timestamp;
    interaction.bump = ctx.bumps.interaction;
    
    // Update post stats
    post.like_count = post.like_count.checked_add(1).ok_or(SolSocialError::Overflow)?;
    
    // Update user engagement score
    user_profile.engagement_score = user_profile.engagement_score
        .checked_add(LIKE_ENGAGEMENT_POINTS)
        .ok_or(SolSocialError::Overflow)?;
    
    // Reward creator with tokens for engagement
    let reward_amount = calculate_engagement_reward(post.like_count, InteractionType::Like);
    if reward_amount > 0 {
        creator_profile.total_earnings = creator_profile.total_earnings
            .checked_add(reward_amount)
            .ok_or(SolSocialError::Overflow)?;
        
        // Transfer tokens from user to creator
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::transfer(cpi_ctx, reward_amount)?;
    }
    
    emit!(PostLiked {
        post: post.key(),
        user: ctx.accounts.user.key(),
        like_count: post.like_count,
        reward_amount,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

pub fn unlike_post(ctx: Context<InteractPost>) -> Result<()> {
    let post = &mut ctx.accounts.post;
    let interaction = &mut ctx.accounts.interaction;
    let user_profile = &mut ctx.accounts.user_profile;
    
    require!(interaction.has_liked, SolSocialError::NotLiked);
    
    // Update interaction state
    interaction.has_liked = false;
    interaction.unliked_at = Clock::get()?.unix_timestamp;
    
    // Update post stats
    post.like_count = post.like_count.checked_sub(1).ok_or(SolSocialError::Underflow)?;
    
    // Reduce user engagement score
    user_profile.engagement_score = user_profile.engagement_score
        .saturating_sub(LIKE_ENGAGEMENT_POINTS);
    
    emit!(PostUnliked {
        post: post.key(),
        user: ctx.accounts.user.key(),
        like_count: post.like_count,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

pub fn share_post(ctx: Context<InteractPost>) -> Result<()> {
    let post = &mut ctx.accounts.post;
    let interaction = &mut ctx.accounts.interaction;
    let user_profile = &mut ctx.accounts.user_profile;
    let creator_profile = &mut ctx.accounts.creator_profile;
    
    require!(!interaction.has_shared, SolSocialError::AlreadyShared);
    
    // Update interaction state
    interaction.user = ctx.accounts.user.key();
    interaction.post = post.key();
    interaction.has_shared = true;
    interaction.shared_at = Clock::get()?.unix_timestamp;
    interaction.bump = ctx.bumps.interaction;
    
    // Update post stats
    post.share_count = post.share_count.checked_add(1).ok_or(SolSocialError::Overflow)?;
    
    // Update user engagement score
    user_profile.engagement_score = user_profile.engagement_score
        .checked_add(SHARE_ENGAGEMENT_POINTS)
        .ok_or(SolSocialError::Overflow)?;
    
    // Reward creator with tokens for share
    let reward_amount = calculate_engagement_reward(post.share_count, InteractionType::Share);
    if reward_amount > 0 {
        creator_profile.total_earnings = creator_profile.total_earnings
            .checked_add(reward_amount)
            .ok_or(SolSocialError::Overflow)?;
        
        // Transfer tokens from user to creator
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::transfer(cpi_ctx, reward_amount)?;
    }
    
    emit!(PostShared {
        post: post.key(),
        user: ctx.accounts.user.key(),
        share_count: post.share_count,
        reward_amount,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

pub fn comment_post(ctx: Context<CommentPost>, content: String) -> Result<()> {
    require!(content.len() <= MAX_COMMENT_LENGTH, SolSocialError::CommentTooLong);
    require!(!content.trim().is_empty(), SolSocialError::EmptyComment);
    
    let post = &mut ctx.accounts.post;
    let comment = &mut ctx.accounts.comment;
    let user_profile = &mut ctx.accounts.user_profile;
    
    // Initialize comment
    comment.author = ctx.accounts.user.key();
    comment.post = post.key();
    comment.content = content;
    comment.created_at = Clock::get()?.unix_timestamp;
    comment.like_count = 0;
    comment.reply_count = 0;
    comment.is_deleted = false;
    comment.bump = ctx.bumps.comment;
    
    // Update post stats
    post.comment_count = post.comment_count.checked_add(1).ok_or(SolSocialError::Overflow)?;
    
    // Update user engagement score
    user_profile.engagement_score = user_profile.engagement_score
        .checked_add(COMMENT_ENGAGEMENT_POINTS)
        .ok_or(SolSocialError::Overflow)?;
    
    emit!(PostCommented {
        post: post.key(),
        comment: comment.key(),
        author: ctx.accounts.user.key(),
        content: comment.content.clone(),
        comment_count: post.comment_count,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

pub fn tip_post(ctx: Context<TipPost>, amount: u64, message: Option<String>) -> Result<()> {
    require!(amount > 0, SolSocialError::InvalidTipAmount);
    require!(amount <= MAX_TIP_AMOUNT, SolSocialError::TipAmountTooHigh);
    
    if let Some(ref msg) = message {
        require!(msg.len() <= MAX_TIP_MESSAGE_LENGTH, SolSocialError::TipMessageTooLong);
    }
    
    let post = &mut ctx.accounts.post;
    let tip = &mut ctx.accounts.tip;
    let creator_profile = &mut ctx.accounts.creator_profile;
    let tipper_profile = &mut ctx.accounts.tipper_profile;
    
    // Initialize tip
    tip.tipper = ctx.accounts.tipper.key();
    tip.recipient = post.creator;
    tip.post = post.key();
    tip.amount = amount;
    tip.message = message.unwrap_or_default();
    tip.created_at = Clock::get()?.unix_timestamp;
    tip.bump = ctx.bumps.tip;
    
    // Transfer tokens from tipper to creator
    let cpi_accounts = Transfer {
        from: ctx.accounts.tipper_token_account.to_account_info(),
        to: ctx.accounts.creator_token_account.to_account_info(),
        authority: ctx.accounts.tipper.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    token::transfer(cpi_ctx, amount)?;
    
    // Update post stats
    post.tip_count = post.tip_count.checked_add(1).ok_or(SolSocialError::Overflow)?;
    post.total_tips = post.total_tips.checked_add(amount).ok_or(SolSocialError::Overflow)?;
    
    // Update profiles
    creator_profile.total_earnings = creator_profile.total_earnings
        .checked_add(amount)
        .ok_or(SolSocialError::Overflow)?;
    creator_profile.tips_received = creator_profile.tips_received
        .checked_add(1)
        .ok_or(SolSocialError::Overflow)?;
    
    tipper_profile.tips_given = tipper_profile.tips_given
        .checked_add(1)
        .ok_or(SolSocialError::Overflow)?;
    tipper_profile.engagement_score = tipper_profile.engagement_score
        .checked_add(TIP_ENGAGEMENT_POINTS)
        .ok_or(SolSocialError::Overflow)?;
    
    emit!(PostTipped {
        post: post.key(),
        tip: tip.key(),
        tipper: ctx.accounts.tipper.key(),
        recipient: post.creator,
        amount,
        message: tip.message.clone(),
        tip_count: post.tip_count,
        total_tips: post.total_tips,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

fn calculate_engagement_reward(interaction_count: u64, interaction_type: InteractionType) -> u64 {
    let base_reward = match interaction_type {