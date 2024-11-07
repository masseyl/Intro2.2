'use client'

import { useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(
  () => import('react-force-graph-2d'),
  { ssr: false }
);

export default function NetworkGraph({ profiles, relationships }: any) {
  const graphRef = useRef();

  const graphData = useMemo(() => ({
    nodes: profiles.map((p: any) => ({
      id: p.email,
      name: p.name || p.email,
      val: 1
    })),
    links: relationships.map((r: any) => ({
      source: r.source,
      target: r.target,
      strength: r.relationship_strength.score,
      label: `${r.shared_interests.join(', ')}`
    }))
  }), [profiles, relationships]);

  const fgRef = useRef<ForceGraphMethods>();

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.pauseAnimation();
    }

    return () => {
      if (fgRef.current) {
        fgRef.current.pauseAnimation();
      }
    };
  }, []);

  return (
    <div className="h-[600px] border rounded-lg">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeCanvasObject={(node: any, ctx) => {
            // Draw the node circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = '#69b3a2';
            ctx.fill();

            const label = node.name;
          const fontSize = 2;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.fillStyle = '#000';
          ctx.textAlign = 'center';
          ctx.fillText(label, node.x, node.y + 8);
          
        }}
        linkLabel={(link: any) => link.label}
        linkWidth={(link: any) => (link.strength || 1) / 2}
        nodeRelSize={6}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        d3VelocityDecay={0.3}
        cooldownTicks={100}
        onEngineStop={() => {
          if (fgRef.current) {
            fgRef.current.pauseAnimation();
          }
        }}
      />
    </div>
  );
} 