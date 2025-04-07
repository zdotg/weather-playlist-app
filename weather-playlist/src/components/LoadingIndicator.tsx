const LoadingIndicator: React.FC = () => {
    return (
        <div className="flex items-center space-x-2 mt-4 text-b;ue-500">
            <svg 
                className="animate-spin h-5 w-5 text-blue-500"
                viewBox="0 0 24 24"
            >
                <circle 
                    className="opacity-25"
                    cx="12" cy="12" r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                />
               <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M12 4v4a4 4 0 000 8v4a8 8 0 010-16z"
                />
            </svg>
            <span>Loading...</span>
        </div>
    );
};

export default LoadingIndicator;