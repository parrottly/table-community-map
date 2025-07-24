// Netlify Function for secure Planning Center API access
// Handles authentication and data processing server-side

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Get Planning Center Personal Access Token from environment variables
        const PAT_APP_ID = process.env.PLANNING_CENTER_APP_ID;
        const PAT_SECRET = process.env.PLANNING_CENTER_SECRET;
        
        // Debug logging
        console.log('Environment check:');
        console.log('PAT_APP_ID exists:', !!PAT_APP_ID);
        console.log('PAT_SECRET exists:', !!PAT_SECRET);
        console.log('PAT_APP_ID length:', PAT_APP_ID ? PAT_APP_ID.length : 0);
        console.log('PAT_SECRET length:', PAT_SECRET ? PAT_SECRET.length : 0);
        
        if (!PAT_APP_ID || !PAT_SECRET) {
            throw new Error(`Missing Planning Center PAT credentials. APP_ID: ${!!PAT_APP_ID}, SECRET: ${!!PAT_SECRET}`);
        }

        // Extract endpoint from path
        const path = event.path.replace('/.netlify/functions/planning-center', '');
        
        let data;
        
        if (path === '/groups' || path === '/groups/') {
            data = await fetchGroups(PAT_APP_ID, PAT_SECRET);
        } else {
            throw new Error(`Unknown endpoint: ${path}`);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                groups: data,
                lastUpdated: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Planning Center API error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to fetch data from Planning Center',
                details: error.message
            })
        };
    }
};

// Fetch groups from Planning Center Groups API using Personal Access Token
async function fetchGroups(appId, secret) {
    try {
        // Create Basic Auth header for Personal Access Token
        const credentials = Buffer.from(`${appId}:${secret}`).toString('base64');
        
        // Planning Center Groups API endpoint
        const apiUrl = 'https://api.planningcenteronline.com/groups/v2/groups';
        
        console.log('Fetching groups from Planning Center API...');
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Table Church Community Map'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Planning Center API error: ${response.status} ${errorText}`);
        }

        const responseData = await response.json();
        
        // Planning Center returns data in a specific format
        const groups = responseData.data || [];
        
        console.log(`✅ Fetched ${groups.length} groups from Planning Center`);
        
        // Debug: Log raw group data structure
        if (groups.length > 0) {
            console.log('First group structure:', JSON.stringify(groups[0], null, 2));
        } else {
            console.log('No groups found in API response');
            console.log('Full API response:', JSON.stringify(responseData, null, 2));
        }
        
        // Filter and process groups
        const processedGroups = groups
            .filter(group => {
                // Only include active, published groups
                const attributes = group.attributes || {};
                const isActive = !attributes.archived;
                const hasUrl = !!attributes.public_church_center_web_url;
                const isOpen = attributes.enrollment === 'open' || attributes.enrollment === 'request_to_join';
                
                console.log(`Group "${attributes.name}": active=${isActive}, hasUrl=${hasUrl}, enrollment=${attributes.enrollment}`);
                
                return isActive; // Simplified filter for debugging
            })
            .map(group => processGroupData(group));

        console.log(`✅ Processed ${processedGroups.length} active groups from ${groups.length} total groups`);
        
        return processedGroups;
        
    } catch (error) {
        console.error('Error fetching groups:', error);
        throw error;
    }
}

// Process individual group data
function processGroupData(group) {
    const attributes = group.attributes || {};
    
    return {
        id: group.id,
        attributes: {
            name: attributes.name || 'Unnamed Group',
            description: attributes.description || '',
            location: attributes.location_type_preference || 'DMV Area',
            schedule: attributes.schedule || 'Contact for details',
            contact_email: attributes.contact_email || '',
            public_url: attributes.public_church_center_web_url || '',
            memberships_count: attributes.memberships_count || 0,
            archived: attributes.archived || false,
            updated_at: attributes.updated_at,
            // Additional fields that might be useful
            group_type: attributes.group_type || '',
            enrollment: attributes.enrollment || 'open'
        }
    };
}

// Fallback function if API fails
function getFallbackGroups() {
    return [
        {
            id: 'fallback-1',
            attributes: {
                name: 'Dupont Circle Community Group',
                description: 'Weekly gathering for authentic community and spiritual growth in the heart of DC',
                location: 'Dupont Circle, Washington DC',
                schedule: 'Wednesday evenings, 7:00 PM',
                contact_email: '',
                public_url: '',
                memberships_count: 12,
                archived: false,
                group_type: 'Community Group',
                enrollment: 'open'
            }
        },
        {
            id: 'fallback-2',
            attributes: {
                name: 'Young Adult Professionals',
                description: 'Affinity group for young professionals navigating faith, career, and community',
                location: 'Arlington, Virginia',
                schedule: 'Tuesday evenings, 7:30 PM',
                contact_email: '',
                public_url: '',
                memberships_count: 8,
                archived: false,
                group_type: 'Affinity Group',
                enrollment: 'open'
            }
        },
        {
            id: 'fallback-3',
            attributes: {
                name: 'Columbia Heights Community Group',
                description: 'Diverse community group focused on justice, service, and neighborhood connection',
                location: 'Columbia Heights, Washington DC',
                schedule: 'Thursday evenings, 6:30 PM',
                contact_email: '',
                public_url: '',
                memberships_count: 15,
                archived: false,
                group_type: 'Community Group',
                enrollment: 'open'
            }
        },
        {
            id: 'fallback-4',
            attributes: {
                name: 'LGBTQ+ Affinity Group',
                description: 'Safe and affirming space for LGBTQ+ members and allies to explore faith together',
                location: 'Shaw, Washington DC',
                schedule: 'Second Saturday of each month, 3:00 PM',
                contact_email: '',
                public_url: '',
                memberships_count: 6,
                archived: false,
                group_type: 'Affinity Group',
                enrollment: 'open'
            }
        },
        {
            id: 'fallback-5',
            attributes: {
                name: 'Bethesda Community Group',
                description: 'Suburban community group welcoming families, couples, and individuals',
                location: 'Bethesda, Maryland',
                schedule: 'Sunday afternoons, 4:00 PM',
                contact_email: '',
                public_url: '',
                memberships_count: 10,
                archived: false,
                group_type: 'Community Group',
                enrollment: 'open'
            }
        }
    ];
}