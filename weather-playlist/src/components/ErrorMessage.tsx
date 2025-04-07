interface ErrorMessageProps {
    message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message}) => {
    return (
        <div className="mt-4 pc-4 py-2 border border-red-400 bg-red-100 text-red-700 rounded">
            ❌ {message}
        </div>
    );
};

export default ErrorMessage;