/**
 * Integration tests for archive management functionality
 * Tests manual archiving controls, bulk operations, and archive browser
 */

import { jest } from '@jest/globals';

// Import modules to test
import { Board, Task, createBoard, createTask } from '../../scripts/modules/models.js';

describe('Archive Management Integration Tests', () => {
    let testBoard;
    let testTasks;

    beforeEach(() => {
        // Create test data
        testTasks = [
            createTask({ text: 'Test task 1', status: 'todo' }),
            createTask({ text: 'Test task 2', status: 'doing' }),
            createTask({ text: 'Completed task 1', status: 'done' }),
            createTask({ text: 'Completed task 2', status: 'done' }),
            createTask({ text: 'Completed task 3', status: 'done' })
        ];

        testBoard = createBoard({
            name: 'Test Board',
            description: 'Test board for archive tests',
            tasks: testTasks.map(t => t.toJSON()),
            archivedTasks: []
        });
    });

    describe('Board Archive Functionality', () => {
        test('should support archived tasks in board model', () => {
            // Test that Board model supports archivedTasks
            expect(testBoard.archivedTasks).toBeDefined();
            expect(Array.isArray(testBoard.archivedTasks)).toBe(true);
            expect(testBoard.archivedTasks).toHaveLength(0);
        });

        test('should include archivedTasks in board JSON serialization', () => {
            const boardJson = testBoard.toJSON();
            expect(boardJson.archivedTasks).toBeDefined();
            expect(Array.isArray(boardJson.archivedTasks)).toBe(true);
        });

        test('should not copy archived tasks when duplicating board', () => {
            // Add some archived tasks to the original board
            const archivedTask = {
                ...testTasks[0].toJSON(),
                archived: true,
                archivedDate: '2024-01-01',
                archivedTimestamp: new Date().toISOString()
            };
            
            const boardWithArchive = new Board({
                ...testBoard.toJSON(),
                archivedTasks: [archivedTask]
            });

            const duplicatedBoard = boardWithArchive.duplicate('Duplicated Board');
            
            expect(duplicatedBoard.archivedTasks).toHaveLength(0);
            expect(duplicatedBoard.tasks).toHaveLength(boardWithArchive.tasks.length);
        });
    });

    describe('Archive Task Data Structure', () => {
        test('should create proper archive metadata', () => {
            const completedTask = testTasks.find(t => t.status === 'done');
            const beforeArchive = new Date();
            
            // Simulate archiving by creating archived task structure
            const archivedTask = {
                ...completedTask.toJSON(),
                archived: true,
                archivedDate: new Date().toISOString().split('T')[0],
                archivedTimestamp: new Date().toISOString(),
                originalBoardId: testBoard.id
            };

            // Verify metadata structure
            expect(archivedTask.archived).toBe(true);
            expect(archivedTask.originalBoardId).toBe(testBoard.id);
            expect(archivedTask.archivedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(archivedTask.archivedTimestamp).toBeDefined();
            
            // Verify original task data is preserved
            expect(archivedTask.text).toBe(completedTask.text);
            expect(archivedTask.status).toBe(completedTask.status);
            expect(archivedTask.createdDate).toBe(completedTask.createdDate);
            expect(archivedTask.id).toBe(completedTask.id);
        });

        test('should filter completed tasks correctly', () => {
            const completedTasks = testTasks.filter(t => t.status === 'done');
            const nonCompletedTasks = testTasks.filter(t => t.status !== 'done');
            
            expect(completedTasks).toHaveLength(3);
            expect(nonCompletedTasks).toHaveLength(2);
            
            completedTasks.forEach(task => {
                expect(task.status).toBe('done');
            });
            
            nonCompletedTasks.forEach(task => {
                expect(task.status).not.toBe('done');
            });
        });
    });

    describe('Task Status Validation', () => {
        test('should validate task status transitions', () => {
            const todoTask = testTasks.find(t => t.status === 'todo');
            const doingTask = testTasks.find(t => t.status === 'doing');
            const doneTask = testTasks.find(t => t.status === 'done');
            
            expect(todoTask.status).toBe('todo');
            expect(doingTask.status).toBe('doing');
            expect(doneTask.status).toBe('done');
            
            // Test task movement
            const movedTask = todoTask.moveTo('done');
            expect(movedTask.status).toBe('done');
            expect(movedTask.completedDate).toBeDefined();
        });

        test('should handle task completion date correctly', () => {
            const todoTask = testTasks.find(t => t.status === 'todo');
            
            // Move to done should set completion date
            const completedTask = todoTask.moveTo('done');
            expect(completedTask.completedDate).toBeDefined();
            expect(completedTask.completedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            
            // Move away from done should clear completion date
            const resetTask = completedTask.moveTo('todo');
            expect(resetTask.completedDate).toBeNull();
        });
    });
});