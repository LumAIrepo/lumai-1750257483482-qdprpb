```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solsocial } from "../target/types/solsocial";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo, getAccount } from "@solana/spl-token";
import { expect } from "chai";

describe("solsocial", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Solsocial as Program<Solsocial>;
  
  let userKeypair: Keypair;
  let creatorKeypair: Keypair;
  let followerKeypair: Keypair;
  let mint: PublicKey;
  let userTokenAccount: PublicKey;
  let creatorTokenAccount: PublicKey;
  let followerTokenAccount: PublicKey;
  
  let userProfile: PublicKey;
  let creatorProfile: PublicKey;
  let followerProfile: PublicKey;
  let socialToken: PublicKey;
  let post: PublicKey;
  let interaction: PublicKey;

  before(async () => {
    userKeypair = Keypair.generate();
    creatorKeypair = Keypair.generate();
    followerKeypair = Keypair.generate();

    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(userKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(creatorKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(followerKeypair.publicKey, 2 * LAMPORTS_PER_SOL);

    // Wait for airdrops to confirm
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create mint for social tokens
    mint = await createMint(
      provider.connection,
      userKeypair,
      userKeypair.publicKey,
      null,
      9
    );

    // Create token accounts
    userTokenAccount = await createAccount(
      provider.connection,
      userKeypair,
      mint,
      userKeypair.publicKey
    );

    creatorTokenAccount = await createAccount(
      provider.connection,
      creatorKeypair,
      mint,
      creatorKeypair.publicKey
    );

    followerTokenAccount = await createAccount(
      provider.connection,
      followerKeypair,
      mint,
      followerKeypair.publicKey
    );

    // Mint initial tokens
    await mintTo(
      provider.connection,
      userKeypair,
      mint,
      userTokenAccount,
      userKeypair,
      1000 * 10**9
    );

    await mintTo(
      provider.connection,
      userKeypair,
      mint,
      followerTokenAccount,
      userKeypair,
      500 * 10**9
    );

    // Derive PDAs
    [userProfile] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), userKeypair.publicKey.toBuffer()],
      program.programId
    );

    [creatorProfile] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), creatorKeypair.publicKey.toBuffer()],
      program.programId
    );

    [followerProfile] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), followerKeypair.publicKey.toBuffer()],
      program.programId
    );

    [socialToken] = PublicKey.findProgramAddressSync(
      [Buffer.from("social_token"), creatorKeypair.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Creates a user profile", async () => {
    const username = "testuser";
    const bio = "Test user bio";
    const avatarUrl = "https://example.com/avatar.jpg";

    await program.methods
      .createProfile(username, bio, avatarUrl)
      .accounts({
        profile: userProfile,
        user: userKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([userKeypair])
      .rpc();

    const profileAccount = await program.account.userProfile.fetch(userProfile);
    expect(profileAccount.user.toString()).to.equal(userKeypair.publicKey.toString());
    expect(profileAccount.username).to.equal(username);
    expect(profileAccount.bio).to.equal(bio);
    expect(profileAccount.avatarUrl).to.equal(avatarUrl);
    expect(profileAccount.followersCount.toNumber()).to.equal(0);
    expect(profileAccount.followingCount.toNumber()).to.equal(0);
    expect(profileAccount.postsCount.toNumber()).to.equal(0);
  });

  it("Creates a creator profile", async () => {
    const username = "creator";
    const bio = "Content creator";
    const avatarUrl = "https://example.com/creator.jpg";

    await program.methods
      .createProfile(username, bio, avatarUrl)
      .accounts({
        profile: creatorProfile,
        user: creatorKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([creatorKeypair])
      .rpc();

    const profileAccount = await program.account.userProfile.fetch(creatorProfile);
    expect(profileAccount.user.toString()).to.equal(creatorKeypair.publicKey.toString());
    expect(profileAccount.username).to.equal(username);
  });

  it("Creates a social token for creator", async () => {
    const tokenName = "CreatorToken";
    const tokenSymbol = "CT";
    const initialPrice = new anchor.BN(1000000); // 0.001 SOL
    const maxSupply = new anchor.BN(1000000 * 10**9);

    await program.methods
      .createSocialToken(tokenName, tokenSymbol, initialPrice, maxSupply)
      .accounts({
        socialToken: socialToken,
        creator: creatorKeypair.publicKey,
        creatorProfile: creatorProfile,
        mint: mint,
        systemProgram: SystemProgram.programId,
      })
      .signers([creatorKeypair])
      .rpc();

    const socialTokenAccount = await program.account.socialToken.fetch(socialToken);
    expect(socialTokenAccount.creator.toString()).to.equal(creatorKeypair.publicKey.toString());
    expect(socialTokenAccount.name).to.equal(tokenName);
    expect(socialTokenAccount.symbol).to.equal(tokenSymbol);
    expect(socialTokenAccount.currentPrice.toString()).to.equal(initialPrice.toString());
    expect(socialTokenAccount.totalSupply.toNumber()).to.equal(0);
    expect(socialTokenAccount.maxSupply.toString()).to.equal(maxSupply.toString());
  });

  it("Buys social tokens", async () => {
    const amount = new anchor.BN(10 * 10**9); // 10 tokens
    const maxPrice = new anchor.BN(2000000); // 0.002 SOL max

    const initialBalance = await getAccount(provider.connection, followerTokenAccount);
    
    await program.methods
      .buySocialTokens(amount, maxPrice)
      .accounts({
        socialToken: socialToken,
        buyer: followerKeypair.publicKey,
        buyerProfile: followerProfile,
        buyerTokenAccount: followerTokenAccount,
        creatorTokenAccount: creatorTokenAccount,
        mint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([followerKeypair])
      .rpc();

    const socialTokenAccount = await program.account.socialToken.fetch(socialToken);
    expect(socialTokenAccount.totalSupply.toNumber()).to.be.greaterThan(0);
    expect(socialTokenAccount.currentPrice.toNumber()).to.be.greaterThan(1000000);

    const finalBalance = await getAccount(provider.connection, followerTokenAccount);
    expect(Number(finalBalance.amount)).to.be.lessThan(Number(initialBalance.amount));
  });

  it("Creates a follower profile and follows creator", async () => {
    const username = "follower";
    const bio = "Social media follower";
    const avatarUrl = "https://example.com/follower.jpg";

    await program.methods
      .createProfile(username, bio, avatarUrl)
      .accounts({
        profile: followerProfile,
        user: followerKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([followerKeypair])
      .rpc();

    await program.methods
      .followUser()
      .accounts({
        followerProfile: followerProfile,
        targetProfile: creatorProfile,
        follower: followerKeypair.publicKey,
      })
      .signers([followerKeypair])
      .rpc();

    const followerProfileAccount = await program.account.userProfile.fetch(followerProfile);
    const creatorProfileAccount = await program.account.userProfile.fetch(creatorProfile);
    
    expect(followerProfileAccount.followingCount.toNumber()).to.equal(1);
    expect(creatorProfileAccount.followersCount.toNumber()).to.equal(1);
  });

  it("Creates a post", async () => {
    const content = "This is my first post on SolSocial!";
    const mediaUrl = "https://example.com/post-image.jpg";
    const isTokenGated = true;
    const requiredTokenAmount = new anchor.BN(5 * 10**9);

    [post] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("post"),
        creatorKeypair.publicKey.toBuffer(),
        new anchor.BN(0).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    await program.methods
      .createPost(content, mediaUrl, isTokenGated, requiredTokenAmount)
      .accounts({
        post: post,
        author: creatorKeypair.publicKey,
        authorProfile: creatorProfile,
        socialToken: socialToken,
        systemProgram: SystemProgram.programId,
      })
      .signers([creatorKeypair])
      .rpc();

    const postAccount = await program.account.post.fetch(post);
    expect(postAccount.author.toString()).to.equal(creatorKeypair.publicKey.toString());
    expect(postAccount.content).to.equal(content);
    expect(postAccount.mediaUrl).to.equal(mediaUrl);
    expect(postAccount.isTokenGated).to.equal(isTokenGated);
    expect(postAccount.requiredTokenAmount.toString()).to.equal(requiredTokenAmount.toString());
    expect(postAccount.likesCount.toNumber()).to.equal(0);
    expect(postAccount.commentsCount.toNumber()).to.equal(0);
    expect(postAccount.tipsReceived.toNumber()).to.equal(0);
  });

  it("Likes a post", async () => {
    [interaction] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("interaction"),
        followerKeypair.publicKey.toBuffer(),
        post.toBuffer()
      ],
      program.programId
    );

    await program.methods
      .likePost()
      .accounts({
        post: post,
        interaction: interaction,
        user: followerKeypair.publicKey,
        userProfile: followerProfile,
        userTokenAccount: followerTokenAccount,
        socialToken: socialToken,
        systemProgram: SystemProgram.programId,
      })
      .signers([followerKeypair])
      .rpc();

    const postAccount = await program.account.post.fetch(post);
    const interactionAccount = await program.account.interaction.fetch(interaction);
    
    expect(postAccount.likesCount.toNumber()).to.equal(1);
    expect(interactionAccount.user.toString()).to.equal(followerKeypair.publicKey.toString());
    expect(interactionAccount.post.toString()).to.equal(post.toString());
    expect(interactionAccount.hasLiked).to.equal(true);
  });

  it("Tips a post", async () => {
    const tipAmount = new anchor.BN(1 * 10**9); // 1 token

    const initialCreatorBalance = await getAccount(provider.connection, creatorTokenAccount);
    const initialFollowerBalance = await getAccount(provider.connection, followerTokenAccount);

    await program.methods
      .tipPost(tipAmount)
      .accounts({
        post: post,
        tipper: followerKeypair.publicKey,
        tipperTokenAccount: followerTokenAccount,
        recipient: creatorKeypair.publicKey,
        recipientTokenAccount: creatorTokenAccount,
        mint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([followerKeypair])
      .rpc();

    const postAccount = await program.account.post.fetch(post);
    const finalCreatorBalance = await getAccount(provider.connection, creatorTokenAccount);
    const finalFollowerBalance = await getAccount(provider.connection, followerTokenAccount);

    expect(postAccount.tipsReceived.toNumber()).to.equal(tipAmount.toNumber());
    expect(Number(finalCreatorBalance.amount)).to.be.greaterThan(Number(initialCreatorBalance.amount));
    expect(Number(finalFollowerBalance.amount)).to.be.lessThan(Number(initialFollowerBalance.amount));
  });

  it("Comments on a post", async () => {
    const commentContent = "Great post! Love the content.";

    const [comment] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("comment"),
        post.toBuffer(),
        followerKeypair.publicKey.toBuffer(),
        new anchor.BN(0).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    await program.methods
      .commentOnPost(commentContent)
      .accounts({
        post: post,
        comment: comment,
        commenter: followerKeypair.publicKey,
        commenterProfile: followerProfile,
        commenterTokenAccount: followerTokenAccount,
        socialToken: socialToken,
        systemProgram: SystemProgram.programId,
      })
      .signers([followerKeypair])
      .rpc();

    const postAccount = await program.account.post.fetch(post);
    const commentAccount = await program.account.comment.fetch(comment);

    expect(postAccount.commentsCount.toNumber()).to.equal(1);
    expect(commentAccount.post.toString()).to.equal(post.toString());
    expect(commentAccount.author.toString()).to.equal(followerKeypair.publicKey.toString());
    expect(commentAccount.content).to.equal(commentContent);
  });

  it("Sells social tokens", async () => {
    const amount = new anchor.BN(5 * 10**9); // 5 tokens
    const minPrice = new anchor.BN(500000); // 0.0005 SOL min

    const initialBalance = await getAccount(provider.connection, followerTokenAccount);
    const initialSocialToken = await program.account.socialToken.fetch(