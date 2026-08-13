// File: client/src/components/ui/LoadingSpinner.jsx
// Loading spinner component

export default function LoadingSpinner({ size = 'md', text = 'Loading...', fullScreen = false }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  };

  const spinner = (
    <>
      <div className={`${sizeClasses[size]} border-primary border-t-transparent rounded-full animate-spin`}></div>
      {text && <p className="mt-4 text-gray-600">{text}</p>}
    </>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {spinner}
    </div>
  );
}
