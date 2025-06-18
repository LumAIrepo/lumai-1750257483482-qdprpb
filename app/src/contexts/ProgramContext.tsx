```tsx
'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Program, AnchorProvider, web3, BN, IdlAccounts } from '@coral-xyz/anchor'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { toast } from 'sonner'

// Program IDL type definitions
interface SolSocialIdl {
  version: string
  name: string
  instructions: any[]
  accounts: any[]
  types: any[]
}

// Account types
export interface UserProfile {
  authority: PublicKey
  username: string
  displayName: string
  bio: string
  profileImage: string
  tokenMint: PublicKey
  tokenSupply: BN
  tokenPrice: BN
  totalVolume: BN
  followerCount: number
  followingCount: number
  postCount: number
  createdAt: BN
  bump: number
}

export interface Post {
  authority: PublicKey
  profile: PublicKey
  content: string
  imageUrl?: string
  likeCount: number
  commentCount: number
  tipAmount: BN
  createdAt: BN
  bump: number
}

export interface SocialToken {
  mint: PublicKey
  profile: PublicKey
  supply: BN
  price: BN
  volume24h: BN
  holders: number
  createdAt: BN
}

export interface TokenTransaction {
  user: PublicKey
  profile: PublicKey
  transactionType: 'buy' | 'sell'
  amount: BN
  price: BN
  timestamp: BN
}

// Context interface
interface ProgramContextType {
  program: Program<SolSocialIdl> | null
  programId: PublicKey | null
  isLoading: boolean
  error: string | null
  
  // User profile methods
  createProfile: (username: string, displayName: string, bio: string, profileImage: string) => Promise<string | null>
  getUserProfile: (authority: PublicKey) => Promise<UserProfile | null>
  updateProfile: (displayName: string, bio: string, profileImage: string) => Promise<boolean>
  
  // Post methods
  createPost: (content: string, imageUrl?: string) => Promise<string | null>
  getPost: (postId: PublicKey) => Promise<Post | null>
  getUserPosts: (authority: PublicKey) => Promise<Post[]>
  likePost: (postId: PublicKey) => Promise<boolean>
  tipPost: (postId: PublicKey, amount: number) => Promise<boolean>
  
  // Social token methods
  buyTokens: (profileAuthority: PublicKey, amount: number) => Promise<boolean>
  sellTokens: (profileAuthority: PublicKey, amount: number) => Promise<boolean>
  getTokenPrice: (profileAuthority: PublicKey) => Promise<number>
  getTokenHoldings: (userAuthority: PublicKey, profileAuthority: PublicKey) => Promise<number>
  
  // Social methods
  followUser: (targetAuthority: PublicKey) => Promise<boolean>
  unfollowUser: (targetAuthority: PublicKey) => Promise<boolean>
  isFollowing: (userAuthority: PublicKey, targetAuthority: PublicKey) => Promise<boolean>
  
  // Utility methods
  getTokenTransactions: (profileAuthority: PublicKey) => Promise<TokenTransaction[]>
  searchProfiles: (query: string) => Promise<UserProfile[]>
  getTrendingProfiles: () => Promise<UserProfile[]>
  getFeedPosts: (userAuthority: PublicKey) => Promise<Post[]>
}

const ProgramContext = createContext<ProgramContextType | null>(null)

// Program ID - replace with your deployed program ID
const PROGRAM_ID = new PublicKey('SoLSociaL1111111111111111111111111111111111')

interface ProgramProviderProps {
  children: ReactNode
}

export function ProgramProvider({ children }: ProgramProviderProps) {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [program, setProgram] = useState<Program<SolSocialIdl> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize program
  useEffect(() => {
    if (wallet.publicKey && wallet.signTransaction) {
      try {
        const provider = new AnchorProvider(
          connection,
          wallet as any,
          { commitment: 'confirmed' }
        )
        
        // In a real implementation, you would load the IDL from your program
        const programInstance = new Program({} as SolSocialIdl, PROGRAM_ID, provider)
        setProgram(programInstance)
        setError(null)
      } catch (err) {
        console.error('Failed to initialize program:', err)
        setError('Failed to initialize program')
      }
    }
  }, [connection, wallet.publicKey, wallet.signTransaction])

  // User profile methods
  const createProfile = async (
    username: string,
    displayName: string,
    bio: string,
    profileImage: string
  ): Promise<string | null> => {
    if (!program || !wallet.publicKey) {
      toast.error('Wallet not connected')
      return null
    }

    setIsLoading(true)
    try {
      const [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('profile'), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      )

      const [tokenMint] = PublicKey.findProgramAddressSync(
        [Buffer.from('token'), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      )

      const tx = await program.methods
        .createProfile(username, displayName, bio, profileImage)
        .accounts({
          profile: profilePda,
          tokenMint: tokenMint,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      toast.success('Profile created successfully!')
      return tx
    } catch (err) {
      console.error('Error creating profile:', err)
      toast.error('Failed to create profile')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const getUserProfile = async (authority: PublicKey): Promise<UserProfile | null> => {
    if (!program) return null

    try {
      const [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('profile'), authority.toBuffer()],
        PROGRAM_ID
      )

      const profile = await program.account.userProfile.fetch(profilePda)
      return profile as UserProfile
    } catch (err) {
      console.error('Error fetching profile:', err)
      return null
    }
  }

  const updateProfile = async (
    displayName: string,
    bio: string,
    profileImage: string
  ): Promise<boolean> => {
    if (!program || !wallet.publicKey) {
      toast.error('Wallet not connected')
      return false
    }

    setIsLoading(true)
    try {
      const [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('profile'), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      )

      await program.methods
        .updateProfile(displayName, bio, profileImage)
        .accounts({
          profile: profilePda,
          authority: wallet.publicKey,
        })
        .rpc()

      toast.success('Profile updated successfully!')
      return true
    } catch (err) {
      console.error('Error updating profile:', err)
      toast.error('Failed to update profile')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Post methods
  const createPost = async (content: string, imageUrl?: string): Promise<string | null> => {
    if (!program || !wallet.publicKey) {
      toast.error('Wallet not connected')
      return null
    }

    setIsLoading(true)
    try {
      const postKeypair = web3.Keypair.generate()
      
      const [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('profile'), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      )

      const tx = await program.methods
        .createPost(content, imageUrl || '')
        .accounts({
          post: postKeypair.publicKey,
          profile: profilePda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([postKeypair])
        .rpc()

      toast.success('Post created successfully!')
      return tx
    } catch (err) {
      console.error('Error creating post:', err)
      toast.error('Failed to create post')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const getPost = async (postId: PublicKey): Promise<Post | null> => {
    if (!program) return null

    try {
      const post = await program.account.post.fetch(postId)
      return post as Post
    } catch (err) {
      console.error('Error fetching post:', err)
      return null
    }
  }

  const getUserPosts = async (authority: PublicKey): Promise<Post[]> => {
    if (!program) return []

    try {
      const posts = await program.account.post.all([
        {
          memcmp: {
            offset: 8,
            bytes: authority.toBase58(),
          },
        },
      ])

      return posts.map(post => post.account as Post)
    } catch (err) {
      console.error('Error fetching user posts:', err)
      return []
    }
  }

  const likePost = async (postId: PublicKey): Promise<boolean> => {
    if (!program || !wallet.publicKey) {
      toast.error('Wallet not connected')
      return false
    }

    setIsLoading(true)
    try {
      await program.methods
        .likePost()
        .accounts({
          post: postId,
          user: wallet.publicKey,
        })
        .rpc()

      toast.success('Post liked!')
      return true
    } catch (err) {
      console.error('Error liking post:', err)
      toast.error('Failed to like post')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const tipPost = async (postId: PublicKey, amount: number): Promise<boolean> => {
    if (!program || !wallet.publicKey) {
      toast.error('Wallet not connected')
      return false
    }

    setIsLoading(true)
    try {
      const lamports = amount * LAMPORTS_PER_SOL

      await program.methods
        .tipPost(new BN(lamports))
        .accounts({
          post: postId,
          tipper: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      toast.success(`Tipped ${amount} SOL!`)
      return true
    } catch (err) {
      console.error('Error tipping post:', err)
      toast.error('Failed to tip post')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Social token methods
  const buyTokens = async (profileAuthority: PublicKey, amount: number): Promise<boolean> => {
    if (!program || !wallet.publicKey) {
      toast.error('Wallet not connected')
      return false
    }

    setIsLoading(true)
    try {
      const [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('profile'), profileAuthority.toBuffer()],
        PROGRAM_ID
      )

      const [tokenMint] = PublicKey.findProgramAddressSync(
        [Buffer.from('token'), profileAuthority.toBuffer()],
        PROGRAM_ID
      )

      await program.methods
        .buyTokens(new BN(amount))
        .accounts({
          profile: profilePda,
          tokenMint: tokenMint,
          buyer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      toast.success(`Bought ${amount} tokens!`)
      return true
    } catch (err) {
      console.error('Error buying tokens:', err)
      toast.error('Failed to buy tokens')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const sellTokens = async (profileAuthority: PublicKey, amount: number): Promise<boolean> => {
    if (!program || !wallet.publicKey) {
      toast.error('Wallet not connected')
      return false
    }

    setIsLoading(true)
    try {
      const [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('profile'), profileAuthority.toBuffer()],
        PROGRAM_ID
      )

      const [tokenMint] = PublicKey.findProgramAddressSync(
        [Buffer.from('token'), profileAuthority.toBuffer()],
        PROGRAM_ID
      )

      await program.methods
        .sellTokens(new BN(amount))
        .accounts({
          profile: profilePda,
          tokenMint: tokenMint,
          seller: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      toast.success(`Sold ${amount} tokens!`)
      return true
    } catch (err) {
      console.error('Error selling tokens:', err)
      toast.error('Failed to sell tokens')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const getTokenPrice = async (profileAuthority: PublicKey): Promise<number> => {
    if (!program) return 0

    try {
      const profile = await getUserProfile(profileAuthority)
      if (!profile) return 0

      // Simple bonding curve calculation
      const supply = profile.tokenSupply.toNumber()
      const basePrice = 0.001 // Base price in SOL
      const price = basePrice * Math.pow(1.1, supply / 1000)
      
      return price
    } catch (err) {
      console.error('Error getting token price:', err)
      return 0
    }
  }

  const getTokenHoldings = async (
    userAuthority: PublicKey,
    profileAuthority: PublicKey
  ): Promise<number> => {
    if (!program) return 0

    try {
      const [holdingPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('holding'),
          userAuthority.toBuffer(),
          profileAuthority.toBuffer(),
        ],
        PROGRAM_ID
      )

      const holding = await program.account.tokenHolding.fetch(holdingPda)
      return holding.amount.toNumber()
    } catch (err) {
      console.error('Error fetching token holdings:', err)
      return 0
    }
  }

  // Social methods
  const followUser = async (targetAuthority: PublicKey): Promise<boolean> => {
    if (!program || !wallet.publicKey) {
      toast.error('Wallet not connected')
      return false
    }

    setIsLoading(true)
    try {
      const [follow