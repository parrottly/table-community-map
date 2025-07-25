// Planning Center API Client
// Handles secure communication with Planning Center API

class PlanningCenterAPI {
    constructor() {
        // API will be called through Netlify Functions for security
        this.baseURL = '/.netlify/functions/planning-center';
    }

    // Fetch all groups from Planning Center
    async getGroups() {
        // TEMPORARY: Force use of fallback data to test distribution
        console.log('🔧 TEMPORARILY USING FALLBACK DATA FOR TESTING');
        return this.getFallbackGroups();
        
        try {
            console.log('Fetching groups from Planning Center...');
            
            const response = await fetch(`${this.baseURL}/groups`);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            console.log('✅ Groups loaded from Planning Center:', data.groups.length);
            const processedGroups = this.processGroups(data.groups);
            
            // Apply geographic distribution to groups without specific locations
            return this.distributeGroupsGeographically(processedGroups);
            
        } catch (error) {
            console.error('❌ Failed to fetch groups:', error);
            return this.getFallbackGroups();
        }
    }

    // Process raw Planning Center data into our format
    processGroups(rawGroups) {
        return rawGroups.map(group => {
            // Extract relevant information from Planning Center format
            const attributes = group.attributes || {};
            const location = this.extractLocation(attributes);
            const groupType = this.determineGroupType(attributes);
            
            return {
                id: group.id,
                name: attributes.name || 'Unnamed Group',
                description: attributes.description || '',
                groupType: groupType,
                location: location,
                meetingDay: attributes.schedule || 'Contact for details',
                contactInfo: attributes.contact_email || '',
                coordinates: location.coordinates,
                // Additional metadata
                memberCount: attributes.memberships_count || 0,
                isActive: attributes.archived === false,
                lastUpdated: attributes.updated_at
            };
        }).filter(group => group.isActive); // Don't filter out groups without coordinates yet
    }

    // Extract location information and geocode if needed
    extractLocation(attributes) {
        // Check all possible location fields from Planning Center
        const locationOptions = [
            attributes.location_type_preference,
            attributes.location,
            attributes.contact_info,
            attributes.church_center_url_location,
            attributes.address,
            attributes.meeting_location
        ].filter(Boolean);
        
        let locationString = locationOptions[0] || '';
        
        // Try to infer location from group name if no explicit location found
        if (!locationString || 
            locationString.trim() === '' || 
            locationString.toLowerCase() === 'dmv area' ||
            locationString.toLowerCase() === 'contact for location' ||
            locationString.toLowerCase().includes('varies')) {
            
            locationString = this.extractLocationFromName(attributes.name) || locationString;
        }
        
        console.log(`Processing group "${attributes.name}":`, {
            available_fields: Object.keys(attributes).filter(key => 
                key.toLowerCase().includes('location') || 
                key.toLowerCase().includes('address') ||
                key.toLowerCase().includes('contact')
            ),
            location_options: locationOptions,
            inferred_from_name: this.extractLocationFromName(attributes.name),
            selected_location: locationString
        });
        
        // If we have a meaningful location, geocode it
        if (locationString && 
            locationString.trim() !== '' && 
            locationString.toLowerCase() !== 'dmv area' &&
            locationString.toLowerCase() !== 'contact for location' &&
            !locationString.toLowerCase().includes('varies')) {
            
            const coordinates = this.geocodeLocation(locationString);
            return {
                address: locationString,
                neighborhood: this.extractNeighborhood(locationString),
                coordinates: coordinates,
                hasSpecificLocation: true
            };
        }
        
        // No specific location available
        console.log(`No specific location for group "${attributes.name}"`);
        return {
            address: 'Contact for meeting location',
            neighborhood: 'DMV Area',
            coordinates: null,
            hasSpecificLocation: false
        };
    }

