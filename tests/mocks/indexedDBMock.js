/**
 * IndexedDB Mock for Testing
 * Provides comprehensive IndexedDB mocking without localStorage dependencies
 */

export class MockIndexedDB {
    constructor() {
        this.databases = new Map();
        this.version = 1;
    }

    open(name, version = 1) {
        return new Promise((resolve) => {
            const request = new MockDBRequest();
            
            setTimeout(() => {
                if (!this.databases.has(name)) {
                    this.databases.set(name, new MockDatabase(name, version));
                    // Trigger upgrade needed
                    request.triggerUpgradeNeeded();
                }
                
                const db = this.databases.get(name);
                request.triggerSuccess(db);
                resolve(request);
            }, 0);

            return request;
        });
    }

    deleteDatabase(name) {
        return new Promise((resolve) => {
            const request = new MockDBRequest();
            
            setTimeout(() => {
                this.databases.delete(name);
                request.triggerSuccess();
                resolve(request);
            }, 0);

            return request;
        });
    }
}

export class MockDatabase {
    constructor(name, version) {
        this.name = name;
        this.version = version;
        this.objectStoreNames = new MockDOMStringList();
        this.stores = new Map();
        this.closed = false;
    }

    createObjectStore(name, options = {}) {
        const store = new MockObjectStore(name, options);
        this.stores.set(name, store);
        this.objectStoreNames.add(name);
        return store;
    }

    deleteObjectStore(name) {
        this.stores.delete(name);
        this.objectStoreNames.remove(name);
    }

    transaction(storeNames, mode = 'readonly') {
        if (typeof storeNames === 'string') {
            storeNames = [storeNames];
        }
        return new MockTransaction(this, storeNames, mode);
    }

    close() {
        this.closed = true;
    }
}

export class MockObjectStore {
    constructor(name, options = {}) {
        this.name = name;
        this.keyPath = options.keyPath;
        this.autoIncrement = options.autoIncrement || false;
        this.indexNames = new MockDOMStringList();
        this.data = new Map();
        this.indexes = new Map();
        this.nextKey = 1;
    }

    createIndex(name, keyPath, options = {}) {
        const index = new MockIndex(name, keyPath, options);
        this.indexes.set(name, index);
        this.indexNames.add(name);
        return index;
    }

    deleteIndex(name) {
        this.indexes.delete(name);
        this.indexNames.remove(name);
    }

    put(value, key) {
        return new Promise((resolve) => {
            const request = new MockDBRequest();
            
            setTimeout(() => {
                let finalKey = key;
                
                if (this.keyPath && typeof value === 'object') {
                    finalKey = value[this.keyPath];
                } else if (!finalKey && this.autoIncrement) {
                    finalKey = this.nextKey++;
                }

                this.data.set(finalKey, value);
                request.triggerSuccess(finalKey);
                resolve(request);
            }, 0);

            return request;
        });
    }

    get(key) {
        return new Promise((resolve) => {
            const request = new MockDBRequest();
            
            setTimeout(() => {
                const value = this.data.get(key);
                request.triggerSuccess(value);
                resolve(request);
            }, 0);

            return request;
        });
    }

    getAll() {
        return new Promise((resolve) => {
            const request = new MockDBRequest();
            
            setTimeout(() => {
                const values = Array.from(this.data.values());
                request.triggerSuccess(values);
                resolve(request);
            }, 0);

            return request;
        });
    }

    delete(key) {
        return new Promise((resolve) => {
            const request = new MockDBRequest();
            
            setTimeout(() => {
                const deleted = this.data.delete(key);
                request.triggerSuccess(deleted);
                resolve(request);
            }, 0);

            return request;
        });
    }

    clear() {
        return new Promise((resolve) => {
            const request = new MockDBRequest();
            
            setTimeout(() => {
                this.data.clear();
                request.triggerSuccess();
                resolve(request);
            }, 0);

            return request;
        });
    }
}

export class MockTransaction {
    constructor(db, storeNames, mode) {
        this.db = db;
        this.objectStoreNames = new MockDOMStringList(storeNames);
        this.mode = mode;
        this.completed = false;
        this.aborted = false;
        this.oncomplete = null;
        this.onerror = null;
        this.onabort = null;

        // Auto-complete after current execution context
        setTimeout(() => {
            if (!this.aborted && !this.completed) {
                this.completed = true;
                if (this.oncomplete) {
                    this.oncomplete();
                }
            }
        }, 0);
    }

    objectStore(name) {
        if (!this.objectStoreNames.contains(name)) {
            throw new Error(`Object store '${name}' not found`);
        }
        return this.db.stores.get(name);
    }

    abort() {
        this.aborted = true;
        if (this.onabort) {
            this.onabort();
        }
    }
}

export class MockIndex {
    constructor(name, keyPath, options = {}) {
        this.name = name;
        this.keyPath = keyPath;
        this.unique = options.unique || false;
        this.multiEntry = options.multiEntry || false;
    }
}

export class MockDBRequest {
    constructor() {
        this.result = undefined;
        this.error = null;
        this.readyState = 'pending';
        this.onsuccess = null;
        this.onerror = null;
    }

    triggerSuccess(result) {
        this.result = result;
        this.readyState = 'done';
        if (this.onsuccess) {
            const event = { target: this, type: 'success' };
            this.onsuccess(event);
        }
    }

    triggerError(error) {
        this.error = error;
        this.readyState = 'done';
        if (this.onerror) {
            const event = { target: this, type: 'error' };
            this.onerror(event);
        }
    }

    triggerUpgradeNeeded() {
        if (this.onupgradeneeded) {
            const event = { target: this, type: 'upgradeneeded' };
            this.onupgradeneeded(event);
        }
    }
}

export class MockDOMStringList {
    constructor(items = []) {
        this.items = [...items];
        this.length = this.items.length;
    }

    contains(str) {
        return this.items.includes(str);
    }

    item(index) {
        return this.items[index] || null;
    }

    add(item) {
        if (!this.items.includes(item)) {
            this.items.push(item);
            this.length = this.items.length;
        }
    }

    remove(item) {
        const index = this.items.indexOf(item);
        if (index !== -1) {
            this.items.splice(index, 1);
            this.length = this.items.length;
        }
    }

    [Symbol.iterator]() {
        return this.items[Symbol.iterator]();
    }
}

// Setup function for tests
export function setupIndexedDBMock() {
    const mockIDB = new MockIndexedDB();
    
    global.indexedDB = mockIDB;
    global.IDBKeyRange = {
        bound: (lower, upper, lowerOpen, upperOpen) => ({ lower, upper, lowerOpen, upperOpen }),
        only: (value) => ({ value }),
        lowerBound: (lower, open) => ({ lower, open }),
        upperBound: (upper, open) => ({ upper, open })
    };

    return mockIDB;
}

// Helper to create test data structure
export function createTestData() {
    return {
        boards: [
            {
                id: 'test-board-1',
                name: 'Test Board',
                description: 'Test board description',
                color: '#6750a4',
                isDefault: true,
                createdDate: '2025-01-01T00:00:00.000Z',
                lastModified: '2025-01-01T00:00:00.000Z',
                tasks: [
                    {
                        id: 'test-task-1',
                        text: 'Test task 1',
                        status: 'todo',
                        createdDate: '2025-01-01T00:00:00.000Z',
                        lastModified: '2025-01-01T00:00:00.000Z'
                    }
                ],
                archivedTasks: []
            }
        ],
        currentBoardId: 'test-board-1',
        filter: 'all'
    };
}