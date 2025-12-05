import { useState, useCallback, useRef } from 'react';

// Define the shape of a screenshot object
export interface Screenshot {
  src: string;
  time: number;
}

// Helper to format time for VTT files (HH:MM:SS.mmm)
const formatTimeToVTT = (timeInSeconds: number): string => {
  const hours = Math.floor(timeInSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((timeInSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
  const milliseconds = Math.floor((timeInSeconds * 1000) % 1000).toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};

export const useSceneDetector = (videoFile: File | null) => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);

  // Use a ref to track processing state to avoid issues with stale closures
  const isProcessingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const reset = useCallback(() => {
    setScreenshots([]);
    setIsProcessing(false);
    setProgress(0);
    setError(null);
    if (subtitleUrl) {
      URL.revokeObjectURL(subtitleUrl);
    }
    setSubtitleUrl(null);
    isProcessingRef.current = false;
    if (videoRef.current) {
      URL.revokeObjectURL(videoRef.current.src);
      videoRef.current = null;
    }
  }, [subtitleUrl]);

  const extractSubtitles = (tracks: TextTrackList) => {
    if (tracks.length === 0) {
      console.log("Không tìm thấy track phụ đề nào.");
      return;
    }
    
    // For simplicity, we'll use the first available text track.
    const track = tracks[0];
    track.mode = 'hidden';

    // Wait for cues to be loaded by the browser
    setTimeout(() => {
      if (track.cues && track.cues.length > 0) {
        let vttContent = "WEBVTT\n\n";
        Array.from(track.cues).forEach((cue: any) => { // Use any for VTTCue compatibility
          vttContent += `${formatTimeToVTT(cue.startTime)} --> ${formatTimeToVTT(cue.endTime)}\n`;
          vttContent += `${cue.text}\n\n`;
        });

        const blob = new Blob([vttContent], { type: 'text/vtt' });
        const url = URL.createObjectURL(blob);
        setSubtitleUrl(url);
      }
    }, 1000); // 1 second delay might be needed for the browser to parse cues
  };

  const startProcessing = useCallback(async (intervalInSeconds: number) => {
    if (!videoFile || intervalInSeconds <= 0) {
        setError('Vui lòng cung cấp một tệp video và khoảng thời gian hợp lệ (lớn hơn 0).');
        return;
    };
    if (isProcessingRef.current) return;

    reset();
    setIsProcessing(true);
    isProcessingRef.current = true;

    const video = document.createElement('video');
    videoRef.current = video;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
        setError('Không thể lấy canvas context.');
        setIsProcessing(false);
        isProcessingRef.current = false;
        return;
    }

    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.crossOrigin = "anonymous"; // Necessary for text tracks

    try {
        await new Promise<void>((resolve, reject) => {
            video.onloadedmetadata = () => {
              // Once metadata is loaded, we can check for text tracks
              extractSubtitles(video.textTracks);
              resolve();
            };
            video.onerror = () => reject(new Error('Không thể tải siêu dữ liệu video.'));
        });

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        for (let time = 0; time < video.duration; time += intervalInSeconds) {
            if (!isProcessingRef.current) break; // Allow early exit
            
            video.currentTime = time;
            await new Promise<void>((resolve) => { video.onseeked = () => resolve(); });

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            // Add the new screenshot with its timestamp
            setScreenshots(prev => [...prev, { src: dataUrl, time }]);

            setProgress((time / video.duration) * 100);
        }
    } catch (e: any) {
        setError(e.message || 'Đã xảy ra lỗi không xác định.');
    } finally {
        // We don't revoke the URL here anymore because reset() handles it
        setIsProcessing(false);
        isProcessingRef.current = false;
        if (!error) {
            setProgress(100);
        }
    }
  }, [videoFile, reset, error]);

  return { screenshots, isProcessing, progress, error, subtitleUrl, startProcessing, reset };
};
