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
        <div className="mt-4 p-4 border rounded shadow-md bg-white">
            <h2 className="text-xl font-bold">{playlistName}</h2>
            <img src={imageUrl} alt={playlistName} className="w-full max-w-xs sm:max-w-sm rounded mx-auto"/>
            <button 
            onClick={onPlay}
            className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700"
            >
               {isPlaying ? "Playing" : "Play"}
            </button>
            <button 
                onClick={onPause}
                className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700"
            >
             Pause
            </button>
        </div>
    );
};

export default NowPlaying;