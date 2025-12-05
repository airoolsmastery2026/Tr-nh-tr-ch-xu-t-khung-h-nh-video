import { useState, useCallback, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { Screenshot } from './useSceneDetector';

// Define the shape of an analysis result object
export interface AnalysisResult {
  originalFrame: Screenshot;
  description: string | null;
  videoUrl: string | null;
  status: 'pending' | 'describing' | 'generating' | 'complete' | 'error';
  error?: string;
}

// Fix for line 23: Resolved TypeScript error "All declarations of 'aistudio' must have identical modifiers."
// by removing the separate 'AIStudio' interface and inlining the type definition for 'window.aistudio'.
// This avoids type conflicts when multiple declarations for the same global property exist.
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export const useVideoGenerator = () => {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const isGeneratingRef = useRef(false);

  // Helper to update a specific result in the array immutably
  const updateResult = (index: number, newResult: Partial<AnalysisResult>) => {
    setResults(prev =>
      prev.map((r, i) => (i === index ? { ...r, ...newResult } : r))
    );
  };

  const reset = useCallback(() => {
    // Revoke old video object URLs to prevent memory leaks
    results.forEach(result => {
      if (result.videoUrl) {
        URL.revokeObjectURL(result.videoUrl);
      }
    });
    setResults([]);
    setIsGenerating(false);
    setProgress(0);
    setError(null);
    isGeneratingRef.current = false;
  }, [results]);

  const startGeneration = useCallback(async (screenshots: Screenshot[]) => {
    if (isGeneratingRef.current || screenshots.length === 0) return;
    
    // VEO requires API key selection
    try {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
      }
    } catch(e: any) {
        setError(`Lỗi khi chọn API Key: ${e.message}. Vui lòng thử lại. Truy cập ai.google.dev/gemini-api/docs/billing để biết thêm thông tin.`);
        return;
    }


    reset();
    setIsGenerating(true);
    isGeneratingRef.current = true;
    
    // Initialize results with pending status
    const initialResults = screenshots.map(frame => ({
      originalFrame: frame,
      description: null,
      videoUrl: null,
      status: 'pending' as const,
    }));
    setResults(initialResults);

    const totalFrames = screenshots.length;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        for (let i = 0; i < totalFrames; i++) {
            if (!isGeneratingRef.current) break; // Early exit if reset
            const screenshot = screenshots[i];
            
            try {
                // Step 1: Describe the image
                updateResult(i, { status: 'describing' });
                const base64Data = screenshot.src.split(',')[1];
                const imagePart = {
                    inlineData: {
                        data: base64Data,
                        mimeType: 'image/jpeg',
                    },
                };
                const textPart = {
                    text: 'Mô tả chi tiết và sống động cảnh này trong một câu ngắn gọn. Câu mô tả này sẽ được dùng làm prompt để tạo một video 8-10 giây.',
                };

                const descriptionResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: { parts: [imagePart, textPart] },
                });
                const description = descriptionResponse.text;
                updateResult(i, { description, status: 'generating' });

                // Step 2: Generate video from description
                let operation = await ai.models.generateVideos({
                    model: 'veo-3.1-fast-generate-preview',
                    prompt: description,
                    config: {
                        numberOfVideos: 1,
                        resolution: '720p',
                        aspectRatio: '16:9'
                    }
                });

                // Step 3: Poll for video generation result
                while (!operation.done) {
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    operation = await ai.operations.getVideosOperation({ operation });
                }

                // Step 4: Fetch video and create a local URL
                const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
                if (!videoUri) throw new Error('Không thể lấy URI của video.');
                
                const videoResponse = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
                if (!videoResponse.ok) {
                    if (videoResponse.status === 404) {
                         throw new Error('Video không tìm thấy. Có thể API Key của bạn không hợp lệ. Vui lòng chọn lại.');
                    }
                    throw new Error(`Lỗi khi tải video: ${videoResponse.statusText}`);
                }

                const videoBlob = await videoResponse.blob();
                const videoUrl = URL.createObjectURL(videoBlob);

                updateResult(i, { videoUrl, status: 'complete' });

            } catch (e: any) {
                console.error(`Error processing frame ${i}:`, e);
                const errorMessage = e.message || 'Lỗi không xác định';
                updateResult(i, { status: 'error', error: errorMessage });
                // If one frame fails, we still continue with others
            } finally {
                // Update overall progress after each frame is processed (or fails)
                setProgress(((i + 1) / totalFrames) * 100);
            }
        }

    } catch(e: any) {
        console.error("A general error occurred during generation:", e);
        setError(e.message || 'Đã xảy ra lỗi không mong muốn.');
    } finally {
        setIsGenerating(false);
        isGeneratingRef.current = false;
        setProgress(100); // Ensure progress bar completes
    }
  }, [reset]);

  return { results, isGenerating, progress, error, startGeneration, reset };
};
