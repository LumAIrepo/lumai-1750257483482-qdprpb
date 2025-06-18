```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Send, Heart, Share2, Gift, TrendingUp, TrendingDown, Users, Settings, Crown } from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  id: string
  userId: string
  username: string
  avatar: string
  content: string
  timestamp: Date
  likes: number
  tips: number
  isLiked: boolean
  tokenPrice: number
  priceChange: number
}

interface RoomMember {
  userId: string
  username: string
  avatar: string
  tokenPrice: number
  priceChange: number
  isOwner: boolean
  joinedAt: Date
}

interface ChatRoom {
  id: string
  name: string
  description: string
  owner: string
  memberCount: number
  tokenPrice: number
  priceChange: number
  isPrivate: boolean
  entryFee: number
}

export default function ChatRoomPage() {
  const router = useRouter()
  const { roomId } = router.query
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()
  
  const [room, setRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<RoomMember[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showMembers, setShowMembers] = useState(false)
  const [tipAmount, setTipAmount] = useState('')
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (roomId) {
      fetchRoomData()
      fetchMessages()
      fetchMembers()
    }
  }, [roomId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchRoomData = async () => {
    try {
      setIsLoading(true)
      // Mock data - replace with actual API call
      const mockRoom: ChatRoom = {
        id: roomId as string,
        name: 'Crypto Traders Hub',
        description: 'Discuss the latest trends in crypto trading and DeFi',
        owner: 'alice.sol',
        memberCount: 247,
        tokenPrice: 12.45,
        priceChange: 8.3,
        isPrivate: false,
        entryFee: 0.1
      }
      setRoom(mockRoom)
    } catch (error) {
      console.error('Error fetching room data:', error)
      toast.error('Failed to load room data')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMessages = async () => {
    try {
      // Mock data - replace with actual API call
      const mockMessages: Message[] = [
        {
          id: '1',
          userId: 'alice.sol',
          username: 'alice.sol',
          avatar: '/avatars/alice.jpg',
          content: 'Welcome to the Crypto Traders Hub! 🚀',
          timestamp: new Date(Date.now() - 3600000),
          likes: 15,
          tips: 2.5,
          isLiked: false,
          tokenPrice: 12.45,
          priceChange: 8.3
        },
        {
          id: '2',
          userId: 'bob.sol',
          username: 'bob.sol',
          avatar: '/avatars/bob.jpg',
          content: 'Just bought more SOL at this dip! 💎🙌',
          timestamp: new Date(Date.now() - 1800000),
          likes: 8,
          tips: 1.2,
          isLiked: true,
          tokenPrice: 8.92,
          priceChange: -3.2
        },
        {
          id: '3',
          userId: 'charlie.sol',
          username: 'charlie.sol',
          avatar: '/avatars/charlie.jpg',
          content: 'Anyone else bullish on the new DeFi protocols launching this week?',
          timestamp: new Date(Date.now() - 900000),
          likes: 12,
          tips: 0.8,
          isLiked: false,
          tokenPrice: 15.67,
          priceChange: 12.1
        }
      ]
      setMessages(mockMessages)
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error('Failed to load messages')
    }
  }

  const fetchMembers = async () => {
    try {
      // Mock data - replace with actual API call
      const mockMembers: RoomMember[] = [
        {
          userId: 'alice.sol',
          username: 'alice.sol',
          avatar: '/avatars/alice.jpg',
          tokenPrice: 12.45,
          priceChange: 8.3,
          isOwner: true,
          joinedAt: new Date(Date.now() - 86400000 * 30)
        },
        {
          userId: 'bob.sol',
          username: 'bob.sol',
          avatar: '/avatars/bob.jpg',
          tokenPrice: 8.92,
          priceChange: -3.2,
          isOwner: false,
          joinedAt: new Date(Date.now() - 86400000 * 15)
        },
        {
          userId: 'charlie.sol',
          username: 'charlie.sol',
          avatar: '/avatars/charlie.jpg',
          tokenPrice: 15.67,
          priceChange: 12.1,
          isOwner: false,
          joinedAt: new Date(Date.now() - 86400000 * 7)
        }
      ]
      setMembers(mockMembers)
    } catch (error) {
      console.error('Error fetching members:', error)
      toast.error('Failed to load members')
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !connected) return

    try {
      const message: Message = {
        id: Date.now().toString(),
        userId: publicKey?.toString() || 'anonymous',
        username: 'You',
        avatar: '/avatars/default.jpg',
        content: newMessage,
        timestamp: new Date(),
        likes: 0,
        tips: 0,
        isLiked: false,
        tokenPrice: 10.0,
        priceChange: 0
      }

      setMessages(prev => [...prev, message])
      setNewMessage('')
      toast.success('Message sent!')
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }

  const handleLikeMessage = async (messageId: string) => {
    try {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isLiked: !msg.isLiked, likes: msg.isLiked ? msg.likes - 1 : msg.likes + 1 }
          : msg
      ))
      toast.success('Message liked!')
    } catch (error) {
      console.error('Error liking message:', error)
      toast.error('Failed to like message')
    }
  }

  const handleTipMessage = async (messageId: string) => {
    if (!tipAmount || !connected) return

    try {
      const amount = parseFloat(tipAmount)
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, tips: msg.tips + amount }
          : msg
      ))
      setTipAmount('')
      setSelectedMessage(null)
      toast.success(`Tipped ${amount} SOL!`)
    } catch (error) {
      console.error('Error tipping message:', error)
      toast.error('Failed to send tip')
    }
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`
  }

  const formatPriceChange = (change: number) => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-100 mb-4">Room Not Found</h2>
            <p className="text-slate-400 mb-6">The chat room you're looking for doesn't exist.</p>
            <Button 
              onClick={() => router.push('/chat')}
              className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
            >
              Back to Chat Rooms
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-inter">
      <div className="flex h-screen">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Room Header */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 rounded-none border-x-0 border-t-0">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-100">{room.name}</h1>
                    <p className="text-slate-400">{room.description}</p>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="bg-purple-600/20 text-purple-300 border-purple-500/30"
                  >
                    <Users className="w-3 h-3 mr-1" />
                    {room.memberCount}
                  </Badge>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-100">
                      {formatPrice(room.tokenPrice)}
                    </div>
                    <div className={`text-sm flex items-center ${
                      room.priceChange >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {room.priceChange >= 0 ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {formatPriceChange(room.priceChange)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMembers(!showMembers)}
                    className="border-slate-600 hover:bg-slate-700"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Members
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Messages Area */}
          <div className="flex-1 flex">
            <div className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <Card 
                      key={message.id}
                      className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50 hover:bg-slate-800/50 transition-all duration-200"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={message.avatar} />
                            <AvatarFallback className="bg-purple-600 text-white">
                              {message.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-semibold text-slate-100">
                                {message.username}
                              </span>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs font-medium text-slate-300">
                                  {formatPrice(message.tokenPrice)}
                                </span>
                                <span className={`text-xs ${
                                  message.priceChange >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {formatPriceChange(message.priceChange)}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500">
                                {formatTime(message.timestamp)}
                              </span>
                            </div>
                            <p className="text-slate-200 mb-3">{message.content}</p>
                            <div className="flex items-center space-x-4">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button