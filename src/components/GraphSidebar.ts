import { store } from '../store/AnalysisStore';
import { groupNodesByLabel } from '../models/GraphModels';
import EventSystem, { EventNames } from '../utils/EventSystem';

/**
 * Graph sidebar component - mirror of Swift EntityCategoriesSidebar
 */
export class GraphSidebar {
  private container: HTMLElement;
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.setupListeners();
  }
  
  private setupListeners() {
    // Listen for selections from graph
    EventSystem.instance.on(EventNames.NODE_SELECTED, () => {
      this.render();
    });
    
    // Listen for expansions
    EventSystem.instance.on(EventNames.LABEL_EXPANDED, () => {
      this.render();
    });
    
    // Simple state change detection for label expansion
    let prevExpandedLabels = JSON.stringify(Array.from(store.state.graphState.expandedLabels));
    
    setInterval(() => {
      const currentExpandedLabels = JSON.stringify(Array.from(store.state.graphState.expandedLabels));
      
      if (prevExpandedLabels !== currentExpandedLabels) {
        this.render();
        prevExpandedLabels = currentExpandedLabels;
      }
    }, 100);
  }
  
  private render() {
    // Clear container
    this.container.innerHTML = '';
    
    // Create sidebar container with VStack layout like Swift
    const sidebar = document.createElement('div');
    sidebar.className = 'flex flex-col h-full bg-black p-4 text-white overflow-hidden';
    
    // Header section (mimics Swift)
    const header = document.createElement('h2');
    header.className = 'text-lg font-semibold text-ember-orange mb-4';
    header.textContent = 'entity categories';
    sidebar.appendChild(header);
    
    // Add divider (purple like Swift)
    const divider = document.createElement('div');
    divider.className = 'h-px bg-ember-purple bg-opacity-30 mb-4';
    sidebar.appendChild(divider);
    
    // Create scrollable content area (ScrollView in Swift)
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'flex-1 overflow-y-auto pr-2 space-y-2';
    
    // Grouped nodes - same as Swift
    const groupedNodes = groupNodesByLabel(store.state.graphState.nodes);
    
    // Create category rows
    const labels = Object.keys(groupedNodes).sort();
    
    // For each label, create EntityCategoryRow like Swift
    labels.forEach(label => {
      const nodes = groupedNodes[label];
      const count = nodes.length;
      const isExpanded = store.state.graphState.expandedLabels.has(label);
      
      const categoryRow = this.createEntityCategoryRow(label, count, isExpanded, nodes);
      scrollContainer.appendChild(categoryRow);
    });
    
    sidebar.appendChild(scrollContainer);
    
    this.container.appendChild(sidebar);
  }
  
  private createEntityCategoryRow(label: string, count: number, isExpanded: boolean, nodes: any[]) {
    // Create a container that mimics Swift's EntityCategoryRow
    const container = document.createElement('div');
    container.className = 'mb-2';
    
    // Header button that mimics Swift's Button(action:) with HStack inside
    const headerButton = document.createElement('button');
    headerButton.className = 'w-full text-left py-3 px-3';
    
    // HStack with label and expanded indicator
    const buttonContent = document.createElement('div');
    buttonContent.className = 'flex items-center justify-between';
    
    // Label text (lowercased like Swift)
    const labelText = document.createElement('span');
    labelText.className = `text-lg ${isExpanded ? 'text-ember-orange' : 'text-white'}`;
    labelText.textContent = label.toLowerCase();
    
    // Right section with count and chevron
    const rightSection = document.createElement('div');
    rightSection.className = 'flex items-center space-x-2';
    
    // Count label 
    const countLabel = document.createElement('span');
    countLabel.className = 'text-lg text-white text-opacity-60';
    countLabel.textContent = count.toString();
    
    // Chevron icon (down/right based on isExpanded)
    const chevron = document.createElement('i');
    chevron.className = `fas fa-chevron-${isExpanded ? 'down' : 'right'} text-white text-opacity-80 text-sm ml-2`;
    
    rightSection.appendChild(countLabel);
    rightSection.appendChild(chevron);
    
    buttonContent.appendChild(labelText);
    buttonContent.appendChild(rightSection);
    headerButton.appendChild(buttonContent);
    
    // Add click handler exactly like Swift
    headerButton.addEventListener('click', () => {
      // Toggle expansion state
      store.toggleLabelExpansion(label);
      EventSystem.instance.emit(EventNames.LABEL_EXPANDED, label);
    });
    
    container.appendChild(headerButton);
    
    // Create nodes list if expanded
    if (isExpanded) {
      // Create VStack for nodes (with padding matching Swift)
      const nodesList = document.createElement('div');
      nodesList.className = 'pl-5 pt-1 space-y-1';
      
      // Sort nodes by size like Swift
      const sortedNodes = [...nodes].sort((a, b) => b.size - a.size);
      
      // Create EntityNodeRow for each node
      sortedNodes.forEach(node => {
        const nodeRow = this.createEntityNodeRow(node);
        nodesList.appendChild(nodeRow);
      });
      
      // Add transition class to mimic Swift animation
      nodesList.classList.add('animate-fade-in');
      
      container.appendChild(nodesList);
    }
    
    return container;
  }
  
  private createEntityNodeRow(node: any) {
    // Create button that mimics Swift's EntityNodeRow
    const isSelected = store.state.graphState.selectedNode === node.id;
    
    const button = document.createElement('button');
    button.className = 'flex items-center space-x-2 py-1.5 px-2 w-full text-left';
    button.setAttribute('data-node-id', node.id);
    
    // Create circle indicator dot
    const circleDot = document.createElement('div');
    circleDot.className = 'w-1.5 h-1.5 rounded-full bg-ember-orange opacity-30';
    
    // Create text label (lowercased like Swift)
    const nodeText = document.createElement('span');
    nodeText.className = `text-base ${isSelected ? 'text-ember-orange' : 'text-white opacity-70'}`;
    nodeText.textContent = node.id.toLowerCase();
    
    button.appendChild(circleDot);
    button.appendChild(nodeText);
    
    // Add click handler to select node
    button.addEventListener('click', () => {
      store.selectGraphNode(node.id);
      
      // Emit event for other components
      EventSystem.instance.emit(EventNames.NODE_SELECTED, node.id);
    });
    
    return button;
  }
}