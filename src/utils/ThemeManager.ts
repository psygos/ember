// Centralized theme management to ensure consistency across the app

export type Theme = 'light' | 'dark';

class ThemeManager {
  private static _instance: ThemeManager;
  private _theme: Theme = 'light';
  private _listeners: Array<(theme: Theme) => void> = [];
  
  private constructor() {
    // Initialize theme based on system preference or saved value
    this._theme = this.getInitialTheme();
    this.applyTheme(this._theme);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('theme')) {
        // Only auto-switch if the user hasn't explicitly set a preference
        const newTheme = e.matches ? 'dark' : 'light';
        this.setTheme(newTheme);
      }
    });
  }
  
  private getInitialTheme(): Theme {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }
    
    // Use system preference if no saved preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  public static get instance(): ThemeManager {
    if (!ThemeManager._instance) {
      ThemeManager._instance = new ThemeManager();
    }
    return ThemeManager._instance;
  }
  
  public get theme(): Theme {
    return this._theme;
  }
  
  public setTheme(theme: Theme): void {
    if (this._theme !== theme) {
      this._theme = theme;
      localStorage.setItem('theme', theme);
      this.applyTheme(theme);
      this.notifyListeners();
    }
  }
  
  public toggleTheme(): void {
    this.setTheme(this._theme === 'light' ? 'dark' : 'light');
  }
  
  public addListener(listener: (theme: Theme) => void): void {
    this._listeners.push(listener);
  }
  
  public removeListener(listener: (theme: Theme) => void): void {
    this._listeners = this._listeners.filter(l => l !== listener);
  }
  
  private notifyListeners(): void {
    this._listeners.forEach(listener => listener(this._theme));
  }
  
  private applyTheme(theme: Theme): void {
    // Apply to document element
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Set CSS variables for consistent colors
    document.documentElement.style.setProperty('--ember-text-primary', theme === 'dark' ? '#FFFFFF' : '#441151');
    document.documentElement.style.setProperty('--ember-text-secondary', theme === 'dark' ? '#CCCCCC' : '#666666');
    document.documentElement.style.setProperty('--ember-background-primary', theme === 'dark' ? '#000000' : '#FFFFFF');
    document.documentElement.style.setProperty('--ember-background-secondary', theme === 'dark' ? '#121212' : '#F8F7FC');
    document.documentElement.style.setProperty('--ember-border-color', theme === 'dark' ? '#333333' : '#DDDDDD');
  }
}

export default ThemeManager;