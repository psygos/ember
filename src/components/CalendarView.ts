// @ts-nocheck
import { store } from '../store/AnalysisStore';
import CalendarDateHelper from '../utils/CalendarDateHelper';
import { format, addMonths, subMonths } from 'date-fns';

/**
 * Calendar View component - mirror of Swift CalendarView
 */
export default class CalendarView {
  private container: HTMLElement;
  private currentMonth: Date;
  private dateHelper: CalendarDateHelper;
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.dateHelper = CalendarDateHelper.shared;
    this.currentMonth = new Date();
    this.render();
  }
  
  private render() {
    // Clear container
    this.container.innerHTML = '';
    
    // Create main container with white background (like Swift)
    const calendarContainer = document.createElement('div');
    calendarContainer.className = 'flex flex-col h-full bg-white text-black';
    
    // Month/Year section (matches Swift headerHeight)
    const monthYearSelector = this.createMonthYearSelector();
    monthYearSelector.style.height = '60px'; 
    calendarContainer.appendChild(monthYearSelector);
    
    // Add divider (purple like in Swift)
    const divider = document.createElement('div');
    divider.className = 'h-px bg-ember-purple bg-opacity-30';
    calendarContainer.appendChild(divider);
    
    // Add calendar grid in a scrollable container
    const calendarContent = this.createCalendarContent();
    calendarContent.className = 'flex-1 overflow-auto';
    calendarContainer.appendChild(calendarContent);
    
    // Add to container
    this.container.appendChild(calendarContainer);
  }
  
  private createMonthYearSelector() {
    // Create header container - directly matching Swift
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between px-4 py-2 border-b border-gray-200';
    
    // Left side with month and year selectors
    const leftSection = document.createElement('div');
    leftSection.className = 'flex items-center space-x-4';
    
    // Month selector - matches Swift brackets
    const monthSelector = document.createElement('div');
    monthSelector.className = 'flex items-center';
    
    const monthBracketLeft = document.createElement('span');
    monthBracketLeft.className = 'text-ember-purple text-opacity-50 text-xl font-light';
    monthBracketLeft.textContent = '［';
    
    const monthLabel = document.createElement('span');
    monthLabel.className = 'text-lg font-medium text-ember-purple';
    monthLabel.textContent = format(this.currentMonth, 'MMMM');
    
    const monthBracketRight = document.createElement('span');
    monthBracketRight.className = 'text-ember-purple text-opacity-50 text-xl font-light';
    monthBracketRight.textContent = '］';
    
    monthSelector.appendChild(monthBracketLeft);
    monthSelector.appendChild(monthLabel);
    monthSelector.appendChild(monthBracketRight);
    
    // Year selector - matches Swift brackets
    const yearSelector = document.createElement('div');
    yearSelector.className = 'flex items-center';
    
    const yearBracketLeft = document.createElement('span');
    yearBracketLeft.className = 'text-ember-purple text-opacity-50 text-xl font-light';
    yearBracketLeft.textContent = '［';
    
    const yearLabel = document.createElement('span');
    yearLabel.className = 'text-lg font-medium text-ember-purple';
    yearLabel.textContent = format(this.currentMonth, 'yyyy');
    
    const yearBracketRight = document.createElement('span');
    yearBracketRight.className = 'text-ember-purple text-opacity-50 text-xl font-light';
    yearBracketRight.textContent = '］';
    
    yearSelector.appendChild(yearBracketLeft);
    yearSelector.appendChild(yearLabel);
    yearSelector.appendChild(yearBracketRight);
    
    leftSection.appendChild(monthSelector);
    leftSection.appendChild(yearSelector);
    
    // Right side navigation buttons - exactly like Swift
    const rightSection = document.createElement('div');
    rightSection.className = 'flex items-center space-x-4';
    
    // Previous month button (with circle background)
    const prevButton = document.createElement('button');
    prevButton.className = 'w-8 h-8 flex items-center justify-center rounded-full';
    prevButton.style.background = 'rgba(241, 80, 47, 0.1)';
    
    const prevIcon = document.createElement('i');
    prevIcon.className = 'fas fa-chevron-left text-ember-orange';
    prevButton.appendChild(prevIcon);
    
    prevButton.addEventListener('click', () => {
      this.currentMonth = subMonths(this.currentMonth, 1);
      this.render();
    });
    
    // Next month button (with circle background)
    const nextButton = document.createElement('button');
    nextButton.className = 'w-8 h-8 flex items-center justify-center rounded-full';
    nextButton.style.background = 'rgba(241, 80, 47, 0.1)';
    
    const nextIcon = document.createElement('i');
    nextIcon.className = 'fas fa-chevron-right text-ember-orange';
    nextButton.appendChild(nextIcon);
    
    nextButton.addEventListener('click', () => {
      this.currentMonth = addMonths(this.currentMonth, 1);
      this.render();
    });
    
    rightSection.appendChild(prevButton);
    rightSection.appendChild(nextButton);
    
    // Add sections to header
    header.appendChild(leftSection);
    header.appendChild(rightSection);
    
    return header;
  }
  
  private createCalendarContent() {
    // Create calendar content container with padding like Swift
    const contentContainer = document.createElement('div');
    contentContainer.className = 'p-4';
    
    // Create a VStack/GeometryReader equivalent
    const calendarStack = document.createElement('div');
    calendarStack.className = 'flex flex-col items-center w-full h-full';
    
    // Day names header (Sun, Mon, Tue, etc.)
    const daysHeader = this.createDaysHeader();
    daysHeader.className = 'w-4/5 grid grid-cols-7 mb-4';
    calendarStack.appendChild(daysHeader);
    
    // Create grid for calendar cells
    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'w-4/5 grid grid-cols-7 gap-2 auto-rows-fr';
    
    // Get all dates for the current month view
    const calendarDates = this.dateHelper.generateCalendarDates(this.currentMonth);
    
    // Calculate the aspect ratio to match Swift (calendarHeight / 6)
    const cellAspectRatio = 'aspect-square'; // Square cells
    
    // Create cells for each date
    calendarDates.forEach(date => {
      const cell = this.createCalendarCell(date, cellAspectRatio);
      calendarGrid.appendChild(cell);
    });
    
    calendarStack.appendChild(calendarGrid);
    contentContainer.appendChild(calendarStack);
    
    return contentContainer;
  }
  
  private createDaysHeader() {
    const header = document.createElement('div');
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
      const dayEl = document.createElement('div');
      dayEl.className = 'text-center text-sm font-semibold text-ember-purple';
      dayEl.textContent = day;
      header.appendChild(dayEl);
    });
    
    return header;
  }
  
  private createCalendarCell(date: Date | null, aspectRatio: string) {
    const cell = document.createElement('div');
    
    if (!date) {
      // Empty cell for dates outside the current month
      cell.className = aspectRatio;
      return cell;
    }
    
    // Use saved recall memories only
    const dateKey = this.dateHelper.dateKey(date);
    // const dailyData = store.state.analysisData?.daily_analysis?.[dateKey]; // removed old analysisData dependency
    
    // Check various date states
    const isSelected = this.dateHelper.isSameDay(store.state.selectedDate, date);
    const isCurrentMonth = date.getMonth() === this.currentMonth.getMonth();
    const isToday = this.dateHelper.isSameDay(date, new Date());
    
    // Build container with proper styling
    cell.className = `${aspectRatio} p-1 rounded-md border relative flex flex-col cursor-pointer transition-all duration-100 ease-in-out`;
    
    // Style based on states (based on Swift CalendarCell rendering)
    if (isSelected) {
      cell.classList.add('border-ember-orange', 'bg-ember-orange', 'bg-opacity-10');
    } else if (isToday) {
      cell.classList.add('border-ember-purple', 'border-opacity-40');
    } else {
      cell.classList.add('border-gray-200');
    }
    
    if (!isCurrentMonth) {
      cell.classList.add('opacity-40');
    }
    
    // Date number (top left like Swift)
    const dateNumber = document.createElement('div');
    dateNumber.className = 'text-sm font-medium self-start';
    dateNumber.textContent = date.getDate().toString();
    cell.appendChild(dateNumber);
    
    // Indicators for saved recall memories
    const savedArr = store.state.savedMemories[dateKey] || [];
    if (savedArr.length > 0) {
      const activitiesContainer = document.createElement('div');
      activitiesContainer.className = 'flex space-x-1 mt-auto self-end';
      const savedCount = Math.min(3, savedArr.length);
      for (let i = 0; i < savedCount; i++) {
        const dot = document.createElement('div');
        dot.className = 'w-1.5 h-1.5 rounded-full bg-ember-orange';
        activitiesContainer.appendChild(dot);
      }
      cell.appendChild(activitiesContainer);
    }
    
    // Add click event
    cell.addEventListener('click', () => {
      store.setSelectedDate(date);
      this.render(); // Refresh to update selection
    });
    
    return cell;
  }
}