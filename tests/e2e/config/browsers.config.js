/**
 * Browser-specific configuration for Playwright E2E tests
 * Handles browser-specific settings and capabilities
 */

/**
 * Chrome/Chromium specific configuration
 */
export const chromeConfig = {
  launchOptions: {
    args: [
      '--disable-web-security',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-field-trial-config',
      '--disable-back-forward-cache',
      '--disable-extensions'
    ],
    // Enable additional Chrome DevTools features for debugging
    devtools: process.env.DEBUG_MODE === 'true'
  },
  contextOptions: {
    // Enable permissions for testing
    permissions: ['clipboard-read', 'clipboard-write'],
    // Disable animations for more stable tests
    reducedMotion: process.env.CI ? 'reduce' : 'no-preference'
  }
};

/**
 * Firefox specific configuration
 */
export const firefoxConfig = {
  launchOptions: {
    firefoxUserPrefs: {
      // Disable notifications and popups
      'dom.webnotifications.enabled': false,
      'dom.push.enabled': false,
      'dom.disable_beforeunload': true,
      // Enable drag and drop
      'dom.events.dataTransfer.protected': false,
      // Disable auto-updates
      'app.update.enabled': false,
      'app.update.auto': false
    }
  },
  contextOptions: {
    // Firefox-specific viewport settings
    viewport: { width: 1280, height: 720 },
    // Enable clipboard access
    permissions: ['clipboard-read', 'clipboard-write']
  }
};

/**
 * WebKit/Safari specific configuration
 */
export const webkitConfig = {
  launchOptions: {
    // WebKit launch options
    args: []
  },
  contextOptions: {
    // Safari-specific settings for drag & drop compatibility
    hasTouch: false,
    // Enable required permissions
    permissions: ['clipboard-read', 'clipboard-write'],
    // WebKit viewport settings
    viewport: { width: 1280, height: 720 }
  },
  // Special handling for WebKit drag & drop
  dragDropConfig: {
    // Use touch events for drag & drop on WebKit
    useTouchEvents: true,
    // Longer delays for WebKit drag operations
    dragDelay: 100,
    dropDelay: 100
  }
};

/**
 * Mobile browser configurations
 */
export const mobileConfig = {
  chrome: {
    contextOptions: {
      hasTouch: true,
      isMobile: true,
      // Mobile-specific permissions
      permissions: ['clipboard-read', 'clipboard-write'],
      // Simulate mobile network conditions
      offline: false
    }
  },
  safari: {
    contextOptions: {
      hasTouch: true,
      isMobile: true,
      // iOS Safari specific settings
      permissions: ['clipboard-read', 'clipboard-write']
    },
    // iOS Safari drag & drop requires special handling
    dragDropConfig: {
      useTouchEvents: true,
      touchDuration: 500,
      dragDelay: 200
    }
  }
};

/**
 * Accessibility testing configuration
 */
export const accessibilityConfig = {
  contextOptions: {
    // High contrast mode
    forcedColors: 'active',
    // Dark mode testing
    colorScheme: 'dark',
    // Reduced motion for accessibility
    reducedMotion: 'reduce',
    // Larger text for accessibility testing
    viewport: { width: 1280, height: 720 }
  },
  // Accessibility-specific launch options
  launchOptions: {
    args: [
      '--force-prefers-reduced-motion',
      '--force-dark-mode'
    ]
  }
};

/**
 * Performance testing configuration
 */
export const performanceConfig = {
  contextOptions: {
    // Simulate slower network
    offline: false,
    // Performance monitoring
    recordVideo: {
      dir: 'test-results/performance-videos/',
      size: { width: 1280, height: 720 }
    }
  },
  launchOptions: {
    args: [
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--disable-features=TranslateUI'
    ]
  }
};

/**
 * Get browser-specific configuration
 */
export function getBrowserConfig(browserName, testType = 'default') {
  const configs = {
    chromium: chromeConfig,
    firefox: firefoxConfig,
    webkit: webkitConfig
  };
  
  const specialConfigs = {
    accessibility: accessibilityConfig,
    performance: performanceConfig
  };
  
  let config = configs[browserName] || chromeConfig;
  
  // Merge with special test type configurations
  if (specialConfigs[testType]) {
    config = {
      ...config,
      contextOptions: {
        ...config.contextOptions,
        ...specialConfigs[testType].contextOptions
      },
      launchOptions: {
        ...config.launchOptions,
        ...specialConfigs[testType].launchOptions
      }
    };
  }
  
  return config;
}

/**
 * Browser capability detection
 */
export const browserCapabilities = {
  chromium: {
    dragAndDrop: true,
    touchEvents: true,
    clipboard: true,
    webGL: true,
    serviceWorkers: true
  },
  firefox: {
    dragAndDrop: true,
    touchEvents: true,
    clipboard: true,
    webGL: true,
    serviceWorkers: true
  },
  webkit: {
    dragAndDrop: true, // With special handling
    touchEvents: true,
    clipboard: true,
    webGL: true,
    serviceWorkers: true
  }
};