import { useEffect, useRef, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

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

  return (
    <div className="h-[600px] border rounded-lg">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeLabel={(node: any) => node.name}
        linkLabel={(link: any) => link.label}
        linkWidth={(link: any) => (link.strength || 1) / 2}
        nodeRelSize={6}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        d3VelocityDecay={0.3}
      />
    </div>
  );
} 