'use client'

import { useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(
  () => import('react-force-graph-2d'),
  { ssr: false }
);

export default function NetworkGraph({ profiles, relationships }: any) {
  const graphRef = useRef();

  const graphData = useMemo(() => {
    const uniqueNodes = new Map();
    profiles.forEach((p: any) => {
      if (!uniqueNodes.has(p.email)) {
        uniqueNodes.set(p.email, {
          id: p.email,
          name: p.name || p.email,
          val: 1,
        });
      }
    });

    const uniqueLinks = new Map();
    relationships.forEach((r: any) => {
      const linkKey = `${r.source}->${r.target}`;
      if (!uniqueLinks.has(linkKey)) {
        uniqueLinks.set(linkKey, {
          source: r.source,
          target: r.target,
          strength: r.relationship_strength.score,
          label: `${r.shared_interests.join(', ')}`,
        });
      }
    });

    return {
      nodes: Array.from(uniqueNodes.values()),
      links: Array.from(uniqueLinks.values()),
    };
  }, [profiles, relationships]);

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