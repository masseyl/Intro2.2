'use client';

import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network/standalone';
import { useRelationshipsStore } from '../lib/store';

export default function GraphVisualization() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { nodes, edges, fetchGraphData } = useRelationshipsStore();

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  useEffect(() => {
    if (containerRef.current && nodes.length > 0 && edges.length > 0) {
      const data = {
        nodes,
        edges,
      };
      const options = {
        nodes: {
          shape: 'dot',
          size: 16,
        },
        edges: {
          width: 2,
        },
        physics: {
          stabilization: false,
        },
      };
      new Network(containerRef.current, data, options);
    }
  }, [nodes, edges]);

  return <div ref={containerRef} style={{ height: '600px' }} />;
}
