/**
 * Basic Test Suite
 * Simple tests to validate Jest setup and basic functionality
 */

import { jest } from '@jest/globals';

describe('Basic Test Suite', () => {
  test('Jest is working correctly', () => {
    expect(true).toBe(true);
  });

  test('Math operations work', () => {
    expect(2 + 2).toBe(4);
    expect(10 - 5).toBe(5);
    expect(3 * 4).toBe(12);
  });

  test('Array operations work', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
    expect(arr.map(x => x * 2)).toEqual([2, 4, 6]);
  });

  test('Object operations work', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj).toHaveProperty('name');
    expect(obj.name).toBe('test');
    expect(obj).toEqual({ name: 'test', value: 42 });
  });

  test('Jest mocks work', () => {
    const mockFn = jest.fn();
    mockFn('arg1', 'arg2');
    
    expect(mockFn).toHaveBeenCalled();
    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('Async operations work', async () => {
    const promise = Promise.resolve('success');
    await expect(promise).resolves.toBe('success');
  });

  test('Error handling works', () => {
    const throwError = () => {
      throw new Error('Test error');
    };
    
    expect(throwError).toThrow('Test error');
  });
});

describe('Environment Validation', () => {
  test('Global objects are available', () => {
    expect(global).toBeDefined();
    expect(console).toBeDefined();
  });

  test('Mocked localStorage is available', () => {
    expect(global.localStorage).toBeDefined();
    expect(global.localStorage.getItem).toBeDefined();
    expect(global.localStorage.setItem).toBeDefined();
  });

  test('Mocked crypto is available', () => {
    expect(global.crypto).toBeDefined();
    expect(global.crypto.randomUUID).toBeDefined();
    expect(global.crypto.randomUUID()).toBe('test-uuid-12345');
  });
});