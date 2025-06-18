```rust
use anchor_lang::prelude::*;

#[account]
pub struct ChatRoom {
    pub authority: Pubkey,
    pub name: String,
    pub description: String,
    pub token_mint: Pubkey,
    pub entry_fee: u64,
    pub total_messages: u64,
    pub created_at: i64,
    pub is_active: bool,
    pub max_participants: u32,
    pub current_participants: u32,
    pub bump: u8,
}

impl ChatRoom {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        4 + 50 + // name (String with length prefix)
        4 + 200 + // description (String with length prefix)
        32 + // token_mint
        8 + // entry_fee
        8 + // total_messages
        8 + // created_at
        1 + // is_active
        4 + // max_participants
        4 + // current_participants
        1; // bump
}

#[account]
pub struct Message {
    pub author: Pubkey,
    pub chat_room: Pubkey,
    pub content: String,
    pub timestamp: i64,
    pub message_id: u64,
    pub tip_amount: u64,
    pub reply_to: Option<u64>,
    pub is_pinned: bool,
    pub reactions: Vec<Reaction>,
    pub bump: u8,
}

impl Message {
    pub const LEN: usize = 8 + // discriminator
        32 + // author
        32 + // chat_room
        4 + 500 + // content (String with length prefix)
        8 + // timestamp
        8 + // message_id
        8 + // tip_amount
        1 + 8 + // reply_to (Option<u64>)
        1 + // is_pinned
        4 + (10 * Reaction::LEN) + // reactions (Vec with max 10 reactions)
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Reaction {
    pub reactor: Pubkey,
    pub emoji: String,
    pub timestamp: i64,
}

impl Reaction {
    pub const LEN: usize = 32 + // reactor
        4 + 10 + // emoji (String with length prefix)
        8; // timestamp
}

#[account]
pub struct ChatParticipant {
    pub user: Pubkey,
    pub chat_room: Pubkey,
    pub joined_at: i64,
    pub last_active: i64,
    pub message_count: u64,
    pub total_tips_sent: u64,
    pub total_tips_received: u64,
    pub is_moderator: bool,
    pub is_muted: bool,
    pub reputation_score: u32,
    pub bump: u8,
}

impl ChatParticipant {
    pub const LEN: usize = 8 + // discriminator
        32 + // user
        32 + // chat_room
        8 + // joined_at
        8 + // last_active
        8 + // message_count
        8 + // total_tips_sent
        8 + // total_tips_received
        1 + // is_moderator
        1 + // is_muted
        4 + // reputation_score
        1; // bump
}

#[account]
pub struct DirectMessage {
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub content: String,
    pub timestamp: i64,
    pub is_read: bool,
    pub is_encrypted: bool,
    pub tip_amount: u64,
    pub bump: u8,
}

impl DirectMessage {
    pub const LEN: usize = 8 + // discriminator
        32 + // sender
        32 + // recipient
        4 + 1000 + // content (String with length prefix)
        8 + // timestamp
        1 + // is_read
        1 + // is_encrypted
        8 + // tip_amount
        1; // bump
}

#[account]
pub struct ChatSettings {
    pub authority: Pubkey,
    pub global_message_fee: u64,
    pub global_tip_fee_percentage: u16,
    pub max_message_length: u16,
    pub spam_threshold: u32,
    pub reputation_threshold: u32,
    pub treasury: Pubkey,
    pub is_paused: bool,
    pub bump: u8,
}

impl ChatSettings {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        8 + // global_message_fee
        2 + // global_tip_fee_percentage
        2 + // max_message_length
        4 + // spam_threshold
        4 + // reputation_threshold
        32 + // treasury
        1 + // is_paused
        1; // bump
}

#[account]
pub struct UserProfile {
    pub owner: Pubkey,
    pub username: String,
    pub bio: String,
    pub avatar_url: String,
    pub token_balance: u64,
    pub total_messages_sent: u64,
    pub total_tips_sent: u64,
    pub total_tips_received: u64,
    pub reputation_score: u32,
    pub created_at: i64,
    pub last_active: i64,
    pub is_verified: bool,
    pub social_links: Vec<SocialLink>,
    pub bump: u8,
}

impl UserProfile {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        4 + 50 + // username (String with length prefix)
        4 + 200 + // bio (String with length prefix)
        4 + 200 + // avatar_url (String with length prefix)
        8 + // token_balance
        8 + // total_messages_sent
        8 + // total_tips_sent
        8 + // total_tips_received
        4 + // reputation_score
        8 + // created_at
        8 + // last_active
        1 + // is_verified
        4 + (5 * SocialLink::LEN) + // social_links (Vec with max 5 links)
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SocialLink {
    pub platform: String,
    pub url: String,
}

impl SocialLink {
    pub const LEN: usize = 4 + 20 + // platform (String with length prefix)
        4 + 200; // url (String with length prefix)
}

#[account]
pub struct TokenPrice {
    pub mint: Pubkey,
    pub price_in_sol: u64,
    pub price_in_usdc: u64,
    pub last_updated: i64,
    pub volume_24h: u64,
    pub price_change_24h: i64,
    pub market_cap: u64,
    pub bump: u8,
}

impl TokenPrice {
    pub const LEN: usize = 8 + // discriminator
        32 + // mint
        8 + // price_in_sol
        8 + // price_in_usdc
        8 + // last_updated
        8 + // volume_24h
        8 + // price_change_24h
        8 + // market_cap
        1; // bump
}

#[account]
pub struct Subscription {
    pub subscriber: Pubkey,
    pub creator: Pubkey,
    pub tier: u8,
    pub price_per_month: u64,
    pub started_at: i64,
    pub expires_at: i64,
    pub is_active: bool,
    pub auto_renew: bool,
    pub total_paid: u64,
    pub bump: u8,
}

impl Subscription {
    pub const LEN: usize = 8 + // discriminator
        32 + // subscriber
        32 + // creator
        1 + // tier
        8 + // price_per_month
        8 + // started_at
        8 + // expires_at
        1 + // is_active
        1 + // auto_renew
        8 + // total_paid
        1; // bump
}

#[account]
pub struct CreatorToken {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub total_supply: u64,
    pub circulating_supply: u64,
    pub price_curve_type: u8,
    pub base_price: u64,
    pub price_multiplier: u64,
    pub trading_fee_percentage: u16,
    pub creator_fee_percentage: u16,
    pub created_at: i64,
    pub is_tradeable: bool,
    pub bump: u8,
}

impl CreatorToken {
    pub const LEN: usize = 8 + // discriminator
        32 + // creator
        32 + // mint
        4 + 50 + // name (String with length prefix)
        4 + 10 + // symbol (String with length prefix)
        8 + // total_supply
        8 + // circulating_supply
        1 + // price_curve_type
        8 + // base_price
        8 + // price_multiplier
        2 + // trading_fee_percentage
        2 + // creator_fee_percentage
        8 + // created_at
        1 + // is_tradeable
        1; // bump
}

#[account]
pub struct Trade {
    pub trader: Pubkey,
    pub creator_token: Pubkey,
    pub trade_type: u8, // 0 = buy, 1 = sell
    pub amount: u64,
    pub price: u64,
    pub total_cost: u64,
    pub fee_paid: u64,
    pub timestamp: i64,
    pub bump: u8,
}

impl Trade {
    pub const LEN: usize = 8 + // discriminator
        32 + // trader
        32 + // creator_token
        1 + // trade_type
        8 + // amount
        8 + // price
        8 + // total_cost
        8 + // fee_paid
        8 + // timestamp
        1; // bump
}
```