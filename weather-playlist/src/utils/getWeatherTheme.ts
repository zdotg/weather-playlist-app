export type WeatherTheme =
  | 'sunny'
  | 'cloudy'
  | 'foggy'
  | 'rainy'
  | 'stormy'
  | 'snowy'
  | 'default';
  
export function getWeatherTheme(code: number): WeatherTheme {
    if (code === 0) return 'sunny';
    if ([1, 2, 3].includes(code)) return 'cloudy';
    if ([45, 48].includes(code)) return 'foggy';
    if ([51, 55, 61, 63, 65, 80].includes(code)) return 'rainy';
    if ([81, 95].includes(code)) return 'stormy';
    if ([71, 73, 75].includes(code)) return 'snowy';

    return 'default';
}