    // Extract location from group name (many groups include location in their title)
    extractLocationFromName(groupName) {
        if (!groupName) return null;
        
        const name = groupName.toLowerCase();
        
        // List of DMV locations that might appear in group names
        const locationKeywords = [
            // DC neighborhoods
            'dupont circle', 'dupont', 'adams morgan', 'capitol hill', 'columbia heights',
            'shaw', 'petworth', 'brookland', 'anacostia', 'foggy bottom', 'georgetown',
            'logan circle', 'u street', 'h street', 'navy yard', 'downtown', 'chinatown',
            
            // DC general
            'washington dc', 'washington', 'dc',
            
            // Northern Virginia
            'arlington', 'alexandria', 'fairfax', 'vienna', 'reston', 'sterling',
            'annandale', 'falls church', 'tysons', 'leesburg', 'herndon', 'mclean',
            'springfield', 'burke', 'woodbridge', 'manassas',
            
            // Maryland suburbs
            'bethesda', 'rockville', 'silver spring', 'takoma park', 'college park',
            'hyattsville', 'gaithersburg', 'germantown', 'wheaton', 'kensington',
            'chevy chase', 'potomac', 'bowie', 'laurel', 'greenbelt', 'riverdale',
            
            // Broader regional terms
            'northern virginia', 'nova', 'maryland', 'virginia'
        ];
        
        // Check if any location keywords appear in the group name
        for (const location of locationKeywords) {
            if (name.includes(location)) {
                console.log(`Found location "${location}" in group name: "${groupName}"`);
                return location;
            }
        }
        
        return null;
    }

    // Determine if it's a Community Group or Affinity Group
    determineGroupType(attributes) {
        const name = (attributes.name || '').toLowerCase();
        const description = (attributes.description || '').toLowerCase();
        const tags = attributes.group_type || '';
        
        // Keywords that suggest Affinity Groups
        const affinityKeywords = [
            'young adult', 'ya', 'professional', 'graduate', 'student',
            'women', 'men', 'lgbtq', 'queer', 'people of color', 'poc',
            'parents', 'family', 'seniors', 'older adult', 'creative',
            'artist', 'musician', 'book', 'hiking', 'outdoors'
        ];
        
        const isAffinity = affinityKeywords.some(keyword => 
            name.includes(keyword) || description.includes(keyword)
        );
        
        return isAffinity ? 'affinity' : 'community';
    }

    // Enhanced geocoding for DMV area locations with distribution
    geocodeLocation(locationString) {
        const dmvLocations = {
            // Washington DC - Central
            'dupont circle': [38.9097, -77.0365],
            'dupont': [38.9097, -77.0365],
            'adams morgan': [38.9220, -77.0420],
            'capitol hill': [38.8903, -76.9901],
            'columbia heights': [38.9289, -77.0353],
            'shaw': [38.9129, -77.0218],
            'petworth': [38.9369, -77.0249],
            'brookland': [38.9339, -76.9956],
            'anacostia': [38.8622, -76.9810],
            'foggy bottom': [38.9006, -77.0472],
            'georgetown': [38.9076, -77.0723],
            'logan circle': [38.9095, -77.0292],
            'u street': [38.9169, -77.0281],
            'h street': [38.8998, -76.9951],
            'navy yard': [38.8762, -77.0065],
            'downtown': [38.8951, -77.0364],
            'chinatown': [38.8998, -77.0218],
            
            // DC Broader terms
            'washington dc': [38.9072, -77.0369],
            'washington': [38.9072, -77.0369],
            'dc': [38.9072, -77.0369],
            
            // Northern Virginia
            'arlington': [38.8816, -77.0910],
            'alexandria': [38.8048, -77.0469],
            'fairfax': [38.8462, -77.3064],
            'vienna': [38.9012, -77.2653],
            'reston': [38.9687, -77.3411],
            'sterling': [39.0068, -77.4286],
            'annandale': [38.8304, -77.1963],
            'falls church': [38.8823, -77.1711],
            'tysons': [38.9188, -77.2297],
            'leesburg': [39.1156, -77.5636],
            'herndon': [38.9696, -77.3861],
            'mclean': [38.9338, -77.1775],
            'springfield': [38.7893, -77.1872],
            'burke': [38.7932, -77.2719],
            'woodbridge': [38.6581, -77.2497],
            'manassas': [38.7509, -77.4753],
            
            // Maryland Suburbs
            'bethesda': [38.9807, -77.1010],
            'rockville': [39.0840, -77.1528],
            'silver spring': [38.9907, -77.0261],
            'takoma park': [38.9779, -77.0074],
            'college park': [38.9897, -76.9378],
            'hyattsville': [38.9551, -76.9455],
            'gaithersburg': [39.1434, -77.2014],
            'germantown': [39.1712, -77.2717],
            'wheaton': [39.0370, -77.0558],
            'kensington': [39.0273, -77.0764],
            'chevy chase': [38.9851, -77.0872],
            'potomac': [39.0223, -77.2086],
            'bowie': [38.9426, -76.7302],
            'laurel': [39.0993, -76.8483],
            'greenbelt': [38.9912, -76.8756],
            'riverdale': [38.9584, -76.9119]
        };
        
        const location = locationString.toLowerCase().trim();
        console.log(`Geocoding location: "${location}"`);
        
        // Try exact matches first
        if (dmvLocations[location]) {
            const coords = dmvLocations[location];
            console.log(`Exact match found: ${coords}`);
            return this.addRandomOffset(coords);
        }
        
        // Try partial matches
        for (const [place, coords] of Object.entries(dmvLocations)) {
            if (location.includes(place) || place.includes(location)) {
                console.log(`Partial match "${place}" found: ${coords}`);
                return this.addRandomOffset(coords);
            }
        }
        
        // Check for state/region indicators
        if (location.includes('virginia') || location.includes('va')) {
            console.log('Virginia location detected, using Arlington');
            return this.addRandomOffset([38.8816, -77.0910]);
        }
        
        if (location.includes('maryland') || location.includes('md')) {
            console.log('Maryland location detected, using Silver Spring');
            return this.addRandomOffset([38.9907, -77.0261]);
        }
        
        // Default to DC center with random offset
        console.log(`No match found for "${location}", using DC center with offset`);
        return this.addRandomOffset([38.9072, -77.0369]);
    }
    
