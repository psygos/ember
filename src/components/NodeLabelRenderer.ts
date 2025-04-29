import * as THREE from 'three';
import { EMBER_DEEP } from '../utils/GraphColors';
import { store, ViewType } from '../store/AnalysisStore';
import { GraphNode } from '../models/GraphModels';

/**
 * Specialized component to efficiently render text labels for graph nodes
 * using a single canvas overlay instead of DOM elements for each label
 * 
 * This is a direct port of Swift's label rendering from GraphViewModule
 */
export class NodeLabelsRenderer {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera!: THREE.Camera;
  private zoom: number = 1;
  
  // Text color matching Swift's emberDeep
  private readonly TEXT_COLOR = EMBER_DEEP;
  private readonly LABEL_BG_COLOR = 'rgba(255, 255, 255, 0.9)';
  
  // High-DPI rendering and label hit detection
  private dpr: number;
  private width: number;
  private height: number;
  private labelBoxes: { id: string; x: number; y: number; width: number; height: number; }[] = [];
  
  constructor(container: HTMLElement) {
    this.container = container;
    
    // Create canvas with pointer-events-none so it doesn't interfere with clicking
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '20';
    
    // Setup canvas for high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    this.dpr = dpr;
    this.width = container.clientWidth || 800;
    this.height = container.clientHeight || 600;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    // Scale context so drawing uses CSS pixels
    const ctx = this.canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    this.ctx = ctx;
    this.ctx.scale(dpr, dpr);
    
    // Add to container
    container.appendChild(this.canvas);
    
    // Handle resize
    window.addEventListener('resize', this.onResize.bind(this));
  }
  
  public onResize() {
    // Update canvas dimensions on resize
    this.width = this.container.clientWidth || 800;
    this.height = this.container.clientHeight || 600;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    // Reset transform and scale context
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
    this.render();
  }
  
  public updateCamera(camera: THREE.Camera, zoom: number): void {
    this.camera = camera;
    this.zoom = zoom;
  }
  
  public render() {
    const { nodes, selectedNode, hoveredNode } = store.state.graphState;
    
    // Clear canvas and reset hit boxes
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.labelBoxes = [];
    
    // Determine if a recall round is currently active
    const isRecallRoundActive = store.state.selectedView === ViewType.Recall &&
                                store.state.graphState.game.active;
    // Create a count of labels rendered for debugging
    let renderedLabels = 0;

    // If in recall mode, render labels for all revealed (non-pending) nodes
    if (isRecallRoundActive) {
      // Pending nodes: those still in chunkIDs; revealed = all others
      const remaining = new Set<string>(store.state.graphState.game.chunkIDs);
      nodes.forEach((node: GraphNode) => {
        if (!remaining.has(node.id)) {
          this.renderNodeLabel(node, false);
          renderedLabels++;
        }
      });
      return;
    }
    
    // First pass: render labels for background nodes
    // This ensures proper layering - connected nodes are drawn first, then selected/hovered on top
    nodes.forEach((node: GraphNode) => {
      const isSelected = node.id === selectedNode;
      const isHovered = node.id === hoveredNode;
      const isConnected = selectedNode ? 
        nodes.get(selectedNode)?.connections.has(node.id) : false;
      
      // Match Swift's visibility logic exactly:
      // if isSelected || isHovered || (isConnected && node.animationProgress > 0.5)
      if (!isSelected && !isHovered && isConnected && node.animationProgress > 0.5) {
        this.renderNodeLabel(node, false);
        renderedLabels++;
      }
    });
    
    // Second pass: render labels for hovered/selected nodes (on top)
    nodes.forEach((node: GraphNode) => {
      const isSelected = node.id === selectedNode;
      const isHovered = node.id === hoveredNode;
      
      // Only render selected/hovered nodes in second pass
      if (isSelected || isHovered) {
        this.renderNodeLabel(node, isSelected);
        renderedLabels++;
      }
    });
  }
  
  private renderNodeLabel(node: GraphNode, isSelected: boolean) {
    // Project node world position to screen coordinates
    const vector = new THREE.Vector3(node.position.x, node.position.y, 0).project(this.camera);
    const screenX = (vector.x + 1) * this.width / 2;
    const screenY = (1 - vector.y) * this.height / 2;
    // Calculate pixel per unit based on camera frustum
    const orthoCam = this.camera as THREE.OrthographicCamera;
    const pixelPerUnit = this.width / (orthoCam.right - orthoCam.left);
    const pixelRadius = (node.size / 2) * pixelPerUnit;
    const pixelOffset = 10 * pixelPerUnit;
    const zoom = this.zoom;
    
    // Font size calculation from Swift:
    // Matches SwiftUI: .font(.system(size: min(node.size * 0.6, 14) * (1/state.zoomLevel)))
    // Applying inverse zoom is the key to making text readable at all zoom levels
    const baseFontSize = Math.min(node.size * 0.6, 14);
    const fontSize = baseFontSize * (1 / zoom);
    
    // Use same font styling as Swift
    this.ctx.font = `${isSelected ? 'bold' : 'normal'} ${fontSize}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Measure text for proper label sizing
    const textWidth = this.ctx.measureText(node.id).width;
    
    // Padding also needs to scale inversely with zoom just like font
    const padding = 6 * (1 / zoom);
    const rectWidth = textWidth + padding * 2;
    const rectHeight = fontSize + padding * 2;
    
    // Draw background with same color and opacity as Swift
    this.ctx.fillStyle = this.LABEL_BG_COLOR;
    this.ctx.beginPath();
    
    // Corner radius also scales inversely with zoom
    const cornerRadius = 4 * (1 / zoom);
    
    // Draw rounded rectangle for label background
    if (this.ctx.roundRect) {
      // Use native roundRect if available
      this.ctx.roundRect(
        screenX - rectWidth / 2,
        screenY + pixelRadius + pixelOffset - rectHeight / 2,
        rectWidth,
        rectHeight,
        cornerRadius
      );
    } else {
      // Fallback for browsers without roundRect
      this.drawRoundedRect(
        screenX - rectWidth / 2,
        screenY + pixelRadius + pixelOffset - rectHeight / 2,
        rectWidth,
        rectHeight,
        cornerRadius
      );
    }
    this.ctx.fill();
    
    // Record label bounding box for hit testing
    this.labelBoxes.push({ id: node.id, x: screenX - rectWidth / 2, y: screenY + pixelRadius + pixelOffset - rectHeight / 2, width: rectWidth, height: rectHeight });
    
    // Draw text with exact same color as Swift
    this.ctx.fillStyle = this.TEXT_COLOR;
    this.ctx.fillText(node.id, screenX, screenY + pixelRadius + pixelOffset);
  }
  
  // Fallback implementation of roundRect for browsers that don't support it
  private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.arcTo(x + width, y, x + width, y + radius, radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.arcTo(x, y + height, x, y + height - radius, radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.arcTo(x, y, x + radius, y, radius);
    this.ctx.closePath();
  }
  
  /** Hit test a click at CSS coordinates against rendered labels */
  public hitTest(x: number, y: number): string | null {
    for (const box of this.labelBoxes) {
      if (x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height) {
        return box.id;
      }
    }
    return null;
  }
  
  public destroy() {
    window.removeEventListener('resize', this.onResize.bind(this));
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}