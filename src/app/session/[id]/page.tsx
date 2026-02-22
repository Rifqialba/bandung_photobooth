'use client';

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCamera } from "@/hooks/useCamera";
import "./session.css";

export default function SessionPage() {
  const { id } = useParams();
  const router = useRouter();
  const sessionId = Number(id);
  
  const {
    videoRef,
    fileInputRef,
    canvasRef,
    startCamera,
    stopCamera,
    capturePhoto,
    uploadPhoto,
    cropImage,
    isCameraActive,
    error: cameraError // Ini adalah error dari useCamera
  } = useCamera();

  const [captured, setCaptured] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploadMode, setUploadMode] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const cropAreaRef = useRef<HTMLDivElement>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Effect untuk start camera
  useEffect(() => {
    let mounted = true;
    
    const initCamera = async () => {
      if (!uploadMode && mounted) {
        setIsStartingCamera(true);
        try {
          await startCamera();
        } catch (err) {
          console.error('Failed to start camera:', err);
        } finally {
          setIsStartingCamera(false);
        }
      }
    };
    
    initCamera();
    
    return () => {
      mounted = false;
      stopCamera();
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [uploadMode, startCamera, stopCamera]);

  const startCountdown = () => {
    if (isCapturing) return;
    
    setIsCapturing(true);
    setCountdown(3);
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(timer);
          handleCapture();
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
    
    countdownRef.current = timer;
  };

  const handleCapture = () => {
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 300);
    
    const photo = capturePhoto();
    if (photo) {
      setCaptured(photo);
      setIsCapturing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadError(null);
      const photoDataUrl = await uploadPhoto(file);
      setTempImage(photoDataUrl);
      setIsCropping(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleCropStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!cropAreaRef.current || !imageRef.current) return;
    
    setIsDragging(true);
    
    const rect = cropAreaRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    
    setCropStart({ x, y });
    setCropEnd({ x, y });
  };

  const handleCropMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !cropStart || !cropAreaRef.current) return;
    
    e.preventDefault();
    
    const rect = cropAreaRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    let x = clientX - rect.left;
    let y = clientY - rect.top;
    
    x = Math.max(0, Math.min(rect.width, x));
    y = Math.max(0, Math.min(rect.height, y));
    
    setCropEnd({ x, y });
  };

  const handleCropEnd = () => {
    setIsDragging(false);
  };

  const applyCrop = () => {
    if (!tempImage || !cropStart || !cropEnd || !imageRef.current) return;

    const imageRect = imageRef.current.getBoundingClientRect();
    
    const scaleX = imageRef.current.naturalWidth / imageRect.width;
    const scaleY = imageRef.current.naturalHeight / imageRect.height;

    const cropX = Math.min(cropStart.x, cropEnd.x);
    const cropY = Math.min(cropStart.y, cropEnd.y);
    const cropWidth = Math.abs(cropEnd.x - cropStart.x);
    const cropHeight = Math.abs(cropEnd.y - cropStart.y);

    if (cropWidth < 50 || cropHeight < 50) {
      setUploadError('Please select a larger area');
      return;
    }

    const croppedImage = cropImage(tempImage, {
      x: cropX * scaleX,
      y: cropY * scaleY,
      width: cropWidth * scaleX,
      height: cropHeight * scaleY
    });

    setCaptured(croppedImage);
    setIsCropping(false);
    setTempImage(null);
    setCropStart(null);
    setCropEnd(null);
  };

  const cancelCrop = () => {
    setIsCropping(false);
    setTempImage(null);
    setCropStart(null);
    setCropEnd(null);
  };

  const handleRetake = () => {
    console.log("Retake clicked, current mode:", uploadMode ? "upload" : "camera");
    
    setCaptured(null);
    setIsCapturing(false);
    setCountdown(null);
    setUploadError(null);
    setTempImage(null);
    setIsCropping(false);
    setCropStart(null);
    setCropEnd(null);
    
    setTimeout(() => {
      if (!uploadMode && !isCameraActive) {
        startCamera();
      }
    }, 100);
  };

  const handleNext = () => {
    if (!captured) return;

    localStorage.setItem(`session-${sessionId}`, captured);
    console.log(`Saved session-${sessionId} to localStorage`);

    if (sessionId === 1) {
      router.push("/session/2");
    } else {
      router.push("/session/result");
    }
  };

  const handleCancelCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);
    setIsCapturing(false);
  };

  const toggleMode = () => {
    setCaptured(null);
    setUploadError(null);
    setTempImage(null);
    setIsCropping(false);
    setCropStart(null);
    setCropEnd(null);
    
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    
    if (!uploadMode) {
      stopCamera();
      setUploadMode(true);
    } else {
      setUploadMode(false);
      setTimeout(() => {
        startCamera();
      }, 100);
    }
  };

  const getCropBoxStyle = () => {
    if (!cropStart || !cropEnd) return { display: 'none' };

    const left = Math.min(cropStart.x, cropEnd.x);
    const top = Math.min(cropStart.y, cropEnd.y);
    const width = Math.abs(cropEnd.x - cropStart.x);
    const height = Math.abs(cropEnd.y - cropStart.y);

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      position: 'absolute' as const,
      border: '2px solid white',
      background: 'rgba(255, 255, 255, 0.2)',
      pointerEvents: 'none' as const,
      zIndex: 10,
      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
    };
  };

  return (
    <main className="session-wrapper">
      <div className="session-card">
        
        <canvas ref={canvasRef} className="hidden-canvas" />

        <div className="retro-tape">
          {sessionId === 1 ? "FIRST SHOT" : "FINAL SHOT"}
        </div>

        <div className="session-counter">
          FRAME #{sessionId} OF 2
        </div>

        <h2 className="session-title">
          CAPTURE {sessionId}
        </h2>

        <div className="mode-toggle">
          <button 
            className={`mode-btn ${!uploadMode ? 'active' : ''}`}
            onClick={toggleMode}
            disabled={isCapturing || isCropping || isStartingCamera}
          >
            📷 CAMERA
          </button>
          <button 
            className={`mode-btn ${uploadMode ? 'active' : ''}`}
            onClick={toggleMode}
            disabled={isCapturing || isCropping || isStartingCamera}
          >
            📁 UPLOAD
          </button>
        </div>

        <div className="instructions-panel">
          <span className="instruction-icon">
            {uploadMode ? '📁' : '📸'}
          </span>
          <span>
            {!captured 
              ? (uploadMode 
                  ? "Click SELECT PHOTO to choose from device" 
                  : "Frame your shot and click CAPTURE")
              : "Preview your vintage photo"}
          </span>
          <span className="instruction-icon">🎞️</span>
        </div>

        {/* FIXED: Gunakan cameraError, bukan error */}
        {(cameraError || uploadError) && (
          <div className="error-message">
            {cameraError || uploadError}
          </div>
        )}

        {!captured ? (
          <>
            {!uploadMode ? (
              /* Camera Mode */
              <>
                <div className="camera-container vintage-effect">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                  />
                  
                  <div className="viewfinder-corner top-left" />
                  <div className="viewfinder-corner top-right" />
                  <div className="viewfinder-corner bottom-left" />
                  <div className="viewfinder-corner bottom-right" />
                  <div className="camera-frame" />
                  
                  {showFlash && <div className="flash-effect" />}
                  
                  {countdown && (
                    <div className="countdown-overlay">
                      <span className="countdown-number">{countdown}</span>
                    </div>
                  )}
                </div>

                <div className="action-area">
                  {countdown ? (
                    <button 
                      className="retro-btn secondary small" 
                      onClick={handleCancelCountdown}
                    >
                      CANCEL
                    </button>
                  ) : (
                    <button 
                      className="retro-btn" 
                      onClick={startCountdown}
                      disabled={isCapturing || !isCameraActive || isStartingCamera}
                    >
                      {isStartingCamera ? 'STARTING...' : (isCapturing ? '...' : 'CAPTURE')}
                    </button>
                  )}
                </div>
              </>
            ) : isCropping && tempImage ? (
              /* Crop Mode */
              <div className="crop-container">
                <div 
                  className="crop-area"
                  ref={cropAreaRef}
                  onMouseDown={handleCropStart}
                  onMouseMove={handleCropMove}
                  onMouseUp={handleCropEnd}
                  onMouseLeave={handleCropEnd}
                  onTouchStart={handleCropStart}
                  onTouchMove={handleCropMove}
                  onTouchEnd={handleCropEnd}
                >
                  <img 
                    ref={imageRef}
                    src={tempImage} 
                    alt="Crop preview" 
                    className="crop-image"
                    draggable={false}
                  />
                  {cropStart && cropEnd && (
                    <div style={getCropBoxStyle()} />
                  )}
                </div>
                <div className="crop-controls">
                  <button 
                    className="retro-btn secondary small" 
                    onClick={cancelCrop}
                  >
                    CANCEL
                  </button>
                  <button 
                    className="retro-btn small" 
                    onClick={applyCrop}
                    disabled={!cropStart || !cropEnd}
                  >
                    APPLY CROP
                  </button>
                </div>
              </div>
            ) : (
              /* Upload Mode */
              <>
                <div className="upload-container">
                  <div className="upload-box">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                    
                    <div className="upload-icon">📁</div>
                    <h3 className="upload-title">Upload Photo</h3>
                    <p className="upload-text">
                      Click below to select a photo
                    </p>
                    <p className="upload-hint">
                      Max: 10MB • JPG, PNG
                    </p>
                    
                    <button 
                      className="retro-btn upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      SELECT PHOTO
                    </button>
                  </div>
                </div>

                <div className="action-area">
                  <button 
                    className="retro-btn secondary small" 
                    onClick={toggleMode}
                  >
                    BACK TO CAMERA
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          /* Preview Mode */
          <>
            <div className="camera-container">
              <img src={captured} alt="Captured" />
              <div className="camera-frame" />
            </div>

            <div className="action-area">
              <div className="preview-actions">
                <button 
                  className="retro-btn secondary" 
                  onClick={handleRetake}
                >
                  {uploadMode ? '🔄 UPLOAD AGAIN' : '🔄 RETAKE'}
                </button>
                <button 
                  className="retro-btn" 
                  onClick={handleNext}
                >
                  {sessionId === 1 ? 'NEXT →' : '✓ FINISH'}
                </button>
              </div>
            </div>
          </>
        )}

        <div className="film-strip">
          <span /><span /><span /><span />
        </div>
        
        {captured && (
          <p className="retro-caption">
            ✦ {uploadMode ? 'uploaded' : 'vintage'} shot #{sessionId} captured ✦
          </p>
        )}
      </div>
    </main>
  );
}