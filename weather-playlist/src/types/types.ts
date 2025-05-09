// Weather API Response
export interface WeatherData {
    current_weather: {
        temperature: number;
        weathercode: number;
    };
}

// Spotify Playlist Metadata
export interface Playlist {
    name: string;
    images: { url: string}[];
    external_urls: { spotify: string};
    uri: string;
}

// Track Info (Current Track Playing)
export interface TrackInfo {
    name: string;
    artist: string;
}

// Wether Theme Options
export type WeatherTheme = "sunny" | "cloudy" | "rainy" | "snowy" | "stormy" | "foggy" | "default";

// Optional: Fetch Error Wrapper
export interface ApiError {
    message: string;
}
