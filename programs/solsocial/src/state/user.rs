```rust
use anchor_lang::prelude::*;

#[account]
pub struct User {
    pub authority: Pubkey,
    pub username: String,
    pub display_name: String,
    pub bio: String,
    pub profile_image_url: String,
    pub banner_image_url: String,
    pub token_mint: Pubkey,
    pub token_supply: u64,
    pub token_price: u64,
    pub followers_count: u64,
    pub following_count: u64,
    pub posts_count: u64,
    pub total_earned: u64,
    pub total_spent: u64,
    pub reputation_score: u64,
    pub is_verified: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl User {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        4 + 32 + // username (max 32 chars)
        4 + 64 + // display_name (max 64 chars)
        4 + 256 + // bio (max 256 chars)
        4 + 128 + // profile_image_url (max 128 chars)
        4 + 128 + // banner_image_url (max 128 chars)
        32 + // token_mint
        8 + // token_supply
        8 + // token_price
        8 + // followers_count
        8 + // following_count
        8 + // posts_count
        8 + // total_earned
        8 + // total_spent
        8 + // reputation_score
        1 + // is_verified
        8 + // created_at
        8 + // updated_at
        1; // bump

    pub fn initialize(
        &mut self,
        authority: Pubkey,
        username: String,
        display_name: String,
        bio: String,
        profile_image_url: String,
        banner_image_url: String,
        token_mint: Pubkey,
        bump: u8,
    ) -> Result<()> {
        require!(username.len() <= 32, ErrorCode::UsernameTooLong);
        require!(display_name.len() <= 64, ErrorCode::DisplayNameTooLong);
        require!(bio.len() <= 256, ErrorCode::BioTooLong);
        require!(profile_image_url.len() <= 128, ErrorCode::ProfileImageUrlTooLong);
        require!(banner_image_url.len() <= 128, ErrorCode::BannerImageUrlTooLong);

        self.authority = authority;
        self.username = username;
        self.display_name = display_name;
        self.bio = bio;
        self.profile_image_url = profile_image_url;
        self.banner_image_url = banner_image_url;
        self.token_mint = token_mint;
        self.token_supply = 1_000_000; // Initial supply
        self.token_price = 1_000_000; // Initial price in lamports (0.001 SOL)
        self.followers_count = 0;
        self.following_count = 0;
        self.posts_count = 0;
        self.total_earned = 0;
        self.total_spent = 0;
        self.reputation_score = 100; // Starting reputation
        self.is_verified = false;
        self.created_at = Clock::get()?.unix_timestamp;
        self.updated_at = Clock::get()?.unix_timestamp;
        self.bump = bump;

        Ok(())
    }

    pub fn update_profile(
        &mut self,
        display_name: Option<String>,
        bio: Option<String>,
        profile_image_url: Option<String>,
        banner_image_url: Option<String>,
    ) -> Result<()> {
        if let Some(name) = display_name {
            require!(name.len() <= 64, ErrorCode::DisplayNameTooLong);
            self.display_name = name;
        }

        if let Some(bio_text) = bio {
            require!(bio_text.len() <= 256, ErrorCode::BioTooLong);
            self.bio = bio_text;
        }

        if let Some(profile_url) = profile_image_url {
            require!(profile_url.len() <= 128, ErrorCode::ProfileImageUrlTooLong);
            self.profile_image_url = profile_url;
        }

        if let Some(banner_url) = banner_image_url {
            require!(banner_url.len() <= 128, ErrorCode::BannerImageUrlTooLong);
            self.banner_image_url = banner_url;
        }

        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn increment_followers(&mut self) -> Result<()> {
        self.followers_count = self.followers_count.checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn decrement_followers(&mut self) -> Result<()> {
        self.followers_count = self.followers_count.checked_sub(1)
            .ok_or(ErrorCode::ArithmeticUnderflow)?;
        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn increment_following(&mut self) -> Result<()> {
        self.following_count = self.following_count.checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn decrement_following(&mut self) -> Result<()> {
        self.following_count = self.following_count.checked_sub(1)
            .ok_or(ErrorCode::ArithmeticUnderflow)?;
        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn increment_posts(&mut self) -> Result<()> {
        self.posts_count = self.posts_count.checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn update_token_price(&mut self, new_price: u64) -> Result<()> {
        self.token_price = new_price;
        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn add_earnings(&mut self, amount: u64) -> Result<()> {
        self.total_earned = self.total_earned.checked_add(amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn add_spending(&mut self, amount: u64) -> Result<()> {
        self.total_spent = self.total_spent.checked_add(amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn update_reputation(&mut self, score_change: i64) -> Result<()> {
        if score_change >= 0 {
            self.reputation_score = self.reputation_score.checked_add(score_change as u64)
                .ok_or(ErrorCode::ArithmeticOverflow)?;
        } else {
            let decrease = (-score_change) as u64;
            self.reputation_score = self.reputation_score.checked_sub(decrease)
                .ok_or(ErrorCode::ArithmeticUnderflow)?;
        }
        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn set_verified(&mut self, verified: bool) -> Result<()> {
        self.is_verified = verified;
        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn calculate_token_market_cap(&self) -> u64 {
        self.token_supply.saturating_mul(self.token_price)
    }

    pub fn get_engagement_rate(&self) -> f64 {
        if self.followers_count == 0 {
            return 0.0;
        }
        (self.posts_count as f64) / (self.followers_count as f64)
    }
}

#[account]
pub struct UserStats {
    pub user: Pubkey,
    pub daily_active_days: u64,
    pub weekly_posts: u64,
    pub monthly_earnings: u64,
    pub total_tips_received: u64,
    pub total_tips_sent: u64,
    pub total_token_trades: u64,
    pub last_active: i64,
    pub streak_days: u64,
    pub bump: u8,
}

impl UserStats {
    pub const LEN: usize = 8 + // discriminator
        32 + // user
        8 + // daily_active_days
        8 + // weekly_posts
        8 + // monthly_earnings
        8 + // total_tips_received
        8 + // total_tips_sent
        8 + // total_token_trades
        8 + // last_active
        8 + // streak_days
        1; // bump

    pub fn initialize(&mut self, user: Pubkey, bump: u8) -> Result<()> {
        self.user = user;
        self.daily_active_days = 0;
        self.weekly_posts = 0;
        self.monthly_earnings = 0;
        self.total_tips_received = 0;
        self.total_tips_sent = 0;
        self.total_token_trades = 0;
        self.last_active = Clock::get()?.unix_timestamp;
        self.streak_days = 1;
        self.bump = bump;
        Ok(())
    }

    pub fn update_activity(&mut self) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp;
        let one_day = 86400; // seconds in a day

        if current_time - self.last_active >= one_day {
            self.daily_active_days = self.daily_active_days.checked_add(1)
                .ok_or(ErrorCode::ArithmeticOverflow)?;
            
            if current_time - self.last_active <= one_day * 2 {
                self.streak_days = self.streak_days.checked_add(1)
                    .ok_or(ErrorCode::ArithmeticOverflow)?;
            } else {
                self.streak_days = 1;
            }
        }

        self.last_active = current_time;
        Ok(())
    }

    pub fn add_tip_received(&mut self, amount: u64) -> Result<()> {
        self.total_tips_received = self.total_tips_received.checked_add(amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        Ok(())
    }

    pub fn add_tip_sent(&mut self, amount: u64) -> Result<()> {
        self.total_tips_sent = self.total_tips_sent.checked_add(amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        Ok(())
    }

    pub fn increment_token_trades(&mut self) -> Result<()> {
        self.total_token_trades = self.total_token_trades.checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        Ok(())
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Username is too long")]
    UsernameTooLong,
    #[msg("Display name is too long")]
    DisplayNameTooLong,
    #[msg("Bio is too long")]
    BioTooLong,
    #[msg("Profile image URL is too long")]
    ProfileImageUrlTooLong,
    #[msg("Banner image URL is too long")]
    BannerImageUrlTooLong,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Arithmetic underflow")]
    ArithmeticUnderflow,
}
```