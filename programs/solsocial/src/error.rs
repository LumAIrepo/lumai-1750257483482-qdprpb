```rust
use anchor_lang::prelude::*;

#[error_code]
pub enum SolSocialError {
    #[msg("Unauthorized access to this profile")]
    UnauthorizedAccess,
    
    #[msg("Profile already exists for this user")]
    ProfileAlreadyExists,
    
    #[msg("Profile not found")]
    ProfileNotFound,
    
    #[msg("Post not found")]
    PostNotFound,
    
    #[msg("Comment not found")]
    CommentNotFound,
    
    #[msg("Invalid post content length")]
    InvalidPostContentLength,
    
    #[msg("Invalid comment content length")]
    InvalidCommentContentLength,
    
    #[msg("Invalid profile name length")]
    InvalidProfileNameLength,
    
    #[msg("Invalid profile bio length")]
    InvalidProfileBioLength,
    
    #[msg("Cannot follow yourself")]
    CannotFollowSelf,
    
    #[msg("Already following this user")]
    AlreadyFollowing,
    
    #[msg("Not following this user")]
    NotFollowing,
    
    #[msg("Cannot like your own post")]
    CannotLikeOwnPost,
    
    #[msg("Already liked this post")]
    AlreadyLiked,
    
    #[msg("Like not found")]
    LikeNotFound,
    
    #[msg("Insufficient token balance")]
    InsufficientTokenBalance,
    
    #[msg("Invalid tip amount")]
    InvalidTipAmount,
    
    #[msg("Cannot tip yourself")]
    CannotTipSelf,
    
    #[msg("Token price calculation failed")]
    TokenPriceCalculationFailed,
    
    #[msg("Invalid bonding curve parameters")]
    InvalidBondingCurveParameters,
    
    #[msg("Token supply overflow")]
    TokenSupplyOverflow,
    
    #[msg("Token supply underflow")]
    TokenSupplyUnderflow,
    
    #[msg("Slippage tolerance exceeded")]
    SlippageToleranceExceeded,
    
    #[msg("Minimum purchase amount not met")]
    MinimumPurchaseAmountNotMet,
    
    #[msg("Maximum purchase amount exceeded")]
    MaximumPurchaseAmountExceeded,
    
    #[msg("Trading is paused")]
    TradingPaused,
    
    #[msg("Invalid token metadata")]
    InvalidTokenMetadata,
    
    #[msg("Token creation failed")]
    TokenCreationFailed,
    
    #[msg("Invalid share amount")]
    InvalidShareAmount,
    
    #[msg("Share transaction failed")]
    ShareTransactionFailed,
    
    #[msg("Insufficient shares to sell")]
    InsufficientSharesToSell,
    
    #[msg("Creator cannot sell all shares")]
    CreatorCannotSellAllShares,
    
    #[msg("Invalid creator fee percentage")]
    InvalidCreatorFeePercentage,
    
    #[msg("Invalid protocol fee percentage")]
    InvalidProtocolFeePercentage,
    
    #[msg("Fee calculation overflow")]
    FeeCalculationOverflow,
    
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
    
    #[msg("Account data serialization failed")]
    AccountDataSerializationFailed,
    
    #[msg("Account data deserialization failed")]
    AccountDataDeserializationFailed,
    
    #[msg("Invalid account owner")]
    InvalidAccountOwner,
    
    #[msg("Account not initialized")]
    AccountNotInitialized,
    
    #[msg("Account already initialized")]
    AccountAlreadyInitialized,
    
    #[msg("Invalid program authority")]
    InvalidProgramAuthority,
    
    #[msg("Math overflow")]
    MathOverflow,
    
    #[msg("Math underflow")]
    MathUnderflow,
    
    #[msg("Division by zero")]
    DivisionByZero,
    
    #[msg("Invalid public key")]
    InvalidPublicKey,
    
    #[msg("Invalid signature")]
    InvalidSignature,
    
    #[msg("Rent exemption not met")]
    RentExemptionNotMet,
    
    #[msg("Invalid token program")]
    InvalidTokenProgram,
    
    #[msg("Invalid associated token program")]
    InvalidAssociatedTokenProgram,
    
    #[msg("Invalid system program")]
    InvalidSystemProgram,
    
    #[msg("Token account creation failed")]
    TokenAccountCreationFailed,
    
    #[msg("Token mint creation failed")]
    TokenMintCreationFailed,
    
    #[msg("Token transfer failed")]
    TokenTransferFailed,
    
    #[msg("SOL transfer failed")]
    SolTransferFailed,
    
    #[msg("Invalid token account owner")]
    InvalidTokenAccountOwner,
    
    #[msg("Token account not found")]
    TokenAccountNotFound,
    
    #[msg("Token mint not found")]
    TokenMintNotFound,
    
    #[msg("Invalid token mint authority")]
    InvalidTokenMintAuthority,
    
    #[msg("Token mint authority required")]
    TokenMintAuthorityRequired,
    
    #[msg("Invalid token freeze authority")]
    InvalidTokenFreezeAuthority,
    
    #[msg("Token account frozen")]
    TokenAccountFrozen,
    
    #[msg("Invalid token decimals")]
    InvalidTokenDecimals,
    
    #[msg("Token supply mismatch")]
    TokenSupplyMismatch,
    
    #[msg("Invalid vault authority")]
    InvalidVaultAuthority,
    
    #[msg("Vault not found")]
    VaultNotFound,
    
    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,
    
    #[msg("Invalid reward calculation")]
    InvalidRewardCalculation,
    
    #[msg("Reward distribution failed")]
    RewardDistributionFailed,
    
    #[msg("Invalid staking period")]
    InvalidStakingPeriod,
    
    #[msg("Staking not active")]
    StakingNotActive,
    
    #[msg("Unstaking too early")]
    UnstakingTooEarly,
    
    #[msg("Invalid governance proposal")]
    InvalidGovernanceProposal,
    
    #[msg("Voting period ended")]
    VotingPeriodEnded,
    
    #[msg("Already voted")]
    AlreadyVoted,
    
    #[msg("Insufficient voting power")]
    InsufficientVotingPower,
    
    #[msg("Proposal execution failed")]
    ProposalExecutionFailed,
    
    #[msg("Invalid oracle data")]
    InvalidOracleData,
    
    #[msg("Oracle data too old")]
    OracleDataTooOld,
    
    #[msg("Price feed not found")]
    PriceFeedNotFound,
    
    #[msg("Invalid price feed")]
    InvalidPriceFeed,
    
    #[msg("Price deviation too high")]
    PriceDeviationTooHigh,
    
    #[msg("Emergency pause activated")]
    EmergencyPauseActivated,
    
    #[msg("Feature not implemented")]
    FeatureNotImplemented,
    
    #[msg("Version mismatch")]
    VersionMismatch,
    
    #[msg("Upgrade required")]
    UpgradeRequired,
    
    #[msg("Maintenance mode active")]
    MaintenanceModeActive,
    
    #[msg("Rate limit exceeded")]
    RateLimitExceeded,
    
    #[msg("Spam detection triggered")]
    SpamDetectionTriggered,
    
    #[msg("Content moderation failed")]
    ContentModerationFailed,
    
    #[msg("Invalid content type")]
    InvalidContentType,
    
    #[msg("Content size limit exceeded")]
    ContentSizeLimitExceeded,
    
    #[msg("NSFW content not allowed")]
    NSFWContentNotAllowed,
    
    #[msg("Copyright violation detected")]
    CopyrightViolationDetected,
    
    #[msg("User banned")]
    UserBanned,
    
    #[msg("Account suspended")]
    AccountSuspended,
    
    #[msg("Verification required")]
    VerificationRequired,
    
    #[msg("Age restriction violation")]
    AgeRestrictionViolation,
    
    #[msg("Geographic restriction")]
    GeographicRestriction,
    
    #[msg("Terms of service violation")]
    TermsOfServiceViolation,
    
    #[msg("Privacy policy violation")]
    PrivacyPolicyViolation,
    
    #[msg("Community guidelines violation")]
    CommunityGuidelinesViolation,
    
    #[msg("Invalid referral code")]
    InvalidReferralCode,
    
    #[msg("Referral reward calculation failed")]
    ReferralRewardCalculationFailed,
    
    #[msg("Maximum referrals exceeded")]
    MaximumReferralsExceeded,
    
    #[msg("Self-referral not allowed")]
    SelfReferralNotAllowed,
    
    #[msg("Referral program not active")]
    ReferralProgramNotActive,
    
    #[msg("Invalid subscription tier")]
    InvalidSubscriptionTier,
    
    #[msg("Subscription expired")]
    SubscriptionExpired,
    
    #[msg("Subscription payment failed")]
    SubscriptionPaymentFailed,
    
    #[msg("Feature requires subscription")]
    FeatureRequiresSubscription,
    
    #[msg("Invalid notification settings")]
    InvalidNotificationSettings,
    
    #[msg("Notification delivery failed")]
    NotificationDeliveryFailed,
    
    #[msg("Push notification not supported")]
    PushNotificationNotSupported,
    
    #[msg("Email notification failed")]
    EmailNotificationFailed,
    
    #[msg("SMS notification failed")]
    SMSNotificationFailed,
    
    #[msg("Invalid webhook URL")]
    InvalidWebhookURL,
    
    #[msg("Webhook delivery failed")]
    WebhookDeliveryFailed,
    
    #[msg("API rate limit exceeded")]
    APIRateLimitExceeded,
    
    #[msg("Invalid API key")]
    InvalidAPIKey,
    
    #[msg("API key expired")]
    APIKeyExpired,
    
    #[msg("Insufficient API permissions")]
    InsufficientAPIPermissions,
    
    #[msg("External service unavailable")]
    ExternalServiceUnavailable,
    
    #[msg("Third party integration failed")]
    ThirdPartyIntegrationFailed,
    
    #[msg("Data synchronization failed")]
    DataSynchronizationFailed,
    
    #[msg("Backup creation failed")]
    BackupCreationFailed,
    
    #[msg("Data restoration failed")]
    DataRestorationFailed,
    
    #[msg("Invalid backup format")]
    InvalidBackupFormat,
    
    #[msg("Backup verification failed")]
    BackupVerificationFailed,
    
    #[msg("Storage quota exceeded")]
    StorageQuotaExceeded,
    
    #[msg("File upload failed")]
    FileUploadFailed,
    
    #[msg("File download failed")]
    FileDownloadFailed,
    
    #[msg("Invalid file format")]
    InvalidFileFormat,
    
    #[msg("File size limit exceeded")]
    FileSizeLimitExceeded,
    
    #[msg("File not found")]
    FileNotFound,
    
    #[msg("File access denied")]
    FileAccessDenied,
    
    #[msg("File corruption detected")]
    FileCorruptionDetected,
    
    #[msg("Encryption failed")]
    EncryptionFailed,
    
    #[msg("Decryption failed")]
    DecryptionFailed,
    
    #[msg("Invalid encryption key")]
    InvalidEncryptionKey,
    
    #[msg("Key derivation failed")]
    KeyDerivationFailed,
    
    #[msg("Hash verification failed")]
    HashVerificationFailed,
    
    #[msg("Digital signature verification failed")]
    DigitalSignatureVerificationFailed,
    
    #[msg("Certificate validation failed")]
    CertificateValidationFailed,
    
    #[msg("SSL/TLS handshake failed")]
    SSLTLSHandshakeFailed,
    
    #[msg("Network connection failed")]
    NetworkConnectionFailed,
    
    #[msg("Request timeout")]
    RequestTimeout,
    
    #[msg("Server error")]
    ServerError,
    
    #[msg("Database connection failed")]
    DatabaseConnectionFailed,
    
    #[msg("Database query failed")]
    DatabaseQueryFailed,
    
    #[msg("Database transaction failed")]
    DatabaseTransactionFailed,
    
    #[msg("Cache miss")]
    CacheMiss,
    
    #[msg("Cache invalidation failed")]
    CacheInvalidationFailed,
    
    #[msg("Session expired")]
    SessionExpired,
    
    #[msg("Invalid session token")]
    InvalidSessionToken,
    
    #[msg("Authentication failed")]
    AuthenticationFailed,
    
    #[msg("Authorization failed")]
    AuthorizationFailed,
    
    #[msg("Multi-factor authentication required")]
    MultiFactorAuthenticationRequired,
    
    #[msg("Invalid multi-factor authentication code")]
    InvalidMultiFactorAuthenticationCode,
    
    #[msg("Account lockout")]
    AccountLockout,
    
    #[msg("Password reset required")]
    PasswordResetRequired,
    
    #[msg("Invalid password")]
    InvalidPassword,
    
    #[msg("Password too weak")]
    PasswordTooWeak,
    
    #[msg("Password reuse not allowed")]
    PasswordReuseNotAllowed,
    
    #[msg("Username already taken")]
    UsernameAlreadyTaken,
    
    #[msg("Invalid username format")]
    InvalidUsernameFormat,
    
    #[msg("Email already registered")]
    EmailAlreadyRegistered,
    
    #[msg("Invalid email format")]
    InvalidEmailFormat,
    
    #[msg("Email verification required")]
    EmailVerificationRequired,
    
    #[msg("Phone number already registered")]
    PhoneNumberAlreadyRegistered,
    
    #[msg("Invalid phone number format")]
    InvalidPhoneNumberFormat,
    
    #[msg("Phone verification required")]
    PhoneVerificationRequired,
    
    #[msg("Identity verification failed")]
    IdentityVerificationFailed,
    
    #[msg("KYC verification required")]
    KYCVerificationRequired,
    
    #[msg("AML check failed")]
    AMLCheckFailed,
    
    #[msg("Sanctions list match")]
    SanctionsListMatch,
    
    #[msg("Jurisdiction not supported")]
    JurisdictionNotSupported,
    
    #[msg("Regulatory compliance violation")]
    RegulatoryComplianceViolation,
    
    #[msg("Tax reporting failed")]
    TaxReportingFailed,
    
    #[msg("Audit trail incomplete")]
    AuditTrailIncomplete,
    
    #[msg("Compliance monitoring failed")]
    ComplianceMonitoringFailed,
    
    #[msg("Risk assessment failed")]
    RiskAssessmentFailed,
    
    #[msg("Fraud detection triggered")]
    FraudDetectionTriggered,
    
    #[msg("Suspicious activity detected")]
    Suspicious