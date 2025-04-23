import { useState, useEffect, useCallback, useRef } from "react";
import { getSpotifyToken } from "./utils/getSpotifyToken";
import { WEATHER_PLAYLISTS, DEFAULT_PLAYLIST_ID } from "./utils/playlistMapping";
import { getFriendlyErrorMessage } from "./utils/getFriendlyErrorMessage";
import LoadingIndicator from "./components/LoadingIndicator";
import ErrorMessage from "./components/ErrorMessage";
import NowPlaying from "./components/NowPlaying";
import { getWeatherTheme } from "./utils/getWeatherTheme";
import { THEME_BACKGROUNDS } from "./constants/themeBackground";

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
  uri: string;
}

const App: React.FC = () => {
  const [location, setLocation] = useState<string>("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [manualWeatherCode, setManualWeatherCode] = useState<number | null>(null);
  const [useFahrenheit, setUseFahrenheit] = useState<boolean>(false);

  const [currentTrack, setCurrentTrack] = useState<{
    name:string;
    artist:string;
  } | null>(null);

  const playerRef = useRef<Spotify.Player | null>(null);

  const formatTemperature = (celsius:number): string => {
    return useFahrenheit 
      ? `${((celsius * 9) / 5 + 32).toFixed(1)}°F`
      : `${celsius.toFixed(1)}°C`;
  };

  

  // Load Spotify SDK on mount
  useEffect(() => {
    if (!window.Spotify) {
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js"; // ✅ Use .co, not .com
      script.async = true;
      script.onload = () => {
        console.log("🎵 Spotify SDK Loaded!");
      };
      document.body.appendChild(script);
    }
  
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
  }, [spotifyToken]); // Only re-run if token changes
      
  // Fetch and set Spotify token on mount
 useEffect(() => {
    //Extract token from URL if redirected from spotify login
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', '?'));
    const tokenFromUrl = new URLSearchParams(hash.replace("#", "?")).get("access_token");
    const expiresIn = params.get("expires_in");
    const storedToken = localStorage.getItem("spotify_token");
    const storedExpiration = localStorage.getItem("spotify_token_expires_at");
 
    
    
    if (tokenFromUrl && expiresIn) {
      const expirationTime = Date.now() + Number(expiresIn) * 1000;
      setSpotifyToken(tokenFromUrl);
      localStorage.setItem("spotify_token", tokenFromUrl);
      localStorage.setItem("spotify_token_expires_at", expirationTime.toString());
      window.location.hash=""; //clean up url
    } else if (storedToken && storedExpiration) {
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

// Weather fetching component
  const fetchWeather = async (): Promise<void> => {
    if (!location.trim()) {
      setError("Please enter a valid city name.");
      return;
    }

    setLoading(true);
    setError(null);
    // const apiUrl = 'https://api.open-meteo.com/v1/forecast?latitude=35.994&longitude=-78.8986&current_weather=true';
    try {
      // Get lat/lon from city name
      const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`);
      if (!geoResponse.ok) throw new Error("Failed to fetch weather location data.");
      const geoData = await geoResponse.json();

      const place = geoData.results?.[0];
      if(!place) throw new Error("City not found");

      const { latitude, longitude, name, country } = place;
      console.log(`Location found: ${name}, ${country}, [${latitude}, ${longitude}]`);

      // Step 2: Fetch either using coordinates
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
      );
      if(!weatherResponse.ok) throw new Error("Failed to fetch weather data.");
      const weatherData: WeatherData = await weatherResponse.json();

      setWeather(weatherData);
    } catch (error) {
      setError(getFriendlyErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };



  const fetchPlaylist = useCallback(async () => {
    if (!spotifyToken || !weather) {
        setError("Spotify token or weather data is missing! Please login or try again.");
        return;
    }

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

    if (name && artist) {
      setCurrentTrack({ name, artist });
    }
  } catch (err) {
    console.error("❌ Error fetching currently playing track:", err);
    setCurrentTrack(null); //fallback to null if there's an error
  }
};


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
    // 1️⃣ Set Web Player as active device
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

    // 2️⃣ Wait for a track to be ready
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

    // 3️⃣ Get playlist ID safely
    const playlistId = playlist?.uri?.split(":")?.pop();

    if (!playlistId || playlistId.length < 10) {
      console.error("❌ Invalid playlist URI:", playlist?.uri);
      setError("Couldn’t start playback. Playlist is invalid.");
      return;
    }

    const contextUri = `spotify:playlist:${playlistId}`;
    console.debug("🎧 Using context URI:", contextUri);

    // 4️⃣ Start Playback
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
};
   
  const pausePlaylist = () => {
    console.log("Attempting to pause...");
    console.log("player:", playerRef.current);
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
  


  // Automatically fetch playlist when weather data is available
  useEffect(() => {
    if (weather) {
      fetchPlaylist();
    }
  }, [weather, fetchPlaylist]);

  const theme = (manualWeatherCode !== null || weather?.current_weather?.weathercode !== undefined)
  ? getWeatherTheme(manualWeatherCode ?? weather!.current_weather!.weathercode)
  : "default";


  const backgroundClass = `bg-gradient-to-br ${THEME_BACKGROUNDS[theme]}`;

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen px-4 py-8 sm:px-6 lg:px-12 ${backgroundClass} text-white`}>
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-blue-600 text-center mb-8">
        Weather-Based Playlist
      </h1>
  
      <div className="w-full max-w-md sm:max-w-xl lg:max-w-2xl space-y-4">
        <input
          type="text"
          placeholder="Enter city name"
          className="w-full border border-gray-300 rounded px-4 py-2 text-base sm:text-lg"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
  
        <button
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition"
          onClick={fetchWeather}
          disabled={!spotifyToken}
        >
          {spotifyToken ? (loading ? "Fetching..." : "Get Playlist") : "Loading Spotify..."}
        </button>

        <select
          className="w-full border border-gray-300 rounded px-4 py-2 text-base sm:text-lg mt-2"
          value={manualWeatherCode ?? ''}
          onChange={(e) => {
            const value = e.target.value;
            setManualWeatherCode(value ? parseInt(value) : null);
          }}
        >
          <option value="">🌦️ Use Live Weather</option>
          <option value="0">☀️ Sunny</option>
          <option value="1">🌤️ Partly Cloudy</option>
          <option value="3">☁️ Overcast</option>
          <option value="45">🌫️ Foggy</option>
          <option value="51">🌧️ Light Rain</option>
          <option value="65">⛈️ Heavy Showers</option>
          <option value="71">❄️ Light Snow</option>
          <option value="95">🌩️ Storm</option>
        </select>
      </div>

  {/* temperature and weather code */}
      <div className="mt-6 w-full max-w-md sm:max-w-xl lg:max-w-2xl">
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
            <div className='mt-4 flex items-center justify-center gap-3'>
              <span className='text-sm text-white'>{useFahrenheit ? "°F" : "°C"}</span>
              <label className='relative inline-flex items-center cursor-pointer'>
                <input 
                  type='checkbox'
                  className='sr-only peer'
                  checked={useFahrenheit}
                  onChange={() => setUseFahrenheit(!useFahrenheit)}
                />
                <div className='w-11 h-6 bg-gray-300 rounded-full peer peer-focusing:ring-2 peer-focus:ring-blue-500 peer-checked:bg-blue-500 transition-all duration-300'></div>
                <div className='absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-md transform peer-checked:translate-x-full transition-all duration-300'></div>
              </label>
            </div>
          </div>
        )}
      </div>

      {playlist && (
        <div className="w-full max-w-md sm:max-w-xl lg:max-w-2xl mt-8">
          <NowPlaying
            playlistName={playlist.name}
            imageUrl={playlist.images[0].url}
            isPlaying={isPlaying}
            onPlay={playPlaylist}
            onPause={pausePlaylist}
          />
        </div>
      )}

      {currentTrack && (
        <div className="mt-3 text-center text-white text-sm">
          Now Playing: <strong>{currentTrack.name}</strong> by <em>{currentTrack.artist}</em>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        {!spotifyToken ? (
          <button onClick={getSpotifyToken} className="underline text-blue-500 hover:text-blue-700">
            Login with Spotify
          </button>
        ) : (
          <p>✅ Logged into Spotify</p>
        )}
      </div>
    </div>
  );   
}

export default App;