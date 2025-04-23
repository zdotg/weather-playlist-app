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
        <div className="mt-4 p-4 border rounded shadow-md bg-none">
            <h2 className="text-xl font-bold">{playlistName}</h2>
            <img src={imageUrl} alt={playlistName} className="w-full max-w-xs sm:max-w-sm rounded  mx-auto"/>
           <button
                onClick={isPlaying ? onPause : onPlay}
                className={`px-6 py-2 mt-4 text-white font-semibold rounded-full transition
                ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-greeb-500 hover:bg-green-600'}
                shadow-md hover:shadow-lg active:sclae-95 duration-200 `}
            >
            {isPlaying ? 'Pause' : 'Play'}
            </button>
        </div>
    );
};

export default NowPlaying;