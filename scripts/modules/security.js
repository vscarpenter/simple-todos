import { debugLog } from './settings.js';

/**
 * Security utilities for file validation and safe error handling
 */
class SecurityManager {
    constructor() {
        // File validation constants
        this.MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
        this.ALLOWED_MIME_TYPES = [
            'application/json',
            'text/plain',
            'text/json'
        ];
        this.ALLOWED_FILE_EXTENSIONS = ['.json', '.txt'];
        
        // Content validation limits
        this.MAX_JSON_DEPTH = 10;
        this.MAX_ARRAY_LENGTH = 50000;
        this.DEFAULT_MAX_STRING_LENGTH = 50000; // Default increased to 50k
        this.MAX_OBJECT_KEYS = 1000;
        
        debugLog.log('SecurityManager initialized');
    }

    /**
     * Get current max string length from settings
     * @returns {number} Current max string length limit
     */
    getMaxStringLength() {
        try {
            // Try to access settings manager from global scope
            if (typeof globalThis !== 'undefined' && globalThis.settingsManager) {
                const maxSize = globalThis.settingsManager.getValue('maxImportFileSize');
                if (maxSize && typeof maxSize === 'number' && maxSize > 0) {
                    return maxSize;
                }
            }
        } catch (error) {
            // Silently fall back to default if settings access fails
            console.warn('SecurityManager: Could not access settings, using default limit');
        }
        return this.DEFAULT_MAX_STRING_LENGTH;
    }

    /**
     * Format bytes to human readable string
     * @param {number} bytes - Number of bytes
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Validate file before processing
     * @param {File} file - File to validate
     * @returns {Object} Validation result
     */
    validateFile(file) {
        const result = {
            isValid: false,
            errors: [],
            warnings: []
        };

        try {
            // Check if file exists
            if (!file) {
                result.errors.push('No file provided');
                return result;
            }

            // Validate file size
            if (file.size === 0) {
                result.errors.push('File is empty');
                return result;
            }

            if (file.size > this.MAX_FILE_SIZE) {
                result.errors.push(`File size (${this.formatBytes(file.size)}) exceeds maximum allowed size (${this.formatBytes(this.MAX_FILE_SIZE)})`);
                return result;
            }

            // Validate file type
            const mimeTypeValid = this.ALLOWED_MIME_TYPES.includes(file.type);
            const extensionValid = this.validateFileExtension(file.name);

            if (!mimeTypeValid && !extensionValid) {
                result.errors.push('Invalid file type. Only JSON files are allowed');
                return result;
            }

            if (!mimeTypeValid && extensionValid) {
                result.warnings.push('File type detection may be unreliable, but extension appears valid');
            }

            // Validate file name
            if (!this.validateFileName(file.name)) {
                result.errors.push('Invalid file name. File name contains potentially unsafe characters');
                return result;
            }

            result.isValid = true;
            debugLog.log('File validation passed:', {
                name: file.name,
                size: this.formatBytes(file.size),
                type: file.type
            });

        } catch (error) {
            result.errors.push('File validation failed due to unexpected error');
            debugLog.error('File validation error:', error);
        }

        return result;
    }

    /**
     * Validate file extension
     * @param {string} fileName - File name to validate
     * @returns {boolean} True if extension is valid
     */
    validateFileExtension(fileName) {
        if (!fileName || typeof fileName !== 'string') {
            return false;
        }

        const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        return this.ALLOWED_FILE_EXTENSIONS.includes(extension);
    }

    /**
     * Validate file name for security
     * @param {string} fileName - File name to validate
     * @returns {boolean} True if file name is safe
     */
    validateFileName(fileName) {
        if (!fileName || typeof fileName !== 'string') {
            return false;
        }

        // Check for path traversal attempts
        if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
            return false;
        }

        // Check for null bytes and control characters
        if (/[\x00-\x1f\x7f-\x9f]/.test(fileName)) {
            return false;
        }

        // Check for excessively long names
        if (fileName.length > 255) {
            return false;
        }

