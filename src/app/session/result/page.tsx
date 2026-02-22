'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { composeNewspaper, getFormattedDate } from "@/utils/imageProcessor";
import "./result.css";

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const photo1 = localStorage.getItem("session-1");
    const photo2 = localStorage.getItem("session-2");

    console.log("Photo1 from storage:", photo1 ? "exists" : "missing");
    console.log("Photo2 from storage:", photo2 ? "exists" : "missing");

    if (!photo1 || !photo2) {
      setError("Photos not found. Please complete both sessions first.");
      setTimeout(() => router.push("/session/1"), 3000);
      return;
    }

    const generateNewspaper = async () => {
      try {
        setIsGenerating(true);
        console.log("Starting newspaper generation...");
        
        const finalImage = await composeNewspaper(
          photo1,
          photo2,
          getFormattedDate()
        );
        
        console.log("Newspaper generated successfully");
        setResult(finalImage);
      } catch (err) {
        console.error("Generation error:", err);
        setError("Failed to generate newspaper. Please try again.");
      } finally {
        setIsGenerating(false);
      }
    };

    // Simulate printing press delay
    setTimeout(generateNewspaper, 1500);
  }, [router]);

  const handleDownload = () => {
    if (!result) return;
    
    const link = document.createElement('a');
    link.href = result;
    link.download = `newspaper-${getFormattedDate().replace(/\s/g, '-')}.png`;
    link.click();
  };

  const handleNewSession = () => {
    localStorage.removeItem("session-1");
    localStorage.removeItem("session-2");
    router.push("/session/1");
  };

  const handleShare = async () => {
    if (!result) return;
    
    try {
      const blob = await fetch(result).then(r => r.blob());
      const file = new File([blob], 'newspaper.png', { type: 'image/png' });
      
      if (navigator.share) {
        await navigator.share({
          title: 'My Vintage Newspaper',
          text: 'Check out my newspaper-style photo!',
          files: [file]
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  if (error) {
    return (
      <main className="result-wrapper">
        <div className="result-card">
          <div className="newspaper-header">
            <h1 className="newspaper-title">ERROR</h1>
          </div>
          <div className="error-container">
            <p className="error-message">{error}</p>
            <p style={{ fontFamily: 'Special Elite', marginTop: '10px', fontSize: '14px' }}>
              Redirecting to start...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="result-wrapper">
      <div className="result-card">
        
        {/* Newspaper Header */}
        <div className="newspaper-header">
          <h1 className="newspaper-title">THE DAILY PHOTO</h1>
          <div className="newspaper-meta">
            <span className="newspaper-edition">SPECIAL EDITION</span>
            <span className="newspaper-date">
              <span className="date-icon">📅</span>
              {getFormattedDate()}
            </span>
            <span>VOL. 1 NO. 2</span>
          </div>
        </div>

        {/* Headline */}
        <div className="newspaper-headline">
          <h2 className="headline-main">MOMENTS CAPTURED IN TIME</h2>
          <div className="headline-sub">A Vintage Photobooth Experience</div>
        </div>

        {/* Content */}
        {isGenerating ? (
          <div className="loading-container">
            <div className="newspaper-loading">
              PRINTING PRESS
            </div>
            <div className="loading-press">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p style={{ fontFamily: 'Special Elite', marginTop: '20px', color: 'var(--newspaper-brown)', fontSize: '14px' }}>
              Developing your newspaper...
            </p>
          </div>
        ) : result ? (
          <>
            {/* Photo with vintage effects */}
            <div className="result-paper">
              <img src={result} alt="Newspaper" />
              <div className="photo-overlay"></div>
              <div className="photo-stamp">
                ✦ AUTHENTIC ✦
              </div>
            </div>

            {/* Photo Caption */}
            <div className="photo-caption">
              Exclusive vintage capture - Frame worthy moments
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button 
                className="newspaper-btn secondary" 
                onClick={handleNewSession}
              >
                <span>📸</span> NEW SESSION
              </button>
              
              <button 
                className="newspaper-btn" 
                onClick={handleDownload}
              >
                <span>⬇️</span> DOWNLOAD
              </button>
              
              <button 
                className="newspaper-btn secondary" 
                onClick={handleShare}
              >
                <span>📤</span> SHARE
              </button>
            </div>

            {/* Newspaper Footer */}
            <div className="newspaper-footer">
              <span className="footer-price">✦ PRICE: 25¢ ✦</span>
              <span>EST. 2024</span>
              <span>WEATHER: SUNNY</span>
            </div>
          </>
        ) : (
          <div className="error-container">
            <p className="error-message">
              Failed to generate newspaper. Please try again.
            </p>
            <button 
              className="newspaper-btn" 
              onClick={handleNewSession}
            >
              START OVER
            </button>
          </div>
        )}
      </div>
    </main>
  );
}