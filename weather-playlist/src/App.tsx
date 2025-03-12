import { useState, useEffect, useCallback } from "react";
import { getSpotifyToken } from "./utils/getSpotifyToken";

interface WeatherData {
  current_weather: {
    temperature: number;
    weathercode: number;
  };
}

interface Playlist {
  name: string;
  images: { url: string}[];
  external_urls: { spotify: string };
}

const PLAYLIST_ID = "0sBrAwNvNMdJFNoPAimsfA";

const loadSpotifySDK = () => {
  if(!window.Spotify){
    const script = document.createElement("script");
    script.src="https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.onload = () => console.log("Spotify Web Playback SDK Loaded!");
    document.body.appendChild(script);
  }
};

const App: React.FC = () => {
  const [location, setLocation] = useState<string>("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [player, setPlayer] = useState<Spotify.Player |null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);


  // Load Spotify SDK on mount
  useEffect(() => {
    loadSpotifySDK();
  
    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log("Spotify SDK Ready!");
  
      const playerInstance = new window.Spotify.Player({
        name: "Weather Playlist Player",
        getOAuthToken: (cb) => {
          if (spotifyToken) {
            cb(spotifyToken);
          }
        },
        volume: 0.5,
      });
  
      setPlayer(playerInstance);
  
      playerInstance.addListener("ready", ({ device_id }) => {
        console.log("✅ Ready with Device ID:", device_id);
        setDeviceId(device_id);
      });
  
      playerInstance.addListener("not_ready", ({ device_id }) => {
        console.log("❌ Device ID has gone offline:", device_id);
      });
  
      playerInstance.connect().then((success) => {
        if (success) {
          console.log("✅ Spotify Player connected successfully!");
        } else {
          console.log("❌ Spotify Player failed to connect!");
        }
      });
    };
  }, [spotifyToken]);
  
      

  // Fetch and set Spotify token on mount
 useEffect(() => {
    //Extract token from URL if redirected from spotify login
    const hash = window.location.hash;
    const token = new URLSearchParams(hash.replace("#", "?")).get("access_token");
    if (token){
      setSpotifyToken(token);
      window.localStorage.setItem("spotify_token", token); //save for later use
      window.location.hash=""; //clean up url
    }
   
 }, []);


  const fetchWeather = async (): Promise<void> => {
    if (!location.trim()) {
      setError("Please enter a valid city name.");
      return;
    }

    setLoading(true);
    setError(null);

    const apiUrl = 'https://api.open-meteo.com/v1/forecast?latitude=35.994&longitude=-78.8986&current_weather=true';

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Failed to fetch weather data.");
      const data: WeatherData = await response.json();
      setWeather(data); //save the data to state
      console.log("Weather Data:", data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "An unknown error occurre");
    } finally {
      setLoading(false);
    }
  };



  const fetchPlaylist = useCallback(async () => {
    if(!spotifyToken) {
      setError("Spotify token is missing");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`https://api.spotify.com/v1/playlists/${PLAYLIST_ID}`, {
        headers: {
          Authorization: `Bearer ${spotifyToken}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch playlist.");
      const data: Playlist = await response.json();
      setPlaylist(data);
      console.log("Spotify Playlist:", data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [spotifyToken]);

  const playPlaylist = async () => {
    console.log("Attempting to play...");
    console.log("deviceId:", deviceId);
    console.log("spotifyToken:", spotifyToken);

    if (!deviceId || !spotifyToken) {
      setError("Spotify is not ready yet.");
      return;
    }

    if(!player) {
      setError("Spotify Player is not initilaized yet.");
      return;
    }

    player.resume().then(() => {
      console.log("Playbackstarted.");
      setIsPlaying(true);
    }).catch(error => {
      console.error("Error playing:", error);
      setError("Could not start playback.");
    });

    player.activateElement();
  
    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${spotifyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context_uri: `spotify:playlist:${PLAYLIST_ID}`,
        }),
      });

      console.log("Playback started");
      setIsPlaying(true);
    } catch(error) {
      console.error("Error starting playback:", error);
      setError("Could not start playback");
    }
  };

  const pausePlaylist = () => {
    if (!player) {
      setError("Spotify Player is not initianilzed yet.");
      return;
    }

    player.pause().then(() => {
      console.log("Playback Paused");
      setIsPlaying(false);
    }).catch(error => {
      console.error("Error pausing:", error);
      setError("Could not pause playback.")
    });
  };


  // Automatically fetch playlist when weather data is available
  useEffect(() => {
    if (weather) {
      fetchPlaylist();
    }
  }, [weather, fetchPlaylist]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold text-blue-600">Weather-Based Playlist!</h1>

      <input
        type="text"
        placeholder="Enter city name"
        className="border border-gray-300 rounded p-2 mt-4"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        />
  
        <button
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={fetchWeather}
          disabled={!spotifyToken}
          >
           {spotifyToken ? "Get Playlist" : "Loading Spotify..."}
          </button>

          {loading && <p className="text-gray-600 mt-4">Loading...</p>}
          {error && <p className="text-red-500 mt-4">{error}</p>}

          {weather && (
            <div className="mt-4">
              <p>Temperature: {weather.current_weather.temperature}°C</p>
              <p>Weather Code: {weather.current_weather.weathercode}</p>
            </div>
          )}

          {playlist && (
            <div className="mt-4 p-4 border rounded shadow-md bg-white">
              <h2 className="text-xl font-bold">{playlist.name}</h2>
              <img src={playlist.images[0].url} alt={playlist.name} className="w-64 rounded" />
              <button
              onClick={playPlaylist}
              className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                {isPlaying ? "Playing" : "Play"}
              </button>
              <button 
                onClick={pausePlaylist}
                className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Pause
              </button>
            </div>
          )}
          <div>
            {!spotifyToken ? (
              <button onClick={getSpotifyToken}>Login with Spotify</button>
            ) : (
              <p>✅ Logged into Spotify</p>
            )}
          </div>
          
    </div>
  );
}

export default App;