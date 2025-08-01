/**
 * Simple pub/sub event bus for reactive UI updates
 */
class EventBus {
    constructor() {
        this.events = {};
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        
        // Prevent duplicate callbacks
        if (this.events[event].indexOf(callback) === -1) {
            this.events[event].push(callback);
        }

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove (optional - if not provided, removes all callbacks)
     */
    off(event, callback) {
        if (!this.events[event]) return;
        
        if (callback) {
            // Remove specific callback
            const index = this.events[event].indexOf(callback);
            if (index > -1) {
                this.events[event].splice(index, 1);
            }
        } else {
            // Remove all callbacks for this event
            this.events[event] = [];
        }
        
        // Clean up empty event arrays
        if (this.events[event].length === 0) {
            delete this.events[event];
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Data to pass to callbacks
     */
    emit(event, data) {
        if (!this.events[event]) return;
        
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for '${event}':`, error);
            }
        });
    }

    /**
     * Subscribe to an event once (auto-unsubscribe after first emit)
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    once(event, callback) {
        const unsubscribe = this.on(event, (data) => {
            callback(data);
            unsubscribe();
        });
        return unsubscribe;
    }
}

// Export singleton instance
export default new EventBus();