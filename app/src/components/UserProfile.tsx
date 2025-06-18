```tsx
'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Heart, MessageCircle, Share2, TrendingUp, TrendingDown, Users, Coins, Calendar, MapPin, Link as LinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserProfileProps {
  userAddress?: string
  className?: string
}

interface UserData {
  address: string
  username: string
  displayName: string
  bio: string
  avatar: string
  banner: string
  tokenPrice: number
  priceChange24h: number
  totalSupply: number
  holders: number
  marketCap: number
  followers: number
  following: number
  posts: number
  joinedDate: string
  location?: string
  website?: string
  verified: boolean
}

interface Post {
  id: string
  content: string
  timestamp: string
  likes: number
  comments: number
  shares: number
  isLiked: boolean
  tokenReward: number
}

export default function UserProfile({ userAddress, className }: UserProfileProps) {
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState('posts')

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true)
        // Mock data - replace with actual Solana program calls
        const mockUserData: UserData = {
          address: userAddress || publicKey?.toString() || '',
          username: '@solsocial_user',
          displayName: 'SolSocial Pioneer',
          bio: 'Building the future of decentralized social media on Solana. Tokenizing social interactions one post at a time. 🚀',
          avatar: '/api/placeholder/150/150',
          banner: '/api/placeholder/800/200',
          tokenPrice: 0.0234,
          priceChange24h: 12.5,
          totalSupply: 1000000,
          holders: 1247,
          marketCap: 23400,
          followers: 15420,
          following: 892,
          posts: 234,
          joinedDate: '2024-01-15',
          location: 'Solana Beach',
          website: 'https://solsocial.app',
          verified: true
        }

        const mockPosts: Post[] = [
          {
            id: '1',
            content: 'Just launched my social token! 🎉 Excited to build a community of believers in decentralized social media. Who\'s ready to join the revolution?',
            timestamp: '2024-01-20T10:30:00Z',
            likes: 89,
            comments: 23,
            shares: 12,
            isLiked: false,
            tokenReward: 0.001
          },
          {
            id: '2',
            content: 'The future of social media is here. No more centralized platforms controlling our data and monetizing our content without fair compensation. #DeSoc #Solana',
            timestamp: '2024-01-19T15:45:00Z',
            likes: 156,
            comments: 34,
            shares: 28,
            isLiked: true,
            tokenReward: 0.0025
          }
        ]

        setUserData(mockUserData)
        setPosts(mockPosts)
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [userAddress, publicKey])

  const handleFollow = async () => {
    try {
      // Implement follow/unfollow logic with Solana program
      setIsFollowing(!isFollowing)
    } catch (error) {
      console.error('Error following user:', error)
    }
  }

  const handleLike = async (postId: string) => {
    try {
      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
          : post
      ))
    } catch (error) {
      console.error('Error liking post:', error)
    }
  }

  const handleTip = async (postId: string) => {
    try {
      // Implement tipping logic with Solana program
      console.log('Tipping post:', postId)
    } catch (error) {
      console.error('Error tipping post:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 p-8">
          <p className="text-slate-100 text-center">User not found</p>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("min-h-screen bg-slate-900 font-inter", className)}>
      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-purple-600 via-indigo-500 to-pink-500">
        <img 
          src={userData.banner} 
          alt="Profile banner" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-10">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="flex-shrink-0">
            <Avatar className="w-32 h-32 border-4 border-slate-800 shadow-2xl">
              <AvatarImage src={userData.avatar} alt={userData.displayName} />
              <AvatarFallback className="bg-purple-600 text-white text-2xl">
                {userData.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-100">
                    {userData.displayName}
                  </h1>
                  {userData.verified && (
                    <Badge className="bg-purple-600 text-white">Verified</Badge>
                  )}
                </div>
                <p className="text-slate-400 text-lg">{userData.username}</p>
              </div>

              <div className="flex gap-3">
                {connected && publicKey?.toString() !== userData.address && (
                  <Button
                    onClick={handleFollow}
                    className={cn(
                      "px-6 py-2 rounded-xl font-semibold transition-all duration-200",
                      isFollowing
                        ? "bg-slate-700 text-slate-100 hover:bg-slate-600"
                        : "bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:from-purple-700 hover:to-pink-600 shadow-lg hover:shadow-purple-500/25"
                    )}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-100 hover:bg-slate-800 rounded-xl"
                >
                  Message
                </Button>
              </div>
            </div>

            <p className="text-slate-300 text-base leading-relaxed max-w-2xl">
              {userData.bio}
            </p>

            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
              {userData.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {userData.location}
                </div>
              )}
              {userData.website && (
                <div className="flex items-center gap-1">
                  <LinkIcon className="w-4 h-4" />
                  <a href={userData.website} className="text-purple-400 hover:text-purple-300">
                    {userData.website.replace('https://', '')}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Joined {new Date(userData.joinedDate).toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 rounded-xl">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Coins className="w-5 h-5 text-purple-400" />
                <span className="text-2xl font-bold text-slate-100">
                  ${userData.tokenPrice.toFixed(4)}
                </span>
                <div className={cn(
                  "flex items-center gap-1 text-sm",
                  userData.priceChange24h >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {userData.priceChange24h >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {Math.abs(userData.priceChange24h).toFixed(1)}%
                </div>
              </div>
              <p className="text-slate-400 text-sm">Token Price</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 rounded-xl">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-100 mb-2">
                {userData.holders.toLocaleString()}
              </div>
              <p className="text-slate-400 text-sm">Holders</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 rounded-xl">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-100 mb-2">
                {userData.followers.toLocaleString()}
              </div>
              <p className="text-slate-400 text-sm">Followers</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 rounded-xl">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-100 mb-2">
                ${userData.marketCap.toLocaleString()}
              </div>
              <p className="text-slate-400 text-sm">Market Cap</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-800/50 backdrop-blur-sm border-slate-700 rounded-xl p-1">
            <TabsTrigger 
              value="posts" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-lg"
            >
              Posts ({userData.posts})
            </TabsTrigger>
            <TabsTrigger 
              value="holders" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-lg"
            >
              Holders ({userData.holders})
            </TabsTrigger>
            <TabsTrigger 
              value="following" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-lg"
            >
              Following ({userData.following})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6 space-y-6">
            {posts.map((post) => (
              <Card key={post.id} className="bg-slate-800/50 backdrop-blur-sm border-slate-700 rounded-xl">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={userData.avatar} alt={userData.displayName} />
                      <AvatarFallback className="bg-purple-600 text-white">
                        {userData.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-slate-100">{userData.displayName}</span>
                        <span className="text-slate-400">{userData.username}</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-500 text-sm">
                          {new Date(post.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <p className="text-slate-200 mb-4 leading-relaxed">{post.content}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="