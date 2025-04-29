// @ts-nocheck
import { store } from '../store/AnalysisStore';
// import { topicsToArray } from '../models/AnalysisData'; // no longer used
import CalendarDateHelper from '../utils/CalendarDateHelper';
import EventSystem, { EventNames } from '../utils/EventSystem';

/**
 * Calendar Sidebar component - mirror of Swift SidebarContent
 */
export class CalendarSidebar {
  private container: HTMLElement;
  private dateHelper: CalendarDateHelper;
  private expandedSections: Set<string> = new Set();
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.dateHelper = CalendarDateHelper.shared;
    this.render();
    this.setupListeners();
  }
  
  private setupListeners() {
    // Listen for date selection changes
    EventSystem.instance.on(EventNames.VIEW_CHANGED, () => {
      this.render();
    });
    
    // Simple state change detection for date changes
    let prevDate = store.state.selectedDate.toISOString();
    
    setInterval(() => {
      const currentDate = store.state.selectedDate.toISOString();
      
      if (prevDate !== currentDate) {
        this.render();
        prevDate = currentDate;
      }
    }, 100);
  }
  
  private render() {
    // Clear container
    this.container.innerHTML = '';
    
    // Create sidebar container with proper structure
    const sidebar = document.createElement('div');
    sidebar.className = 'flex flex-col h-full bg-black overflow-hidden';
    
    // Header with formatted date title (like Swift)
    const header = this.createHeader();
    sidebar.appendChild(header);
    
    // Main content with scrolling
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'flex-1 overflow-y-auto p-4';
    
    // Get saved recall memories for selected date
    const dateKey = this.dateHelper.dateKey(store.state.selectedDate);
    const saved = store.state.savedMemories[dateKey] || [];
    if (saved.length > 0) {
      // List saved sentences
      saved.forEach((sentence) => {
        const entry = document.createElement('div');
        entry.className = 'mb-4 p-3 bg-gray-800 rounded text-white';
        entry.textContent = sentence;
        scrollContainer.appendChild(entry);
      });
    } else {
      // No saved memories message
      const noDataMessage = document.createElement('div');
      noDataMessage.className = 'flex flex-col items-center justify-center text-gray-500 h-full';
      const noDataIcon = document.createElement('div');
      noDataIcon.className = 'text-3xl mb-2';
      noDataIcon.innerHTML = '<i class="fas fa-inbox"></i>';
      const noDataText = document.createElement('p');
      noDataText.textContent = 'No saved recalls for this date';
      noDataMessage.appendChild(noDataIcon);
      noDataMessage.appendChild(noDataText);
      scrollContainer.appendChild(noDataMessage);
    }
    
    sidebar.appendChild(scrollContainer);
    
    // Add to container
    this.container.appendChild(sidebar);
  }
  
  private createHeader() {
    // Create header with formatted date (like Swift)
    const header = document.createElement('div');
    header.className = 'p-4 border-b border-gray-700';
    
    // Format the date exactly like Swift: "Monday, January 1, 2023"
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(store.state.selectedDate);
    
    // Create date heading
    const dateHeading = document.createElement('h2');
    dateHeading.className = 'text-lg font-semibold text-ember-orange';
    dateHeading.textContent = formattedDate;
    
    header.appendChild(dateHeading);
    
    return header;
  }
  
  private createStatsSummary(dailyData: any) {
    // Create stats card similar to Swift
    const statsCard = document.createElement('div');
    statsCard.className = 'bg-black border border-gray-800 rounded-lg p-4 mb-6';
    
    // Stats title
    const statsTitle = document.createElement('h3');
    statsTitle.className = 'text-sm font-medium text-white mb-4';
    statsTitle.textContent = 'Daily Summary';
    
    // Stats grid (2 columns like Swift)
    const statsGrid = document.createElement('div');
    statsGrid.className = 'grid grid-cols-2 gap-4';
    
    // Messages stat
    const messagesStat = this.createStatItem(
      'messages',
      dailyData.date_info.total_messages.toString(),
      'bg-ember-orange'
    );
    
    // Users stat
    const usersStat = this.createStatItem(
      'users',
      dailyData.date_info.active_users.toString(),
      'bg-ember-purple'
    );
    
    statsGrid.appendChild(messagesStat);
    statsGrid.appendChild(usersStat);
    
    statsCard.appendChild(statsTitle);
    statsCard.appendChild(statsGrid);
    
    return statsCard;
  }
  
  private createStatItem(label: string, value: string, iconColor: string) {
    // Create a stat item similar to Swift
    const statItem = document.createElement('div');
    statItem.className = 'flex items-center';
    
    // Icon container
    const iconContainer = document.createElement('div');
    iconContainer.className = `w-10 h-10 rounded-full ${iconColor} bg-opacity-10 flex items-center justify-center mr-3`;
    
    // Icon based on stat type
    const icon = document.createElement('i');
    
    if (label === 'messages') {
      icon.className = 'fas fa-comment text-ember-orange';
    } else if (label === 'users') {
      icon.className = 'fas fa-users text-ember-purple';
    }
    
    iconContainer.appendChild(icon);
    
    // Stat content
    const content = document.createElement('div');
    
    // Value
    const valueEl = document.createElement('div');
    valueEl.className = 'text-lg font-semibold text-white';
    valueEl.textContent = value;
    
    // Label
    const labelEl = document.createElement('div');
    labelEl.className = 'text-xs text-gray-400';
    labelEl.textContent = label;
    
    content.appendChild(valueEl);
    content.appendChild(labelEl);
    
    statItem.appendChild(iconContainer);
    statItem.appendChild(content);
    
    return statItem;
  }
  
  private createUserSection(dailyData: any) {
    // Create user section container
    const section = document.createElement('div');
    section.className = 'mb-6';
    
    // Section title with icon
    const title = document.createElement('h3');
    title.className = 'text-sm font-medium text-white mb-3 flex items-center';
    title.innerHTML = '<i class="fas fa-user-circle mr-2"></i> User Activity';
    
    section.appendChild(title);
    
    // Sort users by message count (like Swift would)
    const users = Object.entries(dailyData.user_analysis)
      .sort(([, a], [, b]) => (b as any).message_count - (a as any).message_count)
      .map(([user, analysis]) => ({ user, analysis }));
    
    // User list
    const userList = document.createElement('div');
    userList.className = 'space-y-2';
    
    // Create user items
    users.forEach(({ user, analysis }) => {
      const userItem = this.createUserItem(user, analysis as any);
      userList.appendChild(userItem);
    });
    
    section.appendChild(userList);
    
    return section;
  }
  
  private createUserItem(user: string, analysis: any) {
    const isExpanded = this.expandedSections.has(user);
    
    // Create user item container
    const container = document.createElement('div');
    container.className = 'rounded-lg overflow-hidden border border-gray-800';
    
    // User header/button
    const header = document.createElement('button');
    header.className = 'w-full p-3 flex items-center justify-between text-left bg-gray-900';
    
    // User info section
    const userInfo = document.createElement('div');
    userInfo.className = 'flex items-center';
    
    // User avatar
    const avatar = document.createElement('div');
    avatar.className = 'w-8 h-8 rounded-full bg-ember-purple bg-opacity-10 flex items-center justify-center text-ember-purple font-medium mr-3';
    avatar.textContent = user.charAt(0).toUpperCase();
    
    // User name and message count
    const nameSection = document.createElement('div');
    
    const name = document.createElement('div');
    name.className = 'text-sm font-medium text-white';
    name.textContent = user;
    
    const messageCount = document.createElement('div');
    messageCount.className = 'text-xs text-gray-400';
    messageCount.textContent = `${analysis.message_count} message${analysis.message_count !== 1 ? 's' : ''}`;
    
    nameSection.appendChild(name);
    nameSection.appendChild(messageCount);
    
    userInfo.appendChild(avatar);
    userInfo.appendChild(nameSection);
    
    // Chevron icon
    const chevron = document.createElement('i');
    chevron.className = `fas fa-chevron-${isExpanded ? 'up' : 'down'} text-gray-400`;
    
    header.appendChild(userInfo);
    header.appendChild(chevron);
    
    // Click handler
    header.addEventListener('click', () => {
      if (isExpanded) {
        this.expandedSections.delete(user);
      } else {
        this.expandedSections.add(user);
      }
      this.render();
    });
    
    container.appendChild(header);
    
    // Topics list (if expanded)
    if (isExpanded) {
      const topics = topicsToArray(analysis.topics);
      
      if (topics.length > 0) {
        const topicsList = document.createElement('div');
        topicsList.className = 'p-3 space-y-2 bg-black';
        
        topics.forEach(topic => {
          const topicItem = document.createElement('div');
          topicItem.className = 'flex items-center text-sm text-white py-1 px-2 rounded bg-gray-900';
          
          const topicIcon = document.createElement('i');
          topicIcon.className = 'fas fa-hashtag text-ember-orange text-opacity-70 mr-2 text-xs';
          
          const topicText = document.createElement('span');
          topicText.textContent = topic;
          
          topicItem.appendChild(topicIcon);
          topicItem.appendChild(topicText);
          
          topicsList.appendChild(topicItem);
        });
        
        container.appendChild(topicsList);
      }
    }
    
    return container;
  }
  
  private createTopicsSection(dailyData: any) {
    // Create topics section container
    const section = document.createElement('div');
    section.className = 'mb-6';
    
    // Section title with icon
    const title = document.createElement('h3');
    title.className = 'text-sm font-medium text-white mb-3 flex items-center';
    title.innerHTML = '<i class="fas fa-hashtag mr-2"></i> Top Topics';
    
    section.appendChild(title);
    
    // Collect all topics and count occurrences
    const topicCounts = new Map<string, number>();
    
    Object.values(dailyData.user_analysis).forEach((userAnalysis: any) => {
      const topics = topicsToArray(userAnalysis.topics);
      
      topics.forEach(topic => {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      });
    });
    
    // Sort topics by count
    const sortedTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    
    // Topics list
    const topicsList = document.createElement('div');
    topicsList.className = 'space-y-2';
    
    // Create topic items (top 5)
    sortedTopics.slice(0, 5).forEach(([topic, count]) => {
      const topicItem = document.createElement('div');
      topicItem.className = 'flex items-center justify-between p-3 bg-gray-900 rounded-lg';
      
      const topicText = document.createElement('span');
      topicText.className = 'text-sm text-white';
      topicText.textContent = topic;
      
      const countBadge = document.createElement('span');
      countBadge.className = 'text-xs bg-ember-orange bg-opacity-10 text-ember-orange px-2 py-1 rounded-full';
      countBadge.textContent = count.toString();
      
      topicItem.appendChild(topicText);
      topicItem.appendChild(countBadge);
      
      topicsList.appendChild(topicItem);
    });
    
    section.appendChild(topicsList);
    
    return section;
  }
  
  private hasTopics(dailyData: any): boolean {
    // Check if any user has topics
    return Object.values(dailyData.user_analysis).some((userAnalysis: any) => {
      const topics = topicsToArray(userAnalysis.topics);
      return topics.length > 0;
    });
  }
}