/**
 * Simple dropdown implementation to replace Bootstrap dropdowns
 */
class DropdownManager {
    constructor() {
        this.activeDropdown = null;
        this.init();
    }

    init() {
        // Handle dropdown toggle clicks
        document.addEventListener('click', (event) => {
            const trigger = event.target.closest('[data-bs-toggle="dropdown"]');
            
            if (trigger) {
                event.preventDefault();
                this.toggleDropdown(trigger);
            } else {
                // Don't close dropdowns when clicking on board action buttons or when modal is open
                const boardAction = event.target.closest('[data-board-action]');
                const modalOpen = document.querySelector('.modal-overlay--visible');
                
                if (!boardAction && !modalOpen) {
                    // Close all dropdowns when clicking outside
                    this.closeAllDropdowns();
                }
            }
        });

        // Handle escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeAllDropdowns();
            }
        });
    }

    toggleDropdown(trigger) {
        const dropdown = trigger.nextElementSibling;
        if (!dropdown || !dropdown.classList.contains('dropdown-menu')) {
            return;
        }

        // Close other dropdowns
        if (this.activeDropdown && this.activeDropdown !== dropdown) {
            this.closeDropdown(this.activeDropdown);
        }

        // Toggle current dropdown
        if (dropdown.classList.contains('show')) {
            this.closeDropdown(dropdown);
        } else {
            this.openDropdown(dropdown);
        }
    }

    openDropdown(dropdown) {
        dropdown.classList.add('show');
        dropdown.style.display = 'block';
        this.activeDropdown = dropdown;
        
        // Update aria-expanded
        const trigger = dropdown.previousElementSibling;
        if (trigger) {
            trigger.setAttribute('aria-expanded', 'true');
        }
    }

    closeDropdown(dropdown) {
        dropdown.classList.remove('show');
        dropdown.style.display = 'none';
        
        // Update aria-expanded
        const trigger = dropdown.previousElementSibling;
        if (trigger) {
            trigger.setAttribute('aria-expanded', 'false');
        }
        
        if (this.activeDropdown === dropdown) {
            this.activeDropdown = null;
        }
    }

    closeAllDropdowns() {
        const openDropdowns = document.querySelectorAll('.dropdown-menu.show');
        openDropdowns.forEach(dropdown => {
            this.closeDropdown(dropdown);
        });
    }
}

// Initialize dropdown manager
new DropdownManager();

export default DropdownManager;