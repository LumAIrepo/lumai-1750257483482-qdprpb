```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Heart, MessageCircle, Share2, TrendingUp, TrendingDown, Users, Coins, Send, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface UserProfile {
  address: string
  username: string
  displayName: string
  bio: string
  avatar: string
  tokenPrice: number
  priceChange24h: number
  totalSupply: number
  holders: number
  marketCap: number
  followers: number
  following: number
  posts: number
  joinedDate: string
}

interface Post {
  id: string
  content: string
  timestamp: string
  likes: number
  comments: number
  shares: number
  isLiked: boolean
  author: {
    address: string
    username: string
    avatar: string
  }
}

interface TokenTransaction {
  id: string
  type: 'buy' | 'sell'
  amount: number
  price: number
  timestamp: string
  user: {
    address: string
    username: string
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const { address } = router.query
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [transactions, setTransactions] = useState<TokenTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [buyAmount, setBuyAmount] = useState('')
  const [sellAmount, setSellAmount] = useState('')
  const [tipAmount, setTipAmount] = useState('')
  const [newPost, setNewPost] = useState('')
  const [showBuyDialog, setShowBuyDialog] = useState(false)
  const [showSellDialog, setShowSellDialog] = useState(false)
  const [showTipDialog, setShowTipDialog] = useState(false)

  const isOwnProfile = connected && publicKey && address === publicKey.toString()

  useEffect(() => {
    if (address) {
      fetchProfileData()
    }
  }, [address])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      
      // Mock data - replace with actual Solana program calls
      const mockProfile: UserProfile = {
        address: address as string,
        username: `user_${(address as string).slice(0, 8)}`,
        displayName: 'Solana Creator',
        bio: 'Building the future of decentralized social media on Solana. Join my community and trade my social tokens!',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`,
        tokenPrice: 0.0234,
        priceChange24h: 12.5,
        totalSupply: 1000000,
        holders: 1247,
        marketCap: 23400,
        followers: 5420,
        following: 892,
        posts: 156,
        joinedDate: '2024-01-15'
      }

      const mockPosts: Post[] = [
        {
          id: '1',
          content: 'Just launched my social token! Excited to build this community together 🚀',
          timestamp: '2024-01-20T10:30:00Z',
          likes: 45,
          comments: 12,
          shares: 8,
          isLiked: false,
          author: {
            address: address as string,
            username: mockProfile.username,
            avatar: mockProfile.avatar
          }
        },
        {
          id: '2',
          content: 'GM everyone! Token holders get exclusive access to my weekly AMAs. Who\'s joining?',
          timestamp: '2024-01-19T08:15:00Z',
          likes: 67,
          comments: 23,
          shares: 15,
          isLiked: true,
          author: {
            address: address as string,
            username: mockProfile.username,
            avatar: mockProfile.avatar
          }
        }
      ]

      const mockTransactions: TokenTransaction[] = [
        {
          id: '1',
          type: 'buy',
          amount: 100,
          price: 0.0234,
          timestamp: '2024-01-20T14:22:00Z',
          user: {
            address: 'ABC123...',
            username: 'crypto_trader'
          }
        },
        {
          id: '2',
          type: 'sell',
          amount: 50,
          price: 0.0231,
          timestamp: '2024-01-20T13:45:00Z',
          user: {
            address: 'DEF456...',
            username: 'hodler_2024'
          }
        }
      ]

      setProfile(mockProfile)
      setPosts(mockPosts)
      setTransactions(mockTransactions)
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!connected) {
      toast.error('Please connect your wallet')
      return
    }
    
    try {
      // Implement follow logic
      setIsFollowing(!isFollowing)
      toast.success(isFollowing ? 'Unfollowed' : 'Following')
    } catch (error) {
      toast.error('Failed to follow user')
    }
  }

  const handleBuyTokens = async () => {
    if (!connected || !buyAmount) return
    
    try {
      // Implement token purchase logic
      toast.success(`Bought ${buyAmount} tokens`)
      setShowBuyDialog(false)
      setBuyAmount('')
    } catch (error) {
      toast.error('Failed to buy tokens')
    }
  }

  const handleSellTokens = async () => {
    if (!connected || !sellAmount) return
    
    try {
      // Implement token sell logic
      toast.success(`Sold ${sellAmount} tokens`)
      setShowSellDialog(false)
      setSellAmount('')
    } catch (error) {
      toast.error('Failed to sell tokens')
    }
  }

  const handleTip = async () => {
    if (!connected || !tipAmount) return
    
    try {
      // Implement tip logic
      toast.success(`Tipped ${tipAmount} SOL`)
      setShowTipDialog(false)
      setTipAmount('')
    } catch (error) {
      toast.error('Failed to send tip')
    }
  }

  const handleLike = async (postId: string) => {
    if (!connected) {
      toast.error('Please connect your wallet')
      return
    }
    
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
        : post
    ))
  }

  const handleShare = async (postId: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`)
      toast.success('Link copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address as string)
      toast.success('Address copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy address')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-100 mb-4">Profile Not Found</h1>
          <p className="text-slate-400">The requested profile could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-inter">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 rounded-xl mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex flex-col items-center md:items-start">
                <Avatar className="w-32 h-32 mb-4">
                  <AvatarImage src={profile.avatar} alt={profile.displayName} />
                  <AvatarFallback className="bg-purple-600 text-white text-2xl">
                    {profile.displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex gap-2 mb-4">
                  {!isOwnProfile && (
                    <>
                      <Button
                        onClick={handleFollow}
                        className={`px-6 py-2 rounded-xl font-medium transition-all ${
                          isFollowing
                            ? 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                            : 'bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white'
                        }`}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </Button>
                      
                      <Dialog open={showTipDialog} onOpenChange={setShowTipDialog}>
                        <DialogTrigger asChild>
                          <Button className="px-6 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white">
                            <Send className="w-4 h-4 mr-2" />
                            Tip
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-800 border-slate-700">
                          <DialogHeader>
                            <DialogTitle className="text-slate-100">Send Tip</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input
                              placeholder="Amount in SOL"
                              value={tipAmount}
                              onChange={(e) => setTipAmount(e.target.value)}
                              className="bg-slate-700 border-slate-600 text-slate-100"
                            />
                            <Button
                              onClick={handleTip}
                              className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
                            >
                              Send Tip
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{profile.displayName}</h1>
                  <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30">
                    @{profile.username}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 mb-4 text-slate-400">
                  <span className="font-mono text-sm">{(address as string).slice(0, 8)}...{(address as string).slice(-8)}</span>
                  <Button
                    onClick={copyAddress}
                    size="sm"
                    variant="ghost"
                    className="p-1 h-auto hover:bg-slate-700"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-1 h-auto hover:bg-slate-700"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>

                <p className="text-slate-300 mb-6 leading-relaxed">{profile.bio}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-100">{profile.followers.toLocaleString()}</div>
                    <div className="text-sm text-slate-400">Followers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-100">{profile.following.toLocaleString()}</div>
                    <div className="text-sm text-slate-400">Following</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-100">{profile.posts}</div>
                    <div className="text-sm text-slate-400">Posts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-100">{profile.holders.toLocaleString()}</div>
                    <div className="text-sm text-slate-400">Token Holders</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Token Info Card */}
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 rounded-xl mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-purple-400" />
              Social Token
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 m