    // Add small random offset within 0.25 miles for privacy
    addRandomOffset(coords) {
        const [lat, lng] = coords;
        
        // Add random offset within ~0.25 miles (fuzzy location for privacy)
        // 0.0036 degrees ≈ 0.25 miles
        const latOffset = (Math.random() - 0.5) * 0.0072; 
        const lngOffset = (Math.random() - 0.5) * 0.0072;
        
        return [
            lat + latOffset,
            lng + lngOffset
        ];
    }

    // Extract neighborhood from location string
    extractNeighborhood(locationString) {
        // Simple extraction - could be enhanced
        const parts = locationString.split(',');
        return parts[0]?.trim() || 'DMV Area';
    }

    // Distribute groups across DMV when no specific location data is available
    distributeGroupsGeographically(groups) {
        console.log('Applying geographic distribution to groups without specific locations');
        
        // Predefined distribution points across DMV
        const distributionPoints = [
            { name: 'Dupont Circle', coords: [38.9097, -77.0365] },
            { name: 'Arlington', coords: [38.8816, -77.0910] },
            { name: 'Columbia Heights', coords: [38.9289, -77.0353] },
            { name: 'Bethesda', coords: [38.9807, -77.1010] },
            { name: 'Alexandria', coords: [38.8048, -77.0469] },
            { name: 'Silver Spring', coords: [38.9907, -77.0261] },
            { name: 'Capitol Hill', coords: [38.8903, -76.9901] },
            { name: 'Fairfax', coords: [38.8462, -77.3064] },
            { name: 'Georgetown', coords: [38.9076, -77.0723] },
            { name: 'Adams Morgan', coords: [38.9220, -77.0420] },
            { name: 'Rockville', coords: [39.0840, -77.1528] },
            { name: 'Takoma Park', coords: [38.9779, -77.0074] }
        ];
        
        let distributionIndex = 0;
        
        return groups.map(group => {
            // If group already has coordinates, keep them
            if (group.coordinates) {
                return group;
            }
            
            // Otherwise, assign to next distribution point
            const point = distributionPoints[distributionIndex % distributionPoints.length];
            distributionIndex++;
            
            console.log(`Assigning "${group.name}" to ${point.name}`);
            
            return {
                ...group,
                location: {
                    ...group.location,
                    address: `${point.name} area`,
                    neighborhood: point.name,
                    coordinates: this.addRandomOffset(point.coords),
                    hasSpecificLocation: true // Mark as having location for map display
                },
                coordinates: this.addRandomOffset(point.coords)
            };
        });
    }

