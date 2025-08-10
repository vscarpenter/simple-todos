/**
 * Unit Tests for ErrorHandler
 * Tests the static methods of the ErrorHandler class.
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

// Import the class to be tested
const { ErrorHandler } = await import('../../scripts/modules/errorHandler.js');

const setupDOM = () => {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <body>
      </body>
    </html>
  `);
  global.document = dom.window.document;
  global.window = dom.window;
};

describe('ErrorHandler', () => {

  beforeEach(() => {
    setupDOM();
    jest.clearAllMocks();
    // Manually init the static class
    ErrorHandler.init();
  });

  afterEach(() => {
    const container = document.getElementById('error-container');
    if (container) {
        container.remove();
        ErrorHandler.errorContainer = null;
    }
  });

  describe('Initialization', () => {
    test('should create an error container div in the body', () => {
      expect(ErrorHandler.errorContainer).not.toBeNull();
      expect(document.getElementById('error-container')).not.toBeNull();
    });
  });

  describe('User-Facing Messages', () => {
    test('should show a success message', () => {
        ErrorHandler.showSuccess('Operation successful!');
        const successToast = document.querySelector('.error-toast--success');
        expect(successToast).not.toBeNull();
        expect(successToast.textContent).toContain('Operation successful!');
    });

    test('should show an error message', () => {
        ErrorHandler.handleError(new Error('Something bad happened'), 'Test Context');
        const errorToast = document.querySelector('.error-toast--error');
        expect(errorToast).not.toBeNull();
        // It should show a user-friendly message, not the raw error
        expect(errorToast.textContent).not.toContain('Something bad happened');
        expect(errorToast.textContent).toContain('Something went wrong');
    });

    test('should get a user-friendly message for a known context', () => {
        const message = ErrorHandler.getUserFriendlyMessage(new Error('raw error'), 'Validation Error');
        expect(message).toBe('Please check your input and try again.');
    });

    test('should get a generic message for an unknown context', () => {
        const message = ErrorHandler.getUserFriendlyMessage(new Error('raw error'), 'Some Obscure Context');
        expect(message).toBe('Something went wrong. Please try again.');
    });
  });

  describe('Error Hiding', () => {
    test('should auto-hide toasts after a duration', (done) => {
        jest.useFakeTimers();
        ErrorHandler.showInfo('This should disappear.', { duration: 1000 });
        
        const infoToast = document.querySelector('.error-toast--info');
        expect(infoToast).not.toBeNull();

        // Fast-forward time
        jest.advanceTimersByTime(1500);

        // The hiding animation takes 300ms
        expect(infoToast.classList.contains('error-toast--hiding')).toBe(true);
        
        // Fast-forward past the animation
        jest.advanceTimersByTime(300);
        
        expect(document.querySelector('.error-toast--info')).toBeNull();
        jest.useRealTimers();
        done();
    });

    test('should be able to be closed manually', () => {
        ErrorHandler.showWarning('A warning.', { autoHide: false });
        const warningToast = document.querySelector('.error-toast--warning');
        const closeButton = warningToast.querySelector('.error-toast__close');

        closeButton.click();

        expect(warningToast.classList.contains('error-toast--hiding')).toBe(true);
    });
  });

  describe('Error Logging', () => {
    test('should log the error to the console', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const error = new Error('Test log');
        
        ErrorHandler.handleError(error, 'Logging Test');

        expect(consoleSpy).toHaveBeenCalledWith('[ERROR] Logging Test:', error);
        consoleSpy.mockRestore();
    });
  });
});