import * as THREE from 'three';
import { store } from '../store/AnalysisStore';
import { GraphNode } from '../models/GraphModels';
import { NodeLabelsRenderer } from './NodeLabelRenderer';
import { EMBER, PENDING, labelColor } from '../utils/GraphColors';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

/**
 * GraphRenderer class - optimized and enhanced version based on Swift implementation
 * This renderer uses WebGL for high performance and carefully mimics the SwiftUI version
 */
export class GraphRenderer {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private nodeObjects: Map<string, THREE.Object3D> = new Map();
  private connectionLines: THREE.Group | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private container: HTMLElement;
  private frameId: number | null = null;
  private labelRenderer: NodeLabelsRenderer;
  
  // Color constants matching Swift version exactly
  private readonly EMBER_ORANGE = new THREE.Color(EMBER);
  // Scale factor for node size to render smaller, sharper nodes
  private readonly NODE_SCALE = 0.8;
  // Reduced segment count for faster rendering (very minor visual impact)
  private readonly CIRCLE_SEGMENTS = 32;
  
  private sceneColors: Record<string, THREE.Color> = {};
  // Renderer resolution for LineMaterial
  private resolution: THREE.Vector2 = new THREE.Vector2();
  
  constructor(container: HTMLElement) {
    // Store container reference
    this.container = container;
    
    // Clear container first to prevent duplicate elements
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    // Create scene with black background (matches Swift)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    
    // Get dimensions with fallbacks to ensure we always have valid values
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    const aspect = width / height;
    const frustrumSize = 1000;
    
    // Create orthographic camera (like in Swift)
    // This creates a 2D-like view that's easier to control
    this.camera = new THREE.OrthographicCamera(
      frustrumSize * aspect / -2,
      frustrumSize * aspect / 2,
      frustrumSize / 2,
      frustrumSize / -2,
      1,
      2000
    );
    this.camera.position.z = 1000;
    
    // Create high-quality renderer with anti-aliasing
    this.renderer = new THREE.WebGLRenderer({
      antialias: false, // disable AA for large scenes – big perf win
      alpha: true,
      premultipliedAlpha: false,
      precision: 'highp',
      powerPreference: 'high-performance'
    });
    
    // Set up renderer
    this.renderer.setSize(width, height);
    // Limit devicePixelRatio to 1.5 to lower GPU load on high-DPI screens
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    // Track resolution for line materials
    this.resolution.set(width, height);
    // Enable dithering for smoother gradients
    const gl = this.renderer.getContext(); gl.enable(gl.DITHER);
    this.renderer.autoClear = true;
    
    // Ensure WebGL canvas looks crisp and fills container
    const canvas = this.renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.id = 'graph-webgl-canvas';
    
    // Add canvas to container
    container.appendChild(canvas);
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Add mouse event listeners
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('click', this.onClick.bind(this));
    
    // Initialize label renderer (after WebGL canvas is added)
    this.labelRenderer = new NodeLabelsRenderer(container);
    
    // Process graph data and start animation
    this.updateGraph();
    this.animate();
  }
  
