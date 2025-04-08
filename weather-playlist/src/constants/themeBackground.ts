import { WeatherTheme } from "../utils/getWeatherTheme";

export const THEME_BACKGROUNDS: Record<WeatherTheme, string> = {
    sunny: "bg-gradient-to-br from-yellow-300 to-orange-400",
    cloudy: "bg-gradient-to-br from-gray-300 to-gray-500",
    foggy: "bg-gradient-to-br from-gray-200 to-blue-gray-300",
    rainy: "bg-gradient-to-br from-blue-400 to-indigo-600",
    stormy: "bg-gradient-to-br from-indigo-800 to-gray-900",
    snowy: "bg-gradient-to-br from-white to-blue-100",
    default: "bg-gradient-to-br from-neutral-200 to-neutral-400",
};