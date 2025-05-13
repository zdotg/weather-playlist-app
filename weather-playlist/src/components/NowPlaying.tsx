import React from 'react';

interface NowPlayingProps {
  playlistName: string;
  imageUrl: string;
  isPlaying: boolean;
  progress: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

const NowPlaying: React.FC<NowPlayingProps> = ({
  playlistName,
  imageUrl,
  isPlaying,
  progress,
  duration,
  onPlay,
  onPause,
  onNext,
  onPrevious,
}) => {
  return (
    <div className="w-full max-w-sm mx-auto bg-white/10 backdrop-blur-md p-6 rounded-xl shadow-lg text-center space-y-4">
      <img
        src={imageUrl}
        alt={playlistName}
        className="w-full rounded-lg shadow-md transition-transform duration-300 hover:scale-105"
      />
      <h2 className="text-xl font-semibold text-white tracking-wide">{playlistName}</h2>
      {/* Progress Bar */}
      <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
        <div 
          className="h-full bg-green-400 transition-all duration-300"
          style={{ width: `${(progress / duration) * 100 || 0}%`}}
        />
      </div>
      <p className="text-xs text-white mt-1">
        {Math.floor(progress / 1000)}s / {Math.floor(duration / 1000)}s
      </p>
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
      {/* Next and Previous Buttons */}
      <div className="flex justify-center gap-4 mt-4">
        <button
          onClick={onPrevious}
          className="px-6 py-2 text-white font-semibold rounded-full transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 bg-blue-500 hover:bg-blue-600"
        >
          Previous
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 text-white font-semibold rounded-full transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 bg-blue-500 hover:bg-blue-600"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default NowPlaying;
