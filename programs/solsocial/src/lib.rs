```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

declare_id!("SoLSociaL1111111111111111111111111111111111");

#[program]
pub mod solsocial {
    use super::*;

    pub fn initialize_user(
        ctx: Context<InitializeUser>,
        username: String,
        bio: String,
    ) -> Result<()> {
        require!(username.len() <= 32, SolSocialError::UsernameTooLong);
        require!(bio.len() <= 280, SolSocialError::BioTooLong);

        let user_account = &mut ctx.accounts.user_account;
        user_account.authority = ctx.accounts.authority.key();
        user_account.username = username;
        user_account.bio = bio;
        user_account.followers_count = 0;
        user_account.following_count = 0;
        user_account.posts_count = 0;
        user_account.token_price = 1_000_000; // 0.001 SOL in lamports
        user_account.total_supply = 1_000_000;
        user_account.circulating_supply = 0;
        user_account.created_at = Clock::get()?.unix_timestamp;
        user_account.bump = ctx.bumps.user_account;

        Ok(())
    }

    pub fn create_post(
        ctx: Context<CreatePost>,
        content: String,
        media_url: Option<String>,
    ) -> Result<()> {
        require!(content.len() <= 500, SolSocialError::ContentTooLong);
        
        if let Some(ref url) = media_url {
            require!(url.len() <= 200, SolSocialError::MediaUrlTooLong);
        }

        let post_account = &mut ctx.accounts.post_account;
        let user_account = &mut ctx.accounts.user_account;

        post_account.authority = ctx.accounts.authority.key();
        post_account.user = user_account.key();
        post_account.content = content;
        post_account.media_url = media_url;
        post_account.likes_count = 0;
        post_account.comments_count = 0;
        post_account.tips_amount = 0;
        post_account.created_at = Clock::get()?.unix_timestamp;
        post_account.bump = ctx.bumps.post_account;

        user_account.posts_count = user_account.posts_count.checked_add(1).unwrap();

        Ok(())
    }

    pub fn like_post(ctx: Context<LikePost>) -> Result<()> {
        let like_account = &mut ctx.accounts.like_account;
        let post_account = &mut ctx.accounts.post_account;

        like_account.user = ctx.accounts.authority.key();
        like_account.post = post_account.key();
        like_account.created_at = Clock::get()?.unix_timestamp;
        like_account.bump = ctx.bumps.like_account;

        post_account.likes_count = post_account.likes_count.checked_add(1).unwrap();

        Ok(())
    }

    pub fn unlike_post(ctx: Context<UnlikePost>) -> Result<()> {
        let post_account = &mut ctx.accounts.post_account;
        post_account.likes_count = post_account.likes_count.checked_sub(1).unwrap();

        Ok(())
    }

    pub fn follow_user(ctx: Context<FollowUser>) -> Result<()> {
        let follow_account = &mut ctx.accounts.follow_account;
        let follower_account = &mut ctx.accounts.follower_account;
        let following_account = &mut ctx.accounts.following_account;

        follow_account.follower = follower_account.key();
        follow_account.following = following_account.key();
        follow_account.created_at = Clock::get()?.unix_timestamp;
        follow_account.bump = ctx.bumps.follow_account;

        follower_account.following_count = follower_account.following_count.checked_add(1).unwrap();
        following_account.followers_count = following_account.followers_count.checked_add(1).unwrap();

        Ok(())
    }

    pub fn unfollow_user(ctx: Context<UnfollowUser>) -> Result<()> {
        let follower_account = &mut ctx.accounts.follower_account;
        let following_account = &mut ctx.accounts.following_account;

        follower_account.following_count = follower_account.following_count.checked_sub(1).unwrap();
        following_account.followers_count = following_account.followers_count.checked_sub(1).unwrap();

        Ok(())
    }

    pub fn buy_user_tokens(
        ctx: Context<BuyUserTokens>,
        amount: u64,
    ) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        let buyer_token_account = &mut ctx.accounts.buyer_token_account;
        
        // Calculate price based on bonding curve
        let price = calculate_buy_price(user_account.circulating_supply, amount);
        
        // Transfer SOL from buyer to user
        let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.user_authority.key(),
            price,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.user_authority.to_account_info(),
            ],
        )?;

        // Update token account
        buyer_token_account.user = user_account.key();
        buyer_token_account.owner = ctx.accounts.buyer.key();
        buyer_token_account.amount = buyer_token_account.amount.checked_add(amount).unwrap();
        buyer_token_account.bump = ctx.bumps.buyer_token_account;

        // Update user account
        user_account.circulating_supply = user_account.circulating_supply.checked_add(amount).unwrap();
        user_account.token_price = calculate_current_price(user_account.circulating_supply);

        Ok(())
    }

    pub fn sell_user_tokens(
        ctx: Context<SellUserTokens>,
        amount: u64,
    ) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        let seller_token_account = &mut ctx.accounts.seller_token_account;
        
        require!(
            seller_token_account.amount >= amount,
            SolSocialError::InsufficientTokens
        );

        // Calculate sell price based on bonding curve
        let price = calculate_sell_price(user_account.circulating_supply, amount);
        
        // Transfer SOL from user to seller
        **ctx.accounts.user_authority.to_account_info().try_borrow_mut_lamports()? -= price;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += price;

        // Update token account
        seller_token_account.amount = seller_token_account.amount.checked_sub(amount).unwrap();

        // Update user account
        user_account.circulating_supply = user_account.circulating_supply.checked_sub(amount).unwrap();
        user_account.token_price = calculate_current_price(user_account.circulating_supply);

        Ok(())
    }

    pub fn tip_post(
        ctx: Context<TipPost>,
        amount: u64,
    ) -> Result<()> {
        let post_account = &mut ctx.accounts.post_account;
        
        // Transfer SOL from tipper to post author
        let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.tipper.key(),
            &ctx.accounts.post_author.key(),
            amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.tipper.to_account_info(),
                ctx.accounts.post_author.to_account_info(),
            ],
        )?;

        post_account.tips_amount = post_account.tips_amount.checked_add(amount).unwrap();

        Ok(())
    }

    pub fn create_comment(
        ctx: Context<CreateComment>,
        content: String,
    ) -> Result<()> {
        require!(content.len() <= 280, SolSocialError::ContentTooLong);

        let comment_account = &mut ctx.accounts.comment_account;
        let post_account = &mut ctx.accounts.post_account;

        comment_account.authority = ctx.accounts.authority.key();
        comment_account.post = post_account.key();
        comment_account.content = content;
        comment_account.likes_count = 0;
        comment_account.created_at = Clock::get()?.unix_timestamp;
        comment_account.bump = ctx.bumps.comment_account;

        post_account.comments_count = post_account.comments_count.checked_add(1).unwrap();

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(username: String)]
pub struct InitializeUser<'info> {
    #[account(
        init,
        payer = authority,
        space = UserAccount::LEN,
        seeds = [b"user", authority.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreatePost<'info> {
    #[account(
        init,
        payer = authority,
        space = PostAccount::LEN,
        seeds = [b"post", authority.key().as_ref(), &user_account.posts_count.to_le_bytes()],
        bump
    )]
    pub post_account: Account<'info, PostAccount>,
    #[account(
        mut,
        seeds = [b"user", authority.key().as_ref()],
        bump = user_account.bump
    )]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LikePost<'info> {
    #[account(
        init,
        payer = authority,
        space = LikeAccount::LEN,
        seeds = [b"like", authority.key().as_ref(), post_account.key().as_ref()],
        bump
    )]
    pub like_account: Account<'info, LikeAccount>,
    #[account(mut)]
    pub post_account: Account<'info, PostAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnlikePost<'info> {
    #[account(
        mut,
        close = authority,
        seeds = [b"like", authority.key().as_ref(), post_account.key().as_ref()],
        bump = like_account.bump
    )]
    pub like_account: Account<'info, LikeAccount>,
    #[account(mut)]
    pub post_account: Account<'info, PostAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct FollowUser<'info> {
    #[account(
        init,
        payer = follower,
        space = FollowAccount::LEN,
        seeds = [b"follow", follower.key().as_ref(), following_account.key().as_ref()],
        bump
    )]
    pub follow_account: Account<'info, FollowAccount>,
    #[account(
        mut,
        seeds = [b"user", follower.key().as_ref()],
        bump = follower_account.bump
    )]
    pub follower_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub following_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub follower: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnfollowUser<'info> {
    #[account(
        mut,
        close = follower,
        seeds = [b"follow", follower.key().as_ref(), following_account.key().as_ref()],
        bump = follow_account.bump
    )]
    pub follow_account: Account<'info, FollowAccount>,
    #[account(
        mut,
        seeds = [b"user", follower.key().as_ref()],
        bump = follower_account.bump
    )]
    pub follower_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub following_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub follower: Signer<'info>,
}

#[derive(Accounts)]
pub struct BuyUserTokens<'info> {
    #[account(mut)]
    pub user_account: Account<'info, UserAccount>,
    #[account(
        init_if_needed,
        payer = buyer,
        space = UserTokenAccount::LEN,
        seeds = [b"user_tokens", buyer.key().as_ref(), user_account.key().as_ref()],
        bump
    )]
    pub buyer_token_account: Account<'info, UserTokenAccount>,
    /// CHECK: User authority for receiving SOL
    #[account(mut)]
    pub user_authority: AccountInfo<'info>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellUserTokens<'info> {
    #[account(mut)]
    pub user_account: Account<'info, UserAccount>,
    #[account(
        mut,
        seeds = [b"user_tokens", seller.key().as_ref(), user_account.key().as_ref()],
        bump = seller_token_account.bump
    )]
    pub seller_token_account: Account<'info, UserTokenAccount>,
    /// CHECK: User authority for sending SOL
    #[account(mut)]
    pub user_authority: AccountInfo<'info>,
    #[account(mut)]
    pub seller: Signer<'info>,
}

#[derive(Accounts)]
pub struct TipPost<'info> {
    #[account(mut)]
    pub post_account: Account<'info, PostAccount>,
    /// CHECK: Post author for receiving tip
    #[account(mut)]
    pub post_author: AccountInfo<'info>,
    #[account(mut)]
    pub tipper: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateComment<'info> {
    #[account(
        init,
        payer = authority,
        space = CommentAccount::LEN,
        seeds = [b"comment", authority.key().as_ref(), post_account.key().as_ref(), &post_account.comments_count.to_le