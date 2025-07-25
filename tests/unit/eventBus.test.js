/**
 * Comprehensive Unit Tests for Event Bus System
 * Tests event emission, subscription, unsubscription, and error handling
 */

import { jest } from '@jest/globals';

describe('EventBus', () => {
  let EventBus;
  let eventBus;

  beforeEach(async () => {
    // Import EventBus fresh for each test
    const eventBusModule = await import('scripts/modules/eventBus.js');
    EventBus = eventBusModule.EventBus;
    eventBus = eventBusModule.default; // Default export is singleton instance
  });

  afterEach(() => {
    // Clear all listeners after each test
    eventBus.listeners.clear();
  });

  describe('Initialization', () => {
    test('should initialize with empty listeners map', () => {
      const newEventBus = new EventBus();
      expect(newEventBus.listeners).toBeInstanceOf(Map);
      expect(newEventBus.listeners.size).toBe(0);
    });

    test('should provide singleton instance', () => {
      expect(eventBus).toBeInstanceOf(EventBus);
    });
  });

  describe('Event Subscription', () => {
    test('should subscribe to events', () => {
      const callback = jest.fn();
      
      eventBus.on('test:event', callback);
      
      expect(eventBus.listeners.has('test:event')).toBe(true);
      expect(eventBus.listeners.get('test:event')).toContain(callback);
    });

    test('should support multiple subscribers for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();
      
      eventBus.on('test:event', callback1);
      eventBus.on('test:event', callback2);
      eventBus.on('test:event', callback3);
      
      const listeners = eventBus.listeners.get('test:event');
      expect(listeners).toHaveLength(3);
      expect(listeners).toContain(callback1);
      expect(listeners).toContain(callback2);
      expect(listeners).toContain(callback3);
    });

    test('should not add duplicate callbacks', () => {
      const callback = jest.fn();
      
      eventBus.on('test:event', callback);
      eventBus.on('test:event', callback); // Same callback again
      
      const listeners = eventBus.listeners.get('test:event');
      expect(listeners).toHaveLength(1);
    });

    test('should handle subscription to multiple events', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      eventBus.on('event:one', callback1);
      eventBus.on('event:two', callback2);
      
      expect(eventBus.listeners.has('event:one')).toBe(true);
      expect(eventBus.listeners.has('event:two')).toBe(true);
      expect(eventBus.listeners.size).toBe(2);
    });
  });

  describe('Event Emission', () => {
    test('should emit events to subscribers', () => {
      const callback = jest.fn();
      
      eventBus.on('test:event', callback);
      eventBus.emit('test:event', { data: 'test' });
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    test('should emit events to all subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();
      
      eventBus.on('test:event', callback1);
      eventBus.on('test:event', callback2);
      eventBus.on('test:event', callback3);
      
      eventBus.emit('test:event', { message: 'hello' });
      
      expect(callback1).toHaveBeenCalledWith({ message: 'hello' });
      expect(callback2).toHaveBeenCalledWith({ message: 'hello' });
      expect(callback3).toHaveBeenCalledWith({ message: 'hello' });
    });

    test('should emit events without data', () => {
      const callback = jest.fn();
      
      eventBus.on('test:event', callback);
      eventBus.emit('test:event');
      
      expect(callback).toHaveBeenCalledWith(undefined);
    });

    test('should not throw when emitting to non-existent event', () => {
      expect(() => {
        eventBus.emit('non:existent:event', { data: 'test' });
      }).not.toThrow();
    });

    test('should handle complex data objects', () => {
      const callback = jest.fn();
      const complexData = {
        user: { id: 1, name: 'John' },
        tasks: [
          { id: 'task-1', text: 'Task 1', status: 'todo' },
          { id: 'task-2', text: 'Task 2', status: 'done' }
        ],
        metadata: {
          timestamp: new Date().toISOString(),
          version: '2.0'
        }
      };
      
      eventBus.on('complex:event', callback);
      eventBus.emit('complex:event', complexData);
      
      expect(callback).toHaveBeenCalledWith(complexData);
    });

    test('should preserve event emission order', () => {
      const callOrder = [];
      const callback1 = jest.fn(() => callOrder.push('callback1'));
      const callback2 = jest.fn(() => callOrder.push('callback2'));
      const callback3 = jest.fn(() => callOrder.push('callback3'));
      
      eventBus.on('order:test', callback1);
      eventBus.on('order:test', callback2);
      eventBus.on('order:test', callback3);
      
      eventBus.emit('order:test');
      
      expect(callOrder).toEqual(['callback1', 'callback2', 'callback3']);
    });
  });

  describe('Event Unsubscription', () => {
    test('should unsubscribe specific callback', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      eventBus.on('test:event', callback1);
      eventBus.on('test:event', callback2);
      
      eventBus.off('test:event', callback1);
      
      const listeners = eventBus.listeners.get('test:event');
      expect(listeners).toHaveLength(1);
      expect(listeners).toContain(callback2);
      expect(listeners).not.toContain(callback1);
    });

    test('should remove event entry when no callbacks remain', () => {
      const callback = jest.fn();
      
      eventBus.on('test:event', callback);
      eventBus.off('test:event', callback);
      
      expect(eventBus.listeners.has('test:event')).toBe(false);
    });

    test('should handle unsubscribing non-existent callback', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      eventBus.on('test:event', callback1);
      
      expect(() => {
        eventBus.off('test:event', callback2); // callback2 was never subscribed
      }).not.toThrow();
      
      expect(eventBus.listeners.get('test:event')).toContain(callback1);
    });

    test('should handle unsubscribing from non-existent event', () => {
      const callback = jest.fn();
      
      expect(() => {
        eventBus.off('non:existent:event', callback);
      }).not.toThrow();
    });

    test('should unsubscribe all callbacks for an event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      eventBus.on('test:event', callback1);
      eventBus.on('test:event', callback2);
      
      eventBus.off('test:event'); // No callback specified = remove all
      
      expect(eventBus.listeners.has('test:event')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = jest.fn();
      
      eventBus.on('error:test', errorCallback);
      eventBus.on('error:test', normalCallback);
      
      expect(() => {
        eventBus.emit('error:test', { data: 'test' });
      }).not.toThrow();
      
      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
    });

    test('should continue executing other callbacks after error', () => {
      const callOrder = [];
      const errorCallback = jest.fn(() => {
        callOrder.push('error');
        throw new Error('Test error');
      });
      const callback1 = jest.fn(() => callOrder.push('callback1'));
      const callback2 = jest.fn(() => callOrder.push('callback2'));
      
      eventBus.on('error:test', callback1);
      eventBus.on('error:test', errorCallback);
      eventBus.on('error:test', callback2);
      
      eventBus.emit('error:test');
      
      expect(callOrder).toEqual(['callback1', 'error', 'callback2']);
    });

    test('should handle null/undefined callbacks', () => {
      expect(() => {
        eventBus.on('test:event', null);
      }).not.toThrow();
      
      expect(() => {
        eventBus.on('test:event', undefined);
      }).not.toThrow();
      
      expect(() => {
        eventBus.off('test:event', null);
      }).not.toThrow();
    });

    test('should handle invalid event names', () => {
      const callback = jest.fn();
      
      expect(() => {
        eventBus.on('', callback);
      }).not.toThrow();
      
      expect(() => {
        eventBus.on(null, callback);
      }).not.toThrow();
      
      expect(() => {
        eventBus.on(undefined, callback);
      }).not.toThrow();
    });
  });

  describe('Event Patterns and Namespacing', () => {
    test('should support namespaced events', () => {
      const taskCallback = jest.fn();
      const boardCallback = jest.fn();
      const stateCallback = jest.fn();
      
      eventBus.on('task:created', taskCallback);
      eventBus.on('board:updated', boardCallback);
      eventBus.on('state:changed', stateCallback);
      
      eventBus.emit('task:created', { id: 'task-1' });
      eventBus.emit('board:updated', { id: 'board-1' });
      eventBus.emit('state:changed', { filter: 'todo' });
      
      expect(taskCallback).toHaveBeenCalledWith({ id: 'task-1' });
      expect(boardCallback).toHaveBeenCalledWith({ id: 'board-1' });
      expect(stateCallback).toHaveBeenCalledWith({ filter: 'todo' });
    });

    test('should handle deeply nested event names', () => {
      const callback = jest.fn();
      
      eventBus.on('app:module:component:action:completed', callback);
      eventBus.emit('app:module:component:action:completed', { success: true });
      
      expect(callback).toHaveBeenCalledWith({ success: true });
    });

    test('should distinguish between similar event names', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();
      
      eventBus.on('task:create', callback1);
      eventBus.on('task:created', callback2);
      eventBus.on('task:creating', callback3);
      
      eventBus.emit('task:created', { id: 'task-1' });
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith({ id: 'task-1' });
      expect(callback3).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Memory Management', () => {
    test('should handle large numbers of subscribers efficiently', () => {
      const callbacks = [];
      
      // Create 1000 subscribers
      for (let i = 0; i < 1000; i++) {
        const callback = jest.fn();
        callbacks.push(callback);
        eventBus.on('performance:test', callback);
      }
      
      const startTime = Date.now();
      eventBus.emit('performance:test', { data: 'test' });
      const endTime = Date.now();
      
      // Should complete quickly (under 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      
      // All callbacks should have been called
      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalledWith({ data: 'test' });
      });
    });

    test('should handle rapid event emissions', () => {
      const callback = jest.fn();
      
      eventBus.on('rapid:test', callback);
      
      const startTime = Date.now();
      
      // Emit 1000 events rapidly
      for (let i = 0; i < 1000; i++) {
        eventBus.emit('rapid:test', { iteration: i });
      }
      
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100);
      expect(callback).toHaveBeenCalledTimes(1000);
    });

    test('should properly clean up memory when unsubscribing', () => {
      const callbacks = [];
      
      // Create many subscribers
      for (let i = 0; i < 100; i++) {
        const callback = jest.fn();
        callbacks.push(callback);
        eventBus.on('memory:test', callback);
      }
      
      expect(eventBus.listeners.get('memory:test')).toHaveLength(100);
      
      // Unsubscribe all
      callbacks.forEach(callback => {
        eventBus.off('memory:test', callback);
      });
      
      expect(eventBus.listeners.has('memory:test')).toBe(false);
    });

    test('should handle concurrent subscriptions and emissions', () => {
      const results = [];
      
      // Simulate concurrent operations
      for (let i = 0; i < 50; i++) {
        const callback = jest.fn((data) => results.push(data.value));
        eventBus.on('concurrent:test', callback);
        eventBus.emit('concurrent:test', { value: i });
      }
      
      // Should handle all operations without issues
      expect(results.length).toBeGreaterThan(0);
      expect(eventBus.listeners.get('concurrent:test')).toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    test('should support typical application event flow', () => {
      const events = [];
      
      // Set up event listeners for typical app flow
      eventBus.on('app:init', (data) => events.push({ type: 'init', data }));
      eventBus.on('data:loaded', (data) => events.push({ type: 'loaded', data }));
      eventBus.on('task:created', (data) => events.push({ type: 'task_created', data }));
      eventBus.on('state:changed', (data) => events.push({ type: 'state_changed', data }));
      eventBus.on('ui:updated', (data) => events.push({ type: 'ui_updated', data }));
      
      // Simulate application flow
      eventBus.emit('app:init', { version: '2.0' });
      eventBus.emit('data:loaded', { boards: [], tasks: [] });
      eventBus.emit('task:created', { id: 'task-1', text: 'New task' });
      eventBus.emit('state:changed', { currentBoardId: 'board-1' });
      eventBus.emit('ui:updated', { component: 'task-list' });
      
      expect(events).toHaveLength(5);
      expect(events[0].type).toBe('init');
      expect(events[1].type).toBe('loaded');
      expect(events[2].type).toBe('task_created');
      expect(events[3].type).toBe('state_changed');
      expect(events[4].type).toBe('ui_updated');
    });

    test('should support event chaining', () => {
      const eventChain = [];
      
      eventBus.on('step:1', (data) => {
        eventChain.push('step1');
        eventBus.emit('step:2', { ...data, step: 2 });
      });
      
      eventBus.on('step:2', (data) => {
        eventChain.push('step2');
        eventBus.emit('step:3', { ...data, step: 3 });
      });
      
      eventBus.on('step:3', (data) => {
        eventChain.push('step3');
        expect(data.step).toBe(3);
      });
      
      eventBus.emit('step:1', { initial: true });
      
      expect(eventChain).toEqual(['step1', 'step2', 'step3']);
    });

    test('should support conditional event handling', () => {
      const processedEvents = [];
      
      eventBus.on('conditional:event', (data) => {
        if (data.condition === 'process') {
          processedEvents.push(data);
          eventBus.emit('event:processed', data);
        }
      });
      
      const processedCallback = jest.fn();
      eventBus.on('event:processed', processedCallback);
      
      // Emit events with different conditions
      eventBus.emit('conditional:event', { id: 1, condition: 'ignore' });
      eventBus.emit('conditional:event', { id: 2, condition: 'process' });
      eventBus.emit('conditional:event', { id: 3, condition: 'ignore' });
      eventBus.emit('conditional:event', { id: 4, condition: 'process' });
      
      expect(processedEvents).toHaveLength(2);
      expect(processedEvents[0].id).toBe(2);
      expect(processedEvents[1].id).toBe(4);
      expect(processedCallback).toHaveBeenCalledTimes(2);
    });
  });
});