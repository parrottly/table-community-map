// Interactive Map for Community Groups
// Uses Leaflet.js for mapping functionality

class CommunityMap {
    constructor() {
        this.map = null;
        this.groups = [];
        this.markers = [];
        this.markerClusterGroup = null;
        this.currentFilter = 'all';
        
        // DMV area bounds
        this.dmvBounds = [
            [38.7, -77.5], // Southwest
            [39.2, -76.8]  // Northeast
        ];
        
        // DMV center coordinates
        this.dmvCenter = [38.9072, -77.0369]; // Washington DC
    }

    // Initialize the map
    async init() {
        try {
            console.log('Initializing community map...');
            
            this.createMap();
            this.setupControls();
            await this.loadGroups();
            this.addGroupsToMap();
            
            console.log('✅ Community map initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize map:', error);
            this.showError('Failed to load community map. Please try refreshing the page.');
        }
    }

    // Create the base map
    createMap() {
        // Remove loading indicator
        const loadingEl = document.querySelector('.map-loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }

        // Initialize Leaflet map
        this.map = L.map('map', {
            center: this.dmvCenter,
            zoom: 10,
            maxBounds: this.dmvBounds,
            maxBoundsViscosity: 0.5
        });

        // Add modern, minimalist tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CARTO',
            subdomains: 'abcd',
            maxZoom: 18
        }).addTo(this.map);

        // Initialize marker cluster group with reduced clustering
        this.markerClusterGroup = L.markerClusterGroup({
            chunkedLoading: true,
            maxClusterRadius: 25, // Reduced from 50 to spread groups more
            disableClusteringAtZoom: 12, // Stop clustering when zoomed in
            iconCreateFunction: (cluster) => {
                const count = cluster.getChildCount();
                let className = 'marker-cluster-small';
                
                if (count > 10) {
                    className = 'marker-cluster-large';
                } else if (count > 5) {
                    className = 'marker-cluster-medium';
                }
                
                return L.divIcon({
                    html: `<div><span>${count}</span></div>`,
                    className: `marker-cluster ${className}`,
                    iconSize: L.point(40, 40)
                });
            }
        });