  // Get canvas element for DOM management
  public getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }
  
  private onWindowResize() {
    // Get new dimensions
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;
    const aspect = width / height;
    const frustrumSize = 1000;
    
    // Update camera frustum to maintain aspect ratio
    this.camera.left = frustrumSize * aspect / -2;
    this.camera.right = frustrumSize * aspect / 2;
    this.camera.top = frustrumSize / 2;
    this.camera.bottom = frustrumSize / -2;
    this.camera.updateProjectionMatrix();
    
    // Update renderer size
    this.renderer.setSize(width, height);
    // Update renderer and resolution
    this.resolution.set(width, height);
    // Update any existing LineMaterial resolutions
    this.scene.traverse(obj => {
      if (obj instanceof Line2) {
        (obj as any).material.resolution.set(width, height);
      }
    });
    
    // Update label renderer
    this.labelRenderer.onResize();
    
    // Redraw scene
    this.render();
  }
  
  private onMouseMove(event: MouseEvent) {
    // Calculate mouse position in normalized device coordinates
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Check for intersections with nodes
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(Array.from(this.nodeObjects.values()), true);
    
    // Change cursor to pointer when over nodes
    if (intersects.length > 0) {
      const object = intersects[0].object;
      const nodeId = object.userData.nodeId;
      
      // Update hover state in store
      store.setHoveredNode(nodeId);
      
      // Change cursor to pointer to indicate clickable
      this.renderer.domElement.style.cursor = 'pointer';
      
      // Also emit event for other components
      import('../utils/EventSystem').then(({ default: EventSystem, EventNames }) => {
        EventSystem.instance.emit(EventNames.NODE_HOVERED, nodeId);
      });
    } else {
      // Reset hover state
      store.setHoveredNode(null);
      
      // Reset cursor
      this.renderer.domElement.style.cursor = 'default';
      
      // Also emit null hover event
      import('../utils/EventSystem').then(({ default: EventSystem, EventNames }) => {
        EventSystem.instance.emit(EventNames.NODE_HOVERED, null);
      });
    }
    
    // Force immediate update of labels
    this.labelRenderer.render();
  }
  
  private onClick(event: MouseEvent) {
    console.log("Click event on graph canvas");
    event.preventDefault();
    event.stopPropagation();
    
    // Get click position relative to canvas
    const rect = this.renderer.domElement.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    // Label hit testing
    const labelHit = this.labelRenderer.hitTest(clickX, clickY);
    if (labelHit) {
      const current = store.state.graphState.selectedNode;
      if (current === labelHit) store.selectGraphNode(null);
      else store.selectGraphNode(labelHit);
      this.updateConnections();
      this.render();
      this.labelRenderer.render();
      import('../utils/EventSystem').then(({ default: EventSystem, EventNames }) => {
        EventSystem.instance.emit(EventNames.NODE_SELECTED, labelHit);
      });
      return true;
    }
    // Convert to normalized device coordinates for raycasting
    this.mouse.x = (clickX / rect.width) * 2 - 1;
    this.mouse.y = -(clickY / rect.height) * 2 + 1;
    
    // Check for intersections with nodes
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(Array.from(this.nodeObjects.values()), true);
    
    console.log(`Intersections: ${intersects.length}`);
    
    if (intersects.length > 0) {
      // Find the nodeId from the clicked object or its parent
      let nodeId = null;
      let currentObj = intersects[0].object;
      
      // Walk up the object hierarchy to find nodeId
      while (currentObj && !nodeId) {
        if (currentObj.userData && currentObj.userData.nodeId) {
          nodeId = currentObj.userData.nodeId;
        } else if (currentObj.parent) {
          currentObj = currentObj.parent;
        } else {
          break;
        }
      }
      
      if (!nodeId) {
        console.error("Could not find nodeId in clicked object");
        return false;
      }
      
      console.log(`Node clicked: ${nodeId}`);
      
      const currentSelection = store.state.graphState.selectedNode;
      console.log(`Current selection: ${currentSelection}`);
      
      // Toggle selection if the same node is clicked twice
      if (currentSelection === nodeId) {
        console.log("Deselecting node");
        store.selectGraphNode(null);
      } else {
        console.log(`Selecting node: ${nodeId}`);
        // Use the store to update state with spring-like animation
        store.selectGraphNode(nodeId);
      }
      
      // Immediately update connections to show them
      this.updateConnections();
      
      // Make sure connections are displayed immediately
      this.render();
      
      // Update labels
      this.labelRenderer.render();
      
      // Broadcast event to the world
      import('../utils/EventSystem').then(({ default: EventSystem, EventNames }) => {
        const eventName = EventNames.NODE_SELECTED;
        console.log(`Broadcasting event ${eventName} with node ${nodeId}`);
        EventSystem.instance.emit(eventName, nodeId);
      });
      
      return true;
    } else {
      console.log("Background clicked - deselecting");
      store.selectGraphNode(null);
      
      // Make sure connections are cleared immediately
      this.updateConnections();
      this.render();
      
      // Also emit null selection event
      import('../utils/EventSystem').then(({ default: EventSystem, EventNames }) => {
        EventSystem.instance.emit(EventNames.NODE_SELECTED, null);
      });
    }
    
    return false;
  }
  
  public updateGraph() {
    // Clear existing objects
    this.clearGraph();
    
    // Create nodes based on filterMode
    const { nodes, filterMode, game } = store.state.graphState;
    const toDraw = filterMode === 'full'
      ? Array.from(nodes.values())
      : Array.from(nodes.values()).filter(n => game.chunkIDs.includes(n.id));
    toDraw.forEach(node => {
      const nodeObject = this.createNodeObject(node);
      this.nodeObjects.set(node.id, nodeObject);
      this.scene.add(nodeObject);
    });
    
    // Create connections if a node is selected
    this.updateConnections();
  }
  
  private clearGraph() {
    // Clear nodes
    this.nodeObjects.forEach(object => {
      this.scene.remove(object);
      if (object.userData.dispose) {
        object.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            } else if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            }
          }
        });
      }
    });
    this.nodeObjects.clear();
    
    // Clear connections - find and remove all line objects
    this.scene.traverse(object => {
      if (object instanceof THREE.Line && object.userData.isConnection) {
        this.scene.remove(object);
        if (object.geometry) object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        } else if (Array.isArray(object.material)) {
          object.material.forEach(mat => mat.dispose());
        }
      }
    });
    this.connectionLines = null;
  }
  
  private createNodeObject(node: GraphNode): THREE.Object3D {
    const group = new THREE.Group();
    group.position.set(node.position.x, node.position.y, 0);
    group.userData = { nodeId: node.id, dispose: true };
    
    // Get node state
    const isSelected = store.state.graphState.selectedNode === node.id;
    const isHovered = store.state.graphState.hoveredNode === node.id;
    const selId = store.state.graphState.selectedNode;
    const isConnected = selId != null && store.state.graphState.nodes.get(selId)?.connections.has(node.id) || false;
    
    // Calculate opacity exactly like Swift implementation
    let opacity = this.calculateNodeOpacity(node, isSelected, isConnected);
    
    // Compute scaled sizes for node and halo
    const scaledSize = node.size * this.NODE_SCALE;
    const scaledHaloSize = (node.size + 20) * this.NODE_SCALE;
    
    // Add selection/hover indicator (matches SwiftUI Circle with fill and opacity)
    if (isSelected || isHovered) {
      // Create glow effect with larger halo
      const haloGeometry = new THREE.CircleGeometry(scaledHaloSize / 2, this.CIRCLE_SEGMENTS);
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: this.EMBER_ORANGE,
        transparent: true,
        opacity: 0.3
      });
      const halo = new THREE.Mesh(haloGeometry, haloMaterial);
      
      // Add slight pulse animation to the halo for selected nodes
      if (isSelected) {
        halo.userData.pulsePhase = 0;
        halo.userData.isPulsing = true;
      }
      
      group.add(halo);
    }
    
    // Create node circle (matching SwiftUI Circle)
    const nodeGeometry = new THREE.CircleGeometry(scaledSize / 2, this.CIRCLE_SEGMENTS);
    
    // Determine fill color (pending or by label)
    const pending = store.state.graphState.game.active &&
                    store.state.graphState.game.chunkIDs.includes(node.id);
    const fillColor = pending ? PENDING : labelColor(node.label);
    const nodeMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(fillColor),
      transparent: true,
      opacity: opacity
    });
    
    const circle = new THREE.Mesh(nodeGeometry, nodeMaterial);
    
    // Store reference to material for easy updates
    circle.userData.material = nodeMaterial;
    
    // Add interactive effects
    if (isSelected || isConnected) {
      // Make nodes slightly larger when selected or connected
      const scale = isSelected ? 1.15 : (isConnected ? 1.05 : 1.0);
      circle.scale.set(scale, scale, 1);
    }
    
    group.add(circle);
    
    return group;
  }
  
  private calculateNodeOpacity(node: GraphNode, isSelected: boolean, isConnected: boolean): number {
    // Exact replica of Swift implementation for opacity calculation
    let baseOpacity = node.animationProgress;
    
    if (node.ring === 0) {
      baseOpacity = Math.max(0.2, baseOpacity);
    } else {
      const ringOpacity = Math.exp(-node.ring * 0.25);
      baseOpacity = Math.max(0.2, Math.min(baseOpacity, ringOpacity));
    }
    
    if (isSelected) {
      return 1.0;
    } else if (isConnected) {
      return Math.min(1.0, baseOpacity * 1.5);
    }
    
    return baseOpacity;
  }
  
  private ensureSceneColors() {
    const graphData = store.state.graphData;
    const keys = Object.keys(graphData);
    if (Object.keys(this.sceneColors).length !== keys.length) {
      this.sceneColors = {};
      keys.forEach((key, idx) => {
        const hue = (idx * 360) / keys.length;
        this.sceneColors[key] = new THREE.Color(`hsl(${hue},70%,50%)`);
      });
    }
  }
  
  public updateConnections() {
    // Remove previous connections group cleanly
    if (this.connectionLines) {
      this.connectionLines.traverse(obj => {
        if (obj instanceof THREE.Line) {
          obj.geometry?.dispose();
          Array.isArray(obj.material)
            ? obj.material.forEach(m => m.dispose())
            : obj.material.dispose();
        }
      });
      this.scene.remove(this.connectionLines);
      this.connectionLines = null;
    }
    if (store.state.graphState.filterMode !== 'full') return;
    const selected = store.state.graphState.selectedNode;
    if (!selected) return;
    this.ensureSceneColors();
    const data = store.state.graphData;
    const linesGroup = new THREE.Group();
    // Chains per scene containing selected
    Object.keys(data)
      .filter(key => data[key].some(e => e.id === selected))
      .forEach(sceneKey => {
        // Build full ordered chain of entity IDs for scene
        const fullChain = data[sceneKey].map(e => e.id);
        fullChain.slice(0, -1).forEach((from, i) => {
          const to = fullChain[i + 1];
          const n1 = store.state.graphState.nodes.get(from);
          const n2 = store.state.graphState.nodes.get(to);
          if (!n1 || !n2) return;
          // Build fat-line geometry for smooth crisp edges
          const positions = [n1.position.x, n1.position.y, 0, n2.position.x, n2.position.y, 0];
          const geom = new LineGeometry(); geom.setPositions(positions);
          const mat = new LineMaterial({
            color: this.sceneColors[sceneKey],
            linewidth: 4, // world units
            transparent: true,
            opacity: 0.9,
            worldUnits: true,
            depthTest: false
          });
          mat.resolution.set(this.resolution.x, this.resolution.y);
          const line = new Line2(geom, mat);
          line.computeLineDistances();
          line.renderOrder = -1;
          line.userData.isConnection = true;
          line.userData.sceneKey = sceneKey;
          linesGroup.add(line);
        });
      });
    // Add and position new connections
    this.scene.add(linesGroup);
    this.connectionLines = linesGroup;
    // Ensure connection lines align with node positions immediately
    this.updateConnectionPositions();
    this.labelRenderer.render();
  }
  
  public render() {
    // Apply camera transformations
    this.updateCameraTransform();
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
    
    // Update camera for label renderer
    this.labelRenderer.updateCamera(this.camera, store.state.graphState.zoomLevel);
    
    // Render labels so they're always on top of the WebGL scene
    this.labelRenderer.render();
    
    // Update connections positions if needed
    if (this.connectionLines && this.connectionLines.children.length > 0) {
      this.updateConnectionPositions();
    }
  }
  
  private updateConnectionPositions() {
    // This ensures connection lines always connect to node centers
    
    // Exit early if no connections
    if (!this.connectionLines) return;
    
    // Get selected node info
    const selectedNodeId = store.state.graphState.selectedNode;
    if (!selectedNodeId) return;
    
    const selectedNode = store.state.graphState.nodes.get(selectedNodeId);
    if (!selectedNode) return;
    
    // Use scene traversal to find all connection lines
    this.scene.traverse(object => {
      if (object instanceof Line2 && object.userData.isConnection) {
        const toNodeId = object.userData.toNode;
        
        // Get the connected node
        const connectedNode = store.state.graphState.nodes.get(toNodeId);
        if (!connectedNode) return;
        
        // Always use the actual model positions adjusted for scale
        const positions = new Float32Array([
          selectedNode.position.x, selectedNode.position.y, 0,
          connectedNode.position.x, connectedNode.position.y, 0
        ]);
        
        // Update the geometry's position buffer
        const positionAttribute = (object as any).geometry.getAttribute('position');
        if (positionAttribute && positionAttribute.array && positionAttribute.array.length === positions.length) {
          for (let i = 0; i < positions.length; i++) {
            positionAttribute.array[i] = positions[i];
          }
          positionAttribute.needsUpdate = true;
        }
      }
    });
  }
  
  private updateCameraTransform() {
    // Get current view state
    const zoomLevel = store.state.graphState.zoomLevel;
    const offset = store.state.graphState.viewOffset;
    
    // Get current container dimensions
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;
    const aspect = width / height;
    const frustrumSize = 1000;
    
    // Base camera frustum 
    const baseLeft = frustrumSize * aspect / -2;
    const baseRight = frustrumSize * aspect / 2;
    const baseTop = frustrumSize / 2;
    const baseBottom = frustrumSize / -2;
    
    // Apply zoom by adjusting camera frustum
    this.camera.left = baseLeft / zoomLevel;
    this.camera.right = baseRight / zoomLevel;
    this.camera.top = baseTop / zoomLevel;
    this.camera.bottom = baseBottom / zoomLevel;
    
    // Apply pan by setting camera position
    this.camera.position.x = offset.x;
    this.camera.position.y = offset.y;
    this.camera.position.z = 1000; // Keep constant
    this.camera.updateProjectionMatrix();
  }
  
  public animate() {
    this.frameId = requestAnimationFrame(this.animate.bind(this));
    
    // Update node positions and animation state
    this.animateNodePositions();
    
    // Update connections when node is selected
    if (store.state.graphState.selectedNode) {
      this.updateConnections();
    }
    
    // Update camera for label renderer before drawing labels
    this.labelRenderer.updateCamera(this.camera, store.state.graphState.zoomLevel);
    
    // Render scene
    this.render();
    
    // Render labels after camera update and scene render
    this.labelRenderer.render();
  }
  
  private animateNodePositions() {
    const graphState = store.state.graphState;
    const selectedNodeId = graphState.selectedNode;

    // Disable per-frame physics when graph is large to keep FPS high
    const APPLY_PHYSICS = graphState.nodes.size <= 300;

    graphState.nodes.forEach((node, nodeId) => {
      const nodeObject = this.nodeObjects.get(nodeId);
      if (!nodeObject) return;

      // Optionally apply spring force animation
      if (APPLY_PHYSICS) {
        this.applySpringForce(node, nodeObject);
      } else {
        // Snap directly to target position for large graphs
        nodeObject.position.set(node.position.x, node.position.y, 0);
      }

      // Update node animation progress based on selection state
      this.updateNodeAnimationProgress(node, nodeId, selectedNodeId);

      // Update node appearance
      this.updateNodeAppearance(nodeId, node);
    });
  }
  
  private applySpringForce(node: GraphNode, nodeObject: THREE.Object3D) {
    // Spring force constants (fine-tuned to match Swift animation feel)
    const springFactor = 0.08;
    const dampingFactor = 0.85;
    const maxSpeed = 5.0;
    
    // CRITICAL: Keep track of target and current positions
    // We MUST ensure node.position represents the "rest" target position
    const targetPosition = new THREE.Vector2(node.position.x, node.position.y);
    const currentPosition = new THREE.Vector2(nodeObject.position.x, nodeObject.position.y);
    
    // Initialize velocity if needed
    if (!node.velocity) node.velocity = new THREE.Vector2(0, 0);
    
    // Calculate forces only if not at target position
    const dx = targetPosition.x - currentPosition.x;
    const dy = targetPosition.y - currentPosition.y;
    const distanceSquared = dx * dx + dy * dy;
    
    if (distanceSquared > 0.01) {
      // Apply spring force
      node.velocity.x += dx * springFactor;
      node.velocity.y += dy * springFactor;
      
      // Apply damping
      node.velocity.x *= dampingFactor;
      node.velocity.y *= dampingFactor;
      
      // Limit velocity
      const speedSquared = node.velocity.x * node.velocity.x + node.velocity.y * node.velocity.y;
      if (speedSquared > maxSpeed * maxSpeed) {
        const scale = maxSpeed / Math.sqrt(speedSquared);
        node.velocity.x *= scale;
        node.velocity.y *= scale;
      }
      
      // Apply velocity to position
      nodeObject.position.x += node.velocity.x;
      nodeObject.position.y += node.velocity.y;
    } else {
      // If very close to target, snap to it and stop
      nodeObject.position.x = targetPosition.x;
      nodeObject.position.y = targetPosition.y;
      node.velocity.set(0, 0);
    }
  }
  
  private updateNodeAnimationProgress(node: GraphNode, nodeId: string, selectedNodeId: string | null) {
    if (selectedNodeId) {
      const selectedNode = store.state.graphState.nodes.get(selectedNodeId);
      if (selectedNode && selectedNode.connections.has(nodeId)) {
        // Increase animation for connected nodes (matches Swift)
        node.animationProgress = Math.min(1.0, node.animationProgress + 0.05);
      } else if (nodeId !== selectedNodeId) {
        // Decrease animation for unconnected nodes (matches Swift)
        node.animationProgress = Math.max(0.2, node.animationProgress - 0.03);
      }
    } else {
      // Reset to default state when no node is selected
      const targetProgress = node.ring === 0 ? 0.8 : Math.max(0.2, Math.exp(-node.ring * 0.25));
      if (Math.abs(node.animationProgress - targetProgress) > 0.01) {
        node.animationProgress += (targetProgress - node.animationProgress) * 0.1;
      }
    }
  }
  
  private updateNodeAppearance(nodeId: string, node: GraphNode) {
    const nodeObject = this.nodeObjects.get(nodeId);
    if (!nodeObject) return;
    
    // States
    const isSelected = store.state.graphState.selectedNode === nodeId;
    const isHovered = store.state.graphState.hoveredNode === nodeId;
    const selId2 = store.state.graphState.selectedNode;
    const isConnected = selId2 != null && store.state.graphState.nodes.get(selId2)?.connections.has(nodeId) || false;
    
    // Calculate opacity exactly like Swift
    const opacity = this.calculateNodeOpacity(node, isSelected, isConnected);
    
    // Update node appearance with proper scaling
    nodeObject.traverse(child => {
      if (child instanceof THREE.Mesh) {
        // Handle main node circle
        if (child.geometry instanceof THREE.CircleGeometry && 
            child.geometry.parameters.radius === node.size * this.NODE_SCALE / 2) {
          // Update opacity
          const material = child.material as THREE.MeshBasicMaterial;
          material.opacity = opacity;
          
          // Update scale based on selection/connection state
          const targetScale = isSelected ? 1.15 : (isConnected ? 1.05 : 1.0);
          
          // Apply smooth scale transition
          child.scale.x += (targetScale - child.scale.x) * 0.15;
          child.scale.y += (targetScale - child.scale.y) * 0.15;
        }
        
        // Handle selection/hover halo
        if (child.geometry instanceof THREE.CircleGeometry && 
            child.geometry.parameters.radius === (node.size + 20) * this.NODE_SCALE / 2) {
          
          // Show/hide halo based on state
          const material = child.material as THREE.MeshBasicMaterial;
          
          if (isSelected || isHovered) {
            // Make sure halo is visible
            material.opacity = isSelected ? 0.3 : 0.2;
            
            // Add pulse effect to selected node halo
            if (isSelected && child.userData.isPulsing) {
              child.userData.pulsePhase = (child.userData.pulsePhase || 0) + 0.03;
              const pulse = 0.2 * Math.sin(child.userData.pulsePhase) + 0.8;
              child.scale.set(pulse, pulse, 1);
            }
          } else {
            // Fade out halo when not selected/hovered
            material.opacity = Math.max(0, material.opacity - 0.1);
          }
        }
      }
    });
    
    // Handle adding/removing halo when hover/selection state changes
    const hasHalo = nodeObject.children.some(child => 
      child instanceof THREE.Mesh && 
      child.geometry instanceof THREE.CircleGeometry && 
      child.geometry.parameters.radius === (node.size + 20) * this.NODE_SCALE / 2
    );
    
    if ((isSelected || isHovered) && !hasHalo) {
      // Add halo if it doesn't exist but should
      const haloGeometry = new THREE.CircleGeometry((node.size + 20) * this.NODE_SCALE / 2, this.CIRCLE_SEGMENTS);
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: this.EMBER_ORANGE,
        transparent: true,
        opacity: isSelected ? 0.3 : 0.2
      });
      const halo = new THREE.Mesh(haloGeometry, haloMaterial);
      
      if (isSelected) {
        halo.userData.pulsePhase = 0;
        halo.userData.isPulsing = true;
      }
      
      nodeObject.add(halo);
    }
  }
  
  public destroy() {
    // Stop animation
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
    }
    
    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.removeEventListener('click', this.onClick.bind(this));
    
    // Clean up label renderer
    this.labelRenderer.destroy();
    
    // Clean up Three.js resources
    this.clearGraph();
    
    // Remove renderer from DOM
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    
    // Dispose renderer
    this.renderer.dispose();
  }
}