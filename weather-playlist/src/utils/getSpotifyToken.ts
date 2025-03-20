const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const SPOTIFY_REDIRECT_URI = "http://localhost:5175/"; // Change this in production

export const getSpotifyToken = () => {
  const scopes = [
    "streaming", 
    "user-read-email", 
    "user-read-private", 
    "user-modify-playback-state", 
    "user-read-playback-state", 
    "user-read-currently-playing"
  ].join(" "); // Use space between scopes

  const authUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}`;

  console.log("Spotify Auth URL:",authUrl); // Log the URL for debugging purposes
  window.location.href = authUrl; // Redirect user to Spotify login
};
