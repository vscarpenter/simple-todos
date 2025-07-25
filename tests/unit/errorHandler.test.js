/**
 * Comprehensive Unit Tests for Error Handler
 * Tests error categorization, user-friendly messages, recovery workflows, and logging
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

const mockSettingsManager = {
  get: jest.fn(() => false), // debugMode default
  debugLog: jest.fn()
};

global.createModuleMock('scripts/modules/eventBus.js', mockEventBus);
global.createModuleMock('scripts/modules/settings.js', { 
  settingsManager: mockSettingsManager,
  debugLog: jest.fn()
});

describe('Error Handler', () => {
  let ErrorHandler;
  let errorHandler;

  beforeEach(async () => {
    // Clear mocks
    mockEventBus.emit.mockClear();
    mockEventBus.on.mockClear();
    mockEventBus.off.mockClear();
    mockSettingsManager.get.mockClear();
    
    // Clear console mocks
    if (console.error.mockClear) console.error.mockClear();
    if (console.warn.mockClear) console.warn.mockClear();
    if (console.log.mockClear) console.log.mockClear();
    
    // Import error handler
    const errorModule = await import('scripts/modules/errorHandler.js');
    ErrorHandler = errorModule.ErrorHandler;
    errorHandler = errorModule.default;
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(errorHandler).toBeInstanceOf(ErrorHandler);
      expect(errorHandler.errorCounts).toBeInstanceOf(Map);
      expect(errorHandler.errorHistory).toBeInstanceOf(Array);
    });

    test('should set up global error handlers', () => {
      const originalOnError = window.onerror;
      const originalOnUnhandledRejection = window.onunhandledrejection;
      
      new ErrorHandler();
      
      expect(window.onerror).not.toBe(originalOnError);
      expect(window.onunhandledrejection).not.toBe(originalOnUnhandledRejection);
    });

    test('should listen for error events', () => {
      expect(mockEventBus.on).toHaveBeenCalledWith('error:occurred', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('error:recovery:needed', expect.any(Function));
    });
  });

  describe('Error Categorization', () => {
    test('should categorize validation errors', () => {
      const validationError = new Error('Task text is required');
      validationError.name = 'ValidationError';
      
      const category = errorHandler.categorizeError(validationError);
      
      expect(category).toBe('validation');
    });

    test('should categorize storage errors', () => {
      const storageError = new Error('QuotaExceededError');
      storageError.name = 'QuotaExceededError';
      
      const category = errorHandler.categorizeError(storageError);
      
      expect(category).toBe('storage');
    });

    test('should categorize network errors', () => {
      const networkError = new Error('Failed to fetch');
      networkError.name = 'NetworkError';
      
      const category = errorHandler.categorizeError(networkError);
      
      expect(category).toBe('network');
    });

    test('should categorize permission errors', () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      
      const category = errorHandler.categorizeError(permissionError);
      
      expect(category).toBe('permission');
    });

    test('should categorize unknown errors as system', () => {
      const unknownError = new Error('Unknown error');
      
      const category = errorHandler.categorizeError(unknownError);
      
      expect(category).toBe('system');
    });

    test('should handle TypeError as system error', () => {
      const typeError = new TypeError('Cannot read property of undefined');
      
      const category = errorHandler.categorizeError(typeError);
      
      expect(category).toBe('system');
    });

    test('should handle ReferenceError as system error', () => {
      const referenceError = new ReferenceError('Variable is not defined');
      
      const category = errorHandler.categorizeError(referenceError);
      
      expect(category).toBe('system');
    });
  });

  describe('User-Friendly Messages', () => {
    test('should provide user-friendly message for validation errors', () => {
      const validationError = new Error('Task text cannot exceed 200 characters');
      validationError.name = 'ValidationError';
      
      const userMessage = errorHandler.getUserFriendlyMessage(validationError);
      
      expect(userMessage).toContain('Please check your input');
      expect(userMessage).not.toContain('ValidationError');
    });

    test('should provide user-friendly message for storage errors', () => {
      const storageError = new Error('QuotaExceededError');
      storageError.name = 'QuotaExceededError';
      
      const userMessage = errorHandler.getUserFriendlyMessage(storageError);
      
      expect(userMessage).toContain('storage space');
      expect(userMessage).toContain('free up space');
    });

    test('should provide user-friendly message for network errors', () => {
      const networkError = new Error('Failed to fetch');
      networkError.name = 'NetworkError';
      
      const userMessage = errorHandler.getUserFriendlyMessage(networkError);
      
      expect(userMessage).toContain('connection');
      expect(userMessage).toContain('try again');
    });

    test('should provide generic message for unknown errors', () => {
      const unknownError = new Error('Mysterious error');
      
      const userMessage = errorHandler.getUserFriendlyMessage(unknownError);
      
      expect(userMessage).toContain('Something went wrong');
      expect(userMessage).toContain('try again');
    });

    test('should include recovery suggestions', () => {
      const storageError = new Error('Storage full');
      storageError.name = 'QuotaExceededError';
      
      const userMessage = errorHandler.getUserFriendlyMessage(storageError);
      
      expect(userMessage).toContain('export your data');
      expect(userMessage).toContain('clear old tasks');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle error with context', () => {
      const error = new Error('Test error');
      const context = {
        operation: 'task:create',
        taskData: { text: 'Test task' },
        userId: 'user-123'
      };
      
      errorHandler.handleError(error, context);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('error:handled', 
        expect.objectContaining({
          error,
          context,
          category: 'system',
          userMessage: expect.any(String)
        })
      );
    });

    test('should increment error count', () => {
      const error = new Error('Repeated error');
      
      errorHandler.handleError(error);
      errorHandler.handleError(error);
      
      expect(errorHandler.errorCounts.get('Repeated error')).toBe(2);
    });

    test('should add error to history', () => {
      const error = new Error('Historical error');
      const initialHistoryLength = errorHandler.errorHistory.length;
      
      errorHandler.handleError(error);
      
      expect(errorHandler.errorHistory.length).toBe(initialHistoryLength + 1);
      expect(errorHandler.errorHistory[errorHandler.errorHistory.length - 1]).toMatchObject({
        error: error,
        timestamp: expect.any(Date),
        category: 'system'
      });
    });

    test('should limit error history size', () => {
      // Fill history beyond limit
      for (let i = 0; i < 150; i++) {
        errorHandler.handleError(new Error(`Error ${i}`));
      }
      
      expect(errorHandler.errorHistory.length).toBeLessThanOrEqual(100);
    });

    test('should provide recovery suggestions', () => {
      const storageError = new Error('Storage quota exceeded');
      storageError.name = 'QuotaExceededError';
      
      const recovery = errorHandler.getRecoveryOptions(storageError);
      
      expect(recovery).toContain('export');
      expect(recovery).toContain('clear');
      expect(recovery).toContain('archive');
    });

    test('should handle critical errors differently', () => {
      const criticalError = new Error('Critical system failure');
      criticalError.critical = true;
      
      errorHandler.handleError(criticalError);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('error:critical', 
        expect.objectContaining({ error: criticalError })
      );
    });
  });

  describe('Error Logging', () => {
    test('should log errors to console in debug mode', () => {
      mockSettingsManager.get.mockReturnValue(true); // Enable debug mode
      
      const error = new Error('Debug error');
      errorHandler.handleError(error);
      
      expect(console.error).toHaveBeenCalledWith('[ERROR]', expect.any(String), error);
    });

    test('should not log sensitive information', () => {
      mockSettingsManager.get.mockReturnValue(true);
      
      const error = new Error('Error with sensitive data');
      const context = {
        password: 'secret123',
        apiKey: 'key-abc123',
        token: 'bearer-token'
      };
      
      errorHandler.handleError(error, context);
      
      const logCall = console.error.mock.calls[0];
      const loggedContent = JSON.stringify(logCall);
      
      expect(loggedContent).not.toContain('secret123');
      expect(loggedContent).not.toContain('key-abc123');
      expect(loggedContent).not.toContain('bearer-token');
    });

    test('should include error context in logs', () => {
      mockSettingsManager.get.mockReturnValue(true);
      
      const error = new Error('Context error');
      const context = {
        operation: 'task:update',
        taskId: 'task-123',
        timestamp: new Date().toISOString()
      };
      
      errorHandler.handleError(error, context);
      
      expect(console.error).toHaveBeenCalledWith(
        '[ERROR]',
        expect.stringContaining('task:update'),
        error
      );
    });

    test('should log error statistics', () => {
      mockSettingsManager.get.mockReturnValue(true);
      
      // Generate multiple errors
      for (let i = 0; i < 5; i++) {
        errorHandler.handleError(new Error('Repeated error'));
      }
      
      const stats = errorHandler.getErrorStatistics();
      
      expect(stats.totalErrors).toBe(5);
      expect(stats.errorsByCategory.system).toBe(5);
      expect(stats.mostCommonError).toBe('Repeated error');
    });
  });

  describe('Global Error Handling', () => {
    test('should handle uncaught JavaScript errors', () => {
      const handleErrorSpy = jest.spyOn(errorHandler, 'handleError');
      
      // Simulate uncaught error
      window.onerror('Test error', 'test.js', 10, 5, new Error('Test error'));
      
      expect(handleErrorSpy).toHaveBeenCalled();
    });

    test('should handle unhandled promise rejections', () => {
      const handleErrorSpy = jest.spyOn(errorHandler, 'handleError');
      
      // Simulate unhandled rejection
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(new Error('Unhandled rejection')),
        reason: new Error('Unhandled rejection')
      });
      
      window.onunhandledrejection(rejectionEvent);
      
      expect(handleErrorSpy).toHaveBeenCalled();
    });

    test('should prevent default error handling when appropriate', () => {
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(new Error('Handled rejection')),
        reason: new Error('Handled rejection'),
        preventDefault: jest.fn()
      });
      
      window.onunhandledrejection(rejectionEvent);
      
      expect(rejectionEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Error Recovery Workflows', () => {
    test('should provide automatic recovery for storage errors', () => {
      const storageError = new Error('Storage quota exceeded');
      storageError.name = 'QuotaExceededError';
      
      const canRecover = errorHandler.canAutoRecover(storageError);
      
      expect(canRecover).toBe(true);
    });

    test('should attempt automatic recovery', async () => {
      const storageError = new Error('Storage quota exceeded');
      storageError.name = 'QuotaExceededError';
      
      const recoveryResult = await errorHandler.attemptRecovery(storageError);
      
      expect(recoveryResult.attempted).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('error:recovery:attempted', 
        expect.objectContaining({ error: storageError })
      );
    });

    test('should not attempt recovery for non-recoverable errors', async () => {
      const systemError = new Error('System crash');
      
      const recoveryResult = await errorHandler.attemptRecovery(systemError);
      
      expect(recoveryResult.attempted).toBe(false);
    });

    test('should provide manual recovery options', () => {
      const validationError = new Error('Invalid input');
      validationError.name = 'ValidationError';
      
      const options = errorHandler.getManualRecoveryOptions(validationError);
      
      expect(options).toContain('correct the input');
      expect(options).toContain('try again');
    });
  });

  describe('Error Reporting and Analytics', () => {
    test('should generate error report', () => {
      // Generate some errors
      errorHandler.handleError(new Error('Error 1'));
      errorHandler.handleError(new Error('Error 2'));
      errorHandler.handleError(new Error('Error 1')); // Duplicate
      
      const report = errorHandler.generateErrorReport();
      
      expect(report).toHaveProperty('totalErrors', 3);
      expect(report).toHaveProperty('uniqueErrors', 2);
      expect(report).toHaveProperty('errorsByCategory');
      expect(report).toHaveProperty('timeline');
      expect(report).toHaveProperty('mostCommonErrors');
    });

    test('should export error data', () => {
      errorHandler.handleError(new Error('Export test error'));
      
      const exportData = errorHandler.exportErrorData();
      
      expect(exportData).toHaveProperty('version');
      expect(exportData).toHaveProperty('exportDate');
      expect(exportData).toHaveProperty('errors');
      expect(exportData).toHaveProperty('statistics');
    });

    test('should clear error history', () => {
      errorHandler.handleError(new Error('Clear test error'));
      
      expect(errorHandler.errorHistory.length).toBeGreaterThan(0);
      
      errorHandler.clearErrorHistory();
      
      expect(errorHandler.errorHistory.length).toBe(0);
      expect(errorHandler.errorCounts.size).toBe(0);
    });
  });

  describe('Error Prevention', () => {
    test('should validate error input', () => {
      expect(() => errorHandler.handleError(null)).not.toThrow();
      expect(() => errorHandler.handleError(undefined)).not.toThrow();
      expect(() => errorHandler.handleError('string error')).not.toThrow();
    });

    test('should handle circular references in context', () => {
      const circularContext = { data: {} };
      circularContext.data.self = circularContext;
      
      const error = new Error('Circular reference error');
      
      expect(() => errorHandler.handleError(error, circularContext)).not.toThrow();
    });

    test('should sanitize error messages', () => {
      const error = new Error('Error with <script>alert("xss")</script>');
      
      const userMessage = errorHandler.getUserFriendlyMessage(error);
      
      expect(userMessage).not.toContain('<script>');
      expect(userMessage).not.toContain('alert');
    });

    test('should rate limit error reporting', () => {
      const error = new Error('Rate limited error');
      
      // Generate many errors quickly
      for (let i = 0; i < 100; i++) {
        errorHandler.handleError(error);
      }
      
      // Should not emit event for every error due to rate limiting
      expect(mockEventBus.emit.mock.calls.length).toBeLessThan(100);
    });
  });

  describe('Integration with Application', () => {
    test('should integrate with toast notifications', () => {
      const error = new Error('Toast error');
      
      errorHandler.handleError(error, { showToast: true });
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('toast:show', 
        expect.objectContaining({
          type: 'error',
          message: expect.any(String)
        })
      );
    });

    test('should integrate with modal dialogs', () => {
      const criticalError = new Error('Critical error');
      criticalError.critical = true;
      
      errorHandler.handleError(criticalError);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('modal:show', 
        expect.objectContaining({
          type: 'error',
          title: expect.any(String),
          message: expect.any(String)
        })
      );
    });

    test('should provide error boundary functionality', () => {
      const componentError = new Error('Component error');
      const componentContext = {
        component: 'TaskList',
        props: { tasks: [] },
        state: { loading: false }
      };
      
      errorHandler.handleComponentError(componentError, componentContext);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('component:error', 
        expect.objectContaining({
          error: componentError,
          component: 'TaskList'
        })
      );
    });
  });

  describe('Performance and Memory Management', () => {
    test('should handle high-frequency errors efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        errorHandler.handleError(new Error(`Performance test error ${i}`));
      }
      
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should manage memory usage with large error histories', () => {
      // Generate many unique errors
      for (let i = 0; i < 200; i++) {
        errorHandler.handleError(new Error(`Memory test error ${i}`));
      }
      
      // History should be limited to prevent memory issues
      expect(errorHandler.errorHistory.length).toBeLessThanOrEqual(100);
    });

    test('should clean up old error data', () => {
      // Add old errors
      const oldError = {
        error: new Error('Old error'),
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        category: 'system'
      };
      
      errorHandler.errorHistory.push(oldError);
      
      errorHandler.cleanupOldErrors();
      
      // Old errors should be removed
      expect(errorHandler.errorHistory.find(e => e.error.message === 'Old error')).toBeUndefined();
    });
  });
});