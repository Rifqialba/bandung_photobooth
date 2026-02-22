import { useRef, useState, useCallback } from 'react';

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  startCamera: () => Promise<boolean>;
  stopCamera: () => void;
  capturePhoto: () => string | null;
  uploadPhoto: (file: File) => Promise<string>;
  cropImage: (imageUrl: string, cropArea: { x: number; y: number; width: number; height: number }) => string;
  isCameraActive: boolean;
  isCameraStarting: boolean;
  error: string | null;
}

export const useCamera = (): UseCameraReturn => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const startAttemptRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  // Cleanup function yang aman
  const safeStopCamera = useCallback(() => {
    console.log('Stopping camera...');
    
    // Stop all tracks
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current) {
      // Cancel any pending play promise
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {});
        playPromiseRef.current = null;
      }
      
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
    
    setIsCameraActive(false);
    startAttemptRef.current = false;
    console.log('Camera stopped');
  }, []);

  const stopCamera = useCallback(() => {
    safeStopCamera();
  }, [safeStopCamera]);

  const startCamera = useCallback(async (): Promise<boolean> => {
    // Prevent multiple simultaneous start attempts
    if (startAttemptRef.current || isCameraStarting) {
      console.log('Camera start already in progress, skipping...');
      return false;
    }

    // If already active, return true
    if (isCameraActive) {
      console.log('Camera already active');
      return true;
    }

    console.log('Starting camera...');
    startAttemptRef.current = true;
    setIsCameraStarting(true);
    setError(null);
    
    try {
      // Clean up any existing stream first
      safeStopCamera();

      // Small delay to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        } 
      });
      
      if (!mountedRef.current) {
        // Component unmounted during async operation
        stream.getTracks().forEach(track => track.stop());
        startAttemptRef.current = false;
        setIsCameraStarting(false);
        return false;
      }

      streamRef.current = stream;
      
      if (videoRef.current) {
        // Set video properties
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.setAttribute('playsinline', '');
        videoRef.current.setAttribute('autoplay', '');
        
        // Wait for metadata to load
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not found'));
            return;
          }
          
          const timeout = setTimeout(() => {
            reject(new Error('Video metadata loading timeout'));
          }, 5000);
          
          videoRef.current.onloadedmetadata = () => {
            clearTimeout(timeout);
            resolve();
          };
          
          videoRef.current.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Video element error'));
          };
        });
        
        if (!mountedRef.current) {
          throw new Error('Component unmounted');
        }
        
        // Play video
        const playPromise = videoRef.current.play();
        playPromiseRef.current = playPromise;
        
        if (playPromise !== undefined) {
          await playPromise;
        }
        
        if (!mountedRef.current) {
          throw new Error('Component unmounted');
        }
        
        setIsCameraActive(true);
        console.log('Camera started successfully');
        return true;
      }
      
      return false;
      
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera access denied. Please use upload option.');
      
      // Clean up on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      return false;
      
    } finally {
      if (mountedRef.current) {
        setIsCameraStarting(false);
      }
      startAttemptRef.current = false;
    }
  }, [isCameraActive, isCameraStarting, safeStopCamera]);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !isCameraActive || !canvasRef.current) {
      console.log('Cannot capture: camera not active');
      return null;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Gunakan ukuran asli video untuk kualitas maksimal
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      // Resize jika terlalu besar (opsional)
      const maxWidth = 800;
      const maxHeight = 600;
      
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
      
      // Mirror untuk selfie view
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, width, height);
      
      return canvas.toDataURL('image/jpeg', 0.9);
      
    } catch (err) {
      console.error('Capture error:', err);
      return null;
    }
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

  // Setup mounted ref
  useState(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      safeStopCamera();
    };
  });

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
    isCameraStarting,
    error
  };
};