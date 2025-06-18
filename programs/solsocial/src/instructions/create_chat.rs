```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
#[instruction(chat_id: String)]
pub struct CreateChat<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Chat::INIT_SPACE,
        seeds = [b"chat", creator.key().as_ref(), chat_id.as_bytes()],
        bump
    )]
    pub chat: Account<'info, Chat>,

    #[account(
        init,
        payer = creator,
        space = 8 + ChatMember::INIT_SPACE,
        seeds = [b"chat_member", chat.key().as_ref(), creator.key().as_ref()],
        bump
    )]
    pub creator_membership: Account<'info, ChatMember>,

    #[account(
        mut,
        seeds = [b"user_profile", creator.key().as_ref()],
        bump,
        constraint = user_profile.owner == creator.key() @ SolSocialError::UnauthorizedAccess
    )]
    pub user_profile: Account<'info, UserProfile>,

    #[account(
        mut,
        constraint = creator_token_account.owner == creator.key() @ SolSocialError::InvalidTokenAccount,
        constraint = creator_token_account.mint == user_profile.social_token_mint @ SolSocialError::InvalidTokenMint
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = user_profile.social_token_mint,
        associated_token::authority = chat
    )]
    pub chat_token_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_chat(
    ctx: Context<CreateChat>,
    chat_id: String,
    name: String,
    description: String,
    is_private: bool,
    entry_fee: u64,
    max_members: u32,
) -> Result<()> {
    require!(chat_id.len() <= 32, SolSocialError::ChatIdTooLong);
    require!(name.len() <= 64, SolSocialError::ChatNameTooLong);
    require!(description.len() <= 256, SolSocialError::ChatDescriptionTooLong);
    require!(max_members > 0 && max_members <= 1000, SolSocialError::InvalidMaxMembers);

    let chat = &mut ctx.accounts.chat;
    let creator_membership = &mut ctx.accounts.creator_membership;
    let user_profile = &mut ctx.accounts.user_profile;

    // Initialize chat account
    chat.chat_id = chat_id;
    chat.name = name;
    chat.description = description;
    chat.creator = ctx.accounts.creator.key();
    chat.is_private = is_private;
    chat.entry_fee = entry_fee;
    chat.max_members = max_members;
    chat.current_members = 1;
    chat.total_messages = 0;
    chat.created_at = Clock::get()?.unix_timestamp;
    chat.last_activity = Clock::get()?.unix_timestamp;
    chat.is_active = true;
    chat.social_token_mint = user_profile.social_token_mint;
    chat.token_vault = ctx.accounts.chat_token_vault.key();
    chat.bump = ctx.bumps.chat;

    // Initialize creator membership
    creator_membership.chat = chat.key();
    creator_membership.user = ctx.accounts.creator.key();
    creator_membership.role = ChatRole::Admin;
    creator_membership.joined_at = Clock::get()?.unix_timestamp;
    creator_membership.last_read_message = 0;
    creator_membership.is_active = true;
    creator_membership.tokens_contributed = entry_fee;
    creator_membership.bump = ctx.bumps.creator_membership;

    // Transfer entry fee tokens to chat vault if required
    if entry_fee > 0 {
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.creator_token_account.to_account_info(),
                to: ctx.accounts.chat_token_vault.to_account_info(),
                authority: ctx.accounts.creator.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, entry_fee)?;
    }

    // Update user profile stats
    user_profile.chats_created = user_profile.chats_created.saturating_add(1);
    user_profile.total_chats_joined = user_profile.total_chats_joined.saturating_add(1);

    emit!(ChatCreatedEvent {
        chat: chat.key(),
        creator: ctx.accounts.creator.key(),
        chat_id: chat.chat_id.clone(),
        name: chat.name.clone(),
        is_private,
        entry_fee,
        max_members,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct ChatCreatedEvent {
    pub chat: Pubkey,
    pub creator: Pubkey,
    pub chat_id: String,
    pub name: String,
    pub is_private: bool,
    pub entry_fee: u64,
    pub max_members: u32,
    pub timestamp: i64,
}
```