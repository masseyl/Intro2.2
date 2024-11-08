'use client'

import { useEffect } from 'react'
import NetworkGraph from './NetworkGraph'
import { useRelationshipsStore } from '@/lib/store'

export default function RelationshipGraph() {
  const { fetchGraphData, edges, loading } = useRelationshipsStore()

  useEffect(() => {
    fetchGraphData()
  }, [fetchGraphData])

  if (loading) {
    return <div>Loading network graph...</div>
  }

  return (
    <div className="w-full">
      <NetworkGraph data={edges || []} />
    </div>
  )
} 