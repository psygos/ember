/**
 * Loading screen component that shows while data is being loaded
 */
export class LoadingScreen {
    private container: HTMLElement;
    private element: HTMLElement;
    
    constructor(container: HTMLElement) {
      this.container = container;
      this.element = this.createLoadingElement();
      this.container.appendChild(this.element);
    }
    
    private createLoadingElement(): HTMLElement {
      const loadingWrapper = document.createElement('div');
      loadingWrapper.className = 'fixed inset-0 flex items-center justify-center bg-white dark:bg-ember-darkBg z-50 transition-opacity duration-500';
      
      const loadingContent = document.createElement('div');
      loadingContent.className = 'flex flex-col items-center';
      
      // Logo
      const logo = document.createElement('h1');
      logo.className = 'text-ember-orange font-montserrat font-black text-5xl mb-8';
      logo.textContent = 'ember';
      
      // Loading spinner
      const spinner = document.createElement('div');
      spinner.className = 'w-12 h-12 border-4 border-ember-orange border-t-transparent rounded-full animate-spin mb-4';
      
      // Loading text
      const loadingText = document.createElement('p');
      loadingText.className = 'text-ember-purple dark:text-white text-lg';
      loadingText.textContent = 'Loading analysis data...';
      
      // Assemble the components
      loadingContent.appendChild(logo);
      loadingContent.appendChild(spinner);
      loadingContent.appendChild(loadingText);
      loadingWrapper.appendChild(loadingContent);
      
      return loadingWrapper;
    }
    
    /**
     * Show the loading screen with a fade-in effect
     */
    public show(): void {
      this.element.style.opacity = '1';
      this.element.style.display = 'flex';
    }
    
    /**
     * Hide the loading screen with a fade-out effect
     */
    public hide(): void {
      this.element.style.opacity = '0';
      setTimeout(() => {
        this.element.style.display = 'none';
      }, 500); // Match the duration of the CSS transition
    }
    
    /**
     * Update the loading message
     */
    public updateMessage(message: string): void {
      const loadingText = this.element.querySelector('p');
      if (loadingText) {
        loadingText.textContent = message;
      }
    }
    
    /**
     * Clean up the component
     */
    public destroy(): void {
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
    }
  }