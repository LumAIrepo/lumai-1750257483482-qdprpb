```tsx
'use client'

import { useState, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/use-toast'
import { 
  ImageIcon, 
  VideoIcon, 
  GifIcon, 
  SmileIcon, 
  HashIcon,
  TrendingUpIcon,
  CoinsIcon,
  XIcon,
  LoaderIcon
} from 'lucide-react'

interface PostCreatorProps {
  onPostCreated?: (post: any) => void
  className?: string
}

export default function PostCreator({ onPostCreated, className }: PostCreatorProps) {
  const { publicKey, connected } = useWallet()
  const [content, setContent] = useState('')
  const [tokenAmount, setTokenAmount] = useState('')
  const [selectedMedia, setSelectedMedia] = useState<File[]>([])
  const [hashtags, setHashtags] = useState<string[]>([])
  const [currentHashtag, setCurrentHashtag] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const [showTokenOptions, setShowTokenOptions] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const handleContentChange = (value: string) => {
    setContent(value)
    
    // Auto-detect hashtags
    const hashtagMatches = value.match(/#\w+/g)
    if (hashtagMatches) {
      const newHashtags = hashtagMatches.map(tag => tag.substring(1))
      setHashtags(prev => [...new Set([...prev, ...newHashtags])])
    }
  }

  const addHashtag = () => {
    if (currentHashtag.trim() && !hashtags.includes(currentHashtag.trim())) {
      setHashtags(prev => [...prev, currentHashtag.trim()])
      setCurrentHashtag('')
    }
  }

  const removeHashtag = (tagToRemove: string) => {
    setHashtags(prev => prev.filter(tag => tag !== tagToRemove))
  }

  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      setSelectedMedia(prev => [...prev, ...files])
    }
  }

  const removeMedia = (index: number) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index))
  }

  const handlePost = async () => {
    if (!connected || !publicKey) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create posts",
        variant: "destructive"
      })
      return
    }

    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter some content for your post",
        variant: "destructive"
      })
      return
    }

    setIsPosting(true)

    try {
      // Simulate post creation with tokenized interaction
      const postData = {
        id: Date.now().toString(),
        content: content.trim(),
        author: publicKey.toString(),
        timestamp: new Date().toISOString(),
        hashtags,
        media: selectedMedia.map(file => ({
          type: file.type.startsWith('image/') ? 'image' : 'video',
          name: file.name,
          size: file.size
        })),
        tokenAmount: tokenAmount ? parseFloat(tokenAmount) : 0,
        likes: 0,
        shares: 0,
        comments: 0,
        tokenPrice: Math.random() * 10 + 1 // Simulated token price
      }

      // Here you would integrate with your Solana program
      // await createPost(postData)

      toast({
        title: "Post created successfully!",
        description: `Your post has been published${tokenAmount ? ` with ${tokenAmount} tokens` : ''}`,
      })

      // Reset form
      setContent('')
      setTokenAmount('')
      setSelectedMedia([])
      setHashtags([])
      setShowTokenOptions(false)

      onPostCreated?.(postData)

    } catch (error) {
      console.error('Error creating post:', error)
      toast({
        title: "Failed to create post",
        description: "Please try again later",
        variant: "destructive"
      })
    } finally {
      setIsPosting(false)
    }
  }

  const characterCount = content.length
  const maxCharacters = 280

  return (
    <Card className={`bg-slate-900/50 backdrop-blur-xl border-slate-700/50 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10 ring-2 ring-purple-500/20">
            <AvatarImage src="/placeholder-avatar.jpg" />
            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-500 text-white">
              {publicKey ? publicKey.toString().slice(0, 2).toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-slate-100 text-lg font-semibold">
              Create Post
            </CardTitle>
            <p className="text-slate-400 text-sm">
              Share your thoughts and earn tokens
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTokenOptions(!showTokenOptions)}
            className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
          >
            <CoinsIcon className="h-4 w-4 mr-1" />
            Tokenize
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Content Input */}
        <div className="space-y-2">
          <Textarea
            placeholder="What's happening in the Solana ecosystem?"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="min-h-[120px] bg-slate-800/50 border-slate-600/50 text-slate-100 placeholder:text-slate-400 focus:border-purple-500/50 focus:ring-purple-500/20 resize-none rounded-xl"
            maxLength={maxCharacters}
          />
          <div className="flex justify-between items-center text-sm">
            <span className={`${characterCount > maxCharacters * 0.9 ? 'text-pink-400' : 'text-slate-400'}`}>
              {characterCount}/{maxCharacters}
            </span>
            {characterCount > maxCharacters && (
              <span className="text-pink-400 text-xs">Character limit exceeded</span>
            )}
          </div>
        </div>

        {/* Token Options */}
        {showTokenOptions && (
          <Card className="bg-slate-800/30 border-slate-600/30 rounded-xl">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <TrendingUpIcon className="h-4 w-4 text-purple-400" />
                <Label className="text-slate-200 font-medium">Token Incentive</Label>
              </div>
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  className="bg-slate-700/50 border-slate-600/50 text-slate-100 placeholder:text-slate-400 focus:border-purple-500/50 rounded-xl"
                  step="0.01"
                  min="0"
                />
                <p className="text-xs text-slate-400">
                  Set token rewards for interactions with your post
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="space-y-2">
            <Label className="text-slate-200 text-sm font-medium">Hashtags</Label>
            <div className="flex flex-wrap gap-2">
              {hashtags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30 rounded-lg"
                >
                  #{tag}
                  <button
                    onClick={() => removeHashtag(tag)}
                    className="ml-1 hover:text-purple-100"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Add Hashtag */}
        <div className="flex space-x-2">
          <Input
            placeholder="Add hashtag..."
            value={currentHashtag}
            onChange={(e) => setCurrentHashtag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addHashtag()}
            className="flex-1 bg-slate-800/50 border-slate-600/50 text-slate-100 placeholder:text-slate-400 focus:border-purple-500/50 rounded-xl"
          />
          <Button
            onClick={addHashtag}
            variant="outline"
            size="sm"
            className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50 rounded-xl"
          >
            <HashIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Media Preview */}
        {selectedMedia.length > 0 && (
          <div className="space-y-2">
            <Label className="text-slate-200 text-sm font-medium">Media</Label>
            <div className="grid grid-cols-2 gap-2">
              {selectedMedia.map((file, index) => (
                <div
                  key={index}
                  className="relative bg-slate-800/50 rounded-xl p-3 border border-slate-600/30"
                >
                  <div className="flex items-center space-x-2">
                    {file.type.startsWith('image/') ? (
                      <ImageIcon className="h-4 w-4 text-purple-400" />
                    ) : (
                      <VideoIcon className="h-4 w-4 text-purple-400" />
                    )}
                    <span className="text-slate-300 text-sm truncate flex-1">
                      {file.name}
                    </span>
                    <button
                      onClick={() => removeMedia(index)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator className="bg-slate-700/50" />

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleMediaSelect(e, 'image')}
              className="hidden"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              multiple
              onChange={(e) => handleMediaSelect(e, 'video')}
              className="hidden"
            />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-xl"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => videoInputRef.current?.click()}
              className="text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-xl"
            >
              <VideoIcon className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-xl"
            >
              <GifIcon className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-xl"
            >
              <SmileIcon className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={handlePost}
            disabled={!connected || !content.trim() || characterCount > maxCharacters || isPosting}
            className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-medium px-6 rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isPosting ? (
              <>
                <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              'Post'
            )}
          </Button>
        </div>

        {!connected && (
          <div className="text-center py-4">
            <p className="text-slate-400 text-sm">
              Connect your wallet to start creating posts
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```