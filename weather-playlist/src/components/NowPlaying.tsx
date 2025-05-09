import React from 'react';

interface NowPlayingProps {
  playlistName: string;
  imageUrl: string;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
}

const NowPlaying: React.FC<NowPlayingProps> = ({
  playlistName,
  imageUrl,
  isPlaying,
  onPlay,
  onPause,
}) => {
  return (
    <div className="w-full max-w-sm mx-auto bg-white/10 backdrop-blur-md p-6 rounded-xl shadow-lg text-center space-y-4">
      <img
        src={imageUrl}
        alt={playlistName}
        className="w-full rounded-lg shadow-md transition-transform duration-300 hover:scale-105"
      />
      <h2 className="text-xl font-semibold text-white tracking-wide">{playlistName}</h2>
      
      <button
        onClick={isPlaying ? onPause : onPlay}
        className={`px-6 py-2 text-white font-semibold rounded-full transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 ${
          isPlaying
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  );
};

export default NowPlaying;
