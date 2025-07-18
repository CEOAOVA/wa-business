import React, { useState } from 'react';

const ImageTest: React.FC = () => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const testImage = () => {
    const img = new Image();
    img.onload = () => {
      console.log('✅ Image loaded successfully');
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.log('❌ Image failed to load');
      setImageError(true);
    };
    img.src = '/logembler.jpg';
  };

  return (
    <div className="min-h-screen bg-gradient-dark p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Image Test</h1>
        
        <div className="space-y-6">
          <div className="card-modern p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Test Image Loading</h2>
            
            <button 
              onClick={testImage}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mb-4"
            >
              Test Image Load
            </button>

            <div className="space-y-4">
              <div>
                <strong className="text-white">Status:</strong>
                {imageLoaded && <span className="text-green-400 ml-2">✅ Loaded</span>}
                {imageError && <span className="text-red-400 ml-2">❌ Error</span>}
                {!imageLoaded && !imageError && <span className="text-yellow-400 ml-2">⏳ Not tested</span>}
              </div>

              <div>
                <strong className="text-white">Image Path:</strong>
                <code className="text-gray-300 ml-2">/logembler.jpg</code>
              </div>
            </div>
          </div>

          <div className="card-modern p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Direct Image Display</h2>
            
            <div className="space-y-4">
              <div>
                <strong className="text-white">Method 1 - Direct src:</strong>
                <img 
                  src="/logembler.jpg" 
                  alt="Test Logo" 
                  className="h-20 w-auto mt-2 rounded-lg border border-white/20"
                  onLoad={() => console.log('✅ Direct image loaded')}
                  onError={(e) => console.log('❌ Direct image error:', e)}
                />
              </div>

              <div>
                <strong className="text-white">Method 2 - With error handling:</strong>
                <img 
                  src="/logembler.jpg" 
                  alt="Test Logo" 
                  className="h-20 w-auto mt-2 rounded-lg border border-white/20"
                  onLoad={() => console.log('✅ Error handled image loaded')}
                  onError={(e) => {
                    console.log('❌ Error handled image failed');
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = document.createElement('div');
                      fallback.className = 'h-20 w-32 bg-red-500 rounded-lg flex items-center justify-center mt-2';
                      fallback.innerHTML = '<span class="text-white font-bold">ERROR</span>';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="card-modern p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Console Output</h2>
            <p className="text-gray-300">
              Check the browser console (F12) for detailed loading information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageTest; 