// @ts-nocheck
import { store, ViewType } from './store/AnalysisStore';
import { groupNodesByLabel } from './models/GraphModels';
import EventSystem, { EventNames } from './utils/EventSystem';
import GraphRecallModule from './components/GraphRecallModule';

export class App {
  private container: HTMLElement;
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }
  
  private async init() {
    await store.init();
    this.render();
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    EventSystem.instance.on(EventNames.VIEW_CHANGED, () => {
      this.render();
    });
    
    let prevSelectedView = store.state.selectedView;
    
    setInterval(() => {
      if (prevSelectedView !== store.state.selectedView) {
        this.render();
        prevSelectedView = store.state.selectedView;
      }
    }, 100);
  }
  
  private render() {
    this.container.innerHTML = '';
    
    // Create main app container (ZStack in Swift)
    const appContainer = document.createElement('div');
    appContainer.className = 'app-container';
    
    // Create header (12% height)
    const header = this.createHeader();
    
    // Create main content area (88% height)
    const mainContent = document.createElement('div');
    mainContent.className = 'main-content';
    
    // Create content area (70% width)
    const contentArea = document.createElement('div');
    contentArea.className = 'content-area';
    
    // Create sidebar (30% width)
    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar';
    
    // Render appropriate view and sidebar based on selected view
    this.renderView(contentArea);
    this.renderSidebar(sidebar);
    
    // Assemble layout
    mainContent.appendChild(contentArea);
    mainContent.appendChild(sidebar);
    
    appContainer.appendChild(header);
    appContainer.appendChild(mainContent);
    
    this.container.appendChild(appContainer);
  }
  
  private createHeader() {
    const header = document.createElement('div');
    header.className = 'header';
    
    // Logo
    const logo = document.createElement('div');
    logo.className = 'logo';
    logo.textContent = 'ember';
    
    // View switcher
    const viewSwitcher = document.createElement('div');
    viewSwitcher.className = 'view-switcher';
    
    // Chat handle / Import tab
    const chatSelected = !!store.state.selectedChatName;
    const chatButton = document.createElement('button');
    chatButton.className = `view-button chat-handle ${store.state.selectedView === ViewType.Import ? 'active' : ''}`;
    // Display chat name if selected, else show ZIP icon
    if (chatSelected) {
      chatButton.textContent = store.state.selectedChatName!;
    } else {
      chatButton.innerHTML = '<i class="fas fa-file-archive"></i>';
    }
    chatButton.disabled = false;
    chatButton.addEventListener('click', () => store.setSelectedView(ViewType.Import));
    viewSwitcher.appendChild(chatButton);
    
    // Game (Recall) tab
    const recallButton = document.createElement('button');
    recallButton.className = `view-button ${store.state.selectedView === ViewType.Recall ? 'active' : ''}`;
    recallButton.innerHTML = '<i class="fas fa-gamepad"></i>';
    recallButton.disabled = !chatSelected;
    recallButton.addEventListener('click', () => store.setSelectedView(ViewType.Recall));
    viewSwitcher.appendChild(recallButton);
    
    // Graph tab
    const graphButton = document.createElement('button');
    graphButton.className = `view-button ${store.state.selectedView === ViewType.Graph ? 'active' : ''}`;
    graphButton.innerHTML = '<i class="fas fa-project-diagram"></i>';
    graphButton.disabled = !chatSelected;
    graphButton.addEventListener('click', () => store.setSelectedView(ViewType.Graph));
    viewSwitcher.appendChild(graphButton);
    
    // Calendar tab
    const calendarButton = document.createElement('button');
    calendarButton.className = `view-button ${store.state.selectedView === ViewType.Calendar ? 'active' : ''}`;
    calendarButton.innerHTML = '<i class="fas fa-calendar"></i>';
    calendarButton.disabled = false;
    calendarButton.addEventListener('click', () => store.setSelectedView(ViewType.Calendar));
    viewSwitcher.appendChild(calendarButton);
    
    header.appendChild(logo);
    header.appendChild(viewSwitcher);
    
    return header;
  }
  
  private renderView(container: HTMLElement) {
    if (store.state.selectedView === ViewType.Import) {
      // Import view
    } else if (store.state.selectedView === ViewType.Recall) {
      const chatName = store.state.selectedChatName;
      if (chatName) {
        new GraphRecallModule(container, chatName);
      } else {
        container.innerHTML = '<div class="text-center text-red-400">No chat selected</div>';
      }
    } else if (store.state.selectedView === ViewType.Graph) {
      this.renderGraphView(container);
    } else if (store.state.selectedView === ViewType.Calendar) {
      this.renderCalendarView(container);
    }
  }
  
  private renderSidebar(container: HTMLElement) {
    if (store.state.selectedView === ViewType.Import) {
      // Import sidebar
    } else if (store.state.selectedView === ViewType.Recall) {
      container.innerHTML = '';
    } else if (store.state.selectedView === ViewType.Graph) {
      this.renderGraphSidebar(container);
    } else if (store.state.selectedView === ViewType.Calendar) {
      this.renderCalendarSidebar(container);
    }
  }
  
  private renderCalendarView(container: HTMLElement) {
    const calendarContainer = document.createElement('div');
    calendarContainer.className = 'calendar-container';
    
    // Month selector (60px height)
    const monthSelector = document.createElement('div');
    monthSelector.className = 'month-selector';
    
    // Month and year display
    const monthYear = document.createElement('div');
    monthYear.className = 'month-year';
    
    // Month bracket
    const monthBracket = document.createElement('div');
    monthBracket.className = 'month-bracket';
    
    const leftMonthBracket = document.createElement('span');
    leftMonthBracket.className = 'bracket';
    leftMonthBracket.textContent = '［';
    
    const monthName = document.createElement('span');
    monthName.className = 'month-name';
    // Format current month name
    const currentMonth = store.state.selectedDate;
    monthName.textContent = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(currentMonth);
    
    const rightMonthBracket = document.createElement('span');
    rightMonthBracket.className = 'bracket';
    rightMonthBracket.textContent = '］';
    
    monthBracket.appendChild(leftMonthBracket);
    monthBracket.appendChild(monthName);
    monthBracket.appendChild(rightMonthBracket);
    
    // Year bracket
    const yearBracket = document.createElement('div');
    yearBracket.className = 'year-bracket';
    
    const leftYearBracket = document.createElement('span');
    leftYearBracket.className = 'bracket';
    leftYearBracket.textContent = '［';
    
    const yearName = document.createElement('span');
    yearName.className = 'year-name';
    yearName.textContent = new Intl.DateTimeFormat('en-US', { year: 'numeric' }).format(currentMonth);
    
    const rightYearBracket = document.createElement('span');
    rightYearBracket.className = 'bracket';
    rightYearBracket.textContent = '］';
    
    yearBracket.appendChild(leftYearBracket);
    yearBracket.appendChild(yearName);
    yearBracket.appendChild(rightYearBracket);
    
    monthYear.appendChild(monthBracket);
    monthYear.appendChild(yearBracket);
    
    // Navigation buttons
    const monthNav = document.createElement('div');
    monthNav.className = 'month-nav';
    
    // Previous month button
    const prevButton = document.createElement('button');
    prevButton.className = 'month-nav-button';
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.addEventListener('click', () => {
      const prevMonth = new Date(currentMonth);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      store.setSelectedDate(prevMonth);
      this.render();
    });
    
    // Next month button
    const nextButton = document.createElement('button');
    nextButton.className = 'month-nav-button';
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.addEventListener('click', () => {
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      store.setSelectedDate(nextMonth);
      this.render();
    });
    
    monthNav.appendChild(prevButton);
    monthNav.appendChild(nextButton);
    
    monthSelector.appendChild(monthYear);
    monthSelector.appendChild(monthNav);
    
    // Calendar grid container
    const calendarGridContainer = document.createElement('div');
    calendarGridContainer.className = 'calendar-grid-container';
    
    // Weekday header
    const weekdayHeader = document.createElement('div');
    weekdayHeader.className = 'weekday-header';
    
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
      const weekday = document.createElement('div');
      weekday.className = 'weekday';
      weekday.textContent = day;
      weekdayHeader.appendChild(weekday);
    });
    
    // Calendar grid
    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'calendar-grid';
    
    // Generate calendar cells
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    
    // Previous month days to fill first week
    const daysFromPrevMonth = firstDayOfMonth;
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const daysInPrevMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
    
    // Create cells for previous month
    for (let i = daysInPrevMonth - daysFromPrevMonth + 1; i <= daysInPrevMonth; i++) {
      const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), i);
      const cell = this.createCalendarCell(date, true);
      calendarGrid.appendChild(cell);
    }
    
    // Create cells for current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      const cell = this.createCalendarCell(date, false);
      calendarGrid.appendChild(cell);
    }
    
    // Next month days to fill last week
    const totalDays = daysFromPrevMonth + daysInMonth;
    const daysFromNextMonth = 42 - totalDays; // 6 rows x 7 days = 42
    
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    // Create cells for next month
    for (let i = 1; i <= daysFromNextMonth; i++) {
      const date = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), i);
      const cell = this.createCalendarCell(date, true);
      calendarGrid.appendChild(cell);
    }
    
    calendarGridContainer.appendChild(weekdayHeader);
    calendarGridContainer.appendChild(calendarGrid);
    
    calendarContainer.appendChild(monthSelector);
    calendarContainer.appendChild(calendarGridContainer);
    
    container.appendChild(calendarContainer);
  }
  
  private createCalendarCell(date: Date, isOutsideMonth: boolean) {
    const cell = document.createElement('div');
    cell.className = `calendar-cell${isOutsideMonth ? ' outside-month' : ''}`;
    
    // Check if cell is selected
    const selectedDate = store.state.selectedDate;
    const isSelected = date.getDate() === selectedDate.getDate() && 
                       date.getMonth() === selectedDate.getMonth() && 
                       date.getFullYear() === selectedDate.getFullYear();
    
    if (isSelected) {
      cell.classList.add('selected');
    }
    
    // Check if cell is today
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && 
                    date.getMonth() === today.getMonth() && 
                    date.getFullYear() === today.getFullYear();
    
    if (isToday) {
      cell.classList.add('today');
    }
    
    // Date number
    const dateNumber = document.createElement('div');
    dateNumber.className = 'date-number';
    dateNumber.textContent = date.getDate().toString();
    cell.appendChild(dateNumber);
    
    // Show recall saved indicators instead of old analysis data
    const dateKey = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`;
    const saved = store.state.savedMemories[dateKey] || [];
    if (saved.length > 0) {
      const activityDots = document.createElement('div');
      activityDots.className = 'activity-dots';
      const dotCount = Math.min(saved.length, 3);
      for (let i = 0; i < dotCount; i++) {
        const dot = document.createElement('div');
        dot.className = 'activity-dot message'; // reused orange dot
        activityDots.appendChild(dot);
      }
      cell.appendChild(activityDots);
    }
    
    // Click handler
    cell.addEventListener('click', () => {
      store.setSelectedDate(date);
      this.render();
    });
    
    return cell;
  }
  
  private renderCalendarSidebar(container: HTMLElement) {
    const sidebarContainer = document.createElement('div');
    sidebarContainer.className = 'calendar-sidebar';

    // Header with date
    const sidebarHeader = document.createElement('div');
    sidebarHeader.className = 'sidebar-header';

    const dateHeading = document.createElement('h2');
    dateHeading.className = 'date-heading';

    // Format selected date like in Swift: "Monday, January 1, 2023"
    const selectedDate = store.state.selectedDate;
    dateHeading.textContent = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(selectedDate);

    sidebarHeader.appendChild(dateHeading);

    const sidebarContent = document.createElement('div');
    sidebarContent.className = 'sidebar-content';

    // Display saved memories for selected date
    const dateKey = `${selectedDate.getDate().toString().padStart(2, '0')}/${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}/${selectedDate.getFullYear().toString().slice(-2)}`;
    const saved = store.state.savedMemories[dateKey] || [];
    if (saved.length > 0) {
      const memoriesList = document.createElement('ul');
      memoriesList.className = 'memories-list';
      saved.forEach(mem => {
        const memItem = document.createElement('li');
        memItem.className = 'memory-item';
        memItem.textContent = mem;
        memoriesList.appendChild(memItem);
      });
      sidebarContent.appendChild(memoriesList);
    } else {
      const noData = document.createElement('div');
      noData.style.textAlign = 'center';
      noData.style.padding = '20px';
      noData.style.color = '#808080';

      const noDataIcon = document.createElement('div');
      noDataIcon.innerHTML = '<i class="fas fa-calendar-times"></i>';
      noDataIcon.style.fontSize = '48px';
      noDataIcon.style.marginBottom = '16px';

      const noDataText = document.createElement('div');
      noDataText.textContent = 'No saved memories for this date';

      noData.appendChild(noDataIcon);
      noData.appendChild(noDataText);

      sidebarContent.appendChild(noData);
    }

    sidebarContainer.appendChild(sidebarHeader);
    sidebarContainer.appendChild(sidebarContent);
    container.appendChild(sidebarContainer);
  }

  private renderGraphView(container: HTMLElement) {
    // Make sure the container is set up for proper sizing
    container.className = 'content-area graph-container';
    container.style.height = '100%';
    container.style.position = 'relative';

    // Create a simple, clean container that has full size
    const graphCanvas = document.createElement('div');
    graphCanvas.className = 'graph-canvas';
    graphCanvas.id = 'graph-canvas';
    graphCanvas.style.width = '100%';
    graphCanvas.style.height = '100%';

    container.appendChild(graphCanvas);

    // Initialize the GraphView
    import('./components/GraphView').then(({ GraphView }) => {
      const graphCanvasContainer = document.getElementById('graph-canvas');
      if (graphCanvasContainer) {
        // Create new GraphView instance
        const graphInstance = new GraphView(graphCanvasContainer);

        // Store a cleanup function for the resize listener
        const resizeHandler = () => graphInstance.handleResize();

        // Make sure to adapt to window size changes
        window.addEventListener('resize', resizeHandler);

        // Store reference to the resize handler for cleanup
      graphCanvasContainer.dataset.resizeHandler = 'true';

        // Store cleanup method on the element for later use
      // Attach cleanup method to the element
      (graphCanvasContainer as any).cleanupGraph = () => {
        // Clean up event listeners
        window.removeEventListener('resize', resizeHandler);
        // Remove the resize handler flag
        delete graphCanvasContainer.dataset.resizeHandler;
      };
      }
    });
  }

  private renderGraphSidebar(container: HTMLElement) {
    // Clear previous sidebar content
    container.innerHTML = '';
    const sidebarContainer = document.createElement('div');
    sidebarContainer.className = 'graph-sidebar';

    // -- Entity details when a node is selected --
    const selectedId = store.state.graphState.selectedNode;
    if (selectedId) {
      const node = store.state.graphState.nodes.get(selectedId);
      if (node) {
        const details = document.createElement('div');
        details.className = 'entity-details';

        // Heading with icon and name
        const heading = document.createElement('div');
        heading.className = 'entity-heading';
        const icon = document.createElement('div');
        icon.className = `entity-icon ${node.label}`;
        const iconInner = document.createElement('i');
        switch (node.label) {
          case 'person': iconInner.className = 'fas fa-user'; break;
          case 'location': iconInner.className = 'fas fa-map-marker-alt'; break;
          case 'organization': iconInner.className = 'fas fa-building'; break;
          default: iconInner.className = 'fas fa-tag';
        }
        icon.appendChild(iconInner);
        const nameEl = document.createElement('div');
        nameEl.className = 'entity-name';
        nameEl.textContent = selectedId;
        heading.appendChild(icon);
        heading.appendChild(nameEl);
        details.appendChild(heading);

        // Metadata section
        const metadata = document.createElement('div');
        metadata.className = 'entity-metadata';
        const metaItems = [
          { label: 'category', value: node.label },
          { label: 'connections', value: node.connections.size.toString() }
        ];
        metaItems.forEach(item => {
          const metaItem = document.createElement('div');
          metaItem.className = 'metadata-item';
          const lbl = document.createElement('div');
          lbl.className = 'metadata-label';
          lbl.textContent = item.label;
          const val = document.createElement('div');
          val.className = 'metadata-value';
          val.textContent = item.value;
          metaItem.appendChild(lbl);
          metaItem.appendChild(val);
          metadata.appendChild(metaItem);
        });
        details.appendChild(metadata);

        // Connections list
        const titleEl = document.createElement('div');
        titleEl.className = 'connected-entities-title';
        titleEl.textContent = 'connected to';
        details.appendChild(titleEl);
        const connList = document.createElement('div');
        connList.className = 'connection-list';
        Array.from(node.connections).sort().forEach(nid => {
          const neighbour = store.state.graphState.nodes.get(nid);
          const connItem = document.createElement('button');
          connItem.className = 'connection-item';
          const info = document.createElement('div');
          info.className = 'connection-info';
          const dot = document.createElement('div');
          const lbl = neighbour?.label || '';
          dot.className = `connection-type ${lbl}`;
          info.appendChild(dot);
          const text = document.createElement('span');
          text.textContent = nid;
          info.appendChild(text);
          connItem.appendChild(info);
          connItem.addEventListener('click', () => {
            const current = store.state.graphState.selectedNode;
            if (current === nid) store.selectGraphNode(null);
            else store.selectGraphNode(nid);
          });
          connList.appendChild(connItem);
        });
        details.appendChild(connList);
        sidebarContainer.appendChild(details);
      }
    }

    // -- Entity categories list --
    const grouped = groupNodesByLabel(store.state.graphState.nodes);
    const sortedLabels = Object.keys(grouped).sort();

    const entityHeader = document.createElement('div');
    entityHeader.className = 'entity-header';
    const entityTitle = document.createElement('h2');
    entityTitle.className = 'entity-title';
    entityTitle.textContent = 'entity categories';
    entityHeader.appendChild(entityTitle);
    const divider = document.createElement('div');
    divider.className = 'divider';

    const entityList = document.createElement('div');
    entityList.className = 'entity-list';
    sortedLabels.forEach(label => {
      const items = grouped[label];
      const categoryContainer = document.createElement('div');
      categoryContainer.className = 'entity-category';
      const categoryHeader = document.createElement('button');
      categoryHeader.className = 'category-header';
      const categoryName = document.createElement('span');
      categoryName.className = 'category-name';
      categoryName.textContent = label;
      const categoryRight = document.createElement('div');
      categoryRight.className = 'category-right';
      const categoryCount = document.createElement('span');
      categoryCount.className = 'category-count';
      categoryCount.textContent = items.length.toString();
      const categoryChevron = document.createElement('i');
      categoryChevron.className = 'fas fa-chevron-right';
      categoryRight.appendChild(categoryCount);
      categoryRight.appendChild(categoryChevron);
      categoryHeader.appendChild(categoryName);
      categoryHeader.appendChild(categoryRight);
      categoryContainer.appendChild(categoryHeader);

      const nodeList = document.createElement('div');
      nodeList.className = 'node-list hidden';
      items
        .sort((a, b) => b.size - a.size)
        .forEach(node => {
          const nodeItem = document.createElement('button');
          nodeItem.className = 'node-item';
          const nodeDot = document.createElement('div');
          nodeDot.className = 'node-dot';
          const nodeNameEl = document.createElement('span');
          nodeNameEl.className = 'node-name' + (store.state.graphState.selectedNode === node.id ? ' selected' : '');
          nodeNameEl.textContent = node.id;
          nodeItem.appendChild(nodeDot);
          nodeItem.appendChild(nodeNameEl);
          nodeItem.addEventListener('click', () => {
            const current = store.state.graphState.selectedNode;
            if (current === node.id) store.selectGraphNode(null);
            else store.selectGraphNode(node.id);
            // Highlight selection
            sidebarContainer.querySelectorAll('.node-name.selected')
              .forEach(el => el.classList.remove('selected'));
            nodeNameEl.classList.add('selected');
          });
          nodeList.appendChild(nodeItem);
        });

      categoryContainer.appendChild(nodeList);
      categoryHeader.addEventListener('click', () => {
        if (nodeList.classList.contains('hidden')) {
          nodeList.classList.remove('hidden');
          categoryChevron.className = 'fas fa-chevron-down';
          categoryName.classList.add('expanded');
        } else {
          nodeList.classList.add('hidden');
          categoryChevron.className = 'fas fa-chevron-right';
          categoryName.classList.remove('expanded');
        }
      });
      entityList.appendChild(categoryContainer);
    });

    sidebarContainer.appendChild(entityHeader);
    sidebarContainer.appendChild(divider);
    sidebarContainer.appendChild(entityList);
    container.appendChild(sidebarContainer);
  }
}