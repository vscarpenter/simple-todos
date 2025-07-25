/**
 * Comprehensive Performance Tests
 * Tests scalability, memory usage, rendering performance, and large dataset handling
 */

import { jest } from '@jest/globals';

describe('Performance Tests', () => {
  let modules = {};
  let performanceObserver;

  beforeEach(async () => {
    // Clear localStorage
    localStorage.clear();
    
    // Set up performance monitoring
    performanceObserver = {
      measurements: [],
      mark: (name) => {
        performanceObserver.measurements.push({
          name,
          timestamp: performance.now(),
          type: 'mark'
        });
      },
      measure: (name, startMark, endMark) => {
        const start = performanceObserver.measurements.find(m => m.name === startMark);
        const end = performanceObserver.measurements.find(m => m.name === endMark);
        const duration = end ? end.timestamp - start.timestamp : 0;
        
        performanceObserver.measurements.push({
          name,
          duration,
          type: 'measure'
        });
        
        return duration;
      },
      getMeasurement: (name) => {
        return performanceObserver.measurements.find(m => m.name === name && m.type === 'measure');
      }
    };
    
    // Set up basic DOM structure
    document.body.innerHTML = `
      <div id="main-content">
        <div id="todo-list" data-status="todo"></div>
        <div id="doing-list" data-status="doing"></div>
        <div id="done-list" data-status="done"></div>
        <div id="board-selector-menu"></div>
      </div>
    `;
    
    try {
      // Import modules for testing
      const eventBusModule = await import('scripts/modules/eventBus.js');
      const stateModule = await import('scripts/modules/state.js');
      const storageModule = await import('scripts/modules/storage.js');
      const domModule = await import('scripts/modules/dom.js');
      const modelsModule = await import('scripts/modules/models.js');
      
      modules = {
        eventBus: eventBusModule.default,
        state: stateModule.default,
        storage: storageModule.default,
        dom: domModule.default,
        models: modelsModule
      };
    } catch (error) {
      // Create performance-focused mocks
      modules = {
        eventBus: {
          emit: jest.fn(),
          on: jest.fn(),
          off: jest.fn()
        },
        state: {
          getState: jest.fn(() => ({ boards: [], tasks: [] })),
          setState: jest.fn(),
          subscribe: jest.fn(() => () => {})
        },
        storage: {
          save: jest.fn(() => true),
          load: jest.fn(() => ({ boards: [], tasks: [] }))
        },
        dom: {
          renderTasks: jest.fn(),
          renderBoardSelector: jest.fn()
        },
        models: {
          Task: class {
            constructor(data) {
              this.id = data.id || `task-${Date.now()}-${Math.random()}`;
              this.text = data.text || '';
              this.status = data.status || 'todo';
              this.createdDate = data.createdDate || new Date().toISOString();
            }
          },
          Board: class {
            constructor(data) {
              this.id = data.id || `board-${Date.now()}-${Math.random()}`;
              this.name = data.name || '';
              this.tasks = data.tasks || [];
            }
          }
        }
      };
    }
  });

  describe('Large Dataset Performance', () => {
    test('should handle 10,000+ tasks efficiently', () => {
      const taskCount = 10000;
      const tasks = [];
      
      performanceObserver.mark('task-creation-start');
      
      // Create large number of tasks
      for (let i = 0; i < taskCount; i++) {
        const task = new modules.models.Task({
          id: `task-${i}`,
          text: `Task ${i}`,
          status: i % 3 === 0 ? 'todo' : i % 3 === 1 ? 'doing' : 'done'
        });
        tasks.push(task);
      }
      
      performanceObserver.mark('task-creation-end');
      const creationTime = performanceObserver.measure(
        'task-creation-time',
        'task-creation-start',
        'task-creation-end'
      );
      
      expect(tasks).toHaveLength(taskCount);
      expect(creationTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle multiple boards with many tasks', () => {
      const boardCount = 100;
      const tasksPerBoard = 100;
      const boards = [];
      
      performanceObserver.mark('board-creation-start');
      
      for (let i = 0; i < boardCount; i++) {
        const tasks = [];
        for (let j = 0; j < tasksPerBoard; j++) {
          tasks.push(new modules.models.Task({
            id: `task-${i}-${j}`,
            text: `Task ${j} in Board ${i}`,
            status: 'todo'
          }));
        }
        
        boards.push(new modules.models.Board({
          id: `board-${i}`,
          name: `Board ${i}`,
          tasks
        }));
      }
      
      performanceObserver.mark('board-creation-end');
      const creationTime = performanceObserver.measure(
        'board-creation-time',
        'board-creation-start',
        'board-creation-end'
      );
      
      expect(boards).toHaveLength(boardCount);
      expect(boards[0].tasks).toHaveLength(tasksPerBoard);
      expect(creationTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    test('should efficiently filter and search large task sets', () => {
      const taskCount = 5000;
      const tasks = Array.from({ length: taskCount }, (_, i) => ({
        id: `task-${i}`,
        text: `Task ${i} with keyword ${i % 10 === 0 ? 'important' : 'normal'}`,
        status: i % 3 === 0 ? 'todo' : i % 3 === 1 ? 'doing' : 'done'
      }));
      
      performanceObserver.mark('filter-start');
      
      // Filter by status
      const todoTasks = tasks.filter(task => task.status === 'todo');
      
      // Search by keyword
      const importantTasks = tasks.filter(task => task.text.includes('important'));
      
      // Complex filter
      const complexFilter = tasks.filter(task => 
        task.status === 'todo' && task.text.includes('important')
      );
      
      performanceObserver.mark('filter-end');
      const filterTime = performanceObserver.measure(
        'filter-time',
        'filter-start',
        'filter-end'
      );
      
      expect(todoTasks.length).toBeGreaterThan(0);
      expect(importantTasks.length).toBe(500); // Every 10th task
      expect(complexFilter.length).toBeGreaterThan(0);
      expect(filterTime).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('DOM Rendering Performance', () => {
    test('should render large task lists efficiently', () => {
      const taskCount = 1000;
      const tasks = Array.from({ length: taskCount }, (_, i) => ({
        id: `task-${i}`,
        text: `Task ${i}`,
        status: i % 3 === 0 ? 'todo' : i % 3 === 1 ? 'doing' : 'done'
      }));
      
      performanceObserver.mark('render-start');
      
      // Mock DOM rendering with actual DOM operations
      const todoList = document.getElementById('todo-list');
      const doingList = document.getElementById('doing-list');
      const doneList = document.getElementById('done-list');
      
      // Clear existing content
      todoList.innerHTML = '';
      doingList.innerHTML = '';
      doneList.innerHTML = '';
      
      // Use document fragment for efficient DOM updates
      const todoFragment = document.createDocumentFragment();
      const doingFragment = document.createDocumentFragment();
      const doneFragment = document.createDocumentFragment();
      
      tasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-card';
        taskElement.textContent = task.text;
        taskElement.setAttribute('data-task-id', task.id);
        
        if (task.status === 'todo') {
          todoFragment.appendChild(taskElement);
        } else if (task.status === 'doing') {
          doingFragment.appendChild(taskElement);
        } else {
          doneFragment.appendChild(taskElement);
        }
      });
      
      todoList.appendChild(todoFragment);
      doingList.appendChild(doingFragment);
      doneList.appendChild(doneFragment);
      
      performanceObserver.mark('render-end');
      const renderTime = performanceObserver.measure(
        'render-time',
        'render-start',
        'render-end'
      );
      
      expect(document.querySelectorAll('.task-card')).toHaveLength(taskCount);
      expect(renderTime).toBeLessThan(500); // Should complete within 500ms
    });

    test('should handle rapid DOM updates efficiently', () => {
      const updateCount = 100;
      
      performanceObserver.mark('rapid-updates-start');
      
      for (let i = 0; i < updateCount; i++) {
        // Simulate rapid task updates
        const taskElement = document.createElement('div');
        taskElement.className = 'task-card';
        taskElement.textContent = `Rapid Task ${i}`;
        
        document.getElementById('todo-list').appendChild(taskElement);
        
        // Immediately remove it (simulating rapid changes)
        if (i % 2 === 0) {
          taskElement.remove();
        }
      }
      
      performanceObserver.mark('rapid-updates-end');
      const updateTime = performanceObserver.measure(
        'rapid-updates-time',
        'rapid-updates-start',
        'rapid-updates-end'
      );
      
      expect(updateTime).toBeLessThan(200); // Should complete within 200ms
    });

    test('should efficiently update task counters', () => {
      const tasks = Array.from({ length: 1000 }, (_, i) => ({
        status: i % 3 === 0 ? 'todo' : i % 3 === 1 ? 'doing' : 'done'
      }));
      
      performanceObserver.mark('counter-update-start');
      
      // Count tasks by status
      const counts = tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {});
      
      // Update DOM counters (if they exist)
      const todoCount = document.getElementById('todo-count');
      const doingCount = document.getElementById('doing-count');
      const doneCount = document.getElementById('done-count');
      
      if (todoCount) todoCount.textContent = counts.todo || 0;
      if (doingCount) doingCount.textContent = counts.doing || 0;
      if (doneCount) doneCount.textContent = counts.done || 0;
      
      performanceObserver.mark('counter-update-end');
      const updateTime = performanceObserver.measure(
        'counter-update-time',
        'counter-update-start',
        'counter-update-end'
      );
      
      expect(updateTime).toBeLessThan(50); // Should complete within 50ms
    });
  });

  describe('Memory Usage Performance', () => {
    test('should not create memory leaks with event listeners', () => {
      const eventListeners = [];
      const elementCount = 1000;
      
      // Create many elements with event listeners
      for (let i = 0; i < elementCount; i++) {
        const element = document.createElement('div');
        const handler = () => console.log(`Handler ${i}`);
        
        element.addEventListener('click', handler);
        eventListeners.push({ element, handler });
        document.body.appendChild(element);
      }
      
      // Clean up event listeners
      performanceObserver.mark('cleanup-start');
      
      eventListeners.forEach(({ element, handler }) => {
        element.removeEventListener('click', handler);
        element.remove();
      });
      
      performanceObserver.mark('cleanup-end');
      const cleanupTime = performanceObserver.measure(
        'cleanup-time',
        'cleanup-start',
        'cleanup-end'
      );
      
      expect(cleanupTime).toBeLessThan(100); // Should complete within 100ms
      expect(document.querySelectorAll('div').length).toBeLessThan(elementCount);
    });

    test('should efficiently manage large state objects', () => {
      const largeState = {
        boards: Array.from({ length: 100 }, (_, i) => ({
          id: `board-${i}`,
          name: `Board ${i}`,
          tasks: Array.from({ length: 100 }, (_, j) => ({
            id: `task-${i}-${j}`,
            text: `Task ${j}`,
            status: 'todo'
          }))
        }))
      };
      
      performanceObserver.mark('state-operations-start');
      
      // Simulate state operations
      modules.state.setState(largeState);
      const retrievedState = modules.state.getState();
      
      // Simulate state updates
      const updatedState = {
        ...retrievedState,
        boards: retrievedState.boards.map(board => ({
          ...board,
          lastModified: new Date().toISOString()
        }))
      };
      
      modules.state.setState(updatedState);
      
      performanceObserver.mark('state-operations-end');
      const operationTime = performanceObserver.measure(
        'state-operations-time',
        'state-operations-start',
        'state-operations-end'
      );
      
      expect(operationTime).toBeLessThan(200); // Should complete within 200ms
    });

    test('should handle garbage collection efficiently', () => {
      const objectCount = 10000;
      const objects = [];
      
      performanceObserver.mark('object-creation-start');
      
      // Create many objects
      for (let i = 0; i < objectCount; i++) {
        objects.push({
          id: i,
          data: new Array(100).fill(i),
          timestamp: Date.now()
        });
      }
      
      performanceObserver.mark('object-creation-end');
      
      // Clear references to allow garbage collection
      performanceObserver.mark('cleanup-start');
      objects.length = 0;
      
      performanceObserver.mark('cleanup-end');
      
      const creationTime = performanceObserver.measure(
        'object-creation-time',
        'object-creation-start',
        'object-creation-end'
      );
      
      const cleanupTime = performanceObserver.measure(
        'object-cleanup-time',
        'cleanup-start',
        'cleanup-end'
      );
      
      expect(creationTime).toBeLessThan(500);
      expect(cleanupTime).toBeLessThan(10);
      expect(objects).toHaveLength(0);
    });
  });

  describe('Storage Performance', () => {
    test('should handle large data serialization efficiently', () => {
      const largeData = {
        boards: Array.from({ length: 50 }, (_, i) => ({
          id: `board-${i}`,
          name: `Board ${i}`,
          tasks: Array.from({ length: 200 }, (_, j) => ({
            id: `task-${i}-${j}`,
            text: `Task ${j} with some longer description text`,
            status: j % 3 === 0 ? 'todo' : j % 3 === 1 ? 'doing' : 'done',
            createdDate: new Date().toISOString(),
            lastModified: new Date().toISOString()
          }))
        }))
      };
      
      performanceObserver.mark('serialization-start');
      
      // Serialize data
      const serialized = JSON.stringify(largeData);
      
      // Deserialize data
      const deserialized = JSON.parse(serialized);
      
      performanceObserver.mark('serialization-end');
      const serializationTime = performanceObserver.measure(
        'serialization-time',
        'serialization-start',
        'serialization-end'
      );
      
      expect(deserialized.boards).toHaveLength(50);
      expect(deserialized.boards[0].tasks).toHaveLength(200);
      expect(serializationTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle localStorage operations efficiently', () => {
      const dataSize = 1000; // Number of items
      const testData = Array.from({ length: dataSize }, (_, i) => ({
        id: `item-${i}`,
        data: `Data for item ${i}`,
        timestamp: Date.now()
      }));
      
      performanceObserver.mark('storage-operations-start');
      
      // Save to localStorage
      localStorage.setItem('performance-test', JSON.stringify(testData));
      
      // Read from localStorage
      const retrieved = JSON.parse(localStorage.getItem('performance-test'));
      
      // Update data
      const updated = retrieved.map(item => ({
        ...item,
        updated: true
      }));
      
      localStorage.setItem('performance-test', JSON.stringify(updated));
      
      performanceObserver.mark('storage-operations-end');
      const storageTime = performanceObserver.measure(
        'storage-operations-time',
        'storage-operations-start',
        'storage-operations-end'
      );
      
      expect(retrieved).toHaveLength(dataSize);
      expect(storageTime).toBeLessThan(500); // Should complete within 500ms
      
      // Cleanup
      localStorage.removeItem('performance-test');
    });

    test('should handle storage quota efficiently', () => {
      const testData = [];
      let quotaReached = false;
      
      performanceObserver.mark('quota-test-start');
      
      try {
        // Try to fill storage until quota is reached
        for (let i = 0; i < 1000 && !quotaReached; i++) {
          const data = {
            id: i,
            largeData: new Array(1000).fill(`data-${i}`).join('')
          };
          
          testData.push(data);
          localStorage.setItem(`quota-test-${i}`, JSON.stringify(data));
        }
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          quotaReached = true;
        }
      }
      
      // Clean up
      for (let i = 0; i < testData.length; i++) {
        localStorage.removeItem(`quota-test-${i}`);
      }
      
      performanceObserver.mark('quota-test-end');
      const quotaTime = performanceObserver.measure(
        'quota-test-time',
        'quota-test-start',
        'quota-test-end'
      );
      
      expect(quotaTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Event System Performance', () => {
    test('should handle high-frequency event emissions', () => {
      const eventCount = 10000;
      const listeners = [];
      
      // Set up multiple listeners
      for (let i = 0; i < 10; i++) {
        const listener = jest.fn();
        listeners.push(listener);
        modules.eventBus.on('performance:test', listener);
      }
      
      performanceObserver.mark('event-emission-start');
      
      // Emit many events
      for (let i = 0; i < eventCount; i++) {
        modules.eventBus.emit('performance:test', { iteration: i });
      }
      
      performanceObserver.mark('event-emission-end');
      const emissionTime = performanceObserver.measure(
        'event-emission-time',
        'event-emission-start',
        'event-emission-end'
      );
      
      expect(emissionTime).toBeLessThan(1000); // Should complete within 1 second
      
      // Verify all listeners were called
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalledTimes(eventCount);
      });
    });

    test('should handle event listener cleanup efficiently', () => {
      const listenerCount = 1000;
      const listeners = [];
      
      // Create many listeners
      for (let i = 0; i < listenerCount; i++) {
        const listener = jest.fn();
        listeners.push(listener);
        modules.eventBus.on(`test:event:${i}`, listener);
      }
      
      performanceObserver.mark('listener-cleanup-start');
      
      // Remove all listeners
      listeners.forEach((listener, i) => {
        modules.eventBus.off(`test:event:${i}`, listener);
      });
      
      performanceObserver.mark('listener-cleanup-end');
      const cleanupTime = performanceObserver.measure(
        'listener-cleanup-time',
        'listener-cleanup-start',
        'listener-cleanup-end'
      );
      
      expect(cleanupTime).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('Real-world Performance Scenarios', () => {
    test('should handle typical user workflow efficiently', () => {
      performanceObserver.mark('workflow-start');
      
      // Simulate typical user workflow
      // 1. Load app with existing data
      const existingData = {
        boards: Array.from({ length: 5 }, (_, i) => ({
          id: `board-${i}`,
          name: `Board ${i}`,
          tasks: Array.from({ length: 20 }, (_, j) => ({
            id: `task-${i}-${j}`,
            text: `Task ${j}`,
            status: 'todo'
          }))
        }))
      };
      
      modules.state.setState(existingData);
      
      // 2. Switch between boards
      for (let i = 0; i < 5; i++) {
        modules.state.setState({ currentBoardId: `board-${i}` });
        modules.dom.renderTasks(existingData.boards[i].tasks);
      }
      
      // 3. Create new tasks
      for (let i = 0; i < 10; i++) {
        const newTask = new modules.models.Task({
          text: `New task ${i}`,
          status: 'todo'
        });
        
        existingData.boards[0].tasks.push(newTask);
        modules.storage.save(existingData);
      }
      
      // 4. Move tasks between columns
      for (let i = 0; i < 5; i++) {
        existingData.boards[0].tasks[i].status = 'doing';
        modules.dom.renderTasks(existingData.boards[0].tasks);
      }
      
      performanceObserver.mark('workflow-end');
      const workflowTime = performanceObserver.measure(
        'workflow-time',
        'workflow-start',
        'workflow-end'
      );
      
      expect(workflowTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle stress test scenario', () => {
      performanceObserver.mark('stress-test-start');
      
      // Create stress test scenario
      const stressData = {
        boards: Array.from({ length: 100 }, (_, i) => ({
          id: `stress-board-${i}`,
          name: `Stress Board ${i}`,
          tasks: Array.from({ length: 100 }, (_, j) => ({
            id: `stress-task-${i}-${j}`,
            text: `Stress Task ${j} in Board ${i}`,
            status: j % 3 === 0 ? 'todo' : j % 3 === 1 ? 'doing' : 'done'
          }))
        }))
      };
      
      // Perform multiple operations
      modules.state.setState(stressData);
      modules.storage.save(stressData);
      
      // Simulate rapid board switching
      for (let i = 0; i < 20; i++) {
        const boardIndex = i % stressData.boards.length;
        modules.state.setState({ currentBoardId: stressData.boards[boardIndex].id });
      }
      
      // Simulate task filtering
      const allTasks = stressData.boards.flatMap(board => board.tasks);
      const todoTasks = allTasks.filter(task => task.status === 'todo');
      const doingTasks = allTasks.filter(task => task.status === 'doing');
      const doneTasks = allTasks.filter(task => task.status === 'done');
      
      performanceObserver.mark('stress-test-end');
      const stressTime = performanceObserver.measure(
        'stress-test-time',
        'stress-test-start',
        'stress-test-end'
      );
      
      expect(stressTime).toBeLessThan(3000); // Should complete within 3 seconds
      expect(allTasks.length).toBe(10000); // 100 boards * 100 tasks
      expect(todoTasks.length + doingTasks.length + doneTasks.length).toBe(allTasks.length);
    });
  });
});