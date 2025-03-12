const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

interface SpotifyAuthResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export const getSpotifyToken = async (): Promise<string | null> => {
    try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
            },
            body: "grant_type=client_credentials",
        });

        if (!response.ok) {
            throw new Error("Failed to retrieve access token");
        }

        const data: SpotifyAuthResponse = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("Error fetching Spotify Token:", error);
        return null;
    }
}