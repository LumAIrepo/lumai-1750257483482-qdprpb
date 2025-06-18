```tsx
'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { ConnectionProvider, WalletProvider, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  SolletWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'

require('@solana/wallet-adapter-react-ui/styles.css')

interface WalletContextType {
  wallet: any
  publicKey: PublicKey | null
  connected: boolean
  connecting: boolean
  disconnecting: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  sendTransaction: (transaction: Transaction | VersionedTransaction) => Promise<string>
  signTransaction: (transaction: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>
  signAllTransactions: (transactions: (Transaction | VersionedTransaction)[]) => Promise<(Transaction | VersionedTransaction)[]>
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
  balance: number | null
  refreshBalance: () => Promise<void>
  connection: Connection
  network: WalletAdapterNetwork
  userProfile: UserProfile | null
  updateUserProfile: (profile: Partial<UserProfile>) => void
  socialTokens: SocialToken[]
  refreshSocialTokens: () => Promise<void>
}

interface UserProfile {
  publicKey: string
  username: string
  displayName: string
  bio: string
  avatar: string
  followers: number
  following: number
  tokenPrice: number
  tokenSupply: number
  totalVolume: number
  createdAt: Date
}

interface SocialToken {
  mint: string
  symbol: string
  name: string
  price: number
  change24h: number
  volume24h: number
  holders: number
  creator: string
  createdAt: Date
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

interface WalletContextProviderProps {
  children: ReactNode
}

const WalletContextProvider: React.FC<WalletContextProviderProps> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet
  const endpoint = clusterApiUrl(network)
  const connection = new Connection(endpoint, 'confirmed')

  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new TorusWalletAdapter(),
    new LedgerWalletAdapter(),
    new SolletWalletAdapter(),
  ]

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletContextInner connection={connection} network={network}>
            {children}
          </WalletContextInner>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

interface WalletContextInnerProps {
  children: ReactNode
  connection: Connection
  network: WalletAdapterNetwork
}

const WalletContextInner: React.FC<WalletContextInnerProps> = ({ children, connection, network }) => {
  const {
    wallet,
    publicKey,
    connected,
    connecting,
    disconnecting,
    connect,
    disconnect,
    sendTransaction,
    signTransaction,
    signAllTransactions,
    signMessage,
  } = useSolanaWallet()

  const [balance, setBalance] = useState<number | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [socialTokens, setSocialTokens] = useState<SocialToken[]>([])

  const refreshBalance = async () => {
    if (!publicKey || !connection) return
    
    try {
      const balance = await connection.getBalance(publicKey)
      setBalance(balance / 1e9) // Convert lamports to SOL
    } catch (error) {
      console.error('Error fetching balance:', error)
      setBalance(null)
    }
  }

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    if (!userProfile) return
    
    const updatedProfile = { ...userProfile, ...profile }
    setUserProfile(updatedProfile)
    
    // Store in localStorage for persistence
    localStorage.setItem('solsocial_profile', JSON.stringify(updatedProfile))
  }

  const refreshSocialTokens = async () => {
    if (!publicKey) return
    
    try {
      // Mock data for social tokens - in production, this would fetch from your program
      const mockTokens: SocialToken[] = [
        {
          mint: 'TokenMint1',
          symbol: 'ALICE',
          name: 'Alice Token',
          price: 0.025,
          change24h: 12.5,
          volume24h: 1250.75,
          holders: 45,
          creator: 'Alice123',
          createdAt: new Date('2024-01-15'),
        },
        {
          mint: 'TokenMint2',
          symbol: 'BOB',
          name: 'Bob Token',
          price: 0.018,
          change24h: -5.2,
          volume24h: 890.25,
          holders: 32,
          creator: 'BobCrypto',
          createdAt: new Date('2024-01-20'),
        },
        {
          mint: 'TokenMint3',
          symbol: 'CAROL',
          name: 'Carol Token',
          price: 0.042,
          change24h: 8.7,
          volume24h: 2100.50,
          holders: 78,
          creator: 'CarolDeFi',
          createdAt: new Date('2024-01-10'),
        },
      ]
      
      setSocialTokens(mockTokens)
    } catch (error) {
      console.error('Error fetching social tokens:', error)
      setSocialTokens([])
    }
  }

  const loadUserProfile = async () => {
    if (!publicKey) return
    
    try {
      // Try to load from localStorage first
      const storedProfile = localStorage.getItem('solsocial_profile')
      if (storedProfile) {
        const profile = JSON.parse(storedProfile)
        if (profile.publicKey === publicKey.toString()) {
          setUserProfile(profile)
          return
        }
      }
      
      // Mock user profile - in production, this would fetch from your program
      const mockProfile: UserProfile = {
        publicKey: publicKey.toString(),
        username: `user_${publicKey.toString().slice(0, 8)}`,
        displayName: 'Anonymous User',
        bio: 'Welcome to SolSocial! Create your profile to get started.',
        avatar: '',
        followers: 0,
        following: 0,
        tokenPrice: 0.01,
        tokenSupply: 1000000,
        totalVolume: 0,
        createdAt: new Date(),
      }
      
      setUserProfile(mockProfile)
      localStorage.setItem('solsocial_profile', JSON.stringify(mockProfile))
    } catch (error) {
      console.error('Error loading user profile:', error)
      setUserProfile(null)
    }
  }

  useEffect(() => {
    if (connected && publicKey) {
      refreshBalance()
      loadUserProfile()
      refreshSocialTokens()
    } else {
      setBalance(null)
      setUserProfile(null)
      setSocialTokens([])
    }
  }, [connected, publicKey])

  // Refresh balance every 30 seconds when connected
  useEffect(() => {
    if (!connected || !publicKey) return
    
    const interval = setInterval(refreshBalance, 30000)
    return () => clearInterval(interval)
  }, [connected, publicKey])

  const contextValue: WalletContextType = {
    wallet,
    publicKey,
    connected,
    connecting,
    disconnecting,
    connect,
    disconnect,
    sendTransaction,
    signTransaction,
    signAllTransactions,
    signMessage,
    balance,
    refreshBalance,
    connection,
    network,
    userProfile,
    updateUserProfile,
    socialTokens,
    refreshSocialTokens,
  }

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  )
}

export default WalletContextProvider
```