// Planning Center API Client
// Handles secure communication with Planning Center API

class PlanningCenterAPI {
    constructor() {
        // API will be called through Netlify Functions for security
        this.baseURL = '/.netlify/functions/planning-center';
    }

    // Fetch all groups from Planning Center
    async getGroups() {
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
            return this.processGroups(data.groups);
            
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
        }).filter(group => group.isActive && group.coordinates);
    }

    // Extract location information and geocode if needed
    extractLocation(attributes) {
        const locationString = attributes.location_type_preference || 
                              attributes.location || 
                              'DMV Area';
        
        // Try to extract coordinates or neighborhood info
        // This might need enhancement based on actual Planning Center data structure
        const coordinates = this.geocodeLocation(locationString);
        
        return {
            address: locationString,
            neighborhood: this.extractNeighborhood(locationString),
            coordinates: coordinates
        };
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

    // Basic geocoding for DMV area locations
    geocodeLocation(locationString) {
        // This is a simplified geocoder - in production you might want to use
        // a proper geocoding service or maintain a database of known locations
        
        const dmvLocations = {
            // DC Neighborhoods
            'dupont circle': [38.9097, -77.0365],
            'adams morgan': [38.9220, -77.0420],
            'capitol hill': [38.8903, -76.9901],
            'columbia heights': [38.9289, -77.0353],
            'shaw': [38.9129, -77.0218],
            'petworth': [38.9369, -77.0249],
            'brookland': [38.9339, -76.9956],
            'anacostia': [38.8622, -76.9810],
            
            // Northern Virginia
            'arlington': [38.8816, -77.0910],
            'alexandria': [38.8048, -77.0469],
            'fairfax': [38.8462, -77.3064],
            'vienna': [38.9012, -77.2653],
            'reston': [38.9687, -77.3411],
            'sterling': [39.0068, -77.4286],
            
            // Maryland
            'bethesda': [38.9807, -77.1010],
            'rockville': [39.0840, -77.1528],
            'silver spring': [38.9907, -77.0261],
            'takoma park': [38.9779, -77.0074],
            'college park': [38.9897, -76.9378],
            'hyattsville': [38.9551, -76.9455]
        };
        
        const location = locationString.toLowerCase();
        
        // Try to find a match in our known locations
        for (const [place, coords] of Object.entries(dmvLocations)) {
            if (location.includes(place)) {
                return coords;
            }
        }
        
        // Default to DC center if no match found
        return [38.9072, -77.0369];
    }

    // Extract neighborhood from location string
    extractNeighborhood(locationString) {
        // Simple extraction - could be enhanced
        const parts = locationString.split(',');
        return parts[0]?.trim() || 'DMV Area';
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
                    coordinates: [38.9097, -77.0365]
                },
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
                    coordinates: [38.8816, -77.0910]
                },
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
                    coordinates: [38.9289, -77.0353]
                },
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
                    coordinates: [38.9129, -77.0218]
                },
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
                    coordinates: [38.9807, -77.1010]
                },
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