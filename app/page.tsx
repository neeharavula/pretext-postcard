"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  prepareWithSegments,
  layoutWithLines,
  type PreparedTextWithSegments,
} from "@chenglou/pretext";

const CARD_W = 900;
const CARD_H = 600;
const DISPLAY_SCALE = 0.75;

const TEXT =
  "Hello from Buenos Aires! Hope this finds you well. Today we wandered Palermo Soho and completely lost track of time — cobblestone streets tunneled by tipa trees, alleyways full of murals, cute shops, cafés, and Messi on practically every corner. Arrived late, got lost twice, found the best empanadas entirely by accident. I bought a book I can't read. I'll figure it out. Wish you were here.";

const FONT = "26px 'Reenie Beanie'";
const TEXT_X = 50;
const TEXT_Y = 160;
const TEXT_W = 445;
const LINE_HEIGHT = 40;

const ADDRESS_LINES = [
  "Jamie Reyes",
  "47 Elmwood Drive",
  "Portland, OR 97201",
  "United States",
];
const ADDRESS_X = 560;
const ADDRESS_Y = 210;
const ADDRESS_HEADER_GAP = 36;
const ADDRESS_LINE_HEIGHT = 64;

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  const postcardImg = useRef<HTMLImageElement | null>(null);
  const stampPrintImg = useRef<HTMLImageElement | null>(null);
  const preparedText = useRef<PreparedTextWithSegments | null>(null);

  useEffect(() => {
    let loadedImages = 0;
    let fontLoaded = false;

    const checkReady = () => {
      if (loadedImages === 2 && fontLoaded) setReady(true);
    };

    const onImageLoad = () => {
      loadedImages++;
      checkReady();
    };

    const pc = new Image();
    pc.src = "/postcard.jpeg";
    pc.onload = onImageLoad;
    postcardImg.current = pc;

    const sp = new Image();
    sp.src = "/stamp-print.png";
    sp.onload = onImageLoad;
    stampPrintImg.current = sp;

    // Must wait for font before calling prepareWithSegments() — pretext measures
    // text via canvas measureText() and needs the real font loaded, otherwise
    // it falls back to a system font and line breaks come out wrong.
    document.fonts.load(FONT).then(() => {
      preparedText.current = prepareWithSegments(TEXT, FONT);
      fontLoaded = true;
      checkReady();
    });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !preparedText.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(postcardImg.current!, 0, 0, CARD_W, CARD_H);

    const { lines } = layoutWithLines(
      preparedText.current,
      TEXT_W,
      LINE_HEIGHT,
    );

    ctx.font = FONT;
    ctx.fillStyle = "#1c2a4a";
    ctx.textBaseline = "top";

    lines.forEach((line, i) => {
      ctx.fillText(line.text, TEXT_X, TEXT_Y + i * LINE_HEIGHT);
    });

    ctx.fillText("To:", ADDRESS_X, ADDRESS_Y);
    ADDRESS_LINES.forEach((line, i) => {
      ctx.fillText(
        line,
        ADDRESS_X,
        ADDRESS_Y + ADDRESS_HEADER_GAP + i * ADDRESS_LINE_HEIGHT,
      );
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    draw();
  }, [ready, draw]);

  return (
    <div
      style={{
        position: "relative",
        width: CARD_W * DISPLAY_SCALE,
        height: CARD_H * DISPLAY_SCALE,
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
        style={{
          display: "block",
          width: CARD_W * DISPLAY_SCALE,
          height: CARD_H * DISPLAY_SCALE,
        }}
      />
    </div>
  );
}
