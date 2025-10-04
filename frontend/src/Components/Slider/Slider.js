import React, { useEffect, useRef, useState, useCallback } from "react";
import "./Slider.css";

export default function Slider({ images = [], intervalMs = 4000, height = 320 }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);
  const shellRef = useRef(null);

  // Controls (stable via useCallback)
  const next = useCallback(() => {
    setIdx(i => (i + 1) % (images.length || 1));
  }, [images.length]);

  const prev = useCallback(() => {
    setIdx(i => (i - 1 + (images.length || 1)) % (images.length || 1));
  }, [images.length]);

  const go = useCallback((i) => {
    if (!images.length) return;
    // normalize index into [0..length-1]
    setIdx(((i % images.length) + images.length) % images.length);
  }, [images.length]);

  // Autoplay interval (doesn't close over next)
  useEffect(() => {
    if (!images.length) return;
    const tick = () => setIdx(i => (i + 1) % images.length);
    timerRef.current = setInterval(tick, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [images.length, intervalMs]);

  const pause = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };
  const resume = () => {
    if (!images.length) return;
    pause();
    const tick = () => setIdx(i => (i + 1) % images.length);
    timerRef.current = setInterval(tick, intervalMs);
  };

  // Keyboard support (left/right) when the shell has focus
  const onKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    }
  };

  if (!images.length) return null;

  return (
    <div
      className="hshell"
      style={{ height }}
      ref={shellRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      aria-roledescription="carousel"
      aria-label="Image Slider"
    >
      {images.map((src, i) => (
        <div
          key={i}
          className={`hslide ${i === idx ? "active" : ""}`}
          style={{ backgroundImage: `url(${src})` }}
          role="group"
          aria-label={`Slide ${i + 1} of ${images.length}`}
          aria-hidden={i === idx ? "false" : "true"}
        />
      ))}

      <button className="hctl prev" onClick={prev} aria-label="Previous slide" type="button">‹</button>
      <button className="hctl next" onClick={next} aria-label="Next slide" type="button">›</button>

      <div className="hdots" role="tablist" aria-label="Slide dots">
        {images.map((_, i) => (
          <button
            key={i}
            className={`hdot ${i === idx ? "on" : ""}`}
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-selected={i === idx}
            role="tab"
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
