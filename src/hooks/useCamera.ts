import { useRef, useState, useCallback } from 'react';

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => string | null;
  uploadPhoto: (file: File) => Promise<string>;
  cropImage: (imageUrl: string, cropArea: { x: number; y: number; width: number; height: number }) => string;
  isCameraActive: boolean;
  error: string | null;
}

export const useCamera = (): UseCameraReturn => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const stopCamera = useCallback(() => {
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current) {
      // Cancel any pending play promise
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {}); // Ignore errors
        playPromiseRef.current = null;
      }
      
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
    
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      // Stop any existing stream first
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Important for autoplay
        videoRef.current.playsInline = true;
        videoRef.current.setAttribute('playsinline', '');
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              resolve(true);
            };
          }
        });
        
        // Play with proper promise handling
        const playPromise = videoRef.current.play();
        playPromiseRef.current = playPromise;
        
        if (playPromise !== undefined) {
          await playPromise;
          setIsCameraActive(true);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Camera access failed';
      setError('Camera access denied. Please use upload option.');
      console.error('Camera error:', err);
      throw new Error(errorMessage);
    }
  }, [stopCamera]);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !isCameraActive || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas size to match video but maintain aspect ratio
    const maxWidth = 800;
    const maxHeight = 600;
    
    let width = video.videoWidth;
    let height = video.videoHeight;
    
    if (width > maxWidth) {
      height = (maxWidth / width) * height;
      width = maxWidth;
    }
    
    if (height > maxHeight) {
      width = (maxHeight / height) * width;
      height = maxHeight;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Flip horizontally for selfie view
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    
    return canvas.toDataURL('image/jpeg', 0.9);
  }, [isCameraActive]);

  const uploadPhoto = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Please upload an image file'));
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('Image size should be less than 10MB'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        
        const img = new Image();
        img.onload = () => {
          // Resize if too large while maintaining aspect ratio
          const maxDimension = 1200;
          let width = img.width;
          let height = img.height;
          
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (maxDimension / width) * height;
              width = maxDimension;
            } else {
              width = (maxDimension / height) * width;
              height = maxDimension;
            }
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.src = result;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const cropImage = useCallback((imageUrl: string, cropArea: { x: number; y: number; width: number; height: number }): string => {
    const img = new Image();
    img.src = imageUrl;
    
    const canvas = document.createElement('canvas');
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;
    
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(
      img, 
      cropArea.x, cropArea.y, cropArea.width, cropArea.height,
      0, 0, cropArea.width, cropArea.height
    );
    
    return canvas.toDataURL('image/jpeg', 0.9);
  }, []);

  return {
    videoRef,
    fileInputRef,
    canvasRef,
    startCamera,
    stopCamera,
    capturePhoto,
    uploadPhoto,
    cropImage,
    isCameraActive,
    error
  };
};