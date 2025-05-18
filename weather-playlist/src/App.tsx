import { useState, useEffect, useCallback, useRef } from "react";
import { getSpotifyToken } from "./utils/getSpotifyToken";
import { WEATHER_PLAYLISTS, DEFAULT_PLAYLIST_ID } from "./utils/playlistMapping";
import { getFriendlyErrorMessage } from "./utils/getFriendlyErrorMessage";
import LoadingIndicator from "./components/LoadingIndicator";
import ErrorMessage from "./components/ErrorMessage";
import NowPlaying from "./components/NowPlaying";
import { getWeatherTheme } from "./utils/getWeatherTheme";
import './App.css';

// ✅ Imported shared types
import { WeatherData, Playlist, TrackInfo } from "./types/types";

const App: React.FC = () => {
  // UI and state management
  const [location, setLocation] = useState<string>("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);

  //Progress Bar
  const [trackProgress, setTrackProgress] = useState<number>(0); //ms
  const [trackDuration, setTrackDuration] = useState<number>(0); //ms
  const progressIntervalRef = useRef<number | undefined>(undefined); 

  // App status
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  //Spotify Integration
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Additional features
  const [manualWeatherCode, setManualWeatherCode] = useState<number | null>(null);
  const [useFahrenheit, setUseFahrenheit] = useState<boolean>(false);

  const [currentTrack, setCurrentTrack] = useState<TrackInfo | null>(null);

  const playerRef = useRef<Spotify.Player | null>(null);

  const formatTemperature = (celsius:number): string => {
    return useFahrenheit 
      ? `${((celsius * 9) / 5 + 32).toFixed(1)}°F`
      : `${celsius.toFixed(1)}°C`;
  };

  

  // On initial mount, load Spotify Web Playback SDK script
  useEffect(() => {
    // Only add script if it's not already present
    if (!window.Spotify) {
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js"; // ✅ Use .co, not .com
      script.async = true;
      script.onload = () => {
        console.log("🎵 Spotify SDK Loaded!");
      };
      document.body.appendChild(script);
    }
    
    // Initialize player once SDK is ready
    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log("🎵 Spotify SDK Ready!");
  
      if (!playerRef.current) {
        console.log("Initializing new Spotify Player...");
  
        const playerInstance = new window.Spotify.Player({
          name: "Weather Playlist Player",
          getOAuthToken: (cb) => {
            if (spotifyToken) {
              cb(spotifyToken);
            }
          },
          volume: 0.5,
        });
  
        playerRef.current = playerInstance;
  
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
      }
    };
  }, [spotifyToken]); // Only re-run if token changes (re-auth flow)
      
  // Fetch and set Spotify token on mount
 useEffect(() => {
    // Try to extract token from URL hash (Spotify OAuth redirect)
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', '?'));
    const tokenFromUrl = new URLSearchParams(hash.replace("#", "?")).get("access_token");
    const expiresIn = params.get("expires_in");
    const storedToken = localStorage.getItem("spotify_token");
    const storedExpiration = localStorage.getItem("spotify_token_expires_at");
 
    // If to exists in URL, store it with an expiration timestamp
    if (tokenFromUrl && expiresIn) {
      const expirationTime = Date.now() + Number(expiresIn) * 1000;
      setSpotifyToken(tokenFromUrl);
      localStorage.setItem("spotify_token", tokenFromUrl);
      localStorage.setItem("spotify_token_expires_at", expirationTime.toString());
      window.location.hash=""; //clean up url
    } else if (storedToken && storedExpiration) {
      // Otherwise, use stored token if it's still valid (within 5 minutes)
      const now = Date.now();
      const expiresAt = parseInt(storedExpiration, 10);

      if (now < expiresAt){
        setSpotifyToken(storedToken);
      } else {
        //re-authenticate automatically
        getSpotifyToken();
      }
    }
 }, []);

// Fetch weather data usin Open-Meteo  geocoding and weather APIs
  const fetchWeather = async (): Promise<void> => {
    if (!location.trim()) {
      setError("Please enter a valid city name.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Convert city name to coordinates using Open-Meteo's geocoding API
      const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`);
      if (!geoResponse.ok) throw new Error("Failed to fetch weather location data.");
      const geoData = await geoResponse.json();

      const place = geoData.results?.[0];
      if(!place) throw new Error("City not found");

      const { latitude, longitude, name, country } = place;
      console.log(`Location found: ${name}, ${country}, [${latitude}, ${longitude}]`);

      // Step 2: Use lat/lon to fetch current weather
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
      );
      if(!weatherResponse.ok) throw new Error("Failed to fetch weather data.");
      const weatherData: WeatherData = await weatherResponse.json();
      // Store weather data in state
      setWeather(weatherData);
    } catch (error) {
      setError(getFriendlyErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };


  // Fetch Spotify playlist based on current weather code
  const fetchPlaylist = useCallback(async () => {
    if (!spotifyToken || !weather) {
        setError("Spotify token or weather data is missing! Please login or try again.");
        return;
    }
    // Determine correct playlist based on weather code mapping
    const weatherCode = manualWeatherCode ?? weather.current_weather.weathercode;
    console.log(`Weather Code: ${weatherCode}`);
    const playlistId = WEATHER_PLAYLISTS[weatherCode] || DEFAULT_PLAYLIST_ID;
    console.log(`Playlist ID: ${playlistId}`);

    if (typeof playlistId !== "string") {
        console.error("Invalid playlist ID:", playlistId);
        setError("Somethingwent wrong loading the playlist. Try refreshing.");
        return;
    }
    // Playlist fallback for invalid IDs
    if (!playlistId || typeof playlistId !== "string" || playlistId.length < 10) {
      console.error("❌ Invalid playlist ID for weather code:", weatherCode);
      setError("Something went wrong with the playlist mapping.");
      return;
    }

    console.log(`Using playlist with ID: ${playlistId}`);

    setLoading(true);
    setError(null);

    try {
      // Request playlist metadata from backend
        const response = await fetch(`http://localhost:5000/spotify/playlist/${playlistId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${spotifyToken}`, // ✅ Make sure this is sent
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch playlist. Status: ${response.status}`);
        }

        const data: Playlist = await response.json();
        setPlaylist(data);
        console.log("✅ Spotify Playlist:", data);
        console.debug("✅ Spotify Playlist fetched:", data.name);
    } catch (error) {
      console.error("❌ Error fetching playlist:", error);
      setError(getFriendlyErrorMessage(error));
    } finally {
      setLoading(false);
    }
}, [spotifyToken, weather, manualWeatherCode]);

const fetchCurrentTrack = async () => {
  try {
    const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: {
        Authorization: `Bearer ${spotifyToken}`,
      },
    });

    if(!response.ok) {
      throw new Error("Failed to fetch currently playing track");
    }

    const data = await response.json();
    const name = data.item?.name;
    const artist = data.item?.artists?.[0]?.name;
    const duration = data.item?.duration_ms;
    const progress = data.progress_ms;
    // const album = data.item?.album?.name;
    // const albumArt = data.item?.album?.images?.[0]?.url;

    if (name && artist) {
      setCurrentTrack({ name, artist });
      setTrackDuration(duration);
      setTrackProgress(progress);
    }
  } catch (err) {
    console.error("❌ Error fetching currently playing track:", err);
    setCurrentTrack(null); //fallback to null if there's an error
    setTrackDuration(0);
    setTrackProgress(0);
  }
};

// Start playback of selected playlist using Web Playback SDK
const playPlaylist = async () => {
  console.debug("🎵 Attempting playback...");

  if (!deviceId || !spotifyToken) {
    setError("Spotify is not ready yet. Please try again later.");
    return;
  }

  if (!playerRef.current) {
    setError("Spotify Player is not initialized yet.");
    return;
  }

  try {
    // Step 1: Set current device as active player
    const deviceResponse = await fetch("https://api.spotify.com/v1/me/player", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${spotifyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: false,
      }),
    });

    if (!deviceResponse.ok) {
      throw new Error(`Failed to set active device: ${deviceResponse.statusText}`);
    }

    // Step 2: Wait for player to be ready
    let attempts = 0;
    let state = null;
    while (attempts < 5) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      state = await playerRef.current.getCurrentState();

      if (state?.track_window?.current_track) {
        console.debug("✅ Web Player is ready with a track loaded!");
        break;
      }

      console.debug(`[Playback] Attempt ${attempts + 1}: waiting for track...`);
      attempts++;
    }

    setInterval(() => {
      playerRef.current?.getCurrentState().then((state) => {
        if(state?.position) {
          setTrackProgress(state.position)
        }
      });
    }, 1000);

    if (!state?.track_window?.current_track) {
      setError("Spotify is not playing a track yet. Try clicking play again.");
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${spotifyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: ["spotify:track:3n3Ppam7vgaVa1iaRUc9Lp"],
        }),
      });
      
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
    }

    const playlistId = playlist?.uri?.split(":")?.pop();

    if (!playlistId || playlistId.length < 10) {
      console.error("❌ Invalid playlist URI:", playlist?.uri);
      setError("Couldn’t start playback. Playlist is invalid.");
      return;
    }
    
    // Step 3: Extract URI and start playback
    const contextUri = `spotify:playlist:${playlistId}`;
    console.debug("🎧 Using context URI:", contextUri);

    // Enable shuffle mode
    await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=true`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${spotifyToken}`,
        "Content-Type": "application/json",
      },
    });
    //  Start Playback
    const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${spotifyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        context_uri: contextUri,
      }),
    });

    if (!playResponse.ok) {
      throw new Error(`Failed to start playback: ${playResponse.statusText}`);
    }

    setIsPlaying(true);
    await fetchCurrentTrack();
    console.debug("✅ Playback started successfully");

  } catch (error) {
    console.error("❌ Error starting playback:", error);
    setError(getFriendlyErrorMessage(error));
  }
  // Clear any existing interval
  if (progressIntervalRef) clearInterval(progressIntervalRef.current);
  
  // Start a new interval
  progressIntervalRef.current = window.setInterval(() => {
    playerRef.current?.getCurrentState().then((state) => {
      if (state?.position) {
        setTrackProgress(state.position);
        setTrackDuration(state.duration);
      }
    });
  }, 1000);
};
  // Pause the playlist
  const pausePlaylist = () => {
    console.log("Attempting to pause...");
    console.log("player:", playerRef.current);

    if (progressIntervalRef.current !== undefined) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = undefined;
    }

    if (!playerRef.current) {
  setError("Spotify Player is not initialized yet.");
  return;
    
}
    playerRef.current.getCurrentState().then(state => {
      console.log("🔹 Player State:", state);
  
      if (!state || !state.track_window?.current_track) {
        setError("No track is currently playing.");
        return;
      }
  
      // Introduce a slight delay before pausing (Spotify API can be slightly delayed)
      setTimeout(() => {
        playerRef.current!.pause().then(() => {
          console.log("✅ Playback Paused!");
          setIsPlaying(false);
          setCurrentTrack(null);
        }).catch(error => {
          console.error("❌ Error pausing:", error);
          setError(getFriendlyErrorMessage(error));
        });
      }, 400); // 400ms delay
    }).catch(error => {
      console.error("❌ Error getting current state:", error);
      setError(getFriendlyErrorMessage(error));
    });
  };

  // Skip to the next track
  const skipToNext = async () => {
    if (!spotifyToken) return;
    try {
      await fetch("https://api.spotify.com/v1/me/player/next", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${spotifyToken}`,
          "Content-Type": "application/json",
        },
      });

      setTimeout(() => {
        fetchCurrentTrack(); // Refresh current track info
      }, 1000); // Wait for 1 second before 

      await fetchCurrentTrack(); // Refresh current track info
      } catch (error) {
        console.error("❌ Error skipping to next track:", error);
        setError(getFriendlyErrorMessage(error));
      }
    };

     const skipToPrevious = async () => {
    if (!spotifyToken) return;
    try {
      await fetch("https://api.spotify.com/v1/me/player/previous", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${spotifyToken}`,
          "Content-Type": "application/json",
        },
      });

       setTimeout(() => {
        fetchCurrentTrack(); // Refresh current track info
      }, 1000); // Wait for 1 second before 
      
      await fetchCurrentTrack(); // Refresh current track info
      } catch (error) {
        console.error("❌ Error skipping to previous track:", error);
        setError(getFriendlyErrorMessage(error));
      }
    };

  


  // Automatically fetch playlist when weather data is available
  useEffect(() => {
    if (weather) {
      fetchPlaylist();
    }
  }, [weather, fetchPlaylist]);

  const backgroundImageMap: Record<string, string> = {
    sunny: "/assets/backgrounds/sunny_weather.jpg",
    "partly-cloudy": "/assets/backgrounds/cloudy_weather.jpg",
    cloudy: "/assets/backgrounds/cloudy_weather.jpg",
    fog: "/assets/backgrounds/fog_weather.jpg",
    rain: "/assets/backgrounds/rainy_weather.jpg",
    storm: "/assets/backgrounds/storm_weather.jpg",
    snow: "/assets/backgrounds/snow_weather.jpg",
    default: "/assets/backgrounds/default_weather.jpg", // fallback
  };
  
  const theme = (manualWeatherCode !== null || weather?.current_weather?.weathercode !== undefined)
    ? getWeatherTheme(manualWeatherCode ?? weather!.current_weather!.weathercode)
    : "default";
  
  const backgroundStyle = {
    backgroundImage: `url(${backgroundImageMap[theme]})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
  
  return (
  <>
    {/* Dark overlay for contrast */}
    <div className="absolute inset-0 bg-black z-0" />

    {/* Main App Container — Positioned over full-screen background */}
    <div
      style={backgroundStyle}
      className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8 overflow-x-hidden overflow-y-auto sm:px-6 lg:px-12 text-white"
    >
      {/* Title Section */}
      <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-light italic text-white text-center px-6 py-3 mb-6 bg-black/30 backdrop-blur-sm rounded-xl tracking-tight">
        wmx weather mix
      </h1>

      {/* City Input + Weather Type Selector */}
      <div className="w-full max-w-xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6">
          {/* City Input */}
          <input
            type="text"
            placeholder="Enter city name"
            className="w-full bg-white/10 text-white placeholder-white border border-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          {/* Prompt if no weather fetched yet */}
          {!weather && !loading && !error && (
            <div className="mt-6 text-center text-white text-lg">
              Enter a city above to get a vibe-matched playlist 🎧
            </div>
          )}

          {/* Fetch Playlist Button */}
          <button
            className="w-full bg-blue-500 text-white px-4 py-3 my-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            onClick={fetchWeather}
            disabled={!spotifyToken}
          >
            {spotifyToken ? (loading ? "Fetching..." : "Get Playlist") : "Loading Spotify..."}
          </button>

          {/* Manual Weather Selection Dropdown */}
          <select
            className="w-full bg-white/10 text-white border border-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={manualWeatherCode ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              setManualWeatherCode(value ? parseInt(value) : null);
            }}
          >
            <option value="">🌦️ Use Live Weather</option>
            <option value="0">☀️ Sunny</option>
            <option value="1">🌤️ Partly Cloudy</option>
            <option value="2">🌥️ Mostly Cloudy</option>
            <option value="3">☁️ Overcast</option>
            <option value="45">🌫️ Fog</option>
            <option value="48">🌁 Dense Fog</option>
            <option value="51">🌧️ Light Rain</option>
            <option value="55">🌧️ Heavy Rain</option>
            <option value="61">🌦️ Light Showers</option>
            <option value="63">🌧️ Moderate Showers</option>
            <option value="65">⛈️ Heavy Showers</option>
            <option value="71">❄️ Light Snow</option>
            <option value="73">❄️ Moderate Snow</option>
            <option value="75">❄️ Heavy Snow</option>
            <option value="80">🌧️ Rain Showers</option>
            <option value="81">⛈️ Thunder Showers</option>
            <option value="95">🌩️ Storm</option>
          </select>
        </div>
      </div>

      {/* Weather Readout + Unit Toggle */}
      <div className="w-full max-w-xl space-y-6 px-4 sm:px-6 lg:px-8">
        {loading && <LoadingIndicator />}
        {error && <ErrorMessage message={error} />}
        {weather && (
          <div className="text-center mt-4 text-white text-lg font-medium">
            <p>
              It’s {formatTemperature(weather.current_weather.temperature)} and{" "}
              {theme === "sunny" ? "sunny ☀️" :
              theme === "cloudy" ? "cloudy ☁️" :
              theme === "rainy" ? "rainy 🌧️" :
              "a unique day 🌤️"}{" "}
              in {location || "your area"}.
            </p>
            <p>Enjoy your weather-based playlist!</p>

            {/* Fahrenheit / Celsius Toggle */}
            <div className='mt-4 flex items-center justify-center gap-3'>
              <span className='text-sm'>{useFahrenheit ? "°F" : "°C"}</span>
              <label className='relative inline-flex items-center cursor-pointer'>
                <input 
                  type='checkbox'
                  className='sr-only peer'
                  checked={useFahrenheit}
                  onChange={() => setUseFahrenheit(!useFahrenheit)}
                />
                <div className='w-11 h-6 bg-gray-300 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500 peer-checked:bg-blue-500 transition-all duration-300'></div>
                <div className='absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-md transform peer-checked:translate-x-full transition-all duration-300'></div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Playlist Player Section */}
      {playlist && (
        <div className="w-full max-w-xl px-4 sm:px-6 lg:px-8 mt-8">
          <NowPlaying
            playlistName={playlist.name}
            imageUrl={playlist.images[0].url} // ✅ replace this with currentTrack.albumArt in the next task
            isPlaying={isPlaying}
            onPlay={playPlaylist}
            onPause={pausePlaylist}
            progress={trackProgress}
            duration={trackDuration}
            onNext={skipToNext}
            onPrevious={skipToPrevious}
          />
        </div>
      )}

      {/* Now Playing Text */}
      {currentTrack && (
        <div className="mt-3 text-center text-white text-sm">
          Now Playing: <strong>{currentTrack.name}</strong> by <em>{currentTrack.artist}</em>
        </div>
      )}

      {/* Error Message Fallback */}
      {error && (
        <div className="mt-4 bg-red-100 text-red-800 p-4 rounded shadow text-center">
          <p className="mb-2">{error}</p>
          <button
            onClick={fetchWeather}
            className="underline text-blue-600 hover:text-blue-800 transition"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Spotify Status — REMOVE before production */}
      <div className="mt-6 text-sm text-gray-600">
        {!spotifyToken ? (
          <button onClick={getSpotifyToken} className="underline text-blue-500 hover:text-blue-700">
            Login with Spotify
          </button>
        ) : (
          <p className="text-xs text-white/50 italic">✅ Logged into Spotify</p>
        )}
      </div>
    </div>
  </>
);

}

export default App;