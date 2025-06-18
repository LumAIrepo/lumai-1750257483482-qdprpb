```rust
use anchor_lang::prelude::*;

#[account]
pub struct UserProfile {
    pub authority: Pubkey,
    pub username: String,
    pub display_name: String,
    pub bio: String,
    pub avatar_url: String,
    pub token_mint: Pubkey,
    pub token_supply: u64,
    pub token_price: u64,
    pub followers_count: u64,
    pub following_count: u64,
    pub posts_count: u64,
    pub total_earned: u64,
    pub created_at: i64,
    pub bump: u8,
}

impl UserProfile {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        4 + 32 + // username (max 32 chars)
        4 + 64 + // display_name (max 64 chars)
        4 + 256 + // bio (max 256 chars)
        4 + 128 + // avatar_url (max 128 chars)
        32 + // token_mint
        8 + // token_supply
        8 + // token_price
        8 + // followers_count
        8 + // following_count
        8 + // posts_count
        8 + // total_earned
        8 + // created_at
        1; // bump
}

#[account]
pub struct Post {
    pub id: u64,
    pub author: Pubkey,
    pub content: String,
    pub image_url: String,
    pub likes_count: u64,
    pub comments_count: u64,
    pub tips_count: u64,
    pub total_tips_amount: u64,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_premium: bool,
    pub premium_price: u64,
    pub bump: u8,
}

impl Post {
    pub const LEN: usize = 8 + // discriminator
        8 + // id
        32 + // author
        4 + 512 + // content (max 512 chars)
        4 + 128 + // image_url (max 128 chars)
        8 + // likes_count
        8 + // comments_count
        8 + // tips_count
        8 + // total_tips_amount
        8 + // created_at
        8 + // updated_at
        1 + // is_premium
        8 + // premium_price
        1; // bump
}

#[account]
pub struct Comment {
    pub id: u64,
    pub post_id: u64,
    pub author: Pubkey,
    pub content: String,
    pub likes_count: u64,
    pub created_at: i64,
    pub bump: u8,
}

impl Comment {
    pub const LEN: usize = 8 + // discriminator
        8 + // id
        8 + // post_id
        32 + // author
        4 + 256 + // content (max 256 chars)
        8 + // likes_count
        8 + // created_at
        1; // bump
}

#[account]
pub struct Like {
    pub user: Pubkey,
    pub post_id: u64,
    pub comment_id: Option<u64>,
    pub created_at: i64,
    pub bump: u8,
}

impl Like {
    pub const LEN: usize = 8 + // discriminator
        32 + // user
        8 + // post_id
        1 + 8 + // comment_id (Option<u64>)
        8 + // created_at
        1; // bump
}

#[account]
pub struct Follow {
    pub follower: Pubkey,
    pub following: Pubkey,
    pub created_at: i64,
    pub bump: u8,
}

impl Follow {
    pub const LEN: usize = 8 + // discriminator
        32 + // follower
        32 + // following
        8 + // created_at
        1; // bump
}

#[account]
pub struct Tip {
    pub id: u64,
    pub from: Pubkey,
    pub to: Pubkey,
    pub post_id: u64,
    pub amount: u64,
    pub message: String,
    pub created_at: i64,
    pub bump: u8,
}

impl Tip {
    pub const LEN: usize = 8 + // discriminator
        8 + // id
        32 + // from
        32 + // to
        8 + // post_id
        8 + // amount
        4 + 128 + // message (max 128 chars)
        8 + // created_at
        1; // bump
}

#[account]
pub struct TokenTrade {
    pub id: u64,
    pub trader: Pubkey,
    pub profile_owner: Pubkey,
    pub token_mint: Pubkey,
    pub trade_type: TradeType,
    pub amount: u64,
    pub price: u64,
    pub total_cost: u64,
    pub created_at: i64,
    pub bump: u8,
}

impl TokenTrade {
    pub const LEN: usize = 8 + // discriminator
        8 + // id
        32 + // trader
        32 + // profile_owner
        32 + // token_mint
        1 + // trade_type
        8 + // amount
        8 + // price
        8 + // total_cost
        8 + // created_at
        1; // bump
}

#[account]
pub struct PremiumAccess {
    pub user: Pubkey,
    pub profile_owner: Pubkey,
    pub expires_at: i64,
    pub created_at: i64,
    pub bump: u8,
}

impl PremiumAccess {
    pub const LEN: usize = 8 + // discriminator
        32 + // user
        32 + // profile_owner
        8 + // expires_at
        8 + // created_at
        1; // bump
}

#[account]
pub struct GlobalState {
    pub authority: Pubkey,
    pub total_users: u64,
    pub total_posts: u64,
    pub total_tips: u64,
    pub total_volume: u64,
    pub platform_fee_bps: u16,
    pub creator_fee_bps: u16,
    pub paused: bool,
    pub bump: u8,
}

impl GlobalState {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        8 + // total_users
        8 + // total_posts
        8 + // total_tips
        8 + // total_volume
        2 + // platform_fee_bps
        2 + // creator_fee_bps
        1 + // paused
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TradeType {
    Buy,
    Sell,
}

#[account]
pub struct TokenHolder {
    pub holder: Pubkey,
    pub profile_owner: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub average_price: u64,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl TokenHolder {
    pub const LEN: usize = 8 + // discriminator
        32 + // holder
        32 + // profile_owner
        32 + // token_mint
        8 + // amount
        8 + // average_price
        8 + // created_at
        8 + // updated_at
        1; // bump
}

#[account]
pub struct Notification {
    pub id: u64,
    pub recipient: Pubkey,
    pub sender: Pubkey,
    pub notification_type: NotificationType,
    pub content: String,
    pub post_id: Option<u64>,
    pub read: bool,
    pub created_at: i64,
    pub bump: u8,
}

impl Notification {
    pub const LEN: usize = 8 + // discriminator
        8 + // id
        32 + // recipient
        32 + // sender
        1 + // notification_type
        4 + 256 + // content (max 256 chars)
        1 + 8 + // post_id (Option<u64>)
        1 + // read
        8 + // created_at
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum NotificationType {
    Like,
    Comment,
    Follow,
    Tip,
    TokenPurchase,
    Mention,
}

#[account]
pub struct ReportedContent {
    pub id: u64,
    pub reporter: Pubkey,
    pub content_type: ContentType,
    pub content_id: u64,
    pub reason: String,
    pub status: ReportStatus,
    pub created_at: i64,
    pub resolved_at: Option<i64>,
    pub bump: u8,
}

impl ReportedContent {
    pub const LEN: usize = 8 + // discriminator
        8 + // id
        32 + // reporter
        1 + // content_type
        8 + // content_id
        4 + 256 + // reason (max 256 chars)
        1 + // status
        8 + // created_at
        1 + 8 + // resolved_at (Option<i64>)
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ContentType {
    Post,
    Comment,
    Profile,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ReportStatus {
    Pending,
    Reviewed,
    Resolved,
    Dismissed,
}
```