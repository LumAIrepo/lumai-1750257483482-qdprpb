```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
#[instruction(message_content: String)]
pub struct SendMessage<'info> {
    #[account(
        init,
        payer = sender,
        space = 8 + Message::INIT_SPACE,
        seeds = [
            b"message",
            sender.key().as_ref(),
            &Clock::get()?.unix_timestamp.to_le_bytes()
        ],
        bump
    )]
    pub message: Account<'info, Message>,

    #[account(
        mut,
        seeds = [b"user_profile", sender.key().as_ref()],
        bump = sender_profile.bump
    )]
    pub sender_profile: Account<'info, UserProfile>,

    #[account(
        mut,
        seeds = [b"user_profile", recipient.key().as_ref()],
        bump = recipient_profile.bump
    )]
    pub recipient_profile: Account<'info, UserProfile>,

    #[account(
        mut,
        constraint = sender_token_account.owner == sender.key(),
        constraint = sender_token_account.mint == sender_profile.token_mint
    )]
    pub sender_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = recipient_token_account.owner == recipient.key(),
        constraint = recipient_token_account.mint == recipient_profile.token_mint
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = platform_fee_account.mint == sender_profile.token_mint
    )]
    pub platform_fee_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"chat_room", sender.key().min(recipient.key()).as_ref(), sender.key().max(recipient.key()).as_ref()],
        bump = chat_room.bump
    )]
    pub chat_room: Account<'info, ChatRoom>,

    #[account(mut)]
    pub sender: Signer<'info>,

    /// CHECK: This is the recipient's public key, validated through the recipient_profile constraint
    pub recipient: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn send_message(
    ctx: Context<SendMessage>,
    message_content: String,
    tip_amount: Option<u64>,
) -> Result<()> {
    let clock = Clock::get()?;
    
    // Validate message content
    require!(
        !message_content.trim().is_empty(),
        SolSocialError::EmptyMessage
    );
    
    require!(
        message_content.len() <= 500,
        SolSocialError::MessageTooLong
    );

    // Calculate message cost based on sender's token price
    let base_message_cost = 1000; // Base cost in lamports
    let token_price_multiplier = ctx.accounts.sender_profile.token_price / 1_000_000; // Convert to SOL
    let message_cost = base_message_cost + (token_price_multiplier * 100);

    // Handle tip if provided
    if let Some(tip) = tip_amount {
        require!(tip > 0, SolSocialError::InvalidTipAmount);
        
        // Calculate platform fee (2% of tip)
        let platform_fee = tip * 2 / 100;
        let recipient_amount = tip - platform_fee;

        // Transfer tip to recipient
        let transfer_to_recipient_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.sender_token_account.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        );
        token::transfer(transfer_to_recipient_ctx, recipient_amount)?;

        // Transfer platform fee
        let transfer_fee_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.sender_token_account.to_account_info(),
                to: ctx.accounts.platform_fee_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        );
        token::transfer(transfer_fee_ctx, platform_fee)?;

        // Update recipient's earnings
        ctx.accounts.recipient_profile.total_earnings = ctx.accounts.recipient_profile.total_earnings
            .checked_add(recipient_amount)
            .ok_or(SolSocialError::MathOverflow)?;
    }

    // Initialize message
    let message = &mut ctx.accounts.message;
    message.sender = ctx.accounts.sender.key();
    message.recipient = ctx.accounts.recipient.key();
    message.content = message_content;
    message.timestamp = clock.unix_timestamp;
    message.tip_amount = tip_amount.unwrap_or(0);
    message.message_cost = message_cost;
    message.is_read = false;
    message.bump = ctx.bumps.message;

    // Update chat room
    let chat_room = &mut ctx.accounts.chat_room;
    chat_room.last_message_timestamp = clock.unix_timestamp;
    chat_room.message_count = chat_room.message_count
        .checked_add(1)
        .ok_or(SolSocialError::MathOverflow)?;
    chat_room.last_message_sender = ctx.accounts.sender.key();

    // Update sender profile stats
    let sender_profile = &mut ctx.accounts.sender_profile;
    sender_profile.messages_sent = sender_profile.messages_sent
        .checked_add(1)
        .ok_or(SolSocialError::MathOverflow)?;
    sender_profile.last_activity = clock.unix_timestamp;

    // Update recipient profile stats
    let recipient_profile = &mut ctx.accounts.recipient_profile;
    recipient_profile.messages_received = recipient_profile.messages_received
        .checked_add(1)
        .ok_or(SolSocialError::MathOverflow)?;

    // Increase token price based on interaction (Friend.tech style)
    let price_increase = calculate_price_increase(sender_profile.holder_count, sender_profile.messages_sent);
    sender_profile.token_price = sender_profile.token_price
        .checked_add(price_increase)
        .ok_or(SolSocialError::MathOverflow)?;

    // Emit event
    emit!(MessageSentEvent {
        message_id: message.key(),
        sender: ctx.accounts.sender.key(),
        recipient: ctx.accounts.recipient.key(),
        content: message.content.clone(),
        tip_amount: tip_amount.unwrap_or(0),
        timestamp: clock.unix_timestamp,
        new_sender_price: sender_profile.token_price,
    });

    Ok(())
}

fn calculate_price_increase(holder_count: u32, message_count: u64) -> u64 {
    // Friend.tech style bonding curve calculation
    let base_increase = 1000; // Base increase in lamports
    let holder_multiplier = (holder_count as u64) * 100;
    let activity_multiplier = (message_count % 100) * 50;
    
    base_increase + holder_multiplier + activity_multiplier
}

#[event]
pub struct MessageSentEvent {
    pub message_id: Pubkey,
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub content: String,
    pub tip_amount: u64,
    pub timestamp: i64,
    pub new_sender_price: u64,
}
```