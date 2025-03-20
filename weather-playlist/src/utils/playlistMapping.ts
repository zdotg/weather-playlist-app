//A mapping of waether codes to Spotify playlist IDs

export const WEATHER_PLAYLISTS: Record<number, string> = {
  0: "6MWC5kNNDoKJJJx5HlpNjF", // Sunny Day
  1: "3dGQU3goyFRmETtgxLax4Vx", // Chill & Groove (partly cloudy)
  2: "3dGQU3goyFRmETtgxLax4Vx", // Chill & Groove (partly cloudy)
  3: "3dGQU3goyFRmETtgxLax4V", // Lo-Fi Chill (cloudy)
  45: "3dGQU3goyFRmETtgxLax4V", // Foggy/Misty Ambience
  51: "41RUHgoROnaeyXk65cbRFI", // Rainy Day 
  61: "41RUHgoROnaeyXk65cbRFI", // Rainy Mood
  71: "5Mc3DhxT4i5ma3xNWhzITr", // Winter
  80: "41RUHgoROnaeyXk65cbRFI", // Light Showers 
  95: "41RUHgoROnaeyXk65cbRFI", // Stormy Nights 
};

//Default playlist in case no matching weather code is found
export const DEFAULT_PLAYLIST_ID = "37i9dQZF1DX0h0QnLkMBl4";// summer 