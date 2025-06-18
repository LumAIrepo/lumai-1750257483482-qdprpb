```typescript
import { PublicKey } from '@solana/web3.js';

// User and Profile Types
export interface User {
  id: string;
  publicKey: string;
  username: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
  followerCount: number;
  followingCount: number;
  postCount: number;
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenName?: string;
  tokenSupply?: number;
  tokenPrice?: number;
  marketCap?: number;
  holders?: number;
}

export interface UserProfile extends User {
  isFollowing: boolean;
  isFollowedBy: boolean;
  mutualFollowers: number;
  tokenBalance?: number;
  tokenValue?: number;
}

// Post and Content Types
export interface Post {
  id: string;
  authorId: string;
  author: User;
  content: string;
  images?: string[];
  videos?: string[];
  createdAt: Date;
  updatedAt: Date;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  tipCount: number;
  totalTipAmount: number;
  isLiked: boolean;
  isTipped: boolean;
  isBookmarked: boolean;
  visibility: 'public' | 'followers' | 'token-holders';
  tokenGated: boolean;
  minimumTokens?: number;
  hashtags: string[];
  mentions: string[];
  parentPostId?: string;
  isRepost: boolean;
  originalPost?: Post;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: User;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  likeCount: number;
  replyCount: number;
  isLiked: boolean;
  parentCommentId?: string;
  replies?: Comment[];
}

// Token and Trading Types
export interface UserToken {
  id: string;
  userId: string;
  user: User;
  tokenAddress: string;
  symbol: string;
  name: string;
  description?: string;
  image?: string;
  totalSupply: number;
  currentSupply: number;
  price: number;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  holders: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  bondingCurveProgress: number;
  graduatedToRaydium: boolean;
}

export interface TokenTransaction {
  id: string;
  signature: string;
  tokenAddress: string;
  token: UserToken;
  buyerId?: string;
  buyer?: User;
  sellerId?: string;
  seller?: User;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  totalValue: number;
  fees: number;
  timestamp: Date;
  blockNumber: number;
}

export interface TokenHolder {
  id: string;
  tokenAddress: string;
  token: UserToken;
  userId: string;
  user: User;
  balance: number;
  value: number;
  percentage: number;
  firstPurchaseAt: Date;
  lastTransactionAt: Date;
}

// Social Interaction Types
export interface Like {
  id: string;
  userId: string;
  user: User;
  postId?: string;
  post?: Post;
  commentId?: string;
  comment?: Comment;
  createdAt: Date;
}

export interface Follow {
  id: string;
  followerId: string;
  follower: User;
  followingId: string;
  following: User;
  createdAt: Date;
}

export interface Tip {
  id: string;
  signature: string;
  fromUserId: string;
  fromUser: User;
  toUserId: string;
  toUser: User;
  postId?: string;
  post?: Post;
  commentId?: string;
  comment?: Comment;
  amount: number;
  tokenAddress?: string;
  token?: UserToken;
  message?: string;
  createdAt: Date;
}

export interface Bookmark {
  id: string;
  userId: string;
  user: User;
  postId: string;
  post: Post;
  createdAt: Date;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  user: User;
  type: 'like' | 'comment' | 'follow' | 'tip' | 'mention' | 'token_buy' | 'token_sell' | 'token_milestone';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  actionUserId?: string;
  actionUser?: User;
  postId?: string;
  post?: Post;
  tokenAddress?: string;
  token?: UserToken;
}

// Chat and Messaging Types
export interface ChatRoom {
  id: string;
  name?: string;
  type: 'direct' | 'group' | 'token_holders';
  tokenAddress?: string;
  token?: UserToken;
  minimumTokens?: number;
  createdBy: string;
  creator: User;
  participants: ChatParticipant[];
  lastMessage?: ChatMessage;
  lastActivity: Date;
  createdAt: Date;
  isActive: boolean;
}

export interface ChatParticipant {
  id: string;
  roomId: string;
  room: ChatRoom;
  userId: string;
  user: User;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: Date;
  lastReadAt?: Date;
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  room: ChatRoom;
  senderId: string;
  sender: User;
  content: string;
  type: 'text' | 'image' | 'tip' | 'token_trade';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
  isDeleted: boolean;
  replyToId?: string;
  replyTo?: ChatMessage;
}

// Trading and Market Types
export interface TradingPair {
  tokenAddress: string;
  token: UserToken;
  baseToken: 'SOL' | 'USDC';
  price: number;
  volume24h: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  lastTradeAt: Date;
}

export interface OrderBook {
  tokenAddress: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  lastUpdated: Date;
}

export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  count: number;
}

export interface PriceChart {
  tokenAddress: string;
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
  data: PriceCandle[];
}

export interface PriceCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Form and Input Types
export interface CreatePostForm {
  content: string;
  images?: File[];
  videos?: File[];
  visibility: 'public' | 'followers' | 'token-holders';
  tokenGated: boolean;
  minimumTokens?: number;
}

export interface EditProfileForm {
  username: string;
  displayName: string;
  bio: string;
  avatar?: File;
  banner?: File;
}

export interface CreateTokenForm {
  name: string;
  symbol: string;
  description: string;
  image?: File;
  initialSupply: number;
}

export interface TradeTokenForm {
  tokenAddress: string;
  type: 'buy' | 'sell';
  amount: number;
  slippage: number;
}

export interface SendTipForm {
  recipientId: string;
  amount: number;
  tokenAddress?: string;
  message?: string;
  postId?: string;
  commentId?: string;
}

// Wallet and Connection Types
export interface WalletState {
  connected: boolean;
  connecting: boolean;
  publicKey: PublicKey | null;
  wallet: any;
  balance: number;
  tokens: TokenBalance[];
}

export interface TokenBalance {
  mint: string;
  amount: number;
  decimals: number;
  symbol?: string;
  name?: string;
  image?: string;
  value?: number;
}

// Search and Discovery Types
export interface SearchResult {
  users: User[];
  posts: Post[];
  tokens: UserToken[];
  hashtags: HashtagResult[];
}

export interface HashtagResult {
  tag: string;
  count: number;
  trending: boolean;
}

export interface TrendingTopic {
  hashtag: string;
  count: number;
  change24h: number;
  posts: Post[];
}

// Analytics and Stats Types
export interface UserStats {
  userId: string;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalTips: number;
  totalTipValue: number;
  followerGrowth: number[];
  engagementRate: number;
  topPosts: Post[];
  tokenPerformance?: TokenStats;
}

export interface TokenStats {
  tokenAddress: string;
  totalVolume: number;
  totalTrades: number;
  uniqueHolders: number;
  priceHistory: PriceCandle[];
  holderDistribution: HolderDistribution[];
  topHolders: TokenHolder[];
}

export interface HolderDistribution {
  range: string;
  count: number;
  percentage: number;
}

// Event and Activity Types
export interface ActivityFeed {
  id: string;
  userId: string;
  user: User;
  type: 'post' | 'like' | 'comment' | 'follow' | 'tip' | 'token_buy' | 'token_sell';
  title: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  postId?: string;
  post?: Post;
  tokenAddress?: string;
  token?: UserToken;
}

// Settings and Preferences Types
export interface UserSettings {
  userId: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  trading: TradingSettings;
  display: DisplaySettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  likes: boolean;
  comments: boolean;
  follows: boolean;
  tips: boolean;
  mentions: boolean;
  tokenTrades: boolean;
  priceAlerts: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'followers' | 'private';
  showTokenHoldings: boolean;
  showTradingActivity: boolean;
  allowDirectMessages: 'everyone' | 'followers' | 'none';
  showOnlineStatus: boolean;
}

export interface TradingSettings {
  defaultSlippage: number;
  autoApprove: boolean;
  showPriceImpact: boolean;
  confirmTransactions: boolean;
  maxGasPrice: number;
}

export interface DisplaySettings {
  theme: 'dark' | 'light' | 'auto';
  language: string;
  currency: 'USD' | 'SOL';
  dateFormat: string;
  timezone: string;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Utility Types
export type SortOrder = 'asc' | 'desc';
export type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
export type TokenSortBy = 'price' | 'volume' | 'market_cap' | 'holders' | 'created_at';
export type PostSortBy = 'created_at' | 'likes' | 'comments' | 'tips';
export type UserSortBy = 'created_at' | 'followers' | 'token_price' | 'market_cap';

export interface SortOptions {
  sortBy: string;
  sortOrder: SortOrder;
}

export interface FilterOptions {
  timeRange?: TimeRange;
  minPrice?: number;
  maxPrice?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
  verified?: boolean;
  hasToken?: boolean;
}
```