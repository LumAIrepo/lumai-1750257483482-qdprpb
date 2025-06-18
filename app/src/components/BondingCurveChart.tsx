```tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react'

interface PricePoint {
  supply: number
  price: number
  timestamp: number
}

interface BondingCurveChartProps {
  tokenAddress?: string
  currentSupply?: number
  currentPrice?: number
  className?: string
}

export default function BondingCurveChart({
  tokenAddress,
  currentSupply = 1000000,
  currentPrice = 0.001,
  className = ''
}: BondingCurveChartProps) {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [timeframe, setTimeframe] = useState<'1H' | '24H' | '7D' | '30D'>('24H')
  const [isLoading, setIsLoading] = useState(true)

  // Generate bonding curve data
  const bondingCurveData = useMemo(() => {
    const points: PricePoint[] = []
    const maxSupply = 10000000
    const basePrice = 0.0001
    
    for (let supply = 0; supply <= maxSupply; supply += maxSupply / 100) {
      // Exponential bonding curve: price = basePrice * (supply / maxSupply)^2
      const price = basePrice * Math.pow(supply / maxSupply, 2)
      points.push({
        supply,
        price,
        timestamp: Date.now()
      })
    }
    
    return points
  }, [])

  // Generate mock price history
  useEffect(() => {
    const generatePriceHistory = () => {
      const history: PricePoint[] = []
      const now = Date.now()
      const intervals = timeframe === '1H' ? 60 : timeframe === '24H' ? 24 : timeframe === '7D' ? 7 : 30
      const intervalMs = timeframe === '1H' ? 60000 : timeframe === '24H' ? 3600000 : timeframe === '7D' ? 86400000 : 86400000
      
      let price = currentPrice * 0.8
      let supply = currentSupply * 0.8
      
      for (let i = intervals; i >= 0; i--) {
        const timestamp = now - (i * intervalMs)
        const volatility = 0.1
        const change = (Math.random() - 0.5) * volatility
        price = Math.max(0.0001, price * (1 + change))
        supply = Math.min(10000000, supply + Math.random() * 10000)
        
        history.push({
          supply,
          price,
          timestamp
        })
      }
      
      setPriceHistory(history)
      setIsLoading(false)
    }

    generatePriceHistory()
  }, [timeframe, currentSupply, currentPrice])

  const priceChange = useMemo(() => {
    if (priceHistory.length < 2) return { value: 0, percentage: 0 }
    
    const latest = priceHistory[priceHistory.length - 1]
    const previous = priceHistory[priceHistory.length - 2]
    const change = latest.price - previous.price
    const percentage = (change / previous.price) * 100
    
    return { value: change, percentage }
  }, [priceHistory])

  const chartDimensions = {
    width: 800,
    height: 400,
    padding: 40
  }

  const getChartPath = (data: PricePoint[], type: 'price' | 'curve') => {
    if (data.length === 0) return ''
    
    const maxPrice = Math.max(...data.map(d => d.price))
    const minPrice = Math.min(...data.map(d => d.price))
    const maxSupply = Math.max(...data.map(d => d.supply))
    
    const points = data.map((point, index) => {
      const x = chartDimensions.padding + 
        ((point.supply / maxSupply) * (chartDimensions.width - 2 * chartDimensions.padding))
      const y = chartDimensions.height - chartDimensions.padding - 
        (((point.price - minPrice) / (maxPrice - minPrice)) * (chartDimensions.height - 2 * chartDimensions.padding))
      
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    
    return points.join(' ')
  }

  const currentPoint = useMemo(() => {
    const maxPrice = Math.max(...bondingCurveData.map(d => d.price))
    const minPrice = Math.min(...bondingCurveData.map(d => d.price))
    const maxSupply = Math.max(...bondingCurveData.map(d => d.supply))
    
    const x = chartDimensions.padding + 
      ((currentSupply / maxSupply) * (chartDimensions.width - 2 * chartDimensions.padding))
    const y = chartDimensions.height - chartDimensions.padding - 
      (((currentPrice - minPrice) / (maxPrice - minPrice)) * (chartDimensions.height - 2 * chartDimensions.padding))
    
    return { x, y }
  }, [bondingCurveData, currentSupply, currentPrice])

  return (
    <Card className={`bg-slate-900/50 backdrop-blur-xl border-slate-700/50 ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Bonding Curve</h3>
              <p className="text-sm text-slate-400">Price discovery mechanism</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {(['1H', '24H', '7D', '30D'] as const).map((tf) => (
              <Button
                key={tf}
                variant={timeframe === tf ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeframe(tf)}
                className={timeframe === tf 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white' 
                  : 'text-slate-400 hover:text-slate-100'
                }
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-slate-400">Current Price</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-100">
                ${currentPrice.toFixed(6)}
              </span>
              <Badge 
                variant={priceChange.percentage >= 0 ? 'default' : 'destructive'}
                className={priceChange.percentage >= 0 
                  ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
                }
              >
                {priceChange.percentage >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {Math.abs(priceChange.percentage).toFixed(2)}%
              </Badge>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-slate-400">Total Supply</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">
              {(currentSupply / 1000000).toFixed(2)}M
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-pink-400" />
              <span className="text-sm text-slate-400">Market Cap</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">
              ${((currentSupply * currentPrice) / 1000).toFixed(1)}K
            </div>
          </div>
        </div>

        <div className="bg-slate-800/30 rounded-xl p-4 backdrop-blur-sm">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <div className="relative">
              <svg
                width={chartDimensions.width}
                height={chartDimensions.height}
                className="w-full h-auto"
                viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
              >
                <defs>
                  <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity="0.8" />
                  </linearGradient>
                  <linearGradient id="priceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                <g stroke="#374151" strokeWidth="1" opacity="0.3">
                  {[0, 1, 2, 3, 4].map(i => (
                    <line
                      key={`h-${i}`}
                      x1={chartDimensions.padding}
                      y1={chartDimensions.padding + (i * (chartDimensions.height - 2 * chartDimensions.padding) / 4)}
                      x2={chartDimensions.width - chartDimensions.padding}
                      y2={chartDimensions.padding + (i * (chartDimensions.height - 2 * chartDimensions.padding) / 4)}
                    />
                  ))}
                  {[0, 1, 2, 3, 4].map(i => (
                    <line
                      key={`v-${i}`}
                      x1={chartDimensions.padding + (i * (chartDimensions.width - 2 * chartDimensions.padding) / 4)}
                      y1={chartDimensions.padding}
                      x2={chartDimensions.padding + (i * (chartDimensions.width - 2 * chartDimensions.padding) / 4)}
                      y2={chartDimensions.height - chartDimensions.padding}
                    />
                  ))}
                </g>

                {/* Bonding curve */}
                <path
                  d={getChartPath(bondingCurveData, 'curve')}
                  fill="none"
                  stroke="url(#curveGradient)"
                  strokeWidth="3"
                  opacity="0.8"
                />

                {/* Price history */}
                <path
                  d={getChartPath(priceHistory, 'price')}
                  fill="none"
                  stroke="url(#priceGradient)"
                  strokeWidth="2"
                  opacity="0.9"
                />

                {/* Current position marker */}
                <circle
                  cx={currentPoint.x}
                  cy={currentPoint.y}
                  r="6"
                  fill="#ec4899"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="animate-pulse"
                />
              </svg>

              <div className="absolute bottom-4 left-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-gradient-to-r from-purple-600 to-pink-500 rounded"></div>
                  <span className="text-slate-400">Bonding Curve</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded"></div>
                  <span className="text-slate-400">Price History</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                  <span className="text-slate-400">Current Position</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-xs text-slate-500 text-center">
          Price increases exponentially with token supply following the bonding curve mechanism
        </div>
      </div>
    </Card>
  )
}
```