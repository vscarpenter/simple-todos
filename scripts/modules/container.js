/**
 * Dependency Injection Container
 * Replaces global window patterns with proper dependency management
 */

export class Container {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
    }

    /**
     * Register a service with the container
     * @param {string} name - Service name
     * @param {Function|Object} factory - Factory function or instance
     * @param {Object} options - Registration options
     */
    register(name, factory, options = {}) {
        const { singleton = false } = options;
        
        this.services.set(name, {
            factory,
            singleton,
            instance: null
        });
    }

    /**
     * Get a service from the container
     * @param {string} name - Service name
     * @returns {*} Service instance
     */
    get(name) {
        const service = this.services.get(name);
        
        if (!service) {
            throw new Error(`Service '${name}' not found in container`);
        }

        // Return singleton instance if already created
        if (service.singleton && service.instance) {
            return service.instance;
        }

        // Create instance
        let instance;
        if (typeof service.factory === 'function') {
            // For classes, return the constructor, for factory functions, call them
            try {
                // Try to determine if it's a class constructor
                const factoryStr = service.factory.toString();
                if (factoryStr.startsWith('class ') || factoryStr.includes('constructor(')) {
                    instance = service.factory; // Return the class itself
                } else {
                    instance = service.factory(this); // Call factory function
                }
            } catch (error) {
                // Fallback: return the factory as-is
                instance = service.factory;
            }
        } else {
            instance = service.factory;
        }

        // Store singleton instance
        if (service.singleton) {
            service.instance = instance;
        }

        return instance;
    }

    /**
     * Check if service is registered
     * @param {string} name - Service name
     * @returns {boolean}
     */
    has(name) {
        return this.services.has(name);
    }

    /**
     * Register multiple services at once
     * @param {Object} services - Object with service definitions
     */
    registerServices(services) {
        Object.entries(services).forEach(([name, config]) => {
            if (typeof config === 'function' || typeof config === 'object') {
                this.register(name, config);
            } else if (config.factory) {
                this.register(name, config.factory, config.options || {});
            }
        });
    }

    /**
     * Clear all services (useful for testing)
     */
    clear() {
        this.services.clear();
        this.singletons.clear();
    }
}

/**
 * Application Context
 * Central place for application state and services
 */
export class AppContext {
    constructor(container) {
        this.container = container;
        this.app = null;
        this.keyboardNav = null;
    }

    /**
     * Set the main application instance
     * @param {CascadeApp} app - Application instance
     */
    setApp(app) {
        this.app = app;
    }

    /**
     * Get the main application instance
     * @returns {CascadeApp}
     */
    getApp() {
        if (!this.app) {
            throw new Error('Application not initialized');
        }
        return this.app;
    }

    /**
     * Set keyboard navigator instance
     * @param {KeyboardNavigator} keyboardNav
     */
    setKeyboardNav(keyboardNav) {
        this.keyboardNav = keyboardNav;
    }

    /**
     * Get keyboard navigator instance
     * @returns {KeyboardNavigator}
     */
    getKeyboardNav() {
        return this.keyboardNav;
    }

    /**
     * Get service from container
     * @param {string} name - Service name
     * @returns {*}
     */
    get(name) {
        return this.container.get(name);
    }

    /**
     * Check if service exists
     * @param {string} name - Service name
     * @returns {boolean}
     */
    has(name) {
        return this.container.has(name);
    }
}

// Create global container instance
export const container = new Container();
export const appContext = new AppContext(container);