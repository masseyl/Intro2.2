'use client'

import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/lib/store'

export default function GraphVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const relationships = useSelector((state: RootState) => state.relationships.data)

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        // Clear the canvas
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

        // Draw the graph here
        // This is a placeholder - you'll need to implement the actual graph drawing logic
        relationships.forEach((relationship, index) => {
          ctx.beginPath()
          ctx.arc(50 + index * 100, 100, 20, 0, 2 * Math.PI)
          ctx.fillStyle = 'blue'
          ctx.fill()
          ctx.stroke()
        })
      }
    }
  }, [relationships])

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Social Graph</h2>
      <canvas ref={canvasRef} width={800} height={400} className="border border-gray-300"></canvas>
    </div>
  )
}
