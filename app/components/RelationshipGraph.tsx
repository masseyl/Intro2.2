'use client'

import { useEffect } from 'react'
import NetworkGraph from './NetworkGraph'
import { useRelationshipsStore } from '../lib/store'

export default function RelationshipGraph() {
  const { fetchGraphData, nodes, edges } = useRelationshipsStore()

  useEffect(() => {
    fetchGraphData()
  }, [fetchGraphData])

  // Transform the data for NetworkGraph
  const graphData = {
    nodes: nodes,
    edges: edges
  }

  return (
    <div className="w-full h-[600px] bg-white rounded-lg shadow-lg p-4">
      <NetworkGraph data={edges} />
    </div>
  )
} 