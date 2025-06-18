```typescript
import { Program, AnchorProvider, web3, BN, IdlAccounts } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { WalletContextState } from '@solana/wallet-adapter-react';

// Program ID for SolSocial (replace with actual deployed program ID)
export const PROGRAM_ID = new PublicKey('SoLSociaL1111111111111111111111111111111111');

// IDL type definitions
export interface SolSocialIDL {
  version: string;
  name: string;
  instructions: any[];
  accounts: any[];
  types: any[];
}

// Account types
export type UserProfile = IdlAccounts<SolSocialIDL>['userProfile'];
export type SocialToken = IdlAccounts<SolSocialIDL>['socialToken'];
export type Post = IdlAccounts<SolSocialIDL>['post'];
export type Interaction = IdlAccounts<SolSocialIDL>['interaction'];

// Program client class
export class SolSocialProgram {
  private program: Program<SolSocialIDL>;
  private provider: AnchorProvider;

  constructor(connection: Connection, wallet: WalletContextState) {
    this.provider = new AnchorProvider(
      connection,
      wallet as any,
      { commitment: 'confirmed' }
    );
    
    // Initialize program with IDL (would be imported from generated types)
    this.program = new Program(
      {} as SolSocialIDL, // IDL would be imported here
      PROGRAM_ID,
      this.provider
    );
  }

  // Get user profile PDA
  getUserProfilePDA(userPubkey: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('user_profile'), userPubkey.toBuffer()],
      PROGRAM_ID
    );
  }

  // Get social token PDA
  getSocialTokenPDA(userPubkey: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('social_token'), userPubkey.toBuffer()],
      PROGRAM_ID
    );
  }

  // Get post PDA
  getPostPDA(userPubkey: PublicKey, postId: BN): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('post'), userPubkey.toBuffer(), postId.toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID
    );
  }

  // Get interaction PDA
  getInteractionPDA(userPubkey: PublicKey, targetPubkey: PublicKey, interactionType: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('interaction'),
        userPubkey.toBuffer(),
        targetPubkey.toBuffer(),
        Buffer.from(interactionType)
      ],
      PROGRAM_ID
    );
  }

  // Initialize user profile
  async initializeUserProfile(
    username: string,
    bio: string,
    avatarUrl: string
  ): Promise<string> {
    const userPubkey = this.provider.wallet.publicKey!;
    const [userProfilePDA] = this.getUserProfilePDA(userPubkey);
    const [socialTokenPDA] = this.getSocialTokenPDA(userPubkey);

    const tokenMint = web3.Keypair.generate();
    const associatedTokenAccount = await getAssociatedTokenAddress(
      tokenMint.publicKey,
      userPubkey
    );

    const tx = await this.program.methods
      .initializeUserProfile(username, bio, avatarUrl)
      .accounts({
        userProfile: userProfilePDA,
        socialToken: socialTokenPDA,
        tokenMint: tokenMint.publicKey,
        associatedTokenAccount,
        user: userPubkey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([tokenMint])
      .rpc();

    return tx;
  }

  // Create post
  async createPost(
    content: string,
    mediaUrl?: string,
    tags?: string[]
  ): Promise<string> {
    const userPubkey = this.provider.wallet.publicKey!;
    const [userProfilePDA] = this.getUserProfilePDA(userPubkey);
    
    // Get next post ID from user profile
    const userProfile = await this.getUserProfile(userPubkey);
    const postId = new BN(userProfile?.postCount || 0);
    
    const [postPDA] = this.getPostPDA(userPubkey, postId);

    const tx = await this.program.methods
      .createPost(content, mediaUrl || '', tags || [])
      .accounts({
        post: postPDA,
        userProfile: userProfilePDA,
        user: userPubkey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  // Buy social tokens
  async buySocialTokens(
    targetUser: PublicKey,
    amount: BN,
    maxPrice: BN
  ): Promise<string> {
    const userPubkey = this.provider.wallet.publicKey!;
    const [targetUserProfilePDA] = this.getUserProfilePDA(targetUser);
    const [socialTokenPDA] = this.getSocialTokenPDA(targetUser);
    
    const buyerTokenAccount = await getAssociatedTokenAddress(
      socialTokenPDA,
      userPubkey
    );

    const tx = await this.program.methods
      .buySocialTokens(amount, maxPrice)
      .accounts({
        socialToken: socialTokenPDA,
        targetUserProfile: targetUserProfilePDA,
        buyerTokenAccount,
        buyer: userPubkey,
        targetUser,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  // Sell social tokens
  async sellSocialTokens(
    targetUser: PublicKey,
    amount: BN,
    minPrice: BN
  ): Promise<string> {
    const userPubkey = this.provider.wallet.publicKey!;
    const [targetUserProfilePDA] = this.getUserProfilePDA(targetUser);
    const [socialTokenPDA] = this.getSocialTokenPDA(targetUser);
    
    const sellerTokenAccount = await getAssociatedTokenAddress(
      socialTokenPDA,
      userPubkey
    );

    const tx = await this.program.methods
      .sellSocialTokens(amount, minPrice)
      .accounts({
        socialToken: socialTokenPDA,
        targetUserProfile: targetUserProfilePDA,
        sellerTokenAccount,
        seller: userPubkey,
        targetUser,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  // Like post
  async likePost(
    postOwner: PublicKey,
    postId: BN
  ): Promise<string> {
    const userPubkey = this.provider.wallet.publicKey!;
    const [postPDA] = this.getPostPDA(postOwner, postId);
    const [interactionPDA] = this.getInteractionPDA(userPubkey, postPDA, 'like');

    const tx = await this.program.methods
      .likePost()
      .accounts({
        post: postPDA,
        interaction: interactionPDA,
        user: userPubkey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  // Tip user
  async tipUser(
    targetUser: PublicKey,
    amount: BN
  ): Promise<string> {
    const userPubkey = this.provider.wallet.publicKey!;
    const [targetUserProfilePDA] = this.getUserProfilePDA(targetUser);
    const [socialTokenPDA] = this.getSocialTokenPDA(targetUser);
    
    const tipperTokenAccount = await getAssociatedTokenAddress(
      socialTokenPDA,
      userPubkey
    );
    
    const recipientTokenAccount = await getAssociatedTokenAddress(
      socialTokenPDA,
      targetUser
    );

    const tx = await this.program.methods
      .tipUser(amount)
      .accounts({
        socialToken: socialTokenPDA,
        targetUserProfile: targetUserProfilePDA,
        tipperTokenAccount,
        recipientTokenAccount,
        tipper: userPubkey,
        recipient: targetUser,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  // Follow user
  async followUser(targetUser: PublicKey): Promise<string> {
    const userPubkey = this.provider.wallet.publicKey!;
    const [userProfilePDA] = this.getUserProfilePDA(userPubkey);
    const [targetUserProfilePDA] = this.getUserProfilePDA(targetUser);
    const [interactionPDA] = this.getInteractionPDA(userPubkey, targetUser, 'follow');

    const tx = await this.program.methods
      .followUser()
      .accounts({
        userProfile: userProfilePDA,
        targetUserProfile: targetUserProfilePDA,
        interaction: interactionPDA,
        user: userPubkey,
        targetUser,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  // Get user profile
  async getUserProfile(userPubkey: PublicKey): Promise<UserProfile | null> {
    try {
      const [userProfilePDA] = this.getUserProfilePDA(userPubkey);
      const userProfile = await this.program.account.userProfile.fetch(userProfilePDA);
      return userProfile as UserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  // Get social token info
  async getSocialToken(userPubkey: PublicKey): Promise<SocialToken | null> {
    try {
      const [socialTokenPDA] = this.getSocialTokenPDA(userPubkey);
      const socialToken = await this.program.account.socialToken.fetch(socialTokenPDA);
      return socialToken as SocialToken;
    } catch (error) {
      console.error('Error fetching social token:', error);
      return null;
    }
  }

  // Get post
  async getPost(userPubkey: PublicKey, postId: BN): Promise<Post | null> {
    try {
      const [postPDA] = this.getPostPDA(userPubkey, postId);
      const post = await this.program.account.post.fetch(postPDA);
      return post as Post;
    } catch (error) {
      console.error('Error fetching post:', error);
      return null;
    }
  }

  // Get all posts by user
  async getUserPosts(userPubkey: PublicKey): Promise<Post[]> {
    try {
      const posts = await this.program.account.post.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator
            bytes: userPubkey.toBase58(),
          },
        },
      ]);
      return posts.map(post => post.account as Post);
    } catch (error) {
      console.error('Error fetching user posts:', error);
      return [];
    }
  }

  // Get token price
  async getTokenPrice(userPubkey: PublicKey): Promise<number> {
    try {
      const socialToken = await this.getSocialToken(userPubkey);
      if (!socialToken) return 0;
      
      // Calculate price based on bonding curve
      const supply = socialToken.supply?.toNumber() || 0;
      const basePrice = 0.001; // Base price in SOL
      const priceMultiplier = Math.pow(1.1, supply / 1000); // Exponential curve
      
      return basePrice * priceMultiplier;
    } catch (error) {
      console.error('Error calculating token price:', error);
      return 0;
    }
  }

  // Get user token balance
  async getUserTokenBalance(userPubkey: PublicKey, tokenOwner: PublicKey): Promise<number> {
    try {
      const [socialTokenPDA] = this.getSocialTokenPDA(tokenOwner);
      const tokenAccount = await getAssociatedTokenAddress(socialTokenPDA, userPubkey);
      
      const balance = await this.provider.connection.getTokenAccountBalance(tokenAccount);
      return balance.value.uiAmount || 0;
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return 0;
    }
  }

  // Get trending users
  async getTrendingUsers(): Promise<UserProfile[]> {
    try {
      const profiles = await this.program.account.userProfile.all();
      
      // Sort by token holder count and recent activity
      return profiles
        .map(profile => profile.account as UserProfile)
        .sort((a, b) => {
          const aScore = (a.tokenHolders?.toNumber() || 0) + (a.totalInteractions?.toNumber() || 0);
          const bScore = (b.tokenHolders?.toNumber() || 0) + (b.totalInteractions?.toNumber() || 0);
          return bScore - aScore;
        })
        .slice(0, 10);
    } catch (error) {
      console.error('Error fetching trending users:', error);
      return [];
    }
  }

  // Get recent posts
  async getRecentPosts(limit: number = 20): Promise<Post[]> {
    try {
      const posts = await this.program.account.post.all();
      
      return posts
        .map(post => post.account as Post)
        .sort((a, b) => (b.timestamp?.toNumber() || 0) - (a.timestamp?.toNumber() || 0))
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching recent posts:', error);
      return [];
    }
  }
}

// Utility functions
export const formatTokenAmount = (amount: number): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toString();
};

export const formatPrice = (price: number): string => {
  return `${price.toFixed(6)} SOL`;
};

export const calculatePriceChange = (currentPrice: number, previousPrice: number): number => {
  if (previousPrice === 0) return 0;
  return ((currentPrice - previousPrice) / previousPrice) * 100;
};

export const getPriceChangeColor = (change: number