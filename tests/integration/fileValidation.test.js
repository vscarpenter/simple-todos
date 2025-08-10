/**
 * Integration tests for file validation and security measures
 */

import securityManager from '../../scripts/modules/security.js';

describe('File Validation Integration Tests', () => {

    describe('Security Manager Integration', () => {
        
        test('should validate file size limits correctly', () => {
            const largeFile = {
                name: 'large.json',
                type: 'application/json',
                size: 11 * 1024 * 1024 // 11MB
            };

            const result = securityManager.validateFile(largeFile);
            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('exceeds maximum allowed size');
        });

        test('should validate file extensions correctly', () => {
            const invalidFile = {
                name: 'malicious.exe',
                type: 'application/octet-stream',
                size: 1024
            };

            const result = securityManager.validateFile(invalidFile);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid file type. Only JSON files are allowed');
        });

        test('should detect path traversal attempts', () => {
            const maliciousFile = {
                name: '../../../etc/passwd.json',
                type: 'application/json',
                size: 1024
            };

            const result = securityManager.validateFile(maliciousFile);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid file name. File name contains potentially unsafe characters');
        });

        test('should validate empty files', () => {
            const emptyFile = {
                name: 'empty.json',
                type: 'application/json',
                size: 0
            };

            const result = securityManager.validateFile(emptyFile);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('File is empty');
        });
    });

    describe('JSON Security Integration', () => {
        
        test('should handle malicious JSON parsing', () => {
            const maliciousJson = '{"invalid": json}';
            
            const result = securityManager.safeJsonParse(maliciousJson);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid JSON format');
        });

        test('should detect and prevent JSON bombs', () => {
            const deeplyNested = '{"a":'.repeat(15) + '{}' + '}'.repeat(15);
            
            const result = securityManager.safeJsonParse(deeplyNested);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Input contains potentially malicious structure');
        });

        test('should handle large content safely', () => {
            const largeContent = '"' + 'a'.repeat(15000) + '"';
            
            const result = securityManager.safeJsonParse(largeContent);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Input contains potentially malicious structure');
        });
    });

    describe('Content Sanitization Integration', () => {
        
        test('should sanitize malicious import data', () => {
            const maliciousData = {
                tasks: [{
                    id: 'task\x001',
                    text: 'Task with\x02control\x03characters',
                    status: 'todo'
                }]
            };

            const result = securityManager.validateImportContent(maliciousData);
            expect(result.isValid).toBe(true);
            expect(result.sanitizedData.tasks[0].id).toBe('task1');
            expect(result.sanitizedData.tasks[0].text).toBe('Task withcontrolcharacters');
        });

        test('should handle complex nested sanitization', () => {
            const complexData = {
                data: {
                    boards: [{
                        id: 'board\x001',
                        name: 'Board\x02Name',
                        tasks: [{
                            id: 'task\x001',
                            text: 'Task\x03Text',
                            status: 'todo'
                        }]
                    }]
                }
            };

            const result = securityManager.validateImportContent(complexData);
            expect(result.isValid).toBe(true);
            expect(result.sanitizedData.data.boards[0].id).toBe('board1');
            expect(result.sanitizedData.data.boards[0].name).toBe('BoardName');
            expect(result.sanitizedData.data.boards[0].tasks[0].text).toBe('TaskText');
        });
    });
});