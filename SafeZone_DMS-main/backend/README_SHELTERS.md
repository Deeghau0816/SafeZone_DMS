# Emergency Shelter System

This document describes the emergency shelter functionality added to the disaster management system.

## Features

### Backend (Node.js/Express)
- **Shelter Model**: MongoDB schema with geospatial indexing
- **Shelter Controller**: CRUD operations for shelters
- **API Endpoints**: RESTful API for shelter management
- **Geospatial Queries**: Find nearby shelters based on location

### Frontend (React/Mapbox)
- **Shelter Markers**: Green home icons on the map
- **User Location**: Blue location marker for current position
- **Nearest Shelter**: Automatic calculation of closest shelter
- **Directions**: Mapbox Directions API integration for evacuation routes
- **Interactive Popups**: Shelter details with contact information

## API Endpoints

### Get All Shelters
```
GET /api/shelters
Query Parameters:
- page: Page number (default: 1)
- limit: Items per page (default: 10)
- sortBy: Sort field (default: 'createdAt')
- sortOrder: Sort order 'asc' or 'desc' (default: 'desc')
```

### Get Nearby Shelters
```
GET /api/shelters/nearby
Query Parameters:
- latitude: User latitude (required)
- longitude: User longitude (required)
- radius: Search radius in meters (default: 10000)
```

### Get Shelter by ID
```
GET /api/shelters/:id
```

### Create Shelter
```
POST /api/shelters
Body:
{
  "name": "Shelter Name",
  "description": "Shelter description",
  "latitude": 6.9271,
  "longitude": 79.8612,
  "capacity": 500,
  "facilities": ["Medical", "Food", "Water"],
  "contact": {
    "phone": "011-2345678",
    "email": "shelter@example.com"
  }
```

### Update Shelter
```
PUT /api/shelters/:id
Body: Same as create
```

### Delete Shelter
```
DELETE /api/shelters/:id
```

### Search Shelters
```
GET /api/shelters/search
Query Parameters:
- query: Search term (required)
- page: Page number (default: 1)
- limit: Items per page (default: 10)
```

## Shelter Schema

```javascript
{
  name: String (required, max 100 chars),
  description: String (required, max 500 chars),
  latitude: Number (required, -90 to 90),
  longitude: Number (required, -180 to 180),
  capacity: Number (default: 0, min: 0),
  facilities: [String],
  contact: {
    phone: String,
    email: String
  },
  isActive: Boolean (default: true),
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Frontend Features

### Shelter Controls Panel
- **Location**: Top-right corner of the map
- **Nearest Shelter**: Shows closest shelter with distance
- **Get Directions**: Button to calculate route to nearest shelter
- **Show/Hide Routes**: Toggle for displaying evacuation routes

### Shelter Markers
- **Color**: Green home icons
- **Click**: Opens popup with shelter details
- **Details**: Name, description, capacity, facilities, contact info

### Directions
- **Route Display**: Blue line showing evacuation route
- **Mapbox Integration**: Uses Mapbox Directions API
- **Real-time**: Calculates route from user location to nearest shelter

## Setup Instructions

### 1. Add Sample Data
```bash
cd backend
node scripts/addSampleShelters.js
```

### 2. Start Backend
```bash
cd backend
npm start
```

### 3. Start Frontend
```bash
cd frontend
npm start
```

### 4. Access the Map
- Open http://localhost:3000
- Navigate to the map component
- Allow location access when prompted
- View shelters and get directions

## Usage

1. **View Shelters**: Green home icons show all available shelters
2. **Find Nearest**: The control panel shows the closest shelter automatically
3. **Get Directions**: Click "Get Directions" to see the evacuation route
4. **Shelter Details**: Click on shelter markers to see detailed information
5. **Toggle Routes**: Use the "Show All Routes" button to display/hide directions

## Technical Details

### Distance Calculation
- Uses Haversine formula for accurate distance calculation
- Calculates distance in kilometers
- Updates automatically when user location changes

### Mapbox Integration
- Uses Mapbox GL JS for map rendering
- Integrates with Mapbox Directions API
- Requires valid Mapbox access token

### Geospatial Queries
- MongoDB 2dsphere index for efficient location queries
- Supports radius-based searches
- Optimized for real-time location updates

## Error Handling

- **Invalid Coordinates**: Filters out shelters with invalid lat/lng
- **API Failures**: Graceful fallback when API calls fail
- **Location Access**: Handles cases where user denies location access
- **Network Issues**: Retry logic for failed requests

## Future Enhancements

- **Real-time Updates**: WebSocket integration for live shelter status
- **Capacity Tracking**: Real-time occupancy monitoring
- **Multiple Routes**: Support for alternative evacuation paths
- **Offline Support**: Cached shelter data for offline access
- **Push Notifications**: Emergency alerts for nearby disasters
