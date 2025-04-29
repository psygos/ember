// A simple event bus to facilitate communication between components

type EventCallback = (...args: any[]) => void;

class EventSystem {
  private static _instance: EventSystem;
  private _events: Map<string, Set<EventCallback>> = new Map();
  
  private constructor() {}
  
  public static get instance(): EventSystem {
    if (!EventSystem._instance) {
      EventSystem._instance = new EventSystem();
    }
    return EventSystem._instance;
  }
  
  /**
   * Subscribe to an event
   * @param event Event name to subscribe to
   * @param callback Function to call when event is emitted
   */
  public on(event: string, callback: EventCallback): void {
    if (!this._events.has(event)) {
      this._events.set(event, new Set());
    }
    
    this._events.get(event)!.add(callback);
  }
  
  /**
   * Unsubscribe from an event
   * @param event Event name to unsubscribe from
   * @param callback Function to remove from subscription list
   */
  public off(event: string, callback: EventCallback): void {
    if (this._events.has(event)) {
      this._events.get(event)!.delete(callback);
      
      if (this._events.get(event)!.size === 0) {
        this._events.delete(event);
      }
    }
  }
  
  /**
   * Emit an event
   * @param event Event name to emit
   * @param args Arguments to pass to event callbacks
   */
  public emit(event: string, ...args: any[]): void {
    if (this._events.has(event)) {
      for (const callback of this._events.get(event)!) {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event callback for '${event}':`, error);
        }
      }
    }
  }
  
  /**
   * Clear all event subscriptions
   */
  public clear(): void {
    this._events.clear();
  }
}

// Define common event names to avoid string typos
export const EventNames = {
  NODE_SELECTED: 'node_selected',
  NODE_HOVERED: 'node_hovered',
  CATEGORY_EXPANDED: 'category_expanded',
  LABEL_EXPANDED: 'label_expanded', // Added to match new naming in GraphSidebar
  VIEW_CHANGED: 'view_changed',
  THEME_CHANGED: 'theme_changed',
  GRAPH_ZOOM_CHANGED: 'graph_zoom_changed'
};

export default EventSystem;