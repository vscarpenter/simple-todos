/**
 * DOM Mock utilities for testing
 * Provides comprehensive DOM element mocking
 */

import { jest } from '@jest/globals';

export class MockElement {
  constructor(tagName = 'div', id = null) {
    this.tagName = tagName.toLowerCase();
    this.id = id;
    this.className = '';
    this.innerHTML = '';
    this.textContent = '';
    this.value = '';
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.attributes = {};
    this.eventListeners = {};
    this.dataset = {};
  }

  appendChild(child) {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parentNode = null;
    }
    return child;
  }

  querySelector(selector) {
    // Simple implementation for common selectors
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return this.findById(id);
    }
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      return this.findByClass(className);
    }
    return this.findByTagName(selector);
  }

  querySelectorAll(selector) {
    return [this.querySelector(selector)].filter(Boolean);
  }

  findById(id) {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.findById?.(id);
      if (found) return found;
    }
    return null;
  }

  findByClass(className) {
    if (this.className.includes(className)) return this;
    for (const child of this.children) {
      const found = child.findByClass?.(className);
      if (found) return found;
    }
    return null;
  }

  findByTagName(tagName) {
    if (this.tagName === tagName.toLowerCase()) return this;
    for (const child of this.children) {
      const found = child.findByTagName?.(tagName);
      if (found) return found;
    }
    return null;
  }

  addEventListener(event, handler) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(handler);
  }

  removeEventListener(event, handler) {
    if (this.eventListeners[event]) {
      const index = this.eventListeners[event].indexOf(handler);
      if (index !== -1) {
        this.eventListeners[event].splice(index, 1);
      }
    }
  }

  dispatchEvent(event) {
    const eventType = event.type || event;
    if (this.eventListeners[eventType]) {
      this.eventListeners[eventType].forEach(handler => {
        handler(event);
      });
    }
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  classList = {
    add: (className) => {
      if (!this.className.includes(className)) {
        this.className = this.className ? `${this.className} ${className}` : className;
      }
    },
    remove: (className) => {
      this.className = this.className.replace(new RegExp(`\\b${className}\\b`, 'g'), '').trim();
    },
    contains: (className) => {
      return this.className.includes(className);
    },
    toggle: (className) => {
      if (this.classList.contains(className)) {
        this.classList.remove(className);
      } else {
        this.classList.add(className);
      }
    }
  };

  scrollIntoView(options) {
    // Mock implementation
  }

  focus() {
    // Mock implementation
  }

  click() {
    this.dispatchEvent({ type: 'click' });
  }
}

export function createMockDOM() {
  const document = new MockElement('document');
  
  // Create essential DOM elements
  const html = new MockElement('html');
  const body = new MockElement('body');
  const todoApp = new MockElement('div', 'todo-app');
  
  // Form elements
  const todoForm = new MockElement('form', 'todo-form');
  const todoInput = new MockElement('input', 'todo-input');
  todoInput.type = 'text';
  
  // Column elements - add the correct class names for proper functionality
  const todoList = new MockElement('div', 'todo-list');
  todoList.className = 'task-column';
  const doingList = new MockElement('div', 'doing-list');
  doingList.className = 'task-column';
  const doneList = new MockElement('div', 'done-list');
  doneList.className = 'task-column';
  
  // Counter elements
  const todoCount = new MockElement('span', 'todo-count');
  const doingCount = new MockElement('span', 'doing-count');
  const doneCount = new MockElement('span', 'done-count');
  
  // Button elements
  const importButton = new MockElement('button', 'import-button');
  const exportButton = new MockElement('button', 'export-button');
  const archiveButton = new MockElement('button', 'archive-button');
  
  // Board selector elements
  const boardSelectorBtn = new MockElement('button', 'board-selector-btn');
  const currentBoardName = new MockElement('span', 'current-board-name');
  const boardSelectorMenu = new MockElement('ul', 'board-selector-menu');
  
  // Modal elements
  const customModal = new MockElement('div', 'custom-modal');
  
  // Build DOM tree
  document.appendChild(html);
  html.appendChild(body);
  body.appendChild(todoApp);
  
  todoApp.appendChild(todoForm);
  todoForm.appendChild(todoInput);
  
  todoApp.appendChild(todoList);
  todoApp.appendChild(doingList);
  todoApp.appendChild(doneList);
  
  todoApp.appendChild(todoCount);
  todoApp.appendChild(doingCount);
  todoApp.appendChild(doneCount);
  
  todoApp.appendChild(importButton);
  todoApp.appendChild(exportButton);
  todoApp.appendChild(archiveButton);
  
  todoApp.appendChild(boardSelectorBtn);
  todoApp.appendChild(currentBoardName);
  todoApp.appendChild(boardSelectorMenu);
  
  body.appendChild(customModal);
  
  // Mock document methods
  document.getElementById = (id) => document.findById(id);
  document.querySelector = (selector) => {
    // Avoid recursion by using the parent's querySelector method
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return document.findById(id);
    }
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      return document.findByClass(className);
    }
    return document.findByTagName(selector);
  };
  document.querySelectorAll = (selector) => {
    const element = document.querySelector(selector);
    return element ? [element] : [];
  };
  document.createElement = (tagName) => new MockElement(tagName);
  document.body = body;
  
  return { document, elements: {
    todoApp,
    todoForm,
    todoInput,
    todoList,
    doingList,
    doneList,
    todoCount,
    doingCount,
    doneCount,
    importButton,
    exportButton,
    archiveButton,
    boardSelectorBtn,
    currentBoardName,
    boardSelectorMenu,
    customModal
  }};
}

export function mockGlobalDOM() {
  const { document } = createMockDOM();
  
  global.document = document;
  global.window = {
    document,
    location: { hostname: 'localhost' },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    matchMedia: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))
  };
  
  return document;
}