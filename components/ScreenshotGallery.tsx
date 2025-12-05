
import React from 'react';
import { DownloadIcon } from './icons/DownloadIcon';

interface ScreenshotGalleryProps {
  screenshots: { src: string; time: number }[];
}

// Helper to format time from seconds to mm:ss format
const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({ screenshots }) => {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {screenshots.map((screenshot, index) => (
          <div key={index} className="group relative rounded-lg overflow-hidden shadow-lg border border-gray-700 bg-gray-800">
            <div className="relative">
              <img
                src={screenshot.src}
                alt={`Khung hình tại ${formatTime(screenshot.time)}`}
                className="block w-full h-auto transition-transform duration-300 group-hover:scale-110"
              />
              <span className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">
                {formatTime(screenshot.time)}
              </span>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
                <a
                  href={screenshot.src}
                  download={`frame-${formatTime(screenshot.time).replace(':', '-')}.jpg`}
                  className="flex items-center justify-center p-3 bg-purple-600 rounded-full text-white transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  aria-label={`Tải xuống khung hình tại ${formatTime(screenshot.time)}`}
                >
                  <DownloadIcon className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default ScreenshotGallery;
