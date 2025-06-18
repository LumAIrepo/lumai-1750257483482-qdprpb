```typescript
import { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor'
import { toast } from 'sonner'

export interface ChatMessage {
  id: string
  sender: string
  senderName?: string
  senderAvatar?: string
  content: string
  timestamp: number
  type: 'text' | 'tip' | 'system'
  tipAmount?: number
  tokenPrice?: number
  reactions?: {
    [emoji: string]: {
      count: number
      users: string[]
    }
  }
  replies?: ChatMessage[]
  parentId?: string
  isEncrypted?: boolean
  roomId: string
  metadata?: {
    tokenSymbol?: string
    priceChange?: number
    socialScore?: number
  }
}

export interface ChatRoom {
  id: string
  name: string
  description?: string
  creator: string
  createdAt: number
  memberCount: number
  isPrivate: boolean
  tokenGated?: {
    tokenMint: string
    minAmount: number
  }
  lastMessage?: ChatMessage
  unreadCount: number
  avatar?: string
  tokenPrice?: number
  priceChange24h?: number
}

export interface ChatUser {
  publicKey: string
  username?: string
  avatar?: string
  tokenBalance: number
  socialScore: number
  isOnline: boolean
  lastSeen: number
  badges?: string[]
}

interface UseChatOptions {
  roomId?: string
  autoConnect?: boolean
  enableEncryption?: boolean
}

export const useChat = (options: UseChatOptions = {}) => {
  const { roomId, autoConnect = true, enableEncryption = false } = options
  const { publicKey, connected, signTransaction } = useWallet()
  const { connection } = useConnection()
  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null)
  const [users, setUsers] = useState<ChatUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState<string[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (!publicKey || !connected) return

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://api.solsocial.app/ws'
    const ws = new WebSocket(`${wsUrl}?wallet=${publicKey.toString()}`)

    ws.onopen = () => {
      setIsConnected(true)
      toast.success('Connected to chat')
      
      if (roomId) {
        ws.send(JSON.stringify({
          type: 'join_room',
          roomId,
          timestamp: Date.now()
        }))
      }
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleWebSocketMessage(data)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      if (autoConnect) {
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      toast.error('Chat connection error')
    }

    wsRef.current = ws
  }, [publicKey, connected, roomId, autoConnect])

  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'new_message':
        setMessages(prev => [...prev, data.message])
        if (data.message.roomId !== roomId) {
          setUnreadCounts(prev => ({
            ...prev,
            [data.message.roomId]: (prev[data.message.roomId] || 0) + 1
          }))
        }
        break
        
      case 'message_reaction':
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, reactions: data.reactions }
            : msg
        ))
        break
        
      case 'user_typing':
        setIsTyping(prev => {
          const filtered = prev.filter(user => user !== data.user)
          return data.isTyping ? [...filtered, data.user] : filtered
        })
        break
        
      case 'room_update':
        setRooms(prev => prev.map(room => 
          room.id === data.room.id ? data.room : room
        ))
        break
        
      case 'user_joined':
        setUsers(prev => {
          const existing = prev.find(u => u.publicKey === data.user.publicKey)
          return existing 
            ? prev.map(u => u.publicKey === data.user.publicKey ? data.user : u)
            : [...prev, data.user]
        })
        break
        
      case 'user_left':
        setUsers(prev => prev.filter(u => u.publicKey !== data.userPublicKey))
        break
        
      case 'tip_sent':
        toast.success(`Tip of ${data.amount} SOL sent!`)
        break
        
      case 'tip_received':
        toast.success(`You received a tip of ${data.amount} SOL!`)
        break
    }
  }, [roomId])

  // Send message
  const sendMessage = useCallback(async (content: string, type: 'text' | 'tip' = 'text', tipAmount?: number) => {
    if (!wsRef.current || !publicKey || !currentRoom) return

    try {
      setIsLoading(true)
      
      let transaction: Transaction | null = null
      
      if (type === 'tip' && tipAmount && tipAmount > 0) {
        // Create tip transaction
        transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(content), // Assuming content is recipient's public key for tips
            lamports: tipAmount * LAMPORTS_PER_SOL
          })
        )
        
        const { blockhash } = await connection.getLatestBlockhash()
        transaction.recentBlockhash = blockhash
        transaction.feePayer = publicKey
        
        if (signTransaction) {
          transaction = await signTransaction(transaction)
          const signature = await connection.sendRawTransaction(transaction.serialize())
          await connection.confirmTransaction(signature)
        }
      }

      const message: Partial<ChatMessage> = {
        content,
        type,
        tipAmount,
        roomId: currentRoom.id,
        timestamp: Date.now(),
        isEncrypted: enableEncryption
      }

      wsRef.current.send(JSON.stringify({
        type: 'send_message',
        message,
        signature: transaction ? 'signature_here' : undefined
      }))
      
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }, [publicKey, currentRoom, connection, signTransaction, enableEncryption])

  // React to message
  const reactToMessage = useCallback((messageId: string, emoji: string) => {
    if (!wsRef.current || !publicKey) return

    wsRef.current.send(JSON.stringify({
      type: 'react_to_message',
      messageId,
      emoji,
      user: publicKey.toString()
    }))
  }, [publicKey])

  // Join room
  const joinRoom = useCallback(async (room: ChatRoom) => {
    if (!wsRef.current || !publicKey) return

    try {
      setIsLoading(true)
      
      // Check token gating if required
      if (room.tokenGated) {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { mint: new PublicKey(room.tokenGated.tokenMint) }
        )
        
        const balance = tokenAccounts.value.reduce((sum, account) => {
          return sum + account.account.data.parsed.info.tokenAmount.uiAmount
        }, 0)
        
        if (balance < room.tokenGated.minAmount) {
          toast.error(`You need at least ${room.tokenGated.minAmount} tokens to join this room`)
          return
        }
      }

      wsRef.current.send(JSON.stringify({
        type: 'join_room',
        roomId: room.id
      }))
      
      setCurrentRoom(room)
      setUnreadCounts(prev => ({ ...prev, [room.id]: 0 }))
      
      // Load room messages
      await loadRoomMessages(room.id)
      
    } catch (error) {
      console.error('Failed to join room:', error)
      toast.error('Failed to join room')
    } finally {
      setIsLoading(false)
    }
  }, [publicKey, connection])

  // Leave room
  const leaveRoom = useCallback(() => {
    if (!wsRef.current || !currentRoom) return

    wsRef.current.send(JSON.stringify({
      type: 'leave_room',
      roomId: currentRoom.id
    }))
    
    setCurrentRoom(null)
    setMessages([])
    setUsers([])
  }, [currentRoom])

  // Create room
  const createRoom = useCallback(async (roomData: Partial<ChatRoom>) => {
    if (!publicKey) return

    try {
      setIsLoading(true)
      
      const response = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicKey.toString()}`
        },
        body: JSON.stringify(roomData)
      })
      
      if (!response.ok) throw new Error('Failed to create room')
      
      const newRoom = await response.json()
      setRooms(prev => [...prev, newRoom])
      toast.success('Room created successfully')
      
      return newRoom
      
    } catch (error) {
      console.error('Failed to create room:', error)
      toast.error('Failed to create room')
    } finally {
      setIsLoading(false)
    }
  }, [publicKey])

  // Load rooms
  const loadRooms = useCallback(async () => {
    if (!publicKey) return

    try {
      const response = await fetch(`/api/chat/rooms?wallet=${publicKey.toString()}`)
      if (!response.ok) throw new Error('Failed to load rooms')
      
      const roomsData = await response.json()
      setRooms(roomsData)
      
    } catch (error) {
      console.error('Failed to load rooms:', error)
    }
  }, [publicKey])

  // Load room messages
  const loadRoomMessages = useCallback(async (roomId: string, before?: string) => {
    try {
      const url = new URL('/api/chat/messages', window.location.origin)
      url.searchParams.set('roomId', roomId)
      if (before) url.searchParams.set('before', before)
      
      const response = await fetch(url.toString())
      if (!response.ok) throw new Error('Failed to load messages')
      
      const messagesData = await response.json()
      
      if (before) {
        setMessages(prev => [...messagesData, ...prev])
      } else {
        setMessages(messagesData)
      }
      
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }, [])

  // Typing indicator
  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!wsRef.current || !publicKey || !currentRoom) return

    wsRef.current.send(JSON.stringify({
      type: 'typing',
      roomId: currentRoom.id,
      isTyping,
      user: publicKey.toString()
    }))
  }, [publicKey, currentRoom])

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Initialize
  useEffect(() => {
    if (connected && publicKey && autoConnect) {
      connectWebSocket()
      loadRooms()
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connected, publicKey, connectWebSocket, loadRooms, autoConnect])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  return {
    // State
    messages,
    rooms,
    currentRoom,
    users,
    isConnected,
    isLoading,
    isTyping,
    unreadCounts,
    
    // Actions
    sendMessage,
    reactToMessage,
    joinRoom,
    leaveRoom,
    createRoom,
    loadRooms,
    loadRoomMessages,
    sendTypingIndicator,
    scrollToBottom,
    connectWebSocket,
    
    // Refs
    messagesEndRef
  }
}

export default useChat
```