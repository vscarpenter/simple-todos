/**
 * AccessibilityHelper - WCAG testing utilities with axe-core integration
 * Provides methods for comprehensive accessibility testing
 */
class AccessibilityHelper {
  /**
   * Run axe-core accessibility audit
   * @param {Page} page - Playwright page object
   * @param {Object} options - Axe configuration options
   * @returns {Object} Accessibility audit results
   */
  static async runAxeAudit(page, options = {}) {
    const defaultOptions = {
      rules: {
        // Enable all WCAG 2.1 AA rules
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'focus-order-semantics': { enabled: true },
        'aria-roles': { enabled: true },
        'aria-properties': { enabled: true },
        'landmark-roles': { enabled: true }
      },
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
      ...options
    };

    // Inject axe-core if not already present
    await this.injectAxeCore(page);

    // Run the accessibility audit
    const results = await page.evaluate((axeOptions) => {
      return new Promise((resolve) => {
        if (typeof window.axe === 'undefined') {
          resolve({ error: 'axe-core not loaded' });
          return;
        }

        window.axe.run(document, axeOptions, (err, results) => {
          if (err) {
            resolve({ error: err.message });
          } else {
            resolve(results);
          }
        });
      });
    }, defaultOptions);

    return this.processAxeResults(results);
  }

  /**
   * Inject axe-core library into the page
   * @param {Page} page - Playwright page object
   */
  static async injectAxeCore(page) {
    // Check if axe is already loaded
    const axeLoaded = await page.evaluate(() => typeof window.axe !== 'undefined');
    
    if (!axeLoaded) {
      // Load axe-core from CDN
      await page.addScriptTag({
        url: 'https://unpkg.com/axe-core@4.8.2/axe.min.js'
      });

      // Wait for axe to be available
      await page.waitForFunction(() => typeof window.axe !== 'undefined', {
        timeout: 10000
      });
    }
  }

  /**
   * Process and format axe results
   * @param {Object} results - Raw axe results
   * @returns {Object} Processed results
   */
  static processAxeResults(results) {
    if (results.error) {
      return {
        success: false,
        error: results.error,
        violations: [],
        passes: [],
        incomplete: []
      };
    }

    return {
      success: results.violations.length === 0,
      violations: results.violations.map(violation => ({
        id: violation.id,
        impact: violation.impact,
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.map(node => ({
          target: node.target,
          html: node.html,
          failureSummary: node.failureSummary
        }))
      })),
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      summary: {
        total: results.violations.length + results.passes.length + results.incomplete.length,
        violations: results.violations.length,
        passes: results.passes.length,
        incomplete: results.incomplete.length
      }
    };
  }

  /**
   * Test keyboard navigation throughout the application
   * @param {Page} page - Playwright page object
   * @param {Object} options - Navigation test options
   * @returns {Object} Navigation test results
   */
  static async testKeyboardNavigation(page, options = {}) {
    const { startSelector = 'body', expectedStops = [] } = options;
    const navigationResults = {
      success: true,
      focusableElements: [],
      tabOrder: [],
      issues: []
    };

    try {
      // Get all focusable elements
      const focusableElements = await page.evaluate(() => {
        const focusableSelectors = [
          'a[href]',
          'button:not([disabled])',
          'input:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          '[tabindex]:not([tabindex="-1"])',
          '[contenteditable="true"]'
        ];

        const elements = [];
        focusableSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            if (el.offsetParent !== null || el.tagName === 'AREA') {
              elements.push({
                tagName: el.tagName,
                id: el.id,
                className: el.className,
                tabIndex: el.tabIndex,
                selector: this.getElementSelector(el)
              });
            }
          });
        });

