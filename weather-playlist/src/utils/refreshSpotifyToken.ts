// Automatic refresh to handle refresh flow
export async function refreshSpotifyToken(refreshToken: string): Promise<string | null> {
    try {
        const response = await fetch("http://localhost:5000/spotify/refresh", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({refresh_token: refreshToken}),
        });

        if(!response.ok){
            console.error("Failed to refresh token");
            return null;
        }

        const data = await response.json();
        return data.access_token;
    } catch(error) {
        console.error("Refresh token error:", error);
        return null;
    }
}
    