import { store } from '../store/AnalysisStore';
import { GraphRenderer } from './GraphRenderer';
import * as THREE from 'three';
import EventSystem, { EventNames } from '../utils/EventSystem';

/**
 * Graph View component - A completely rewritten version that exactly mimics the Swift version
 * This implementation fixes sizing, interactions, and performance issues
 */
export class GraphView {
  private container: HTMLElement;
  private graphContainer!: HTMLElement;
  private graphRenderer: GraphRenderer | null = null;
  
  // Gesture state
  private isPanning = false;
  private lastPanPosition = { x: 0, y: 0 };
  private gestureZoomScale = 1.0;
  private previousZoomScale = 1.0;
  
  // Bound handlers for proper add/remove
  private readonly _mouseMoveHandler = this.handlePan.bind(this);
  private readonly _mouseUpHandler = this.endPan.bind(this);
  
  // UI constants - exact match with Swift
  private readonly EMBER_ORANGE = '#f1502f'; 
  
  constructor(container: HTMLElement) {
    this.container = container;
    
    // Create a graph view that fills the entire container
    this.render();
    
    // Set up event listeners for node selection
    EventSystem.instance.on(EventNames.NODE_SELECTED, (nodeId) => {
      console.log("Node selection event received:", nodeId);
      // When a node is selected, we need to immediately update the graph
      if (this.graphRenderer) {
        this.graphRenderer.updateConnections();
        this.graphRenderer.render();
      }
    });
  }
  
  public handleResize() {
    // Only update the renderer size, not completely rebuild
    if (this.graphRenderer) {
      // Force a re-render to update proportions
      this.graphRenderer.render();
    }
  }
  
  private render() {
    // Clear previous content
    this.container.innerHTML = '';
    
    // Create main container with black background (matches SwiftUI ZStack)
    const graphViewContainer = document.createElement('div');
    graphViewContainer.className = 'graph-container';
    graphViewContainer.style.height = '100%';
    graphViewContainer.style.width = '100%';
    graphViewContainer.style.display = 'flex';
    graphViewContainer.style.flexDirection = 'column';
    graphViewContainer.style.backgroundColor = '#000000';
    graphViewContainer.style.position = 'relative';
    
    // Header section (60px height like Swift)
    const header = this.createHeader();
    header.style.height = '60px';
    header.style.flexShrink = '0';
    header.style.borderBottom = `1px solid ${this.EMBER_ORANGE}4D`; // 30% opacity divider
    
    // Create graph container (fills remaining space)
    this.graphContainer = document.createElement('div');
    this.graphContainer.className = 'graph-content';
    this.graphContainer.style.position = 'relative';
    this.graphContainer.style.flex = '1';
    this.graphContainer.style.overflow = 'hidden';
    
    // Add elements to container
    graphViewContainer.appendChild(header);
    graphViewContainer.appendChild(this.graphContainer);
    this.container.appendChild(graphViewContainer);
    
    // Initialize graph renderer immediately
    this.initGraphRenderer();
  }
  
  private createHeader() {
    // Create header container
    const header = document.createElement('div');
    header.className = 'graph-header';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.padding = '0 16px'; // px-4
    header.style.width = '100%';
    
    // Title - exactly matching Swift version font and size
    const title = document.createElement('h2');
    title.className = 'graph-title';
    title.style.color = 'white';
    title.style.fontSize = '18px';
    title.style.fontWeight = '500';
    title.textContent = 'Interaction Graph';
    
    // Control buttons container
    const controlButtons = document.createElement('div');
    controlButtons.className = 'graph-controls';
    controlButtons.style.display = 'flex';
    controlButtons.style.alignItems = 'center';
    controlButtons.style.gap = '16px';
    
    // Zoom in button (magnifyingglass icon in Swift)
    const zoomInButton = this.createControlButton('search', () => {
      console.log("Zoom button clicked");
      this.animateZoom(Math.min(4.0, store.state.graphState.zoomLevel * 1.2));
    });
    
    // Reset button (arrow.clockwise icon in Swift)
    const resetButton = this.createControlButton('redo-alt', () => {
      console.log("Reset button clicked");
      this.resetViewState();
    });
    
    controlButtons.appendChild(zoomInButton);
    controlButtons.appendChild(resetButton);
    
    header.appendChild(title);
    header.appendChild(controlButtons);
    
    return header;
  }
  
