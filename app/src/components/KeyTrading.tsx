```tsx
'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Users, Zap, Star, MessageCircle, Share2, Gift } from 'lucide-react'
import { toast } from 'sonner'

interface KeyData {
  id: string
  creator: string
  name: string
  symbol: string
  avatar: string
  price: number
  priceChange24h: number
  supply: number
  holders: number
  marketCap: number
  volume24h: number
  description: string
  socialScore: number
  isFollowing: boolean
}

interface TradeHistory {
  id: string
  type: 'buy' | 'sell'
  amount: number
  price: number
  timestamp: Date
  user: string
  userAvatar: string
}

const mockKeys: KeyData[] = [
  {
    id: '1',
    creator: 'CryptoInfluencer',
    name: 'CryptoInfluencer',
    symbol: 'CRYPTO',
    avatar: '/avatars/crypto.jpg',
    price: 0.045,
    priceChange24h: 12.5,
    supply: 1000000,
    holders: 2847,
    marketCap: 45000,
    volume24h: 8750,
    description: 'Leading crypto educator and market analyst with 500K+ followers',
    socialScore: 95,
    isFollowing: true
  },
  {
    id: '2',
    creator: 'TechGuru',
    name: 'TechGuru',
    symbol: 'TECH',
    avatar: '/avatars/tech.jpg',
    price: 0.032,
    priceChange24h: -5.2,
    supply: 750000,
    holders: 1923,
    marketCap: 24000,
    volume24h: 4200,
    description: 'Blockchain developer and DeFi protocol architect',
    socialScore: 87,
    isFollowing: false
  },
  {
    id: '3',
    creator: 'ArtistDAO',
    name: 'ArtistDAO',
    symbol: 'ART',
    avatar: '/avatars/artist.jpg',
    price: 0.078,
    priceChange24h: 28.3,
    supply: 500000,
    holders: 3421,
    marketCap: 39000,
    volume24h: 12300,
    description: 'Digital artist collective creating NFTs and immersive experiences',
    socialScore: 92,
    isFollowing: true
  }
]

const mockTradeHistory: TradeHistory[] = [
  {
    id: '1',
    type: 'buy',
    amount: 100,
    price: 0.045,
    timestamp: new Date(Date.now() - 300000),
    user: 'whale_trader',
    userAvatar: '/avatars/whale.jpg'
  },
  {
    id: '2',
    type: 'sell',
    amount: 50,
    price: 0.043,
    timestamp: new Date(Date.now() - 600000),
    user: 'day_trader_pro',
    userAvatar: '/avatars/trader.jpg'
  },
  {
    id: '3',
    type: 'buy',
    amount: 250,
    price: 0.044,
    timestamp: new Date(Date.now() - 900000),
    user: 'hodl_master',
    userAvatar: '/avatars/hodl.jpg'
  }
]

export default function KeyTrading() {
  const { publicKey, connected, signTransaction } = useWallet()
  const { connection } = useConnection()
  const [selectedKey, setSelectedKey] = useState<KeyData | null>(null)
  const [tradeAmount, setTradeAmount] = useState('')
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')
  const [isTrading, setIsTrading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'price' | 'volume' | 'holders' | 'marketCap'>('marketCap')
  const [keys, setKeys] = useState<KeyData[]>(mockKeys)
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>(mockTradeHistory)

  const filteredKeys = keys.filter(key =>
    key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    key.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    key.creator.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedKeys = [...filteredKeys].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return b.price - a.price
      case 'volume':
        return b.volume24h - a.volume24h
      case 'holders':
        return b.holders - a.holders
      case 'marketCap':
        return b.marketCap - a.marketCap
      default:
        return 0
    }
  })

  const handleTrade = async () => {
    if (!connected || !publicKey || !selectedKey || !tradeAmount) {
      toast.error('Please connect wallet and enter trade amount')
      return
    }

    setIsTrading(true)
    try {
      const amount = parseFloat(tradeAmount)
      const totalCost = amount * selectedKey.price

      if (tradeType === 'buy') {
        // Simulate buy transaction
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey('11111111111111111111111111111112'),
            lamports: totalCost * LAMPORTS_PER_SOL
          })
        )

        const { blockhash } = await connection.getLatestBlockhash()
        transaction.recentBlockhash = blockhash
        transaction.feePayer = publicKey

        if (signTransaction) {
          const signedTransaction = await signTransaction(transaction)
          // In a real implementation, you would send this transaction
          console.log('Signed transaction:', signedTransaction)
        }

        toast.success(`Successfully bought ${amount} ${selectedKey.symbol} keys!`)
      } else {
        // Simulate sell transaction
        toast.success(`Successfully sold ${amount} ${selectedKey.symbol} keys!`)
      }

      // Add to trade history
      const newTrade: TradeHistory = {
        id: Date.now().toString(),
        type: tradeType,
        amount: amount,
        price: selectedKey.price,
        timestamp: new Date(),
        user: publicKey.toString().slice(0, 8) + '...',
        userAvatar: '/avatars/default.jpg'
      }
      setTradeHistory(prev => [newTrade, ...prev])
      setTradeAmount('')
    } catch (error) {
      console.error('Trade error:', error)
      toast.error('Trade failed. Please try again.')
    } finally {
      setIsTrading(false)
    }
  }

  const formatPrice = (price: number) => {
    return price.toFixed(4)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const getPriceChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-400' : 'text-red-400'
  }

  const getPriceChangeIcon = (change: number) => {
    return change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Key Trading
            </h1>
            <p className="text-slate-400 mt-2">Trade social keys and unlock exclusive content</p>
          </div>
          <div className="flex gap-4">
            <Input
              placeholder="Search creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 bg-slate-800/50 border-slate-700 backdrop-blur-sm"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl backdrop-blur-sm"
            >
              <option value="marketCap">Market Cap</option>
              <option value="price">Price</option>
              <option value="volume">Volume</option>
              <option value="holders">Holders</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Keys List */}
          <div className="lg:col-span-2 space-y-4">
            {sortedKeys.map((key) => (
              <Card key={key.id} className="bg-slate-800/30 border-slate-700 backdrop-blur-sm hover:bg-slate-800/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={key.avatar} alt={key.name} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500">
                          {key.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-semibold">{key.name}</h3>
                          <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                            {key.symbol}
                          </Badge>
                          {key.isFollowing && (
                            <Badge variant="secondary" className="bg-green-500/20 text-green-300">
                              Following
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-400 text-sm mt-1">{key.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-400">{formatNumber(key.holders)} holders</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm text-slate-400">{key.socialScore}/100</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{formatPrice(key.price)} SOL</span>
                        <div className={`flex items-center gap-1 ${getPriceChangeColor(key.priceChange24h)}`}>
                          {getPriceChangeIcon(key.priceChange24h)}
                          <span className="text-sm font-medium">
                            {key.priceChange24h > 0 ? '+' : ''}{key.priceChange24h.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-slate-400 mt-1">
                        Vol: {formatNumber(key.volume24h)} SOL
                      </div>
                      <div className="text-sm text-slate-400">
                        MCap: {formatNumber(key.marketCap)} SOL
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            className="mt-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
                            onClick={() => setSelectedKey(key)}
                          >
                            Trade Keys
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={key.avatar} alt={key.name} />
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500">
                                  {key.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              Trade {key.name} Keys
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Tabs value={tradeType} onValueChange={(value) => setTradeType(value as 'buy' | 'sell')}>
                              <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                                <TabsTrigger value="buy" className="data-[state=active]:bg-green-600">Buy</TabsTrigger>
                                <TabsTrigger value="sell" className="data-[state=active]:bg-red-600">Sell</TabsTrigger>
                              </TabsList>
                              <TabsContent value="buy" className="space-y-4">
                                <div>
                                  <Label htmlFor="amount">Amount of Keys