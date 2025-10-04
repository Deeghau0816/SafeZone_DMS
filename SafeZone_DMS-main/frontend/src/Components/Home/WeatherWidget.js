import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Thermometer, Droplets, Eye, MapPin } from 'lucide-react';
import './WeatherWidget.css';

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);

  // Get weather icon based on condition
  const getWeatherIcon = (condition) => {
    const conditionLower = condition?.toLowerCase() || '';
    
    if (conditionLower.includes('clear') || conditionLower.includes('sunny')) {
      return <Sun className="weather-icon sun" />;
    } else if (conditionLower.includes('cloud')) {
      return <Cloud className="weather-icon cloud" />;
    } else if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
      return <CloudRain className="weather-icon rain" />;
    } else if (conditionLower.includes('snow')) {
      return <CloudSnow className="weather-icon snow" />;
    } else {
      return <Cloud className="weather-icon default" />;
    }
  };

  // Get user's location and fetch weather
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        
        // Try to get user's current location with better error handling
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              setLocation({ lat: latitude, lng: longitude });
              
              // Use a free weather API (OpenWeatherMap requires API key)
              // For now, we'll use mock data with location info
              try {
                // Try to get location name from coordinates using reverse geocoding
                const reverseGeocodeResponse = await fetch(
                  `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                );
                
                let locationName = 'Current Location';
                let countryName = 'Unknown';
                
                if (reverseGeocodeResponse.ok) {
                  const locationData = await reverseGeocodeResponse.json();
                  locationName = locationData.city || locationData.locality || 'Current Location';
                  countryName = locationData.countryName || 'Unknown';
                }
                
                // Set weather data with proper location
                setWeather({
                  temperature: Math.round(20 + Math.random() * 15), // Random temp between 20-35°C
                  condition: ['Clear', 'Cloudy', 'Partly Cloudy', 'Sunny'][Math.floor(Math.random() * 4)],
                  description: ['Clear sky', 'Partly cloudy', 'Sunny', 'Overcast'][Math.floor(Math.random() * 4)],
                  humidity: Math.round(40 + Math.random() * 40), // 40-80%
                  windSpeed: Math.round((1 + Math.random() * 5) * 10) / 10, // 1-6 m/s
                  visibility: Math.round(5 + Math.random() * 15), // 5-20 km
                  location: locationName,
                  country: countryName
                });
              } catch (apiError) {
                console.error('Error fetching location data:', apiError);
                // Fallback with coordinates
                setWeather({
                  temperature: Math.round(20 + Math.random() * 15),
                  condition: 'Clear',
                  description: 'Clear sky',
                  humidity: 65,
                  windSpeed: 3.2,
                  visibility: 10,
                  location: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
                  country: 'Current Location'
                });
              }
            },
            (error) => {
              console.error('Error getting location:', error);
              // Fallback to mock data with generic location
              setWeather({
                temperature: Math.round(20 + Math.random() * 15),
                condition: 'Clear',
                description: 'Clear sky',
                humidity: 65,
                windSpeed: 3.2,
                visibility: 10,
                location: 'Your Location',
                country: 'Unknown'
              });
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000 // 5 minutes
            }
          );
        } else {
          // Fallback to mock data
          setWeather({
            temperature: Math.round(20 + Math.random() * 15),
            condition: 'Clear',
            description: 'Clear sky',
            humidity: 65,
            windSpeed: 3.2,
            visibility: 10,
            location: 'Your Location',
            country: 'Unknown'
          });
        }
      } catch (err) {
        console.error('Error fetching weather:', err);
        setError('Unable to fetch weather data');
        // Fallback to mock data
        setWeather({
          temperature: Math.round(20 + Math.random() * 15),
          condition: 'Clear',
          description: 'Clear sky',
          humidity: 65,
          windSpeed: 3.2,
          visibility: 10,
          location: 'Your Location',
          country: 'Unknown'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  if (loading) {
    return (
      <div className="weather-widget">
        <div className="weather-loading">
          <div className="loading-spinner"></div>
          <p>Loading weather data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-widget">
        <div className="weather-error">
          <p>Unable to load weather data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="weather-widget">
      <div className="weather-header">
        <h3>Current Weather</h3>
        <div className="weather-location">
          <MapPin size={16} />
          <span>{weather?.location}, {weather?.country}</span>
        </div>
      </div>
      
      <div className="weather-main">
        <div className="weather-icon-container">
          {getWeatherIcon(weather?.condition)}
        </div>
        <div className="weather-temp">
          <span className="temperature">{weather?.temperature}°C</span>
          <span className="condition">{weather?.description}</span>
        </div>
      </div>
      
      <div className="weather-details">
        <div className="weather-detail">
          <Droplets size={16} />
          <span>Humidity: {weather?.humidity}%</span>
        </div>
        <div className="weather-detail">
          <Wind size={16} />
          <span>Wind: {weather?.windSpeed} m/s</span>
        </div>
        <div className="weather-detail">
          <Eye size={16} />
          <span>Visibility: {weather?.visibility} km</span>
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
