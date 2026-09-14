import { notFound } from 'next/navigation';
import { getWeather } from '@/app/weather/_services/weatherService';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const cityCapitalized = city.charAt(0).toUpperCase() + city.slice(1);

  return {
    title: `Weather in ${cityCapitalized}`,
    description: `Current weather conditions in ${cityCapitalized}`,
  };
}

export default async function WeatherPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const cityCapitalized = city.charAt(0).toUpperCase() + city.slice(1);

  // Fetch weather data using shared service
  // - Throws Error for 5xx (triggers app/error.tsx)
  // - Returns null for 4xx (city not found)
  // - Special case: city='error500' simulates server error
  const weather = await getWeather(city);

  if (!weather) {
    notFound();
  }

  const iconUrl = weather.weatherIconUrl[0].value;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 space-y-8">
        <h1 className="text-4xl font-bold text-foreground">
          Weather in {cityCapitalized}
        </h1>
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8 min-w-[300px]">
          <div className="text-center">
            <img
              src={iconUrl}
              alt={weather.weatherDesc[0].value}
              width={64}
              height={64}
              loading="lazy"
              className="mx-auto mb-4"
            />
            <div className="text-6xl font-bold text-foreground mb-2">
              {weather.temp_C}°C
            </div>
            <div className="text-xl text-gray-600 dark:text-gray-400">
              {weather.weatherDesc[0].value}
            </div>
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-500">
              Wind: {weather.windspeedKmph} km/h
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
