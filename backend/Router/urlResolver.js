const express = require('express');
const router = express.Router();
const { resolveGoogleMapsShortLink } = require('../utils/urlResolver');

/**
 * POST /api/resolve-url
 * Resolves Google Maps short links to extract coordinates
 */
router.post('/resolve-url', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }

    // Check if it's a short link
    const shortLinkPatterns = [
      /maps\.app\.goo\.gl\//,
      /goo\.gl\/maps\//,
      /maps\.google\.com\/maps\/d\/\w+/
    ];
    
    const isShortLink = shortLinkPatterns.some(pattern => pattern.test(url));
    
    if (!isShortLink) {
      return res.status(400).json({
        success: false,
        message: 'URL is not a recognized Google Maps short link'
      });
    }

    // Resolve the short link
    const result = await resolveGoogleMapsShortLink(url);
    
    res.json({
      success: true,
      data: {
        originalUrl: url,
        resolvedUrl: result.resolvedUrl,
        coordinates: result.coordinates
      }
    });
    
  } catch (error) {
    console.error('Error resolving URL:', error);
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (error.message.includes('timeout')) {
      statusCode = 408; // Request Timeout
    } else if (error.message.includes('Network error')) {
      statusCode = 503; // Service Unavailable
    } else if (error.message.includes('Invalid URL') || error.message.includes('not a recognized')) {
      statusCode = 400; // Bad Request
    }
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to resolve URL',
      error: {
        type: error.name || 'UnknownError',
        code: error.code || 'UNKNOWN_ERROR'
      }
    });
  }
});

module.exports = router;
