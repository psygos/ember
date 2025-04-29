// This file contains all the interfaces for our graph visualization
// Ported from GraphModels.swift

import * as THREE from 'three';

export interface GraphNode {
  id: string;
  position: THREE.Vector2;
  size: number;
  ring: number;
  connections: Set<string> | ReadonlySet<string>;
  animationProgress: number;
  velocity: THREE.Vector2;
  label: string;
}

export interface EntityItem {
  id: string;
  text: string;
  label: string;
}

export interface GraphState {
  nodes: Map<string, GraphNode>;
  selectedNode: string | null;
  hoveredNode: string | null;
  viewOffset: THREE.Vector2;
  zoomLevel: number;
  expandedLabels: Set<string>;
  // Filter mode during recall: full graph or unlocked-only
  filterMode: 'full' | 'unlockedOnly';
  // Current recall round state: active flag and pending chunk IDs
  game: {
    active: boolean;
    chunkIDs: string[];
  };
}

// Group nodes by their label type
export function groupNodesByLabel(nodes: Map<string, GraphNode> | ReadonlyMap<string, GraphNode>): Record<string, GraphNode[]> {
  const grouped: Record<string, GraphNode[]> = {};
  
  nodes.forEach(node => {
    if (!grouped[node.label]) {
      grouped[node.label] = [];
    }
    grouped[node.label].push(node);
  });
  
  return grouped;
}