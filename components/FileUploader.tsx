
import React, { useCallback, useState } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { VideoIcon } from './icons/VideoIcon';

interface FileUploaderProps {
  onFileChange: (file: File) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileChange }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File | null | undefined) => {
    if (file && file.type.startsWith('video/')) {
      onFileChange(file);
    } else {
      alert('Vui lòng chọn một tệp video.');
    }
  }, [onFileChange]);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
  };

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <label
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`w-full max-w-lg p-10 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
          isDragging ? 'border-purple-500 bg-gray-700/50' : 'border-gray-600 hover:border-purple-400 hover:bg-gray-700/30'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <UploadIcon className="w-16 h-16 text-gray-500" />
          <p className="text-xl font-semibold text-gray-300">
            Kéo và thả video của bạn vào đây
          </p>
          <p className="text-gray-400">hoặc</p>
          <div
            className="px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors duration-300"
          >
            Chọn tệp
          </div>
        </div>
        <input type="file" accept="video/*" className="hidden" onChange={handleChange} />
      </label>
       <div className="mt-8 flex items-center justify-center space-x-3 text-gray-400">
         <VideoIcon className="w-5 h-5" />
         <span>Định dạng được hỗ trợ: MP4, WebM, Ogg, v.v.</span>
       </div>
    </div>
  );
};

export default FileUploader;
