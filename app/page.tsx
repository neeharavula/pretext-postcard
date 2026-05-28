"use client";

import { useRef, useEffect, useState } from "react";

const CARD_W = 900;
const CARD_H = 600;

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Preload images
  const postcardImg = useRef<HTMLImageElement | null>(null);
  const stampPrintImg = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    let loaded = 0;
    const onLoad = () => {
      loaded++;
      if (loaded === 2) setImagesLoaded(true);
    };

    const pc = new Image();
    pc.src = "/postcard.jpeg";
    pc.onload = onLoad;
    postcardImg.current = pc;

    const sp = new Image();
    sp.src = "/stamp-print.png";
    sp.onload = onLoad;
    stampPrintImg.current = sp;
  }, []);

  // Draw the postcard background once images are loaded
  useEffect(() => {
    if (!imagesLoaded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(postcardImg.current!, 0, 0, CARD_W, CARD_H);
  }, [imagesLoaded]);

  return (
    <div
      style={{
        position: "relative",
        width: CARD_W,
        height: CARD_H,
        borderRadius: 8,
        overflow: "hidden",
        transform: "rotate(-4deg)",
        cursor: `url(/stamp-cursor.png) 45 30, crosshair`,
      }}
    >
      <canvas
        ref={canvasRef}
        width={CARD_W}
        height={CARD_H}
        style={{ display: "block" }}
      />
    </div>
  );
}
