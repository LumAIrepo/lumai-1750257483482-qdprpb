```typescript
import { useState, useEffect, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Keypair, SystemProgram, Transaction } from '@solana/web3.js'
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor'
import { toast } from 'sonner'

interface UserKey {
  publicKey: string
  name: string
  symbol: string
  totalSupply: number
  currentPrice: number
  priceChange24h: number
  holders: number
  volume24h: number
  marketCap: number
  createdAt: Date
  isOwned: boolean
  balance: number
}

interface KeyTransaction {
  id: string
  type: 'buy' | 'sell'
  amount: number
  price: number
  timestamp: Date
  user: string
}

interface UseUserKeysReturn {
  userKeys: UserKey[]
  ownedKeys: UserKey[]
  keyTransactions: KeyTransaction[]
  isLoading: boolean
  error: string | null
  createUserKey: (name: string, symbol: string, initialSupply: number) => Promise<boolean>
  buyKey: (keyPublicKey: string, amount: number) => Promise<boolean>
  sellKey: (keyPublicKey: string, amount: number) => Promise<boolean>
  getUserKeyPrice: (keyPublicKey: string) => Promise<number>
  refreshUserKeys: () => Promise<void>
  getKeyHolders: (keyPublicKey: string) => Promise<any[]>
}

const PROGRAM_ID = new PublicKey('SoLSociaL1111111111111111111111111111111111')
const SOLSOCIAL_PROGRAM_ID = new PublicKey('SoLSociaL1111111111111111111111111111111111')

export function useUserKeys(): UseUserKeysReturn {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  
  const [userKeys, setUserKeys] = useState<UserKey[]>([])
  const [ownedKeys, setOwnedKeys] = useState<UserKey[]>([])
  const [keyTransactions, setKeyTransactions] = useState<KeyTransaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calculateKeyPrice = useCallback((supply: number, amount: number): number => {
    // Bonding curve formula: price = (supply^2) / 16000
    const basePrice = Math.pow(supply, 2) / 16000
    return Math.max(basePrice * amount, 0.001) // Minimum price of 0.001 SOL
  }, [])

  const createUserKey = useCallback(async (name: string, symbol: string, initialSupply: number): Promise<boolean> => {
    if (!publicKey || !signTransaction) {
      toast.error('Please connect your wallet')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const keyKeypair = Keypair.generate()
      const [keyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_key'), publicKey.toBuffer(), keyKeypair.publicKey.toBuffer()],
        PROGRAM_ID
      )

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), keyPda.toBuffer()],
        PROGRAM_ID
      )

      const transaction = new Transaction()
      
      // Create key account instruction
      const createKeyInstruction = SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: keyKeypair.publicKey,
        lamports: await connection.getMinimumBalanceForRentExemption(1000),
        space: 1000,
        programId: PROGRAM_ID,
      })

      transaction.add(createKeyInstruction)

      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      transaction.partialSign(keyKeypair)
      const signedTransaction = await signTransaction(transaction)
      
      const signature = await connection.sendRawTransaction(signedTransaction.serialize())
      await connection.confirmTransaction(signature, 'confirmed')

      // Create new user key object
      const newUserKey: UserKey = {
        publicKey: keyKeypair.publicKey.toString(),
        name,
        symbol,
        totalSupply: initialSupply,
        currentPrice: calculateKeyPrice(0, 1),
        priceChange24h: 0,
        holders: 1,
        volume24h: 0,
        marketCap: calculateKeyPrice(0, initialSupply),
        createdAt: new Date(),
        isOwned: true,
        balance: initialSupply
      }

      setUserKeys(prev => [newUserKey, ...prev])
      setOwnedKeys(prev => [newUserKey, ...prev])

      toast.success(`Successfully created ${symbol} key!`)
      return true
    } catch (err) {
      console.error('Error creating user key:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user key'
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [publicKey, signTransaction, connection, calculateKeyPrice])

  const buyKey = useCallback(async (keyPublicKey: string, amount: number): Promise<boolean> => {
    if (!publicKey || !signTransaction) {
      toast.error('Please connect your wallet')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const keyPubkey = new PublicKey(keyPublicKey)
      const userKey = userKeys.find(key => key.publicKey === keyPublicKey)
      
      if (!userKey) {
        throw new Error('Key not found')
      }

      const price = calculateKeyPrice(userKey.totalSupply, amount)
      const priceInLamports = price * web3.LAMPORTS_PER_SOL

      const [keyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_key'), keyPubkey.toBuffer()],
        PROGRAM_ID
      )

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), keyPda.toBuffer()],
        PROGRAM_ID
      )

      const transaction = new Transaction()
      
      // Transfer SOL to vault
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: vaultPda,
        lamports: priceInLamports,
      })

      transaction.add(transferInstruction)

      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      const signedTransaction = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signedTransaction.serialize())
      await connection.confirmTransaction(signature, 'confirmed')

      // Update local state
      setUserKeys(prev => prev.map(key => {
        if (key.publicKey === keyPublicKey) {
          const newSupply = key.totalSupply + amount
          return {
            ...key,
            totalSupply: newSupply,
            currentPrice: calculateKeyPrice(newSupply, 1),
            holders: key.holders + (key.balance === 0 ? 1 : 0),
            volume24h: key.volume24h + price,
            marketCap: calculateKeyPrice(newSupply, newSupply),
            balance: key.balance + amount,
            isOwned: true
          }
        }
        return key
      }))

      // Add to owned keys if not already owned
      const ownedKey = ownedKeys.find(key => key.publicKey === keyPublicKey)
      if (!ownedKey) {
        const updatedKey = userKeys.find(key => key.publicKey === keyPublicKey)
        if (updatedKey) {
          setOwnedKeys(prev => [...prev, { ...updatedKey, balance: amount, isOwned: true }])
        }
      } else {
        setOwnedKeys(prev => prev.map(key => 
          key.publicKey === keyPublicKey 
            ? { ...key, balance: key.balance + amount }
            : key
        ))
      }

      // Add transaction record
      const newTransaction: KeyTransaction = {
        id: signature,
        type: 'buy',
        amount,
        price,
        timestamp: new Date(),
        user: publicKey.toString()
      }
      setKeyTransactions(prev => [newTransaction, ...prev])

      toast.success(`Successfully bought ${amount} ${userKey.symbol} keys for ${price.toFixed(4)} SOL`)
      return true
    } catch (err) {
      console.error('Error buying key:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to buy key'
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [publicKey, signTransaction, connection, userKeys, ownedKeys, calculateKeyPrice])

  const sellKey = useCallback(async (keyPublicKey: string, amount: number): Promise<boolean> => {
    if (!publicKey || !signTransaction) {
      toast.error('Please connect your wallet')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const userKey = ownedKeys.find(key => key.publicKey === keyPublicKey)
      
      if (!userKey || userKey.balance < amount) {
        throw new Error('Insufficient key balance')
      }

      const price = calculateKeyPrice(userKey.totalSupply - amount, amount)
      const priceInLamports = price * web3.LAMPORTS_PER_SOL

      const [keyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_key'), new PublicKey(keyPublicKey).toBuffer()],
        PROGRAM_ID
      )

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), keyPda.toBuffer()],
        PROGRAM_ID
      )

      const transaction = new Transaction()
      
      // Transfer SOL from vault to user
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: vaultPda,
        toPubkey: publicKey,
        lamports: priceInLamports,
      })

      transaction.add(transferInstruction)

      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      const signedTransaction = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signedTransaction.serialize())
      await connection.confirmTransaction(signature, 'confirmed')

      // Update local state
      setUserKeys(prev => prev.map(key => {
        if (key.publicKey === keyPublicKey) {
          const newSupply = key.totalSupply - amount
          return {
            ...key,
            totalSupply: newSupply,
            currentPrice: calculateKeyPrice(newSupply, 1),
            volume24h: key.volume24h + price,
            marketCap: calculateKeyPrice(newSupply, newSupply),
            balance: key.balance - amount,
            isOwned: key.balance - amount > 0
          }
        }
        return key
      }))

      setOwnedKeys(prev => prev.map(key => {
        if (key.publicKey === keyPublicKey) {
          const newBalance = key.balance - amount
          return newBalance > 0 
            ? { ...key, balance: newBalance }
            : null
        }
        return key
      }).filter(Boolean) as UserKey[])

      // Add transaction record
      const newTransaction: KeyTransaction = {
        id: signature,
        type: 'sell',
        amount,
        price,
        timestamp: new Date(),
        user: publicKey.toString()
      }
      setKeyTransactions(prev => [newTransaction, ...prev])

      toast.success(`Successfully sold ${amount} ${userKey.symbol} keys for ${price.toFixed(4)} SOL`)
      return true
    } catch (err) {
      console.error('Error selling key:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to sell key'
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [publicKey, signTransaction, connection, ownedKeys, calculateKeyPrice])

  const getUserKeyPrice = useCallback(async (keyPublicKey: string): Promise<number> => {
    try {
      const userKey = userKeys.find(key => key.publicKey === keyPublicKey)
      if (!userKey) return 0
      
      return calculateKeyPrice(userKey.totalSupply, 1)
    } catch (err) {
      console.error('Error getting key price:', err)
      return 0
    }
  }, [userKeys, calculateKeyPrice])

  const getKeyHolders = useCallback(async (keyPublicKey: string): Promise<any[]> => {
    try {
      // In a real implementation, this would fetch from the blockchain
      // For now, return mock data
      return [
        {
          address: publicKey?.toString() || '',
          balance: ownedKeys.find(key => key.publicKey === keyPublicKey)?.balance || 0,
          percentage: 100
        }
      ]
    } catch (err) {
      console.error('Error getting key holders:', err)
      return []
    }
  }, [publicKey, ownedKeys])

  const refreshUserKeys = useCallback(async (): Promise<void> => {
    if (!publicKey) return

    setIsLoading(true)
    setError(null)

    try {
      // In a real implementation, this would fetch from the blockchain
      // For now, we'll simulate fetching popular keys
      const mockKeys: UserKey[] = [
        {
          publicKey: Keypair.generate().publicKey.toString(),
          name: 'CryptoInfluencer',
          symbol: 'CRYPTO',
          totalSupply: 1000,
          currentPrice: 0.05,
          priceChange24h: 12.5,
          holders: 45,
          volume24h: 2.3,
          marketCap: 50,
          createdAt: new Date(Date.now() - 86400000),
          isOwned: false,
          balance: 0
        },
        {
          publicKey: Keypair.generate().publicKey.toString(),
          name: 'SolanaBuilder',
          symbol: 'BUILD',
          totalSupply: 750,
          currentPrice: 0.08,
          priceChange24h: -5.2,
          holders: 32,
          volume24h: 1.8,
          marketCap: 60,
          createdAt: new Date(Date.now() - 172800000),
          isOwned: false,
          balance: 0
        },
        {
          publicKey: Keypair.generate().publicKey.toString(),
          name: 'DeFiExpert',
          symbol: 'DEFI',
          totalSupply: 1200,
          currentPrice: 0.03,