# The Table Church - Community Groups Map

An interactive map showcasing Community and Affinity Groups throughout the DMV (DC-Maryland-Virginia) area, with live data integration from Planning Center.

## 🌐 Live Site
**Production URL:** [Your Netlify URL here]

## 🗺️ Features

- **Interactive DMV Area Map** - Modern, minimalist design with neighborhood-level detail
- **Live Planning Center Integration** - Real-time group data and locations
- **Dual Group Types** - Community Groups and Affinity Groups with distinct styling
- **Fuzzy Circle Locations** - Privacy-conscious approximate locations
- **Gap Analysis** - Visual identification of underserved areas
- **Mobile Responsive** - Optimized for all devices
- **Secure API Management** - Planning Center credentials safely stored server-side

## 🏗️ Architecture

### Frontend
- **Leaflet.js** - Lightweight, customizable mapping
- **OpenStreetMap** - Modern, minimalist tile layer
- **Marker Clustering** - Efficient display of multiple groups
- **Responsive Design** - Mobile-first approach

### Backend
- **Netlify Functions** - Secure Planning Center API integration
- **Planning Center Groups API** - Live group data
- **Environment Variables** - Secure credential management

## 🔧 Development Setup

### Prerequisites
- Node.js (for Netlify Functions)
- Git and GitHub account
- Netlify account
- Planning Center API access

### Local Development
```bash
# Clone the repository
git clone https://github.com/parrottly/table-community-map.git
cd table-community-map

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Planning Center credentials

# Run locally with Netlify CLI
npm run dev
```

## 🔐 Environment Variables

**Set these in Netlify Dashboard → Site Settings → Environment Variables:**

| Variable | Purpose | Example |
|----------|---------|---------|
| `PLANNING_CENTER_CLIENT_ID` | Planning Center API Client ID | `a94e3c1216c077646e96...` |
| `PLANNING_CENTER_SECRET` | Planning Center API Secret | `pco_pat_c19ca87a5346ac4d...` |

**⚠️ NEVER commit API credentials to version control!**

## 📊 Planning Center Integration

### Required API Scopes
- **Groups**: Read access to group information
- **People**: Read access for group membership counts

### Data Mapping
The application maps Planning Center group data as follows:

```javascript
{
  id: group.id,
  name: attributes.name,
  description: attributes.description,
  groupType: 'community' | 'affinity', // Auto-detected from name/description
  location: {
    address: attributes.location_type_preference,
    neighborhood: extractedNeighborhood,
    coordinates: [lat, lng] // Geocoded from location
  },
  meetingDay: attributes.schedule,
  memberCount: attributes.memberships_count,
  isActive: !attributes.archived
}
```

### Group Type Detection
Groups are automatically categorized as:

- **Community Groups**: General neighborhood-based groups
- **Affinity Groups**: Identity-based or interest-based groups

Keywords for Affinity Group detection:
- Demographics: "young adult", "ya", "professional", "student", "women", "men", "seniors"
- Identity: "lgbtq", "queer", "people of color", "poc"
- Life Stage: "parents", "family", "graduate"
- Interests: "creative", "artist", "musician", "book", "hiking", "outdoors"

## 🗺️ Mapping Features

### Geocoding
The application includes a built-in geocoder for common DMV locations:

**Washington DC**: Dupont Circle, Adams Morgan, Capitol Hill, Columbia Heights, Shaw, Petworth, Brookland, Anacostia

**Northern Virginia**: Arlington, Alexandria, Fairfax, Vienna, Reston, Sterling

**Maryland**: Bethesda, Rockville, Silver Spring, Takoma Park, College Park, Hyattsville

### Visual Elements
- **Community Groups**: Green markers and circles
- **Affinity Groups**: Purple markers and circles
- **Marker Clustering**: Automatic grouping of nearby markers
- **Popup Details**: Group information with meeting details
- **Filter Controls**: Toggle between group types

## 📈 Gap Analysis