    // Fallback data if API fails
    getFallbackGroups() {
        console.log('Using fallback group data');
        
        return [
            {
                id: 'fallback-1',
                name: 'Dupont Circle Community Group',
                description: 'Weekly gathering for authentic community and spiritual growth',
                groupType: 'community',
                location: {
                    address: 'Dupont Circle, DC',
                    neighborhood: 'Dupont Circle',
                    hasSpecificLocation: true
                },
                coordinates: [38.9097, -77.0365], // Direct property, not nested
                meetingDay: 'Wednesday evenings',
                contactInfo: 'Contact church for details',
                memberCount: 12,
                isActive: true
            },
            {
                id: 'fallback-2',
                name: 'Young Adult Professionals',
                description: 'Affinity group for young professionals navigating faith and career',
                groupType: 'affinity',
                location: {
                    address: 'Arlington, VA',
                    neighborhood: 'Arlington',
                    hasSpecificLocation: true
                },
                coordinates: [38.8816, -77.0910], // Direct property, not nested
                meetingDay: 'Tuesday evenings',
                contactInfo: 'Contact church for details',
                memberCount: 8,
                isActive: true
            },
            {
                id: 'fallback-3',
                name: 'Columbia Heights Community Group',
                description: 'Diverse community group focused on justice and service',
                groupType: 'community',
                location: {
                    address: 'Columbia Heights, DC',
                    neighborhood: 'Columbia Heights',
                    hasSpecificLocation: true
                },
                coordinates: [38.9289, -77.0353], // Direct property, not nested
                meetingDay: 'Thursday evenings',
                contactInfo: 'Contact church for details',
                memberCount: 15,
                isActive: true
            },
            {
                id: 'fallback-4',
                name: 'LGBTQ+ Affinity Group',
                description: 'Safe space for LGBTQ+ members and allies',
                groupType: 'affinity',
                location: {
                    address: 'Shaw, DC',
                    neighborhood: 'Shaw',
                    hasSpecificLocation: true
                },
                coordinates: [38.9129, -77.0218], // Direct property, not nested
                meetingDay: 'Monthly gatherings',
                contactInfo: 'Contact church for details',
                memberCount: 6,
                isActive: true
            },
            {
                id: 'fallback-5',
                name: 'Bethesda Community Group',
                description: 'Suburban community group for families and individuals',
                groupType: 'community',
                location: {
                    address: 'Bethesda, MD',
                    neighborhood: 'Bethesda',
                    hasSpecificLocation: true
                },
                coordinates: [38.9807, -77.1010], // Direct property, not nested
                meetingDay: 'Sunday afternoons',
                contactInfo: 'Contact church for details',
                memberCount: 10,
                isActive: true
            }
        ];
    }

    // Get group statistics for gap analysis
    async getGroupStats() {
        try {
            const groups = await this.getGroups();
            
            const stats = {
                totalGroups: groups.length,
                communityGroups: groups.filter(g => g.groupType === 'community').length,
                affinityGroups: groups.filter(g => g.groupType === 'affinity').length,
                totalMembers: groups.reduce((sum, g) => sum + g.memberCount, 0),
                averageGroupSize: Math.round(groups.reduce((sum, g) => sum + g.memberCount, 0) / groups.length),
                locationCoverage: this.analyzeLocationCoverage(groups)
            };
            
            return stats;
            
        } catch (error) {
            console.error('Failed to get group stats:', error);
            return {
                totalGroups: 5,
                communityGroups: 3,
                affinityGroups: 2,
                totalMembers: 51,
                averageGroupSize: 10,
                locationCoverage: ['DC', 'Northern VA', 'Maryland']
            };
        }
    }

    // Analyze which areas have group coverage
    analyzeLocationCoverage(groups) {
        const coverage = new Set();
        
        groups.forEach(group => {
            const neighborhood = group.location.neighborhood;
            
            // Categorize by broader regions
            if (neighborhood.toLowerCase().includes('dc') || 
                ['dupont circle', 'adams morgan', 'capitol hill', 'columbia heights', 'shaw'].some(n => 
                    neighborhood.toLowerCase().includes(n))) {
                coverage.add('Washington DC');
            } else if (['arlington', 'alexandria', 'fairfax', 'vienna', 'reston'].some(n => 
                       neighborhood.toLowerCase().includes(n))) {
                coverage.add('Northern Virginia');
            } else if (['bethesda', 'rockville', 'silver spring', 'takoma park'].some(n => 
                       neighborhood.toLowerCase().includes(n))) {
                coverage.add('Maryland');
            }
        });
        
        return Array.from(coverage);
    }
}

// Export for use in other files
window.PlanningCenterAPI = PlanningCenterAPI;