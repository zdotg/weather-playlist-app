export type WeatherTheme =
  | 'sunny'
  | 'cloudy'
  | 'foggy'
  | 'rainy'
  | 'stormy'
  | 'snowy'
  | 'default';
  
// utils/getWeatherTheme.ts
export const getWeatherTheme = (code: number): string => {
  if ([0].includes(code)) return "sunny";
  if ([1, 2].includes(code)) return "partly-cloudy";
  if ([3].includes(code)) return "cloudy";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 55, 61, 63, 80].includes(code)) return "rain";
  if ([65, 81, 95].includes(code)) return "storm";
  if ([71, 73, 75].includes(code)) return "snow";
  return "default";
};
