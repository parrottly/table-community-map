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
        // Get Planning Center credentials from environment variables
        const CLIENT_ID = process.env.PLANNING_CENTER_CLIENT_ID;
        const SECRET = process.env.PLANNING_CENTER_SECRET;
        
        // Debug logging
        console.log('Environment check:');
        console.log('CLIENT_ID exists:', !!CLIENT_ID);
        console.log('SECRET exists:', !!SECRET);
        console.log('CLIENT_ID length:', CLIENT_ID ? CLIENT_ID.length : 0);
        console.log('SECRET length:', SECRET ? SECRET.length : 0);
        
        if (!CLIENT_ID || !SECRET) {
            throw new Error(`Missing Planning Center API credentials. CLIENT_ID: ${!!CLIENT_ID}, SECRET: ${!!SECRET}`);
        }

        // Extract endpoint from path
        const path = event.path.replace('/.netlify/functions/planning-center', '');
        
        let data;
        
        if (path === '/groups' || path === '/groups/') {
            data = await fetchGroups(CLIENT_ID, SECRET);
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

// Fetch groups from Planning Center Groups API
async function fetchGroups(clientId, secret) {
    try {
        // Create Basic Auth header
        const credentials = Buffer.from(`${clientId}:${secret}`).toString('base64');
        
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
        
        // Filter and process groups
        const processedGroups = groups
            .filter(group => {
                // Only include active, published groups
                const attributes = group.attributes || {};
                return !attributes.archived && 
                       attributes.public_church_center_web_url && 
                       attributes.enrollment === 'open';
            })
            .map(group => processGroupData(group));

        console.log(`✅ Processed ${processedGroups.length} active groups`);
        
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