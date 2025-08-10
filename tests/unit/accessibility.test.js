/**
 * Unit Tests for Accessibility Features
 */

import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';

// Mock dependencies
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

global.createModuleMock('scripts/modules/eventBus.js', mockEventBus);

// Import the singleton instance to be tested
const accessibilityManager = await import('../../scripts/modules/accessibility.js');

const setupDOM = () => {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <body>
        <header></header>
        <main>
            <div class="task-board">
                <div id="todo-column" class="board-column">
                    <h3>To Do</h3>
                    <div id="todo-list" class="column-content" data-status="todo"></div>
                </div>
            </div>
        </main>
        <footer></footer>
        <div id="custom-modal" style="display: none;"></div>
      </body>
    </html>
  `);
  global.document = dom.window.document;
  global.window = dom.window;
  global.HTMLElement = dom.window.HTMLElement;
};


describe('AccessibilityManager', () => {
  beforeEach(() => {
    setupDOM();
    jest.clearAllMocks();
    // Reset the singleton instance for each test
    accessibilityManager.default.isInitialized = false;
  });

  describe('Initialization', () => {
    test('should create a screen reader announcer element', () => {
      accessibilityManager.default.init();
      const announcer = document.getElementById('screen-reader-announcements');
      expect(announcer).not.toBeNull();
      expect(announcer.getAttribute('aria-live')).toBe('polite');
    });

    test('should enhance HTML with roles', () => {
        accessibilityManager.default.init();
        expect(document.querySelector('header').getAttribute('role')).toBe('banner');
        expect(document.querySelector('main').getAttribute('role')).toBe('main');
        expect(document.querySelector('footer').getAttribute('role')).toBe('contentinfo');
    });
  });

  describe('Announcements', () => {
    test('should announce messages to the screen reader div', (done) => {
      accessibilityManager.default.init();
      const message = 'This is a test announcement';
      accessibilityManager.default.announce(message);

      // Announcements have a 100ms delay
      setTimeout(() => {
        const announcer = document.getElementById('screen-reader-announcements');
        expect(announcer.textContent).toBe(message);
        done();
      }, 150);
    });
  });

  describe('Focus Management', () => {
    test('should restore focus to the previously focused element', () => {
        accessibilityManager.default.init();
        const button1 = document.createElement('button');
        const button2 = document.createElement('button');
        document.body.appendChild(button1);
        document.body.appendChild(button2);

        // Simulate focus changes
        accessibilityManager.default.focusManagement.previousFocus = button1;
        
        accessibilityManager.default.restoreFocus();
        expect(document.activeElement).toBe(button1);
    });
  });

  describe('DOM helpers', () => {
    test('isInTaskBoard should return true for elements inside the board', () => {
        accessibilityManager.default.init();
        const taskBoard = document.querySelector('.task-board');
        const element = document.createElement('div');
        taskBoard.appendChild(element);
        
        expect(accessibilityManager.default.isInTaskBoard(element)).toBe(true);
    });

    test('isInTaskBoard should return false for elements outside the board', () => {
        accessibilityManager.default.init();
        const footer = document.querySelector('footer');
        expect(accessibilityManager.default.isInTaskBoard(footer)).toBe(false);
    });

    test('isInModal should return true for elements inside a visible modal', () => {
        accessibilityManager.default.init();
        const modal = document.getElementById('custom-modal');
        const button = document.createElement('button');
        modal.appendChild(button);
        modal.style.display = 'block';

        expect(accessibilityManager.default.isInModal(button)).toBe(true);
    });
  });
});