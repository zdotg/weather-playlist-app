import { useState, useEffect, useCallback, useRef } from "react";
import { getSpotifyToken } from "./utils/getSpotifyToken";
import { WEATHER_PLAYLISTS, DEFAULT_PLAYLIST_ID } from "./utils/playlistMapping";
import { getFriendlyErrorMessage } from "./utils/getFriendlyErrorMessage";
import LoadingIndicator from "./components/LoadingIndicator";
import ErrorMessage from "./components/ErrorMessage";
import NowPlaying from "./components/NowPlaying";
import { getWeatherTheme } from "./utils/getWeatherTheme";
import './App.css';
import { motion, AnimatePresence } from "framer-motion";

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
  
  //Toggle Controls
  const [showControls, setShowControls] = useState<boolean>(false);

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

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const [hasLoadedPlaylist, setHasLoadedPlaylist] = useState<boolean>(false);

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
      script.src = "https://sdk.scdn.co/spotify-player.js"; 
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

    setHasLoadedPlaylist(true);
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
      setShowControls(false);
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

    const text = await response.text();
    if (!text) {
      console.warn("⚠️ No content in currently playing response");
      setCurrentTrack(null);
      setTrackDuration(0);
      setTrackProgress(0);
      return;
    }

    const data = JSON.parse(text);


    const name = data.item?.name;
    const artist = data.item?.artists?.[0]?.name;
    const duration = data.item?.duration_ms;
    const progress = data.progress_ms;
    const id = data.item?.id;
    const albumArt = data.item?.album?.images?.[0]?.url || ""; // add fallback
    // const album = data.item?.album?.name;

    if (name && artist) {

      setCurrentTrack({
        name,
        artist,
        albumArt,
        id,
      });

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

  // Save current track function
  const saveCurrentTrack = async () => {
  if (!spotifyToken || !currentTrack) {
    setError("No track to save.");
    return;
  }

  try {
    const response = await fetch("https://api.spotify.com/v1/me/tracks", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${spotifyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ids: [currentTrack.id], // we need to add this to the TrackInfo type!
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save track to library.");

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess)
    }

    console.log("✅ Track saved to your Liked Songs!");
  } catch (err) {
    console.error("❌ Error saving track:", err);
    setError("Could not save track.");
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
    backgroundImage: `url(${backgroundImageMap[theme] || backgroundImageMap["default"]})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };
  
  const panelVariants = {
    hidden: { opacity: 0, x: -300 },
    show: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
        staggerChildren: 0.1,
      },
    },
    exit: { opacity: 0, x: -300 },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
  <>
    {/* Removed Overlay */}
    <div className="absolute inset-0 z-0" />

    {/* Main App Container — Positioned over full-screen background */}
    <div
      style={backgroundStyle}
      className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8 overflow-x-hidden overflow-y-auto sm:px-6 lg:px-12 text-white"
    >
      {/* Floating Burger Icon */}
     <motion.button
        layoutId="titleBurger"
        onClick={() => setShowControls(!showControls)}
        className="fixed top-4 left-4 z-50 bg-white text-gray-800 p-2 rounded-full shadow-lg hover:bg-gray-100 transition"
        aria-label="Toggle Controls"
      >
        ☰
      </motion.button>

      <AnimatePresence>
        {(showControls || !hasLoadedPlaylist) && (
          <>
            {/* Overlay */}
            <motion.div
              key="overlay"
              className="fixed inset-0 bg-black/5 z-40"
              onClick={() => setShowControls(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Slide-In Controls Panel */}
            <motion.div
              key="controls"
              variants={panelVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="fixed z-50 bg-white text-black shadow-lg p-6 space-y-4 
                w-full sm:w-72 
                h-[40vh] sm:h-full 
                bottom-0 sm:top-0 
                left-0 sm:left-0 
                rounded-t-2xl sm:rounded-none"
            >
              {/* Drag Handle for mobile */}
              <div className="w-12 h-1 bg-gray-400 rounded-full mx-auto my-2 sm:hidden" />

              {/* Title and Close */}
              <motion.div variants={itemVariants} className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Controls</h2>
                <button
                  onClick={() => setShowControls(false)}
                  className="text-xl text-gray-500 hover:text-black"
                  aria-label="Close Menu"
                >
                  x
                </button>
              </motion.div>

              {/* City Input */}
              <motion.input
                variants={itemVariants}
                type="text"
                placeholder="Enter city name"
                className="w-full bg-white/10 placeholder-gray border border-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />

              {/* Weather Dropdown */}
              <motion.select
                variants={itemVariants}
                className="w-full bg-white/10 text-gray border border-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
              </motion.select>

              {/* Fetch Playlist Button */}
              <motion.button
                variants={itemVariants}
                className="w-full bg-black/70 text-white px-4 py-3 my-2 rounded-md border border-white hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-white transition"
                onClick={fetchWeather}
                disabled={!spotifyToken}
              >
                {spotifyToken
                  ? loading
                    ? "Fetching..."
                    : playlist
                    ? "Playlist Ready"
                    : "Get Playlist"
                  : "Loading Spotify..."}
              </motion.button>
            </motion.div>

          </>
        )}
      </AnimatePresence>


      {/* Title Section */}
     <AnimatePresence>
        {!hasLoadedPlaylist && (
          <motion.h1
            key="title"
            layoutId="titleBurger"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="font-heading text-3xl sm:text-4xl lg:text-5xl font-light italic text-white text-center px-6 py-3 mb-6 bg-black/30 backdrop-blur-sm rounded-xl tracking-tight"
          >
            wmx weather mix
          </motion.h1>
        )}
      </AnimatePresence>

      


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
            imageUrl={currentTrack?.albumArt ?? playlist.images[0].url} // fallback to playlist art
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
          {/* Save track button */}
          <button
            onClick={saveCurrentTrack}
            className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition "
          >
            Save to Liked Songs
          </button>
          {saveSuccess && (
            <p className="mt-1 text-sm text-green-300">Track saved to liked songs</p>
          )}
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
    </div>
  </>
);

}

export default App;