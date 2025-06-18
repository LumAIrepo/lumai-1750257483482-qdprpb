```rust
use anchor_lang::prelude::*;

#[account]
pub struct Post {
    pub author: Pubkey,
    pub content: String,
    pub timestamp: i64,
    pub likes: u64,
    pub shares: u64,
    pub tips_received: u64,
    pub token_price: u64,
    pub is_premium: bool,
    pub reply_to: Option<Pubkey>,
    pub media_hash: Option<String>,
    pub bump: u8,
}

impl Post {
    pub const MAX_CONTENT_LENGTH: usize = 280;
    pub const MAX_MEDIA_HASH_LENGTH: usize = 64;
    
    pub const SPACE: usize = 8 + // discriminator
        32 + // author
        4 + Self::MAX_CONTENT_LENGTH + // content (string)
        8 + // timestamp
        8 + // likes
        8 + // shares
        8 + // tips_received
        8 + // token_price
        1 + // is_premium
        1 + 32 + // reply_to (option + pubkey)
        1 + 4 + Self::MAX_MEDIA_HASH_LENGTH + // media_hash (option + string)
        1; // bump

    pub fn initialize(
        &mut self,
        author: Pubkey,
        content: String,
        timestamp: i64,
        token_price: u64,
        is_premium: bool,
        reply_to: Option<Pubkey>,
        media_hash: Option<String>,
        bump: u8,
    ) -> Result<()> {
        require!(
            content.len() <= Self::MAX_CONTENT_LENGTH,
            SolSocialError::ContentTooLong
        );

        if let Some(ref hash) = media_hash {
            require!(
                hash.len() <= Self::MAX_MEDIA_HASH_LENGTH,
                SolSocialError::MediaHashTooLong
            );
        }

        self.author = author;
        self.content = content;
        self.timestamp = timestamp;
        self.likes = 0;
        self.shares = 0;
        self.tips_received = 0;
        self.token_price = token_price;
        self.is_premium = is_premium;
        self.reply_to = reply_to;
        self.media_hash = media_hash;
        self.bump = bump;

        Ok(())
    }

    pub fn like(&mut self) -> Result<()> {
        self.likes = self.likes.checked_add(1).ok_or(SolSocialError::Overflow)?;
        Ok(())
    }

    pub fn share(&mut self) -> Result<()> {
        self.shares = self.shares.checked_add(1).ok_or(SolSocialError::Overflow)?;
        Ok(())
    }

    pub fn add_tip(&mut self, amount: u64) -> Result<()> {
        self.tips_received = self.tips_received.checked_add(amount).ok_or(SolSocialError::Overflow)?;
        Ok(())
    }

    pub fn update_token_price(&mut self, new_price: u64) -> Result<()> {
        self.token_price = new_price;
        Ok(())
    }

    pub fn is_reply(&self) -> bool {
        self.reply_to.is_some()
    }

    pub fn has_media(&self) -> bool {
        self.media_hash.is_some()
    }
}

#[account]
pub struct PostInteraction {
    pub user: Pubkey,
    pub post: Pubkey,
    pub interaction_type: InteractionType,
    pub timestamp: i64,
    pub bump: u8,
}

impl PostInteraction {
    pub const SPACE: usize = 8 + // discriminator
        32 + // user
        32 + // post
        1 + // interaction_type
        8 + // timestamp
        1; // bump

    pub fn initialize(
        &mut self,
        user: Pubkey,
        post: Pubkey,
        interaction_type: InteractionType,
        timestamp: i64,
        bump: u8,
    ) -> Result<()> {
        self.user = user;
        self.post = post;
        self.interaction_type = interaction_type;
        self.timestamp = timestamp;
        self.bump = bump;
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum InteractionType {
    Like,
    Share,
    Tip,
}

#[account]
pub struct PostStats {
    pub post: Pubkey,
    pub total_engagement: u64,
    pub engagement_score: u64,
    pub last_updated: i64,
    pub bump: u8,
}

impl PostStats {
    pub const SPACE: usize = 8 + // discriminator
        32 + // post
        8 + // total_engagement
        8 + // engagement_score
        8 + // last_updated
        1; // bump

    pub fn initialize(
        &mut self,
        post: Pubkey,
        timestamp: i64,
        bump: u8,
    ) -> Result<()> {
        self.post = post;
        self.total_engagement = 0;
        self.engagement_score = 0;
        self.last_updated = timestamp;
        self.bump = bump;
        Ok(())
    }

    pub fn update_engagement(&mut self, likes: u64, shares: u64, tips: u64, timestamp: i64) -> Result<()> {
        self.total_engagement = likes.checked_add(shares).ok_or(SolSocialError::Overflow)?
            .checked_add(tips).ok_or(SolSocialError::Overflow)?;
        
        // Calculate engagement score with weighted values
        let like_weight = 1;
        let share_weight = 3;
        let tip_weight = 5;
        
        self.engagement_score = likes.checked_mul(like_weight).ok_or(SolSocialError::Overflow)?
            .checked_add(shares.checked_mul(share_weight).ok_or(SolSocialError::Overflow)?)
            .ok_or(SolSocialError::Overflow)?
            .checked_add(tips.checked_mul(tip_weight).ok_or(SolSocialError::Overflow)?)
            .ok_or(SolSocialError::Overflow)?;
        
        self.last_updated = timestamp;
        Ok(())
    }
}

#[error_code]
pub enum SolSocialError {
    #[msg("Content exceeds maximum length")]
    ContentTooLong,
    #[msg("Media hash exceeds maximum length")]
    MediaHashTooLong,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Invalid interaction type")]
    InvalidInteractionType,
    #[msg("Post not found")]
    PostNotFound,
    #[msg("Insufficient funds for premium content")]
    InsufficientFunds,
    #[msg("Premium content access required")]
    PremiumAccessRequired,
}
```