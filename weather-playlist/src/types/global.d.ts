export {};

declare global {
  interface Window {
    Spotify: typeof Spotify; 
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}
