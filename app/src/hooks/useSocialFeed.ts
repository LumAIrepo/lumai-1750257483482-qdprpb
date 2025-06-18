```typescript
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, Connection } from '@solana/web3.js'
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor'
import { toast } from 'sonner'

export interface SocialPost {
  id: string
  author: PublicKey
  authorUsername: string
  authorAvatar?: string
  content: string
  timestamp: number
  likes: number
  shares: number
  tips: number
  tokenPrice: number
  priceChange24h: number
  isLiked: boolean
  isShared: boolean
  comments: number
  media?: {
    type: 'image' | 'video'
    url: string
  }[]
  tokenSymbol: string
  marketCap: number
}

export interface FeedFilters {
  following: boolean
  trending: boolean
  recent: boolean
  priceRange?: {
    min: number
    max: number
  }
  timeframe: '1h' | '24h' | '7d' | '30d'
}

export interface UseSocialFeedReturn {
  posts: SocialPost[]
  loading: boolean
  error: string | null
  hasMore: boolean
  filters: FeedFilters
  refreshing: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  setFilters: (filters: Partial<FeedFilters>) => void
  likePost: (postId: string) => Promise<void>
  sharePost: (postId: string) => Promise<void>
  tipPost: (postId: string, amount: number) => Promise<void>
  createPost: (content: string, media?: File[]) => Promise<void>
}

const POSTS_PER_PAGE = 20
const PROGRAM_ID = new PublicKey('SoLSociaL1111111111111111111111111111111111')

export function useSocialFeed(): UseSocialFeedReturn {
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [filters, setFiltersState] = useState<FeedFilters>({
    following: false,
    trending: true,
    recent: false,
    timeframe: '24h'
  })

  const program = useMemo(() => {
    if (!connection || !publicKey) return null
    
    try {
      const provider = new AnchorProvider(
        connection,
        {
          publicKey,
          signTransaction: signTransaction!,
          signAllTransactions: async (txs) => {
            if (signTransaction) {
              return Promise.all(txs.map(tx => signTransaction(tx)))
            }
            throw new Error('Wallet not connected')
          }
        },
        { commitment: 'confirmed' }
      )
      
      return new Program(
        {
          version: '0.1.0',
          name: 'solsocial',
          instructions: [],
          accounts: [],
          types: [],
          events: [],
          errors: [],
          metadata: {
            address: PROGRAM_ID.toString()
          }
        },
        PROGRAM_ID,
        provider
      )
    } catch (err) {
      console.error('Failed to initialize program:', err)
      return null
    }
  }, [connection, publicKey, signTransaction])

  const fetchPosts = useCallback(async (pageNum: number = 0, isRefresh: boolean = false) => {
    if (!connection) return

    try {
      if (isRefresh) {
        setRefreshing(true)
      } else if (pageNum === 0) {
        setLoading(true)
      }
      
      setError(null)

      // Simulate API call to fetch posts
      await new Promise(resolve => setTimeout(resolve, 1000))

      const mockPosts: SocialPost[] = Array.from({ length: POSTS_PER_PAGE }, (_, i) => {
        const postId = `post_${pageNum}_${i}`
        const priceChange = (Math.random() - 0.5) * 20
        const tokenPrice = Math.random() * 100 + 1
        
        return {
          id: postId,
          author: new PublicKey('11111111111111111111111111111112'),
          authorUsername: `user${Math.floor(Math.random() * 1000)}`,
          authorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${postId}`,
          content: `This is a sample social post #${pageNum * POSTS_PER_PAGE + i + 1}. Check out my token! 🚀`,
          timestamp: Date.now() - Math.random() * 86400000,
          likes: Math.floor(Math.random() * 500),
          shares: Math.floor(Math.random() * 100),
          tips: Math.floor(Math.random() * 50),
          tokenPrice,
          priceChange24h: priceChange,
          isLiked: Math.random() > 0.7,
          isShared: Math.random() > 0.9,
          comments: Math.floor(Math.random() * 200),
          tokenSymbol: `TKN${Math.floor(Math.random() * 999)}`,
          marketCap: tokenPrice * Math.floor(Math.random() * 1000000 + 100000),
          media: Math.random() > 0.7 ? [{
            type: Math.random() > 0.5 ? 'image' : 'video',
            url: `https://picsum.photos/400/300?random=${postId}`
          }] : undefined
        }
      })

      // Apply filters
      let filteredPosts = mockPosts

      if (filters.following && publicKey) {
        // Filter for following only
        filteredPosts = filteredPosts.filter(() => Math.random() > 0.5)
      }

      if (filters.priceRange) {
        filteredPosts = filteredPosts.filter(post => 
          post.tokenPrice >= filters.priceRange!.min && 
          post.tokenPrice <= filters.priceRange!.max
        )
      }

      // Sort based on filters
      if (filters.trending) {
        filteredPosts.sort((a, b) => (b.likes + b.shares + b.tips) - (a.likes + a.shares + a.tips))
      } else if (filters.recent) {
        filteredPosts.sort((a, b) => b.timestamp - a.timestamp)
      }

      if (isRefresh || pageNum === 0) {
        setPosts(filteredPosts)
        setPage(1)
      } else {
        setPosts(prev => [...prev, ...filteredPosts])
        setPage(prev => prev + 1)
      }

      setHasMore(filteredPosts.length === POSTS_PER_PAGE)
    } catch (err) {
      console.error('Error fetching posts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch posts')
      toast.error('Failed to load social feed')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [connection, filters, publicKey])

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await fetchPosts(page)
  }, [fetchPosts, hasMore, loading, page])

  const refresh = useCallback(async () => {
    await fetchPosts(0, true)
  }, [fetchPosts])

  const setFilters = useCallback((newFilters: Partial<FeedFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }))
    setPage(0)
    setHasMore(true)
  }, [])

  const likePost = useCallback(async (postId: string) => {
    if (!publicKey || !program) {
      toast.error('Please connect your wallet')
      return
    }

    try {
      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 1000))

      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            isLiked: !post.isLiked,
            likes: post.isLiked ? post.likes - 1 : post.likes + 1
          }
        }
        return post
      }))

      toast.success('Post liked!')
    } catch (err) {
      console.error('Error liking post:', err)
      toast.error('Failed to like post')
    }
  }, [publicKey, program])

  const sharePost = useCallback(async (postId: string) => {
    if (!publicKey || !program) {
      toast.error('Please connect your wallet')
      return
    }

    try {
      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 1000))

      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            isShared: !post.isShared,
            shares: post.isShared ? post.shares - 1 : post.shares + 1
          }
        }
        return post
      }))

      toast.success('Post shared!')
    } catch (err) {
      console.error('Error sharing post:', err)
      toast.error('Failed to share post')
    }
  }, [publicKey, program])

  const tipPost = useCallback(async (postId: string, amount: number) => {
    if (!publicKey || !program) {
      toast.error('Please connect your wallet')
      return
    }

    if (amount <= 0) {
      toast.error('Tip amount must be greater than 0')
      return
    }

    try {
      // Simulate blockchain transaction for tipping
      await new Promise(resolve => setTimeout(resolve, 1500))

      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            tips: post.tips + amount
          }
        }
        return post
      }))

      toast.success(`Tipped ${amount} SOL!`)
    } catch (err) {
      console.error('Error tipping post:', err)
      toast.error('Failed to send tip')
    }
  }, [publicKey, program])

  const createPost = useCallback(async (content: string, media?: File[]) => {
    if (!publicKey || !program) {
      toast.error('Please connect your wallet')
      return
    }

    if (!content.trim()) {
      toast.error('Post content cannot be empty')
      return
    }

    try {
      // Simulate blockchain transaction for creating post
      await new Promise(resolve => setTimeout(resolve, 2000))

      const newPost: SocialPost = {
        id: `post_${Date.now()}`,
        author: publicKey,
        authorUsername: 'You',
        content: content.trim(),
        timestamp: Date.now(),
        likes: 0,
        shares: 0,
        tips: 0,
        tokenPrice: Math.random() * 10 + 1,
        priceChange24h: 0,
        isLiked: false,
        isShared: false,
        comments: 0,
        tokenSymbol: 'YOUR',
        marketCap: 100000,
        media: media && media.length > 0 ? media.map((file, index) => ({
          type: file.type.startsWith('video/') ? 'video' : 'image',
          url: URL.createObjectURL(file)
        })) : undefined
      }

      setPosts(prev => [newPost, ...prev])
      toast.success('Post created successfully!')
    } catch (err) {
      console.error('Error creating post:', err)
      toast.error('Failed to create post')
    }
  }, [publicKey, program])

  useEffect(() => {
    fetchPosts(0)
  }, [fetchPosts])

  return {
    posts,
    loading,
    error,
    hasMore,
    filters,
    refreshing,
    loadMore,
    refresh,
    setFilters,
    likePost,
    sharePost,
    tipPost,
    createPost
  }
}
```