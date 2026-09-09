import { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Loader2, MapPin } from 'lucide-react';
import axios from 'axios';

interface WeatherData {
  city: string;
  temperature: number;
  weathercode: number;
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        // Get location from IP
        const locRes = await axios.get('https://ipapi.co/json/');
        const { latitude, longitude, city } = locRes.data;

        // Get weather from Open-Meteo
        const weatherRes = await axios.get(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
        );
        
        setWeather({
          city: city || 'Unknown Location',
          temperature: weatherRes.data.current_weather.temperature,
          weathercode: weatherRes.data.current_weather.weathercode,
        });
      } catch (err) {
        console.error('Failed to fetch weather:', err);
        setError('Weather unavailable');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  const getWeatherIcon = (code: number) => {
    if (code === 0 || code === 1) return <Sun className="w-5 h-5 text-orange-400" />;
    if (code === 2 || code === 3) return <Cloud className="w-5 h-5 text-gray-400" />;
    if (code >= 51 && code <= 67) return <CloudRain className="w-5 h-5 text-blue-400" />;
    if (code >= 71 && code <= 82) return <CloudSnow className="w-5 h-5 text-blue-200" />;
    if (code >= 95) return <CloudLightning className="w-5 h-5 text-purple-400" />;
    return <Cloud className="w-5 h-5 text-gray-400" />;
  };

  const getWeatherDescription = (code: number) => {
    if (code === 0) return 'Clear';
    if (code === 1 || code === 2 || code === 3) return 'Partly Cloudy';
    if (code >= 51 && code <= 67) return 'Rain';
    if (code >= 71 && code <= 82) return 'Snow';
    if (code >= 95) return 'Thunderstorm';
    return 'Cloudy';
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm font-medium">Loading weather...</span>
      </div>
    );
  }

  if (error || !weather) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-300">
        <MapPin className="w-4 h-4" />
        <span className="text-sm font-medium">{weather.city}</span>
      </div>
      <div className="h-4 w-px bg-gray-200 dark:bg-gray-700"></div>
      <div className="flex items-center space-x-1.5" title={getWeatherDescription(weather.weathercode)}>
        {getWeatherIcon(weather.weathercode)}
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {Math.round(weather.temperature)}°C
        </span>
      </div>
    </div>
  );
}