The gap analysis section identifies areas for potential group expansion based on:

- **Population Density**: Areas with significant population but few groups
- **Geographic Coverage**: Distance from existing groups
- **Demographic Analysis**: Community composition and needs
- **Growth Opportunities**: High-need vs. medium-need classification

## 🎨 Brand Guidelines

### Typography
- **Headlines**: Rubik Mono One (modern, distinctive)
- **Body Text**: Raleway (clean, friendly)
- **Hierarchy**: Following Table Church brand standards

### Colors
- **Pure White**: `#FFFFFF` - Primary background
- **Soft Gray**: `#D1D5DB` - Secondary elements
- **Fresh Green**: `#86EFAC` - Community groups, buttons
- **Deep Purple**: `#5B21B6` - Affinity groups, headlines
- **Charcoal**: `#374151` - Body text, grounding

### Map Styling
- **Minimalist Approach**: Clean, uncluttered interface
- **High Contrast**: Accessible color combinations
- **Modern Icons**: Custom markers with brand colors
- **Smooth Interactions**: Subtle animations and transitions

## 🔍 Troubleshooting

### Map Not Loading?
1. Check browser console for JavaScript errors
2. Verify internet connection for tile loading
3. Ensure Leaflet.js libraries are loading correctly

### No Groups Displaying?
1. Check Planning Center API credentials in Netlify environment variables
2. Verify groups have location information in Planning Center
3. Check browser Network tab for API call failures
4. Review Netlify function logs for server-side errors

### Groups in Wrong Locations?
1. Review location data in Planning Center
2. Check geocoding logic in `planning-center-api.js`
3. Update location mappings for new neighborhoods
4. Verify coordinate format (latitude, longitude)

## 🚀 Deployment

### Netlify Setup
1. **Connect Repository**: Link GitHub repo to Netlify
2. **Build Settings**: No build command needed (static site)
3. **Environment Variables**: Add Planning Center credentials
4. **Deploy**: Automatic deployment on git push

### Custom Domain (Optional)
1. Add custom domain in Netlify dashboard
2. Configure DNS records with domain provider
3. Enable HTTPS (automatic with Netlify)

## 🔄 Maintenance

### Weekly
- [ ] Verify group data is updating from Planning Center
- [ ] Check for any console errors on live site
- [ ] Monitor Netlify function execution logs

### Monthly
- [ ] Review group categorization accuracy
- [ ] Update gap analysis based on new groups
- [ ] Check geocoding for any new locations
- [ ] Review API usage and rate limits

### As Needed
- [ ] Add new DMV neighborhoods to geocoder
- [ ] Update group type detection keywords
- [ ] Enhance gap analysis criteria
- [ ] Add new map features or improvements

## 📚 API Documentation

### Planning Center Groups API
- **Base URL**: `https://api.planningcenteronline.com/groups/v2/`
- **Authentication**: Basic auth with Client ID and Secret
- **Rate Limits**: 100 requests per minute
- **Documentation**: [Planning Center API Docs](https://developer.planning.center/docs/#/apps/groups)

### Leaflet.js
- **Documentation**: [Leaflet Docs](https://leafletjs.com/reference.html)
- **Plugins Used**: 
  - `leaflet.markercluster` - Marker clustering
  - Custom marker styling and popups

## 🆘 Emergency Contacts

### Technical Issues
- **Repository**: https://github.com/parrottly/table-community-map
- **Netlify Dashboard**: [Your Netlify site URL]
- **Planning Center Admin**: [Your Planning Center account]

### Quick Fixes
- **Map Not Loading**: Check Netlify function logs
- **No Group Data**: Verify Planning Center API credentials
- **Outdated Information**: Check Planning Center data accuracy

---

## 🚀 Generated with Claude Code

This community groups map was built with assistance from Claude Code, ensuring best practices for security, accessibility, and maintainability.

**Co-Authored-By:** Claude <noreply@anthropic.com>

---

*Last Updated: July 2025*