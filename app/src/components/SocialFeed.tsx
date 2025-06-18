```tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Heart, MessageCircle, Share2, TrendingUp, TrendingDown, Coins, Send, MoreHorizontal } from 'lucide-react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

interface SocialPost {
  id: string
  author: {
    username: string
    avatar: string
    tokenSymbol: string
    tokenPrice: number
    priceChange24h: number
    publicKey: string
  }
  content: string
  timestamp: Date
  likes: number
  comments: number
  shares: number
  isLiked: boolean
  tokenTips: number
}

interface TokenizedUser {
  username: string
  avatar: string
  tokenSymbol: string
  tokenPrice: number
  priceChange24h: number
  publicKey: string
  followers: number
  posts: number
}

export default function SocialFeed() {
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [newPost, setNewPost] = useState('')
  const [trendingUsers, setTrendingUsers] = useState<TokenizedUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
    fetchTrendingUsers()
  }, [])

  const fetchPosts = async () => {
    // Mock data - in production, fetch from your Solana program or API
    const mockPosts: SocialPost[] = [
      {
        id: '1',
        author: {
          username: 'cryptodev',
          avatar: '/avatars/cryptodev.jpg',
          tokenSymbol: 'CDEV',
          tokenPrice: 2.45,
          priceChange24h: 12.5,
          publicKey: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
        },
        content: 'Just shipped a new DeFi protocol on Solana! 🚀 The future of finance is decentralized. Who wants to be early?',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        likes: 42,
        comments: 8,
        shares: 12,
        isLiked: false,
        tokenTips: 15.2
      },
      {
        id: '2',
        author: {
          username: 'solana_queen',
          avatar: '/avatars/solana_queen.jpg',
          tokenSymbol: 'SQEN',
          tokenPrice: 1.89,
          priceChange24h: -3.2,
          publicKey: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
        },
        content: 'Market analysis: SOL is showing strong support at $95. Expecting a breakout soon. My token holders get exclusive alpha! 📈',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        likes: 128,
        comments: 23,
        shares: 45,
        isLiked: true,
        tokenTips: 89.7
      },
      {
        id: '3',
        author: {
          username: 'nft_artist',
          avatar: '/avatars/nft_artist.jpg',
          tokenSymbol: 'NART',
          tokenPrice: 0.75,
          priceChange24h: 8.9,
          publicKey: '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi'
        },
        content: 'New NFT collection dropping tomorrow! Token holders get 50% discount and early access. This is why tokenized social is the future 🎨',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
        likes: 67,
        comments: 15,
        shares: 28,
        isLiked: false,
        tokenTips: 34.1
      }
    ]
    setPosts(mockPosts)
    setLoading(false)
  }

  const fetchTrendingUsers = async () => {
    const mockTrending: TokenizedUser[] = [
      {
        username: 'solana_whale',
        avatar: '/avatars/whale.jpg',
        tokenSymbol: 'WHAL',
        tokenPrice: 15.67,
        priceChange24h: 25.3,
        publicKey: '8qbHbw2BbbTHBW1sbeqakYXVKRQM8Ne7pLK7m6CVfeR',
        followers: 12500,
        posts: 342
      },
      {
        username: 'defi_alpha',
        avatar: '/avatars/defi.jpg',
        tokenSymbol: 'ALFA',
        tokenPrice: 8.92,
        priceChange24h: 18.7,
        publicKey: '5KJbLm2wksjhEzHaYK547MqSoWTjhAMAKFuSrLLH5PvG',
        followers: 8900,
        posts: 156
      },
      {
        username: 'meme_lord',
        avatar: '/avatars/meme.jpg',
        tokenSymbol: 'MEME',
        tokenPrice: 0.42,
        priceChange24h: 69.0,
        publicKey: '3FoUAsWM8hAszfRzDmgqYJVj2T8KcqzqQFQd7MgWjXeL',
        followers: 25000,
        posts: 1247
      }
    ]
    setTrendingUsers(mockTrending)
  }

  const handleLike = async (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
        : post
    ))
  }

  const handleTip = async (authorPublicKey: string, amount: number) => {
    if (!connected || !publicKey) return
    
    try {
      // In production, implement actual SOL transfer
      console.log(`Tipping ${amount} SOL to ${authorPublicKey}`)
    } catch (error) {
      console.error('Tip failed:', error)
    }
  }

  const handleCreatePost = async () => {
    if (!newPost.trim() || !connected) return

    const post: SocialPost = {
      id: Date.now().toString(),
      author: {
        username: 'you',
        avatar: '/avatars/default.jpg',
        tokenSymbol: 'YOU',
        tokenPrice: 1.0,
        priceChange24h: 0,
        publicKey: publicKey?.toString() || ''
      },
      content: newPost,
      timestamp: new Date(),
      likes: 0,
      comments: 0,
      shares: 0,
      isLiked: false,
      tokenTips: 0
    }

    setPosts(prev => [post, ...prev])
    setNewPost('')
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-inter">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Feed */}
          <div className="lg:col-span-3 space-y-6">
            {/* Create Post */}
            {connected && (
              <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 rounded-xl">
                <CardContent className="p-6">
                  <div className="flex space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src="/avatars/default.jpg" />
                      <AvatarFallback className="bg-purple-600">You</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-4">
                      <Textarea
                        placeholder="Share your alpha with token holders..."
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                        className="bg-slate-700/50 border-slate-600 rounded-xl resize-none text-slate-100 placeholder-slate-400"
                        rows={3}
                      />
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-slate-400">
                          Your token holders will see this first
                        </div>
                        <Button
                          onClick={handleCreatePost}
                          disabled={!newPost.trim()}
                          className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 rounded-xl px-6"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Post
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Posts */}
            <div className="space-y-6">
              {posts.map((post) => (
                <Card key={post.id} className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 rounded-xl hover:bg-slate-800/70 transition-all duration-200">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={post.author.avatar} />
                          <AvatarFallback className="bg-purple-600">
                            {post.author.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-slate-100">@{post.author.username}</h3>
                            <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30 rounded-lg">
                              ${post.author.tokenSymbol}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-lg font-bold text-slate-100">
                              ${post.author.tokenPrice.toFixed(2)}
                            </span>
                            <div className={`flex items-center space-x-1 ${
                              post.author.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {post.author.priceChange24h >= 0 ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : (
                                <TrendingDown className="h-4 w-4" />
                              )}
                              <span className="text-sm font-medium">
                                {post.author.priceChange24h >= 0 ? '+' : ''}{post.author.priceChange24h.toFixed(1)}%
                              </span>
                            </div>
                            <span className="text-slate-400 text-sm">
                              {formatTimeAgo(post.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100 rounded-lg">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-slate-100 mb-4 leading-relaxed">{post.content}</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                      <div className="flex items-center space-x-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center space-x-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                            post.isLiked ? 'text-pink-500 hover:text-pink-400' : 'text-slate-400 hover:text-pink-500'
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} />
                          <span>{post.likes}</span>
                        </Button>
                        
                        <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-slate-400 hover:text-indigo-400 rounded-lg transition-all duration-200 hover:scale-105">
                          <MessageCircle className="h-4 w-4" />
                          <span>{post.comments}</span>
                        </Button>
                        
                        <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-slate-400 hover:text-purple-400 rounded-lg transition-all duration-200 hover:scale-105">
                          <Share2 className="h-4 w-4" />
                          <span>{post.shares}</span>
                        </Button>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center