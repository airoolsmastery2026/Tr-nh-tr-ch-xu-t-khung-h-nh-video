
import React, { useState, useCallback } from 'react';
import { useSceneDetector } from './hooks/useSceneDetector';
import FileUploader from './components/FileUploader';
import ScreenshotGallery from './components/ScreenshotGallery';
import Spinner from './components/Spinner';
import { DocumentTextIcon } from './components/icons/DocumentTextIcon';

// This is a workaround to use JSZip from a CDN in TypeScript
declare global {
  interface Window {
    JSZip: any;
  }
}

// Helper to format time from seconds to mm:ss format
const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [interval, setInterval] = useState<number>(5); // State for the interval
  const [isDownloading, setIsDownloading] = useState<boolean>(false); // State for the download process
  
  const {
    screenshots,
    isProcessing,
    progress,
    error: extractionError,
    subtitleUrl,
    startProcessing,
    reset: resetExtraction,
  } = useSceneDetector(videoFile);

  const handleFileChange = (file: File) => {
    resetExtraction();
    setVideoFile(file);
  };

  const handleReset = () => {
    resetExtraction();
    setVideoFile(null);
  };

  const handleStart = useCallback(() => {
    if (videoFile) {
      startProcessing(interval); // Pass interval to startProcessing
    }
  }, [videoFile, startProcessing, interval]);

  const handleDownloadAll = useCallback(async () => {
    if (screenshots.length === 0 || !window.JSZip) {
      if (!window.JSZip) {
        console.error("JSZip library not found. Make sure it's included in your HTML.");
      }
      return;
    }

    setIsDownloading(true);
    try {
      const zip = new window.JSZip();

      screenshots.forEach((screenshot) => {
        // src is a data URL: "data:image/jpeg;base64,..."
        const base64Data = screenshot.src.split(',')[1];
        const fileName = `frame-${formatTime(screenshot.time).replace(':', '-')}.jpg`;
        zip.file(fileName, base64Data, { base64: true });
      });

      const content = await zip.generateAsync({ type: 'blob' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      const videoName = videoFile?.name.split('.').slice(0, -1).join('.') || 'video';
      link.download = `extracted-frames-${videoName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

    } catch (err) {
      console.error("Error creating zip file:", err);
    } finally {
      setIsDownloading(false);
    }
  }, [screenshots, videoFile?.name]);

  const videoFileName = videoFile?.name.split('.').slice(0, -1).join('.') || 'subtitles';

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Trình trích xuất khung hình video
          </h1>
          <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
            Một ứng dụng web cho phép người dùng tải lên video và trích xuất các khung hình theo một khoảng thời gian giây do người dùng chỉ định.
          </p>
        </header>

        <main className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-700">
          {!videoFile && <FileUploader onFileChange={handleFileChange} />}

          {videoFile && !isProcessing && screenshots.length === 0 && (
            <div className="text-center">
              <p className="text-lg mb-4">
                Tệp đã sẵn sàng: <span className="font-semibold text-purple-300">{videoFile.name}</span>
              </p>
              
              <div className="mb-6 max-w-xs mx-auto">
                <label htmlFor="interval" className="block text-sm font-medium text-gray-300 mb-2">
                  Khoảng thời gian trích xuất (giây)
                </label>
                <input
                  type="number"
                  id="interval"
                  value={interval}
                  onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5"
                  min="1"
                  required
                />
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleStart}
                  className="px-8 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
                >
                  Bắt đầu trích xuất
                </button>
                 <button
                  onClick={handleReset}
                  className="px-8 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-all duration-300"
                >
                  Chọn video khác
                </button>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center space-y-6">
                <Spinner />
                <p className="text-lg font-medium text-gray-300">Đang xử lý video... Vui lòng đợi.</p>
                <div className="w-full max-w-md bg-gray-700 rounded-full h-4">
                    <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all duration-300 ease-linear"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <p className="text-2xl font-bold text-purple-300">{Math.round(progress)}%</p>
                {extractionError && <p className="text-red-400 mt-4">Lỗi: {extractionError}</p>}
            </div>
          )}

          {!isProcessing && screenshots.length > 0 && (
            <div>
              <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold text-gray-200">
                    Kết quả: <span className="text-purple-400">{screenshots.length}</span> khung hình được trích xuất
                </h2>
                <div className="flex items-center space-x-4">
                    {subtitleUrl && (
                        <a
                            href={subtitleUrl}
                            download={`${videoFileName}.vtt`}
                            className="px-6 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors duration-300 flex items-center justify-center space-x-2"
                        >
                            <DocumentTextIcon className="w-5 h-5" />
                            <span>Tải xuống Phụ đề</span>
                        </a>
                    )}
                    <button
                        onClick={handleDownloadAll}
                        disabled={isDownloading}
                        className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isDownloading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Đang nén...</span>
                        </>
                        ) : (
                        'Tải xuống tất cả'
                        )}
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors duration-300"
                    >
                      Bắt đầu lại
                    </button>
                </div>
              </div>
              
              <ScreenshotGallery screenshots={screenshots} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