        return elements;
      });

      navigationResults.focusableElements = focusableElements;

      // Test tab navigation
      await page.focus(startSelector);
      const tabOrder = [];

      for (let i = 0; i < focusableElements.length + 5; i++) {
        await page.keyboard.press('Tab');
        
        const activeElement = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            tabIndex: el.tabIndex,
            text: el.textContent?.trim().substring(0, 50) || '',
            selector: this.getElementSelector(el)
          };
        });

        tabOrder.push(activeElement);

        // Break if we've cycled back to the beginning
        if (i > 0 && tabOrder[0].selector === activeElement.selector) {
          break;
        }
      }

      navigationResults.tabOrder = tabOrder;

      // Check for keyboard traps
      const hasKeyboardTrap = await this.checkForKeyboardTraps(page);
      if (hasKeyboardTrap.trapped) {
        navigationResults.issues.push({
          type: 'keyboard-trap',
          description: 'Keyboard focus is trapped',
          element: hasKeyboardTrap.element
        });
        navigationResults.success = false;
      }

      // Test escape key functionality
      const escapeWorks = await this.testEscapeKey(page);
      if (!escapeWorks) {
        navigationResults.issues.push({
          type: 'escape-key',
          description: 'Escape key does not work as expected'
        });
      }

    } catch (error) {
      navigationResults.success = false;
      navigationResults.issues.push({
        type: 'navigation-error',
        description: error.message
      });
    }

    return navigationResults;
  }

  /**
   * Test screen reader announcements and ARIA labels
   * @param {Page} page - Playwright page object
   * @returns {Object} Screen reader test results
   */
  static async testScreenReaderAnnouncements(page) {
    const results = {
      success: true,
      ariaLabels: [],
      liveRegions: [],
      headingStructure: [],
      issues: []
    };

    try {
      // Check ARIA labels and roles
      const ariaElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('[aria-label], [aria-labelledby], [role]');
        return Array.from(elements).map(el => ({
          tagName: el.tagName,
          ariaLabel: el.getAttribute('aria-label'),
          ariaLabelledBy: el.getAttribute('aria-labelledby'),
          role: el.getAttribute('role'),
          id: el.id,
          className: el.className,
          text: el.textContent?.trim().substring(0, 100) || ''
        }));
      });

      results.ariaLabels = ariaElements;

      // Check live regions
      const liveRegions = await page.evaluate(() => {
        const regions = document.querySelectorAll('[aria-live], [role="status"], [role="alert"]');
        return Array.from(regions).map(el => ({
          tagName: el.tagName,
          ariaLive: el.getAttribute('aria-live'),
          role: el.getAttribute('role'),
          id: el.id,
          className: el.className
        }));
      });

      results.liveRegions = liveRegions;

      // Check heading structure
      const headings = await page.evaluate(() => {
        const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
        return Array.from(headingElements).map(el => ({
          tagName: el.tagName,
          level: el.tagName.match(/h(\d)/)?.[1] || el.getAttribute('aria-level'),
          text: el.textContent?.trim() || '',
          id: el.id
        }));
      });

      results.headingStructure = headings;

      // Validate heading hierarchy
      const headingIssues = this.validateHeadingHierarchy(headings);
      results.issues.push(...headingIssues);

      // Check for missing alt text on images
      const imageIssues = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        const issues = [];
        
        images.forEach(img => {
          if (!img.alt && !img.getAttribute('aria-label') && !img.getAttribute('role')) {
            issues.push({
              type: 'missing-alt-text',
              description: 'Image missing alt text',
              src: img.src,
              id: img.id
            });
          }
        });

        return issues;
      });

      results.issues.push(...imageIssues);

      if (results.issues.length > 0) {
        results.success = false;
      }

    } catch (error) {
      results.success = false;
      results.issues.push({
        type: 'screen-reader-error',
        description: error.message
      });
    }

    return results;
  }

  /**
   * Test color contrast ratios
   * @param {Page} page - Playwright page object
   * @returns {Object} Color contrast test results
   */
  static async testColorContrast(page) {
    const results = {
      success: true,
      elements: [],
      issues: []
    };

    try {
      // Get color information for text elements
      const colorData = await page.evaluate(() => {
        const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button, label');
        const elements = [];

        textElements.forEach(el => {
          const styles = window.getComputedStyle(el);
          const text = el.textContent?.trim();
          
          if (text && text.length > 0) {
            elements.push({
              text: text.substring(0, 50),
              color: styles.color,
              backgroundColor: styles.backgroundColor,
              fontSize: styles.fontSize,
              fontWeight: styles.fontWeight,
              tagName: el.tagName,
              id: el.id,
              className: el.className
            });
          }
        });

        return elements;
      });

      results.elements = colorData;

      // Note: Actual contrast ratio calculation would require a color contrast library
      // For now, we'll check for common contrast issues
      const contrastIssues = colorData.filter(el => {
        // Basic checks for obviously problematic combinations
        const hasLightText = el.color.includes('rgb(255') || el.color.includes('#fff');
        const hasLightBackground = el.backgroundColor.includes('rgb(255') || el.backgroundColor.includes('#fff');
        
        return hasLightText && hasLightBackground;
      });

      if (contrastIssues.length > 0) {
        results.success = false;
        results.issues = contrastIssues.map(el => ({
          type: 'low-contrast',
          description: 'Potential low contrast issue',
          element: el
        }));
      }

    } catch (error) {
      results.success = false;
      results.issues.push({
        type: 'contrast-error',
        description: error.message
      });
    }

    return results;
  }

  /**
   * Test focus management in modals and dropdowns
   * @param {Page} page - Playwright page object
   * @param {string} triggerSelector - Selector for element that opens modal/dropdown
   * @returns {Object} Focus management test results
   */
  static async testFocusManagement(page, triggerSelector) {
    const results = {
      success: true,
      focusTrapped: false,
      focusRestored: false,
      issues: []
    };

    try {
      // Record initial focus
      const initialFocus = await page.evaluate(() => {
        return {
          tagName: document.activeElement.tagName,
          id: document.activeElement.id,
          className: document.activeElement.className
        };
      });

      // Open modal/dropdown
      await page.click(triggerSelector);
      await page.waitForTimeout(500); // Wait for animation

      // Test focus trapping
      const trapTest = await this.checkForKeyboardTraps(page);
      results.focusTrapped = trapTest.trapped;

      // Close modal/dropdown (usually Escape key)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Check if focus was restored
      const finalFocus = await page.evaluate(() => {
        return {
          tagName: document.activeElement.tagName,
          id: document.activeElement.id,
          className: document.activeElement.className
        };
      });

      results.focusRestored = (
        initialFocus.tagName === finalFocus.tagName &&
        initialFocus.id === finalFocus.id
      );

      if (!results.focusTrapped) {
        results.issues.push({
          type: 'focus-not-trapped',
          description: 'Focus is not properly trapped in modal/dropdown'
        });
        results.success = false;
      }

      if (!results.focusRestored) {
        results.issues.push({
          type: 'focus-not-restored',
          description: 'Focus was not restored to triggering element'
        });
        results.success = false;
      }

    } catch (error) {
      results.success = false;
      results.issues.push({
        type: 'focus-management-error',
        description: error.message
      });
    }

    return results;
  }

  /**
   * Test high contrast mode compatibility
   * @param {Page} page - Playwright page object
   * @returns {Object} High contrast test results
   */
  static async testHighContrastMode(page) {
    const results = {
      success: true,
      supportsHighContrast: false,
      issues: []
    };

    try {
      // Enable high contrast mode simulation
      await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
      
      // Check if elements are still visible and functional
      const visibilityCheck = await page.evaluate(() => {
        const elements = document.querySelectorAll('button, a, input, select, textarea');
        const invisibleElements = [];

        elements.forEach(el => {
          const styles = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          
          if (rect.width === 0 || rect.height === 0 || 
              styles.visibility === 'hidden' || 
              styles.display === 'none' ||
              styles.opacity === '0') {
            invisibleElements.push({
              tagName: el.tagName,
              id: el.id,
              className: el.className
            });
          }
        });

        return {
          totalElements: elements.length,
          invisibleElements: invisibleElements
        };
      });

      results.supportsHighContrast = visibilityCheck.invisibleElements.length === 0;

      if (!results.supportsHighContrast) {
        results.success = false;
        results.issues.push({
          type: 'high-contrast-issues',
          description: 'Some elements are not visible in high contrast mode',
          invisibleElements: visibilityCheck.invisibleElements
        });
      }

      // Reset media emulation
      await page.emulateMedia({ colorScheme: 'light', forcedColors: 'none' });

    } catch (error) {
      results.success = false;
      results.issues.push({
        type: 'high-contrast-error',
        description: error.message
      });
    }

    return results;
  }

  /**
   * Check for keyboard traps
   * @param {Page} page - Playwright page object
   * @returns {Object} Keyboard trap detection results
   */
  static async checkForKeyboardTraps(page) {
    const initialElement = await page.evaluate(() => {
      return document.activeElement.tagName + '#' + document.activeElement.id;
    });

    // Try to tab through elements
    const tabSequence = [];
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const currentElement = await page.evaluate(() => {
        return document.activeElement.tagName + '#' + document.activeElement.id;
      });
      
      tabSequence.push(currentElement);
      
      // Check if we're stuck on the same element
      if (i > 2 && tabSequence.slice(-3).every(el => el === currentElement)) {
        return {
          trapped: true,
          element: currentElement,
          sequence: tabSequence
        };
      }
    }

    return {
      trapped: false,
      sequence: tabSequence
    };
  }

  /**
   * Test escape key functionality
   * @param {Page} page - Playwright page object
   * @returns {boolean} Whether escape key works as expected
   */
  static async testEscapeKey(page) {
    try {
      // Look for modal or dropdown that might be open
      const hasModal = await page.locator('[role="dialog"], .modal, .dropdown-open').count() > 0;
      
      if (hasModal) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
        // Check if modal/dropdown was closed
        const stillHasModal = await page.locator('[role="dialog"], .modal, .dropdown-open').count() > 0;
        return !stillHasModal;
      }
      
      return true; // No modal to test
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate heading hierarchy
   * @param {Array} headings - Array of heading elements
   * @returns {Array} Array of heading hierarchy issues
   */
  static validateHeadingHierarchy(headings) {
    const issues = [];
    let previousLevel = 0;

    headings.forEach((heading, index) => {
      const level = parseInt(heading.level);
      
      if (index === 0 && level !== 1) {
        issues.push({
          type: 'heading-hierarchy',
          description: 'First heading should be h1',
          heading: heading
        });
      }
      
      if (level > previousLevel + 1) {
        issues.push({
          type: 'heading-hierarchy',
          description: `Heading level jumps from h${previousLevel} to h${level}`,
          heading: heading
        });
      }
      
      previousLevel = level;
    });

    return issues;
  }

  /**
   * Generate comprehensive accessibility report
   * @param {Page} page - Playwright page object
   * @param {Object} options - Report options
   * @returns {Object} Comprehensive accessibility report
   */
  static async generateAccessibilityReport(page, options = {}) {
    const report = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      summary: {
        passed: true,
        totalIssues: 0,
        criticalIssues: 0,
        warnings: 0
      },
      tests: {}
    };

    try {
      // Run all accessibility tests
      report.tests.axeAudit = await this.runAxeAudit(page, options.axe);
      report.tests.keyboardNavigation = await this.testKeyboardNavigation(page, options.keyboard);
      report.tests.screenReader = await this.testScreenReaderAnnouncements(page);
      report.tests.colorContrast = await this.testColorContrast(page);
      report.tests.highContrast = await this.testHighContrastMode(page);

      // Calculate summary
      Object.values(report.tests).forEach(test => {
        if (!test.success) {
          report.summary.passed = false;
        }
        
        if (test.issues) {
          report.summary.totalIssues += test.issues.length;
          
          test.issues.forEach(issue => {
            if (issue.impact === 'critical' || issue.type.includes('critical')) {
              report.summary.criticalIssues++;
            } else {
              report.summary.warnings++;
            }
          });
        }
        
        if (test.violations) {
          report.summary.totalIssues += test.violations.length;
          
          test.violations.forEach(violation => {
            if (violation.impact === 'critical') {
              report.summary.criticalIssues++;
            } else {
              report.summary.warnings++;
            }
          });
        }
      });

    } catch (error) {
      report.error = error.message;
      report.summary.passed = false;
    }

    return report;
  }
}

// Helper function to get element selector (would be injected into page context)
function getElementSelector(element) {
  if (element.id) {
    return `#${element.id}`;
  }
  
  if (element.className) {
    return `.${element.className.split(' ')[0]}`;
  }
  
  return element.tagName.toLowerCase();
}

export { AccessibilityHelper };