  private createControlButton(icon: string, action: () => void) {
    // Create button using CSS class for exact styling match
    const button = document.createElement('button');
    button.className = 'graph-control-button';
    button.type = 'button'; // Explicitly set to prevent form submission in some contexts
    
    // Copy styles directly from Swift version
    button.style.width = '32px';
    button.style.height = '32px';
    button.style.borderRadius = '50%';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.backgroundColor = `rgba(241, 80, 47, 0.1)`; // 10% opacity ember orange
    button.style.border = 'none';
    button.style.cursor = 'pointer';
    button.style.color = this.EMBER_ORANGE;
    
    // Icon element
    const iconElement = document.createElement('i');
    iconElement.className = `fas fa-${icon}`;
    iconElement.style.fontSize = '14px';
    
    button.appendChild(iconElement);
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      action();
    });
    
    return button;
  }
  
  private initGraphRenderer() {
    // Clean up existing renderer
    if (this.graphRenderer) {
      this.graphRenderer.destroy();
      this.graphRenderer = null;
    }
    
    console.log("Creating graph renderer in container:", this.graphContainer);
    
    // Create new renderer - wait to ensure DOM is ready and sized correctly
    setTimeout(() => {
      // Create the renderer
      this.graphRenderer = new GraphRenderer(this.graphContainer);
      
      // Add background for handling clicks when not on nodes
      const backgroundClickHandler = document.createElement('div');
      backgroundClickHandler.style.position = 'absolute';
      backgroundClickHandler.style.inset = '0';
      backgroundClickHandler.style.zIndex = '0';
      
      // Make sure it gets clicks that don't hit nodes
      backgroundClickHandler.addEventListener('click', (e) => {
        console.log("Background clicked");
        if (e.target === backgroundClickHandler) {
          e.preventDefault();
          e.stopPropagation();
          
          // Deselect any selected node
          this.animateSelection(null);
        }
      });
      
      this.graphContainer.appendChild(backgroundClickHandler);
      
      // Set up the canvas for interactions
      if (this.graphRenderer && this.graphRenderer.getCanvas()) {
        const canvas = this.graphRenderer.getCanvas();
        canvas.style.zIndex = '1';
        
        // Add gesture handlers with proper event capture
        const zoomHandler = this.handleZoom.bind(this);
        const panStartHandler = this.startPan.bind(this);
        const touchStartHandler = this.handleTouchStart.bind(this);
        const touchMoveHandler = this.handleTouchMove.bind(this);
        const touchEndHandler = this.handleTouchEnd.bind(this);
        
        canvas.addEventListener('wheel', zoomHandler, { passive: false });
        canvas.addEventListener('mousedown', panStartHandler);
        canvas.addEventListener('touchstart', touchStartHandler, { passive: false });
        canvas.addEventListener('touchmove', touchMoveHandler, { passive: false });
        canvas.addEventListener('touchend', touchEndHandler);
        
        // Store handlers for cleanup
        canvas.dataset.hasEventHandlers = 'true';
        
        // For testability - force a render
        this.graphRenderer.render();
      }
    }, 50); // Small delay to ensure DOM is ready
  }
  
  // ZOOM HANDLING
  
  private handleZoom(event: WheelEvent) {
    event.preventDefault();
    
    // Increase zoom speed for better responsiveness
    const zoomFactor = event.deltaY < 0 ? 1.2 : 0.8; // Even faster zoom
    this.gestureZoomScale *= zoomFactor;
    
    // Apply zoom with animation - mimic Swift's smooth animation
    // But calculate a more controlled target zoom
    const newZoom = store.state.graphState.zoomLevel * this.gestureZoomScale / this.previousZoomScale;
    
    // Clamp zoom range to match Swift's limits exactly
    const clampedZoom = Math.max(0.15, Math.min(4.0, newZoom));
    
    // Use a smoother animation with a smaller step
    this.animateZoom(clampedZoom);
    
    // Update gesture state
    this.previousZoomScale = this.gestureZoomScale;
  }
  
  // PAN HANDLING FOR MOUSE
  
  private startPan(event: MouseEvent) {
    event.preventDefault();
    this.isPanning = true;
    this.lastPanPosition = { x: event.clientX, y: event.clientY };
    
    // Add document-level event listeners for move and up
    document.addEventListener('mousemove', this._mouseMoveHandler);
    document.addEventListener('mouseup', this._mouseUpHandler);
  }
  
  private handlePan(event: MouseEvent) {
    if (!this.isPanning) return;
    
    // Calculate delta from last position
    const dx = event.clientX - this.lastPanPosition.x;
    const dy = event.clientY - this.lastPanPosition.y;
    this.lastPanPosition = { x: event.clientX, y: event.clientY };
    
    // Apply pan exactly like Swift does, accounting for zoom level
    const offset = store.state.graphState.viewOffset;
    store.setViewOffset(new THREE.Vector2(
      offset.x - dx / store.state.graphState.zoomLevel,
      offset.y + dy / store.state.graphState.zoomLevel
    ));
    
    // Force immediate update
    if (this.graphRenderer) {
      this.graphRenderer.render();
    }
  }
  
  private endPan() {
    this.isPanning = false;
    document.removeEventListener('mousemove', this._mouseMoveHandler);
    document.removeEventListener('mouseup', this._mouseUpHandler);
  }
  
  // TOUCH HANDLING FOR MOBILE
  
  private lastTouchDistance = 0;
  private lastTouchCenter = { x: 0, y: 0 };
  
  private handleTouchStart(event: TouchEvent) {
    event.preventDefault();
    
    if (event.touches.length === 1) {
      // Single touch = pan
      this.isPanning = true;
      this.lastPanPosition = { 
        x: event.touches[0].clientX, 
        y: event.touches[0].clientY 
      };
    }
    else if (event.touches.length === 2) {
      // Two touches = zoom + pan
      this.isPanning = true;
      
      // Calculate center position
      this.lastTouchCenter = {
        x: (event.touches[0].clientX + event.touches[1].clientX) / 2,
        y: (event.touches[0].clientY + event.touches[1].clientY) / 2
      };
      
      // Calculate distance for zoom
      this.lastTouchDistance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      
      // Set pan position to center
      this.lastPanPosition = { ...this.lastTouchCenter };
    }
  }
  
  private handleTouchMove(event: TouchEvent) {
    event.preventDefault();
    
    if (!this.isPanning) return;
    
    if (event.touches.length === 1) {
      // Single touch = pan only
      const dx = event.touches[0].clientX - this.lastPanPosition.x;
      const dy = event.touches[0].clientY - this.lastPanPosition.y;
      
      this.lastPanPosition = { 
        x: event.touches[0].clientX, 
        y: event.touches[0].clientY 
      };
      
      // Apply pan accounting for zoom level
      const offset = store.state.graphState.viewOffset;
      store.setViewOffset(new THREE.Vector2(
        offset.x - dx / store.state.graphState.zoomLevel,
        offset.y + dy / store.state.graphState.zoomLevel
      ));
      
      // Force immediate update
      if (this.graphRenderer) {
        this.graphRenderer.render();
      }
    }
    else if (event.touches.length === 2) {
      // Calculate new center position
      const newCenter = {
        x: (event.touches[0].clientX + event.touches[1].clientX) / 2,
        y: (event.touches[0].clientY + event.touches[1].clientY) / 2
      };
      
      // Handle pan (center movement)
      const dx = newCenter.x - this.lastTouchCenter.x;
      const dy = newCenter.y - this.lastTouchCenter.y;
      
      // Apply pan
      const offset = store.state.graphState.viewOffset;
      store.setViewOffset(new THREE.Vector2(
        offset.x - dx / store.state.graphState.zoomLevel,
        offset.y + dy / store.state.graphState.zoomLevel
      ));
      
      // Calculate new distance for zoom
      const newDistance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      
      // Apply zoom based on pinch with Swift-like spring effect
      if (this.lastTouchDistance > 0) {
        const zoomFactor = newDistance / this.lastTouchDistance;
        const newZoom = store.state.graphState.zoomLevel * zoomFactor;
        
        // Clamp zoom range to match Swift's limits exactly
        this.animateZoom(Math.max(0.15, Math.min(4.0, newZoom)));
      }
      
      // Update last position
      this.lastTouchCenter = newCenter;
      this.lastTouchDistance = newDistance;
      
      // Force immediate update
      if (this.graphRenderer) {
        this.graphRenderer.render();
      }
    }
  }
  
  private handleTouchEnd(event: TouchEvent) {
    // If no more touches, end panning
    if (event.touches.length === 0) {
      this.isPanning = false;
    }
    // If we still have one touch, update to track that touch
    else if (event.touches.length === 1) {
      this.lastPanPosition = { 
        x: event.touches[0].clientX, 
        y: event.touches[0].clientY 
      };
    }
  }
  
  // ANIMATION METHODS
  
  private animateZoom(targetZoom: number) {
    // Get current zoom level
    const currentZoom = store.state.graphState.zoomLevel;
    
    // For smoother animation, use a gradual transition with requestAnimationFrame
    const startTime = performance.now();
    const duration = 300; // Longer animation duration (ms) for smoother feel
    
    const animate = (currentTime: number) => {
      // Calculate progress (0 to 1)
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easeOutQuad easing function for natural feel
      const easeProgress = 1 - (1 - progress) * (1 - progress);
      
      // Calculate intermediate zoom value
      const newZoom = currentZoom + (targetZoom - currentZoom) * easeProgress;
      
      // Apply the zoom
      store.setZoomLevel(newZoom);
      
      // Update rendering
      if (this.graphRenderer) {
        this.graphRenderer.render();
      }
      
      // Continue animation if not complete
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Reset scales when done
        this.resetGestureScales();
      }
    };
    
    // Start the animation
    requestAnimationFrame(animate);
  }
  
  private animateSelection(nodeId: string | null) {
    // Update selected node with spring animation
    store.selectGraphNode(nodeId);
    
    // Force immediate update
    if (this.graphRenderer) {
      this.graphRenderer.updateConnections();
      this.graphRenderer.render();
    }
  }
  
  private resetGestureScales() {
    this.previousZoomScale = 1.0;
    this.gestureZoomScale = 1.0;
  }
  
  private resetViewState() {
    // Reset view to default state (mimics Swift version)
    store.resetGraphView();
    this.resetGestureScales();
    
    // Force immediate update
    if (this.graphRenderer) {
      this.graphRenderer.updateConnections();
      this.graphRenderer.render();
    }
  }
}