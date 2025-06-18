```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Send, Gift, Heart, Share2, TrendingUp, TrendingDown, Users, Crown } from 'lucide-react'

interface Message {
  id: string
  sender: {
    publicKey: string
    username: string
    avatar?: string
    tokenPrice: number
    priceChange: number
    isCreator: boolean
  }
  content: string
  timestamp: Date
  tips: number
  likes: number
  isLiked: boolean
  isTipped: boolean
}

interface ChatRoomProps {
  roomId: string
  creatorPublicKey: string
}

export default function ChatRoom({ roomId, creatorPublicKey }: ChatRoomProps) {
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [roomInfo, setRoomInfo] = useState({
    name: 'Premium Chat',
    memberCount: 42,
    tokenPrice: 0.85,
    priceChange: 12.5,
    creatorUsername: 'cryptoinfluencer'
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Simulate loading messages
    const mockMessages: Message[] = [
      {
        id: '1',
        sender: {
          publicKey: creatorPublicKey,
          username: 'cryptoinfluencer',
          avatar: '/avatars/creator.jpg',
          tokenPrice: 0.85,
          priceChange: 12.5,
          isCreator: true
        },
        content: 'Welcome to my premium chat! Big alpha coming soon 🚀',
        timestamp: new Date(Date.now() - 3600000),
        tips: 15,
        likes: 28,
        isLiked: false,
        isTipped: false
      },
      {
        id: '2',
        sender: {
          publicKey: 'Bx7eKRQeubkxrnyoDZskMhLuGnMvkzuuo26jLNFFXgqd',
          username: 'degentrader',
          avatar: '/avatars/user1.jpg',
          tokenPrice: 0.12,
          priceChange: -5.2,
          isCreator: false
        },
        content: 'Thanks for the insights! Your calls have been printing 💰',
        timestamp: new Date(Date.now() - 1800000),
        tips: 3,
        likes: 12,
        isLiked: true,
        isTipped: false
      },
      {
        id: '3',
        sender: {
          publicKey: 'DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1',
          username: 'moonboy',
          avatar: '/avatars/user2.jpg',
          tokenPrice: 0.08,
          priceChange: 8.7,
          isCreator: false
        },
        content: 'When moon ser? 🌙',
        timestamp: new Date(Date.now() - 900000),
        tips: 1,
        likes: 5,
        isLiked: false,
        isTipped: false
      }
    ]
    setMessages(mockMessages)
  }, [creatorPublicKey])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !connected || !publicKey) return

    setIsLoading(true)
    try {
      const message: Message = {
        id: Date.now().toString(),
        sender: {
          publicKey: publicKey.toString(),
          username: 'You',
          tokenPrice: 0.05,
          priceChange: 2.1,
          isCreator: false
        },
        content: newMessage,
        timestamp: new Date(),
        tips: 0,
        likes: 0,
        isLiked: false,
        isTipped: false
      }

      setMessages(prev => [...prev, message])
      setNewMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLike = async (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { 
            ...msg, 
            likes: msg.isLiked ? msg.likes - 1 : msg.likes + 1,
            isLiked: !msg.isLiked 
          }
        : msg
    ))
  }

  const handleTip = async (messageId: string) => {
    if (!connected) return

    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { 
            ...msg, 
            tips: msg.isTipped ? msg.tips - 1 : msg.tips + 1,
            isTipped: !msg.isTipped 
          }
        : msg
    ))
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 font-inter">
      {/* Chat Header */}
      <Card className="rounded-none border-0 border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12 ring-2 ring-purple-500/20">
                <AvatarImage src="/avatars/creator.jpg" />
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-500 text-white">
                  CI
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl text-slate-100 flex items-center gap-2">
                  {roomInfo.name}
                  <Crown className="h-5 w-5 text-yellow-500" />
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {roomInfo.memberCount} members
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-medium">
                      ${roomInfo.tokenPrice.toFixed(3)}
                    </span>
                    <Badge 
                      variant="secondary" 
                      className={`${
                        roomInfo.priceChange >= 0 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}
                    >
                      {roomInfo.priceChange >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(roomInfo.priceChange).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="group">
              <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50 hover:bg-slate-800/50 transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10 ring-2 ring-slate-600/30">
                      <AvatarImage src={message.sender.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm">
                        {message.sender.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-200">
                          {message.sender.username}
                        </span>
                        {message.sender.isCreator && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>${message.sender.tokenPrice.toFixed(3)}</span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs px-1.5 py-0.5 ${
                              message.sender.priceChange >= 0 
                                ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}
                          >
                            {message.sender.priceChange >= 0 ? '+' : ''}
                            {message.sender.priceChange.toFixed(1)}%
                          </Badge>
                        </div>
                        <span className="text-xs text-slate-500">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      
                      <p className="text-slate-100 mb-3 leading-relaxed">
                        {message.content}
                      </p>
                      
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLike(message.id)}
                          className={`h-8 px-3 text-xs hover:bg-pink-500/20 transition-all duration-200 ${
                            message.isLiked 
                              ? 'text-pink-400 bg-pink-500/10' 
                              : 'text-slate-400 hover:text-pink-400'
                          }`}
                        >
                          <Heart className={`h-4 w-4 mr-1 ${message.isLiked ? 'fill-current' : ''}`} />
                          {message.likes}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTip(message.id)}
                          className={`h-8 px-3 text-xs hover:bg-purple-500/20 transition-all duration-200 ${
                            message.isTipped 
                              ? 'text-purple-400 bg-purple-500/10' 
                              : 'text-slate-400 hover:text-purple-400'
                          }`}
                        >
                          <Gift className="h-4 w-4 mr-1" />
                          {message.tips}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-xs text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/20 transition-all duration-200"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-slate-700">
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={connected ? "Type your message..." : "Connect wallet to chat"}
                disabled={!connected || isLoading}
                className="flex-1 bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!connected || !newMessage.trim() || isLoading}
                className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white border-0 transition-all duration-200 hover:scale-105"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {!connected && (
              <p className="text-xs text-slate-400 mt-2">
                Connect your wallet to participate in the chat
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```