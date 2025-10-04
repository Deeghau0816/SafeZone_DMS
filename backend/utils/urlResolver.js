const axios = require('axios');

/**
 * Resolves Google Maps short links to get the full URL with coordinates
 * @param {string} shortUrl - The short URL to resolve
 * @returns {Promise<Object>} - Object containing resolved URL and coordinates
 */
async function resolveGoogleMapsShortLink(shortUrl) {
  try {
    // Make a GET request to follow redirects and get the final URL
    const response = await axios.get(shortUrl, {
      maxRedirects: 5,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Extract the final URL from the response
    const finalUrl = response.request.res.responseUrl || response.config.url;
    
    if (!finalUrl) {
      throw new Error('Could not resolve short link');
    }

    // Parse coordinates from the resolved URL
    const coords = extractCoordinatesFromUrl(finalUrl);
    
    if (!coords) {
      throw new Error('Could not extract coordinates from resolved URL');
    }

    return {
      resolvedUrl: finalUrl,
      coordinates: coords
    };
  } catch (error) {
    console.error('Error resolving short link:', error.message);
    throw new Error(`Failed to resolve short link: ${error.message}`);
  }
}

/**
 * Extracts coordinates from various Google Maps URL formats
 * @param {string} url - The Google Maps URL
 * @returns {Object|null} - Object with latitude and longitude, or null if not found
 */
function extractCoordinatesFromUrl(url) {
  try {
    let lat, lng;
    
    // Format 1: https://www.google.com/maps/@lat,lng,zoom
    const coordMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (coordMatch) {
      lat = parseFloat(coordMatch[1]);
      lng = parseFloat(coordMatch[2]);
    }
    
    // Format 2: https://www.google.com/maps/place/name/@lat,lng,zoom
    if (!lat || !lng) {
      const placeMatch = url.match(/place\/[^/]*\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (placeMatch) {
        lat = parseFloat(placeMatch[1]);
        lng = parseFloat(placeMatch[2]);
      }
    }
    
    // Format 3: https://maps.google.com/maps?q=lat,lng
    if (!lat || !lng) {
      const queryMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (queryMatch) {
        lat = parseFloat(queryMatch[1]);
        lng = parseFloat(queryMatch[2]);
      }
    }
    
    // Format 4: https://www.google.com/maps/search/query/@lat,lng,zoom
    if (!lat || !lng) {
      const searchMatch = url.match(/search\/[^/]*\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (searchMatch) {
        lat = parseFloat(searchMatch[1]);
        lng = parseFloat(searchMatch[2]);
      }
    }
    
    // Format 5: https://www.google.com/maps/place/lat,lng/... (new format from short links)
    if (!lat || !lng) {
      const placeMatch = url.match(/place\/(\d+\.?\d*),(\d+\.?\d*)/);
      if (placeMatch) {
        lat = parseFloat(placeMatch[1]);
        lng = parseFloat(placeMatch[2]);
      }
    }
    
    // Validate coordinates
    if (lat && lng && 
        lat >= -90 && lat <= 90 && 
        lng >= -180 && lng <= 180 &&
        !isNaN(lat) && !isNaN(lng)) {
      return { latitude: lat, longitude: lng };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting coordinates:', error);
    return null;
  }
}

module.exports = {
  resolveGoogleMapsShortLink,
  extractCoordinatesFromUrl
};
