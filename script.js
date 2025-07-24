// Main application script
// Coordinates all components of the community map

class CommunityMapApp {
    constructor() {
        this.map = null;
        this.planningCenterAPI = null;
        this.isInitialized = false;
    }

    // Initialize the application
    async init() {
        try {
            console.log('🚀 Initializing Table Church Community Map...');
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.init());
                return;
            }
            
            // Initialize components
            await this.initializeComponents();
            this.setupEventListeners();
            await this.loadInitialData();
            
            this.isInitialized = true;
            console.log('✅ Community Map App initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.showError('Failed to load the community map. Please refresh to try again.');
        }
    }

    // Initialize core components
    async initializeComponents() {
        // Initialize Planning Center API client
        this.planningCenterAPI = new PlanningCenterAPI();
        
        // Initialize map
        this.map = new CommunityMap();
        await this.map.init();
        
        console.log('✅ Core components initialized');
    }

    // Set up event listeners
    setupEventListeners() {
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Intersection Observer for navigation highlighting
        this.setupScrollSpyNavigation();
        
        console.log('✅ Event listeners set up');
    }

    // Load initial data and update UI
    async loadInitialData() {
        try {
            // Get group statistics for gap analysis
            const stats = await this.planningCenterAPI.getGroupStats();
            this.updateGapAnalysis(stats);
            
            console.log('✅ Initial data loaded');
            
        } catch (error) {
            console.error('❌ Failed to load initial data:', error);
            // Non-critical error - app can still function
        }
    }

    // Set up scroll spy navigation
    setupScrollSpyNavigation() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
        
        if (sections.length === 0 || navLinks.length === 0) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Remove active class from all nav links
                    navLinks.forEach(link => link.classList.remove('active'));
                    
                    // Add active class to current section's nav link
                    const activeLink = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
                    if (activeLink) {
                        activeLink.classList.add('active');
                    }
                }
            });
        }, {
            rootMargin: '-20% 0px -60% 0px'
        });
        
        sections.forEach(section => observer.observe(section));
    }

    // Update gap analysis with real data
    updateGapAnalysis(stats) {
        try {
            // Update statistics in gap cards if they exist
            const gapCards = document.querySelectorAll('.gap-card');
            
            // You could enhance this to show real coverage data
            console.log('Gap analysis stats:', stats);
            
            // For now, the gap analysis uses static content
            // In a future version, you could dynamically update based on real group locations
            
        } catch (error) {
            console.error('Failed to update gap analysis:', error);
        }
    }

    // Show error message
    showError(message) {
        // Create error banner
        const errorBanner = document.createElement('div');
        errorBanner.className = 'error-banner';
        errorBanner.innerHTML = `
            <div class="container">
                <div class="error-content">
                    <span class="error-icon">⚠️</span>
                    <span class="error-message">${message}</span>
                    <button class="error-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
            </div>
        `;
        
        // Add error styles
        errorBanner.style.cssText = `
            background: #FEE2E2;
            border-bottom: 1px solid #FECACA;
            padding: 1rem 0;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 9999;
        `;
        
        const errorContent = errorBanner.querySelector('.error-content');
        errorContent.style.cssText = `
            display: flex;
            align-items: center;
            gap: 1rem;
            color: #DC2626;
        `;
        
        const closeButton = errorBanner.querySelector('.error-close');
        closeButton.style.cssText = `
            background: none;
            border: none;
            font-size: 1.5rem;
            color: #DC2626;
            cursor: pointer;
            margin-left: auto;
            padding: 0;
            width: 2rem;
            height: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Insert at top of page
        document.body.insertBefore(errorBanner, document.body.firstChild);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorBanner.parentNode) {
                errorBanner.remove();
            }
        }, 10000);
    }

    // Utility method to refresh data
    async refreshData() {
        try {
            console.log('🔄 Refreshing community map data...');
            
            if (this.map) {
                await this.map.loadGroups();
                this.map.addGroupsToMap();
            }
            
            const stats = await this.planningCenterAPI.getGroupStats();
            this.updateGapAnalysis(stats);
            
            console.log('✅ Data refreshed successfully');
            
        } catch (error) {
            console.error('❌ Failed to refresh data:', error);
            this.showError('Failed to refresh data. Please try again.');
        }
    }

    // Get app status for debugging
    getStatus() {
        return {
            initialized: this.isInitialized,
            mapReady: this.map !== null,
            apiReady: this.planningCenterAPI !== null,
            timestamp: new Date().toISOString()
        };
    }
}

// Global app instance
let communityMapApp;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    communityMapApp = new CommunityMapApp();
    await communityMapApp.init();
});

// Make app available globally for debugging
window.communityMapApp = communityMapApp;
window.refreshMapData = () => communityMapApp?.refreshData();

// Service worker registration for offline support (future enhancement)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Could register a service worker here for offline functionality
        console.log('Service Worker support detected');
    });
}

// Analytics event tracking (if needed)
function trackEvent(eventName, properties = {}) {
    // Could integrate with analytics service here
    console.log('Event tracked:', eventName, properties);
}

// Export for external use
window.trackEvent = trackEvent;