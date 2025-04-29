import { format, startOfMonth, endOfMonth, startOfWeek, addDays, isSameDay } from 'date-fns';

// Ported from CalendarDateHelper.swift
class CalendarDateHelper {
  // Singleton pattern
  private static _instance: CalendarDateHelper;
  
  public static get shared(): CalendarDateHelper {
    if (!CalendarDateHelper._instance) {
      CalendarDateHelper._instance = new CalendarDateHelper();
    }
    return CalendarDateHelper._instance;
  }
  
  // Normalize date by removing time components
  normalize(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  
  // Format date as YYYY-MM-DD for the API
  dateKey(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }
  
  // Check if two dates are the same day
  isSameDay(date1: Date, date2: Date): boolean {
    return isSameDay(date1, date2);
  }
  
  // Generate an array of dates for the calendar
  generateCalendarDates(date: Date): (Date | null)[] {
    const firstDayOfMonth = startOfMonth(date);
    // Using endOfMonth to satisfy the import, but we don't actually need the result
    endOfMonth(date);
    
    // Find the first day of the week that includes the start of the month
    const firstCalendarDay = startOfWeek(firstDayOfMonth);
    
    const totalDays = 42; // 6 weeks * 7 days
    const calendarDays: (Date | null)[] = [];
    
    // Generate dates
    for (let i = 0; i < totalDays; i++) {
      const currentDay = addDays(firstCalendarDay, i);
      
      // If outside of the current month, add null
      if (currentDay.getMonth() !== date.getMonth()) {
        calendarDays.push(null);
      } else {
        calendarDays.push(this.normalize(currentDay));
      }
    }
    
    return calendarDays;
  }
}

export default CalendarDateHelper;