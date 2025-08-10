/**
 * Security validation tests
 */

import securityManager from '../../scripts/modules/security.js';
import { jest } from '@jest/globals';

describe('SecurityManager', () => {
    
    // Spy on getMaxStringLength to control it in tests
    let maxStringLengthSpy;

    beforeEach(() => {
        // Default spy returns the original default value
        maxStringLengthSpy = jest.spyOn(securityManager, 'getMaxStringLength').mockReturnValue(50000);
    });

    afterEach(() => {
        // Restore original implementation
        maxStringLengthSpy.mockRestore();
    });

    describe('File Validation', () => {
        
        test('should reject null or undefined file', () => {
            const result1 = securityManager.validateFile(null);
            const result2 = securityManager.validateFile(undefined);
            
            expect(result1.isValid).toBe(false);
            expect(result1.errors).toContain('No file provided');
            expect(result2.isValid).toBe(false);
            expect(result2.errors).toContain('No file provided');
        });
        
        test('should reject empty files', () => {
            const mockFile = {
                name: 'test.json',
                type: 'application/json',
                size: 0
            };
            
            const result = securityManager.validateFile(mockFile);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('File is empty');
        });
        
        test('should reject files exceeding size limit', () => {
            const mockFile = {
                name: 'large.json',
                type: 'application/json',
                size: 11 * 1024 * 1024 // 11MB
            };
            
            const result = securityManager.validateFile(mockFile);
            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('exceeds maximum allowed size');
        });
        
        test('should accept valid JSON files', () => {
            const mockFile = {
                name: 'valid.json',
                type: 'application/json',
                size: 1024 // 1KB
            };
            
            const result = securityManager.validateFile(mockFile);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        
        test('should accept files with valid extensions even with wrong MIME type', () => {
            const mockFile = {
                name: 'valid.json',
                type: 'application/octet-stream', // Wrong MIME type not in allowed list
                size: 1024
            };
            
            const result = securityManager.validateFile(mockFile);
            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('File type detection may be unreliable, but extension appears valid');
        });
        
        test('should reject files with invalid extensions', () => {
            const mockFile = {
                name: 'invalid.exe',
                type: 'application/octet-stream',
                size: 1024
            };
            
            const result = securityManager.validateFile(mockFile);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid file type. Only JSON files are allowed');
        });
        
        test('should reject files with path traversal attempts', () => {
            const mockFiles = [
                { name: '../../../etc/passwd', type: 'application/json', size: 1024 },
                { name: '..\\..\\windows\\system32\\config\\sam', type: 'application/json', size: 1024 },
                { name: 'normal/../../../evil.json', type: 'application/json', size: 1024 }
            ];
            
            mockFiles.forEach(mockFile => {
                const result = securityManager.validateFile(mockFile);
                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('Invalid file name. File name contains potentially unsafe characters');
            });
        });
        
        test('should reject files with control characters in name', () => {
            const mockFile = {
                name: 'test\x00.json', // Null byte
                type: 'application/json',
                size: 1024
            };
            
            const result = securityManager.validateFile(mockFile);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid file name. File name contains potentially unsafe characters');
        });
        
        test('should reject files with excessively long names', () => {
            const mockFile = {
                name: 'a'.repeat(300) + '.json', // 304 characters
                type: 'application/json',
                size: 1024
            };
            
            const result = securityManager.validateFile(mockFile);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid file name. File name contains potentially unsafe characters');
        });
    });
    
    describe('JSON Parsing Security', () => {
        
        test('should reject non-string input', () => {
            const inputs = [null, undefined, 123, {}, [], true];
            
            inputs.forEach(input => {
                const result = securityManager.safeJsonParse(input);
                expect(result.success).toBe(false);
                expect(result.error).toBe('Invalid input: not a string');
            });
        });
        
        test('should reject excessively large strings', () => {
            // Mock the max length to be smaller for this test
            maxStringLengthSpy.mockReturnValue(100);
            const largeString = 'a'.repeat(200);
            
            const result = securityManager.safeJsonParse(largeString);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Import file too large');
        });
        
        test('should detect JSON bombs (excessive nesting)', () => {
            const deeplyNested = '{"a":'.repeat(15) + '{}' + '}'.repeat(15);
            
            const result = securityManager.safeJsonParse(deeplyNested);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Input contains potentially malicious structure');
        });
        
        test('should detect repetitive content (potential zip bomb)', () => {
            const repetitive = '"' + 'a'.repeat(1000) + '"';
            
            const result = securityManager.safeJsonParse(repetitive);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Input contains potentially malicious structure');
        });
        
        test('should parse valid JSON successfully', () => {
            const validJson = '{"name": "test", "tasks": [{"id": "1", "text": "Task 1"}]}';
            
            const result = securityManager.safeJsonParse(validJson);
            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                name: "test",
                tasks: [{ id: "1", text: "Task 1" }]
            });
        });
        
        test('should sanitize syntax error messages', () => {
            const invalidJson = '{"invalid": json}';
            
            const result = securityManager.safeJsonParse(invalidJson);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid JSON format');
        });
    });
    
    describe('JSON Structure Validation', () => {
        
        test('should reject deeply nested structures', () => {
            const deepObject = {};
            let current = deepObject;
            for (let i = 0; i < 15; i++) {
                current.nested = {};
                current = current.nested;
            }
            
            const result = securityManager.validateJsonStructure(deepObject);
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Data structure too deeply nested');
        });
        
        test('should reject arrays that are too large', () => {
            const largeArray = new Array(60000).fill('item');
            
            const result = securityManager.validateJsonStructure(largeArray);
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Array too large');
        });
        
        test('should reject objects with too many keys', () => {
            const largeObject = {};
            for (let i = 0; i < 1500; i++) {
                largeObject[`key${i}`] = `value${i}`;
            }
            
            const result = securityManager.validateJsonStructure(largeObject);
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Object has too many properties');
        });
        
        test('should reject strings that are too long', () => {
            // Mock the max length to be smaller for this test
            maxStringLengthSpy.mockReturnValue(100);
            const longString = 'a'.repeat(150);
            
            const result = securityManager.validateJsonStructure(longString);
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('String value too long');
        });
        
        test('should accept valid structures', () => {
            const validData = {
                boards: [
                    {
                        id: "board1",
                        name: "Test Board",
                        tasks: [
                            { id: "task1", text: "Task 1", status: "todo" }
                        ]
                    }
                ]
            };
            
            const result = securityManager.validateJsonStructure(validData);
            expect(result.isValid).toBe(true);
            expect(result.error).toBeNull();
        });
    });
    
    describe('Import Content Validation', () => {
        
        test('should reject invalid data types', () => {
            const invalidInputs = [null, undefined, "string", 123, true];
            
            invalidInputs.forEach(input => {
                const result = securityManager.validateImportContent(input);
                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('Invalid data format');
            });
        });
        
        test('should accept valid Cascade multi-board format', () => {
            const validData = {
                data: {
                    boards: [
                        {
                            id: "board1",
                            name: "Test Board",
                            tasks: [
                                { id: "task1", text: "Task 1", status: "todo" }
                            ]
                        }
                    ]
                }
            };
            
            const result = securityManager.validateImportContent(validData);
            expect(result.isValid).toBe(true);
            expect(result.sanitizedData).toBeDefined();
        });
        
        test('should accept valid legacy task format', () => {
            const validData = {
                tasks: [
                    {
                        id: "task1", text: "Task 1", status: "todo" }
                ]
            };
            
            const result = securityManager.validateImportContent(validData);
            expect(result.isValid).toBe(true);
            expect(result.sanitizedData).toBeDefined();
        });
        
        test('should accept direct array format', () => {
            const validData = [
                { id: "task1", text: "Task 1", status: "todo" }
            ];
            
            const result = securityManager.validateImportContent(validData);
            expect(result.isValid).toBe(true);
            expect(result.sanitizedData).toBeDefined();
        });
        
        test('should reject unrecognized formats', () => {
            const invalidData = {
                randomProperty: "value",
                anotherProperty: 123
            };
            
            const result = securityManager.validateImportContent(invalidData);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Data does not match expected format');
        });
    });
    
    describe('Data Sanitization', () => {
        
        test('should remove control characters from strings', () => {
            const dirtyString = "Hello\x00\x01\x02World\x7F";
            const cleaned = securityManager.sanitizeString(dirtyString);
            
            expect(cleaned).toBe("HelloWorld");
        });
        
        test('should trim whitespace from strings', () => {
            const dirtyString = "  \t\n  Hello World  \t\n  ";
            const cleaned = securityManager.sanitizeString(dirtyString);
            
            expect(cleaned).toBe("Hello World");
        });
        
        test('should truncate excessively long strings', () => {
            // Mock the max length to be smaller for this test
            maxStringLengthSpy.mockReturnValue(10);
            const longString = 'a'.repeat(15);
            const cleaned = securityManager.sanitizeString(longString);
            
            expect(cleaned.length).toBe(10);
        });
        
        test('should sanitize nested objects recursively', () => {
            const dirtyData = {
                "normal\x00key": "normal\x01value",
                nested: {
                    "another\x02key": "another\x03value",
                    array: ["item\x04one", "item\x05two"]
                }
            };
            
            const cleaned = securityManager.sanitizeImportData(dirtyData);
            
            expect(cleaned.normalkey).toBe("normalvalue");
            expect(cleaned.nested.anotherkey).toBe("anothervalue");
            expect(cleaned.nested.array[0]).toBe("itemone");
            expect(cleaned.nested.array[1]).toBe("itemtwo");
        });
        
        test('should handle infinite numbers safely', () => {
            const data = {
                validNumber: 42,
                infiniteNumber: Infinity,
                negativeInfinite: -Infinity,
                notANumber: NaN
            };
            
            const cleaned = securityManager.sanitizeImportData(data);
            
            expect(cleaned.validNumber).toBe(42);
            expect(cleaned.infiniteNumber).toBe(0);
            expect(cleaned.negativeInfinite).toBe(0);
            expect(cleaned.notANumber).toBe(0);
        });
        
        test('should preserve valid data types', () => {
            const data = {
                string: "valid string",
                number: 42,
                boolean: true,
                nullValue: null,
                array: [1, 2, 3],
                object: { nested: "value" }
            };
            
            const cleaned = securityManager.sanitizeImportData(data);
            
            expect(cleaned.string).toBe("valid string");
            expect(cleaned.number).toBe(42);
            expect(cleaned.boolean).toBe(true);
            expect(cleaned.nullValue).toBeNull();
            expect(cleaned.array).toEqual([1, 2, 3]);
            expect(cleaned.object.nested).toBe("value");
        });
    });
    
    describe('Error Message Sanitization', () => {
        
        test('should return generic messages for different contexts', () => {
            const contexts = [
                'file',
                'import', 
                'export',
                'storage',
                'validation',
                'network',
                'permission',
                'default'
            ];
            
            contexts.forEach(context => {
                const message = securityManager.sanitizeErrorMessage('Some technical error', context);
                expect(message).toBeDefined();
                expect(typeof message).toBe('string');
                expect(message.length).toBeGreaterThan(0);
                // Should not contain technical details
                expect(message).not.toContain('technical error');
            });
        });
        
        test('should handle unknown contexts', () => {
            const message = securityManager.sanitizeErrorMessage('Error', 'unknown_context');
            expect(message).toBe('An error occurred. Please try again.');
        });
        
        test('should handle error objects', () => {
            const error = new Error('Technical database connection failed');
            const message = securityManager.sanitizeErrorMessage(error, 'storage');
            
            expect(message).toBe('Data storage failed. Please check available space and try again.');
            expect(message).not.toContain('database');
            expect(message).not.toContain('connection');
        });
    });
    
    describe('Utility Functions', () => {
        
        test('should format bytes correctly', () => {
            expect(securityManager.formatBytes(0)).toBe('0 Bytes');
            expect(securityManager.formatBytes(1024)).toBe('1 KB');
            expect(securityManager.formatBytes(1024 * 1024)).toBe('1 MB');
            expect(securityManager.formatBytes(1536)).toBe('1.5 KB');
        });
        
        test('should detect repetition ratio correctly', () => {
            const highRepetition = 'aaaaaaaaaa'.repeat(20);
            const lowRepetition = 'abcdefghijklmnopqrstuvwxyz'.repeat(10);
            
            const highRatio = securityManager.calculateRepetitionRatio(highRepetition);
            const lowRatio = securityManager.calculateRepetitionRatio(lowRepetition);
            
            expect(highRatio).toBeGreaterThan(0.8);
            expect(lowRatio).toBeLessThan(0.2);
        });
        
        test('should validate Cascade data formats correctly', () => {
            const validFormats = [
                { data: { boards: [] } },
                { tasks: [] },
                [],
                { data: [] },
                { data: { tasks: [] } }
            ];
            
            const invalidFormats = [
                null,
                undefined,
                "string",
                123,
                { randomProperty: "value" }
            ];
            
            validFormats.forEach(format => {
                expect(securityManager.isValidCascadeData(format)).toBe(true);
            });
            
            invalidFormats.forEach(format => {
                expect(securityManager.isValidCascadeData(format)).toBe(false);
            });
        });
    });
});