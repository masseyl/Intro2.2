'use client'

import { useEffect, useRef, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(
  () => import('react-force-graph-2d'),
  { ssr: false }
);

interface NetworkGraphProps {
  refreshTrigger: number;
}

interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    value: number;
    strength: number;
    connection_points: string[];
  }>;
}

export default function NetworkGraph({ refreshTrigger }: NetworkGraphProps) {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const fgRef = useRef();

  // Fetch graph data from the existing endpoint
  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const response = await fetch('/api/graph');
        const data = await response.json();
        console.log('Fetched graph data:', data);
        setGraphData(data);
      } catch (error) {
        console.error('Error fetching graph data:', error);
      }
    };

    fetchGraphData();
  }, [refreshTrigger]);

  return (
    <div className="h-[600px] border rounded-lg bg-white">
      <ForceGraph2D
        ref={fgRef}
        graphData={{
          nodes: graphData.nodes,
          links: graphData.edges // ForceGraph expects 'links' instead of 'edges'
        }}
        nodeLabel={node => (node as any).label}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D) => {
          // Draw node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#4CAF50';
          ctx.fill();

          // Draw node label
          ctx.font = '4px Arial';
          ctx.fillStyle = '#000';
          ctx.textAlign = 'center';
          ctx.fillText(node.label || '', node.x, node.y + 8);
        }}
        linkLabel={(link: any) => 
          `Strength: ${link.strength}\nEmails: ${link.value}\n\nConnection Points: ${link.connection_points?.join(', ') || 'None'}`
        }
        linkWidth={(link: any) => Math.sqrt(link.value || 1) * 0.5}
        linkColor={() => '#999'}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        d3VelocityDecay={0.3}
        cooldownTicks={100}
      />
    </div>
  );
} 