import express from "express";
import cors from "cors";
import fetch from "node-fetch"; // Ensure this is installed

const app = express();
app.use(cors());

app.get("/spotify/playlist/:playlistId", async (req, res) => {
  const { playlistId } = req.params;
  const accessToken = req.headers.authorization?.split(" ")[1]; // Extract token
  
  if (!accessToken) {
      console.error("🚨 Missing access token in request");
      return res.status(401).json({ error: "Missing access token" });
  }

  console.log(`🔹 Fetching Spotify playlist: ${playlistId}`);

  try {
      const spotifyResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!spotifyResponse.ok) {
          const errorText = await spotifyResponse.text();
          throw new Error(`Spotify API error: ${spotifyResponse.status} - ${errorText}`);
      }

      const data = await spotifyResponse.json();
      console.log("✅ Successfully fetched playlist:", data);
      res.json(data);
  } catch (error) {
      console.error("❌ Error fetching playlist:", error);
      res.status(500).json({ error: "Internal server error" });
  }
});



const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Proxy Server running on port ${PORT}`));