        this.map.addLayer(this.markerClusterGroup);
    }

    // Set up map controls and filters
    setupControls() {
        // Group type filter
        const filterSelect = document.getElementById('group-type-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.filterGroups();
            });
        }
    }

    // Load groups from Planning Center API
    async loadGroups() {
        try {
            console.log('Loading groups from Planning Center...');
            
            const api = new PlanningCenterAPI();
            this.groups = await api.getGroups();
            
            console.log(`✅ Loaded ${this.groups.length} groups`);
            
            // Update groups list in sidebar
            this.updateGroupsList();
            
        } catch (error) {
            console.error('❌ Failed to load groups:', error);
            throw error;
        }
    }

    // Add groups to map as markers
    addGroupsToMap() {
        // Clear existing markers
        this.markerClusterGroup.clearLayers();
        this.markers = [];
        
        this.groups.forEach(group => {
            if (!group.coordinates) return;
            
            const marker = this.createGroupMarker(group);
            this.markers.push({ marker, group });
            this.markerClusterGroup.addLayer(marker);
        });
        
        // Fit map to show all groups
        if (this.markers.length > 0) {
            const group = new L.featureGroup(this.markers.map(m => m.marker));
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    // Create a marker for a group
    createGroupMarker(group) {
        // Create custom icon based on group type
        const icon = this.createGroupIcon(group.groupType);
        
        // Create marker
        const marker = L.marker(group.coordinates, { icon })
            .bindPopup(this.createPopupContent(group), {
                maxWidth: 300,
                className: 'group-popup'
            });
        
        // Add click handler
        marker.on('click', () => {
            this.selectGroup(group.id);
        });
        
        return marker;
    }

    // Create custom icon for group type
    createGroupIcon(groupType) {
        const color = groupType === 'community' ? '#86EFAC' : '#5B21B6';
        const textColor = groupType === 'community' ? '#374151' : '#FFFFFF';
        
        return L.divIcon({
            className: 'group-marker',
            html: `
                <div class="marker-pin" style="background-color: ${color}; border-color: ${textColor};">
                    <div class="marker-dot" style="background-color: ${textColor};"></div>
                </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 24],
            popupAnchor: [0, -24]
        });
    }

    // Create popup content for a group
    createPopupContent(group) {
        const typeClass = group.groupType === 'community' ? 'community' : 'affinity';
        const typeLabel = group.groupType === 'community' ? 'Community Group' : 'Affinity Group';
        
        return `
            <div class="group-popup-content">
                <h4>${group.name}</h4>
                <span class="group-type ${typeClass}">${typeLabel}</span>
                <p class="group-description">${group.description}</p>
                <div class="group-details">
                    <p><strong>📍 Location:</strong> ${group.location.neighborhood}</p>
                    <p><strong>📅 Meeting:</strong> ${group.meetingDay}</p>
                    ${group.memberCount ? `<p><strong>👥 Members:</strong> ${group.memberCount}</p>` : ''}
                </div>
                <div class="popup-actions">
                    <a href="https://thetablechurch.churchcenter.com/" target="_blank" class="join-button">
                        Learn More
                    </a>
                </div>
            </div>
        `;
    }

    // Update the groups list in sidebar
    updateGroupsList() {
        const listContainer = document.getElementById('groups-list');
        if (!listContainer) return;
        
        if (this.groups.length === 0) {
            listContainer.innerHTML = '<div class="loading">No groups found</div>';
            return;
        }
        
        const groupsHtml = this.groups
            .filter(group => this.currentFilter === 'all' || group.groupType === this.currentFilter)
            .map(group => this.createGroupListItem(group))
            .join('');
        
        listContainer.innerHTML = groupsHtml;
        
        // Add click handlers
        listContainer.querySelectorAll('.group-card').forEach(card => {
            card.addEventListener('click', () => {
                const groupId = card.dataset.groupId;
                this.selectGroup(groupId);
            });
        });
    }

    // Create list item for a group
    createGroupListItem(group) {
        const typeClass = group.groupType === 'community' ? 'community' : 'affinity';
        const typeLabel = group.groupType === 'community' ? 'Community Group' : 'Affinity Group';
        
        return `
            <div class="group-card" data-group-id="${group.id}">
                <div class="group-name">${group.name}</div>
                <span class="group-type ${typeClass}">${typeLabel}</span>
                <div class="group-details">
                    <div class="group-location">📍 ${group.location.neighborhood}</div>
                    <div>📅 ${group.meetingDay}</div>
                    ${group.memberCount ? `<div>👥 ${group.memberCount} members</div>` : ''}
                </div>
            </div>
        `;
    }

    // Select and highlight a group
    selectGroup(groupId) {
        // Remove previous selection
        document.querySelectorAll('.group-card.selected').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Highlight selected group
        const selectedCard = document.querySelector(`[data-group-id="${groupId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
            selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        // Find and center map on group
        const groupData = this.groups.find(g => g.id === groupId);
        if (groupData && groupData.coordinates) {
            this.map.setView(groupData.coordinates, 14);
            
            // Open popup if marker exists
            const markerData = this.markers.find(m => m.group.id === groupId);
            if (markerData) {
                markerData.marker.openPopup();
            }
        }
    }

    // Filter groups by type
    filterGroups() {
        // Update sidebar list
        this.updateGroupsList();
        
        // Filter map markers
        this.markerClusterGroup.clearLayers();
        
        const filteredMarkers = this.markers.filter(({ group }) => 
            this.currentFilter === 'all' || group.groupType === this.currentFilter
        );
        
        filteredMarkers.forEach(({ marker }) => {
            this.markerClusterGroup.addLayer(marker);
        });
        
        // Adjust map view if needed
        if (filteredMarkers.length > 0) {
            const group = new L.featureGroup(filteredMarkers.map(m => m.marker));
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    // Show error message
    showError(message) {
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div class="error" style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 1000;
                    max-width: 400px;
                    text-align: center;
                ">
                    <h3>Map Loading Error</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" style="
                        margin-top: 1rem;
                        padding: 0.5rem 1rem;
                        background: #86EFAC;
                        color: #374151;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                    ">Retry</button>
                </div>
            `;
        }
    }
}

// Add custom CSS for markers
const markerStyles = `
<style>
.group-marker {
    background: transparent;
    border: none;
}

.marker-pin {
    width: 24px;
    height: 24px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.marker-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    transform: rotate(45deg);
}

.marker-cluster {
    background: rgba(134, 239, 172, 0.8);
    border: 3px solid #374151;
    border-radius: 50%;
    text-align: center;
    color: #374151;
    font-weight: bold;
}

.marker-cluster div {
    width: 34px;
    height: 34px;
    margin: 3px;
    background: rgba(134, 239, 172, 0.9);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.marker-cluster-large {
    background: rgba(91, 33, 182, 0.8);
    border-color: white;
    color: white;
}

.marker-cluster-large div {
    background: rgba(91, 33, 182, 0.9);
}

.group-popup-content .group-type {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    margin: 0.5rem 0;
}

.group-popup-content .group-type.community {
    background: #86EFAC;
    color: #374151;
}

.group-popup-content .group-type.affinity {
    background: #5B21B6;
    color: white;
}

.group-popup-content .group-description {
    margin: 0.5rem 0;
    color: #6B7280;
    font-size: 0.9rem;
}

.group-popup-content .group-details {
    margin: 0.5rem 0;
}

.group-popup-content .group-details p {
    margin: 0.25rem 0;
    font-size: 0.85rem;
    color: #374151;
}

.popup-actions {
    margin-top: 1rem;
    text-align: center;
}

.join-button {
    display: inline-block;
    background: #86EFAC;
    color: #374151;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.9rem;
    transition: background-color 0.2s ease;
}

.join-button:hover {
    background: #6EE7B7;
}
</style>
`;

// Inject marker styles
document.head.insertAdjacentHTML('beforeend', markerStyles);

// Export for use in main script
window.CommunityMap = CommunityMap;