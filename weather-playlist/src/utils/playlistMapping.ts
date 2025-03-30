//A mapping of waether codes to Spotify playlist IDs

export const WEATHER_PLAYLISTS: Record<number, string> = {
  0: "6MWC5kNNDoKJJJx5HlpNjF", // ☀️ Sunny Day – Bright & Uplifting
  1: "7AzwBpqBRHYPDB7D8jrgYv", // 🌤️ Partly Cloudy – Chill & Groove
  2: "3dGQU3goyFRmETtgxLax4V", // 🌥️ Mostly Cloudy – Chill & Groove
  3: "5HB4o8ybCxmfRRPHndLIan", // ☁️ Overcast – Lo-Fi Chill
  45: "5yOLvUuGkBXBF3TR4LQIDf", // 🌫️ Fog/Mist – Ambient Focus or Cinematic Mood
  48: "5yOLvUuGkBXBF3TR4LQIDf", // 🌁 Dense Fog – Ambient
  51: "6WIoL84XdrOUbkRh22utBB", // 🌧️ Moderate Rain – Rainy Mood
  55: "41RUHgoROnaeyXk65cbRFI", // 🌧️ Heavy Rain – Rainy Mood
  61: "41RUHgoROnaeyXk65cbRFI", // 🌧️ Light Showers
  63: "41RUHgoROnaeyXk65cbRFI", // 🌧️ Moderate Showers
  65: "2OkXJY6fGe0QhOJ4yRFMxe", // ⛈️ Heavy Showers – Melancholy Indie / Introspective
  71: "5Mc3DhxT4i5ma3xNWhzITr", // ❄️ Light Snow – Winter Calm
  73: "5Mc3DhxT4i5ma3xNWhzITr", // ❄️ Moderate Snow – Cozy Vibes
  75: "0seT2Uu67LE9Tk1JrJ7D69", // ❄️ Heavy Snow – Winter Hibernation
  80: "41RUHgoROnaeyXk65cbRFI", // 🌧️ Rain Showers – Rainy Chill
  81: "2zZ3P8PlhgJwmlZawLOjVL", // ⛈️ Thunder Showers – Moody Indie
  95: "59ZYAP4IaizWIk5SOt2RFx", // ⛈️ Storm – Electric & Reflective
};

//Default playlist in case no matching weather code is found
export const DEFAULT_PLAYLIST_ID = "3hbaBCUUEU0kQzN8PFYX9D";// Default weather mix