        return true;
    }

    /**
     * Safely parse JSON with security checks
     * @param {string} jsonString - JSON string to parse
     * @returns {Object} Parse result with data or error
     */
    safeJsonParse(jsonString) {
        const result = {
            success: false,
            data: null,
            error: null
        };

        try {
            // Basic input validation
            if (!jsonString || typeof jsonString !== 'string') {
                result.error = 'Invalid input: not a string';
                return result;
            }

            // Check string length
            const maxLength = this.getMaxStringLength();
            if (jsonString.length > maxLength) {
                result.error = `Import file too large (${this.formatBytes(jsonString.length)}). Maximum allowed size is ${this.formatBytes(maxLength)}. You can increase this limit in Settings.`;
                return result;
            }

            // Check for potential JSON bombs (excessive nesting)
            if (this.detectJsonBomb(jsonString)) {
                result.error = 'Input contains potentially malicious structure';
                return result;
            }

            // Parse JSON
            const parsed = JSON.parse(jsonString);

            // Validate parsed structure
            const structureValidation = this.validateJsonStructure(parsed);
            if (!structureValidation.isValid) {
                result.error = structureValidation.error;
                return result;
            }

            result.success = true;
            result.data = parsed;
            debugLog.log('JSON parsing successful');

        } catch (error) {
            // Sanitize error message to avoid information disclosure
            if (error instanceof SyntaxError) {
                result.error = 'Invalid JSON format';
            } else {
                result.error = 'Failed to process file content';
            }
            debugLog.error('JSON parsing error:', error.message);
        }

        return result;
    }

    /**
     * Detect potential JSON bombs (excessive nesting or size)
     * @param {string} jsonString - JSON string to check
     * @returns {boolean} True if potential bomb detected
     */
    detectJsonBomb(jsonString) {
        try {
            // Count nesting depth by counting brackets
            let depth = 0;
            let maxDepth = 0;
            
            for (let i = 0; i < jsonString.length; i++) {
                const char = jsonString[i];
                if (char === '{' || char === '[') {
                    depth++;
                    maxDepth = Math.max(maxDepth, depth);
                    if (maxDepth > this.MAX_JSON_DEPTH) {
                        return true;
                    }
                } else if (char === '}' || char === ']') {
                    depth--;
                }
            }

            // Check for excessive repetition (potential zip bomb)
            const repetitionRatio = this.calculateRepetitionRatio(jsonString);
            if (repetitionRatio > 0.9) {
                return true;
            }

            return false;
        } catch (error) {
            // If we can't analyze it safely, consider it suspicious
            return true;
        }
    }

    /**
     * Calculate repetition ratio in string
     * @param {string} str - String to analyze
     * @returns {number} Repetition ratio (0-1)
     */
    calculateRepetitionRatio(str) {
        if (str.length < 100) return 0;

        const sample = str.substring(0, Math.min(1000, str.length));
        const charCounts = {};
        
        for (const char of sample) {
            charCounts[char] = (charCounts[char] || 0) + 1;
        }

        const maxCount = Math.max(...Object.values(charCounts));
        return maxCount / sample.length;
    }

    /**
     * Validate JSON structure for security
     * @param {*} data - Parsed JSON data
     * @param {number} depth - Current nesting depth
     * @returns {Object} Validation result
     */
    validateJsonStructure(data, depth = 0) {
        const result = { isValid: true, error: null };

        try {
            // Check nesting depth
            if (depth > this.MAX_JSON_DEPTH) {
                result.isValid = false;
                result.error = 'Data structure too deeply nested';
                return result;
            }

            // Handle different data types
            if (Array.isArray(data)) {
                if (data.length > this.MAX_ARRAY_LENGTH) {
                    result.isValid = false;
                    result.error = 'Array too large';
                    return result;
                }

                // Validate array elements
                for (const item of data) {
                    const itemValidation = this.validateJsonStructure(item, depth + 1);
                    if (!itemValidation.isValid) {
                        return itemValidation;
                    }
                }
            } else if (data && typeof data === 'object') {
                const keys = Object.keys(data);
                if (keys.length > this.MAX_OBJECT_KEYS) {
                    result.isValid = false;
                    result.error = 'Object has too many properties';
                    return result;
                }

                // Validate object properties
                for (const key of keys) {
                    // Validate key
                    if (typeof key !== 'string' || key.length > 100) {
                        result.isValid = false;
                        result.error = 'Invalid object key';
                        return result;
                    }

                    // Validate value
                    const valueValidation = this.validateJsonStructure(data[key], depth + 1);
                    if (!valueValidation.isValid) {
                        return valueValidation;
                    }
                }
            } else if (typeof data === 'string') {
                const maxLength = this.getMaxStringLength();
                if (data.length > maxLength) {
                    result.isValid = false;
                    result.error = 'String value too long';
                    return result;
                }
            }

        } catch (error) {
            result.isValid = false;
            result.error = 'Structure validation failed';
            debugLog.error('JSON structure validation error:', error);
        }

        return result;
    }

    /**
     * Sanitize error message to prevent information disclosure
     * @param {Error|string} error - Error to sanitize
     * @param {string} context - Context for the error
     * @returns {string} Sanitized error message
     */
    sanitizeErrorMessage(error, context = 'operation') {
        // Generic error messages that don't expose system details
        const genericMessages = {
            'file': 'File processing failed. Please check the file format and try again.',
            'import': 'Import failed. Please verify the file contains valid data.',
            'export': 'Export failed. Please try again.',
            'storage': 'Data storage failed. Please check available space and try again.',
            'validation': 'Data validation failed. Please check the input format.',
            'network': 'Network operation failed. Please check your connection.',
            'permission': 'Operation not permitted. Please check file permissions.',
            'default': 'An error occurred. Please try again.'
        };

        // Return appropriate generic message
        return genericMessages[context] || genericMessages['default'];
    }

    /**
     * Format bytes to human readable format
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Validate import data content for security
     * @param {*} data - Data to validate
     * @returns {Object} Validation result
     */
    validateImportContent(data) {
        const result = {
            isValid: false,
            sanitizedData: null,
            errors: [],
            warnings: []
        };

        try {
            if (!data || typeof data !== 'object') {
                result.errors.push('Invalid data format');
                return result;
            }

            // Create sanitized copy
            const sanitized = this.sanitizeImportData(data);
            
            // Validate structure
            if (!this.isValidCascadeData(sanitized)) {
                result.errors.push('Data does not match expected format');
                return result;
            }

            result.isValid = true;
            result.sanitizedData = sanitized;
            debugLog.log('Import content validation passed');

        } catch (error) {
            result.errors.push('Content validation failed');
            debugLog.error('Import content validation error:', error);
        }

        return result;
    }

    /**
     * Sanitize import data by removing potentially dangerous content
     * @param {*} data - Data to sanitize
     * @returns {*} Sanitized data
     */
    sanitizeImportData(data) {
        if (data === null || data === undefined) {
            return data;
        }

        if (Array.isArray(data)) {
            return data.map(item => this.sanitizeImportData(item));
        }

        if (typeof data === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(data)) {
                // Sanitize key
                const cleanKey = this.sanitizeString(key);
                if (cleanKey && cleanKey.length <= 100) {
                    sanitized[cleanKey] = this.sanitizeImportData(value);
                }
            }
            return sanitized;
        }

        if (typeof data === 'string') {
            return this.sanitizeString(data);
        }

        // For numbers, booleans, etc., return as-is if reasonable
        if (typeof data === 'number') {
            return isFinite(data) ? data : 0;
        }

        if (typeof data === 'boolean') {
            return data;
        }

        return null;
    }

    /**
     * Sanitize string content
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     */
    sanitizeString(str) {
        if (typeof str !== 'string') {
            return '';
        }

        // Remove null bytes and control characters
        let sanitized = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        // Remove potential XSS patterns
        sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        sanitized = sanitized.replace(/javascript:/gi, '');
        sanitized = sanitized.replace(/on\w+\s*=/gi, '');
        
        // Limit length
        const maxLength = this.getMaxStringLength();
        if (sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
        }

        return sanitized.trim();
    }

    /**
     * Sanitize HTML content for safe display
     * @param {string} html - HTML content to sanitize
     * @returns {string} Sanitized HTML
     */
    sanitizeHTML(html) {
        if (typeof html !== 'string') {
            return '';
        }
        
        // Create a temporary element to escape HTML
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    /**
     * Check if data matches expected Cascade format
     * @param {*} data - Data to check
     * @returns {boolean} True if valid format
     */
    isValidCascadeData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }

        // Check for multi-board format
        if (data.data && data.data.boards && Array.isArray(data.data.boards)) {
            return true;
        }

        // Check for legacy single board format
        if (data.tasks && Array.isArray(data.tasks)) {
            return true;
        }

        // Check for direct array format
        if (Array.isArray(data)) {
            return true;
        }

        // Check for nested data format
        if (data.data && (Array.isArray(data.data) || (data.data.tasks && Array.isArray(data.data.tasks)))) {
            return true;
        }

        return false;
    }
}

// Export singleton instance
export default new SecurityManager();