"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  prepareWithSegments,
  layoutNextLine,
  type PreparedTextWithSegments,
  type LayoutCursor,
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
const ADDRESS_W = CARD_W - ADDRESS_X - 30;

const OBSTACLE_R = 65;
const MIN_SLOT_W = 40;

type Mouse = { x: number; y: number };

// Returns the available horizontal slot for a text line given the cursor obstacle.
// areaX/areaW define the text region so the slot never escapes those bounds.
// Returns w=-1 when the obstacle fully covers the line (caller should skip/hide it).
function computeSlot(
  lineY: number,
  lineH: number,
  mouse: Mouse | null,
  areaX: number,
  areaW: number,
): { x: number; w: number } {
  if (!mouse) return { x: areaX, w: areaW };

  const dy = lineY + lineH / 2 - mouse.y;
  if (Math.abs(dy) >= OBSTACLE_R) return { x: areaX, w: areaW };

  const dx = Math.sqrt(OBSTACLE_R * OBSTACLE_R - dy * dy);
  const blockLeft = mouse.x - dx;
  const blockRight = mouse.x + dx;

  // Obstacle doesn't overlap this text area at all
  if (blockLeft >= areaX + areaW || blockRight <= areaX)
    return { x: areaX, w: areaW };

  const rightX = Math.max(areaX, blockRight + 6);
  const rightW = Math.max(0, areaX + areaW - rightX);
  const leftW = Math.max(0, Math.min(areaW, blockLeft - areaX - 6));

  if (rightW >= leftW && rightW >= MIN_SLOT_W) return { x: rightX, w: rightW };
  if (leftW >= MIN_SLOT_W) return { x: areaX, w: leftW };
  return { x: areaX, w: -1 };
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);

  const postcardImg = useRef<HTMLImageElement | null>(null);
  const stampPrintImg = useRef<HTMLImageElement | null>(null);
  const preparedText = useRef<PreparedTextWithSegments | null>(null);
  const mousePos = useRef<Mouse | null>(null);
  const stamps = useRef<Mouse[]>([]);
  const rafId = useRef<number | null>(null);

  const STAMP_W = 220;
  const STAMP_H = 147;

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

    ctx.font = FONT;
    ctx.fillStyle = "#1c2a4a";
    ctx.textBaseline = "top";

    const mouse = mousePos.current;

    // --- Message text (flowing paragraph, pretext iterator) ---
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    let lineIndex = 0;

    while (true) {
      const lineY = TEXT_Y + lineIndex * LINE_HEIGHT;
      if (lineY > CARD_H) break;

      const slot = computeSlot(lineY, LINE_HEIGHT, mouse, TEXT_X, TEXT_W);

      if (slot.w < 0) {
        // Fully blocked — advance the text cursor without rendering so the
        // paragraph flow doesn't stall or repeat on the next line.
        const skipped = layoutNextLine(preparedText.current, cursor, TEXT_W);
        if (!skipped) break;
        cursor = skipped.end;
        lineIndex++;
        continue;
      }

      const line = layoutNextLine(preparedText.current, cursor, slot.w);
      if (!line) break;

      ctx.fillText(line.text, slot.x, lineY);
      cursor = line.end;
      lineIndex++;
    }

    // --- Address text (fixed lines, same obstacle geometry) ---
    const toSlot = computeSlot(
      ADDRESS_Y,
      LINE_HEIGHT,
      mouse,
      ADDRESS_X,
      ADDRESS_W,
    );
    ctx.fillText("To:", toSlot.w >= 0 ? toSlot.x : ADDRESS_X, ADDRESS_Y);

    ADDRESS_LINES.forEach((addressLine, i) => {
      const lineY = ADDRESS_Y + ADDRESS_HEADER_GAP + i * ADDRESS_LINE_HEIGHT;
      const slot = computeSlot(
        lineY,
        ADDRESS_LINE_HEIGHT,
        mouse,
        ADDRESS_X,
        ADDRESS_W,
      );
      ctx.fillText(addressLine, slot.w >= 0 ? slot.x : ADDRESS_X, lineY);
    });

    // --- Placed stamps (drawn last so they sit on top of text) ---
    for (const s of stamps.current) {
      ctx.drawImage(
        stampPrintImg.current!,
        s.x - STAMP_W / 2,
        s.y - STAMP_H / 2,
        STAMP_W,
        STAMP_H,
      );
    }
  }, []);

  const scheduleRedraw = useCallback(() => {
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => {
    if (!ready) return;
    draw();
  }, [ready, draw]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      mousePos.current = {
        x: e.nativeEvent.offsetX / DISPLAY_SCALE,
        y: e.nativeEvent.offsetY / DISPLAY_SCALE,
      };
      scheduleRedraw();
    },
    [scheduleRedraw],
  );

  const handleMouseLeave = useCallback(() => {
    mousePos.current = null;
    scheduleRedraw();
  }, [scheduleRedraw]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      stamps.current.push({
        x: e.nativeEvent.offsetX / DISPLAY_SCALE,
        y: e.nativeEvent.offsetY / DISPLAY_SCALE,
      });
      scheduleRedraw();
    },
    [scheduleRedraw],
  );

  return (
    <>
      <div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
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

      <div
        style={{
          position: "fixed",
          bottom: 24,
          left: 28,
          display: "flex",
          alignItems: "center",
          gap: 50,
          fontFamily: "var(--font-geist-mono)",
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#2c3e45",
        }}
      >
        <button
          onClick={() => setInfoVisible((v) => !v)}
          style={{
            fontFamily: "inherit",
            fontSize: "inherit",
            letterSpacing: "inherit",
            textTransform: "inherit",
            color: "inherit",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "inherit",
          }}
        >
          Info
        </button>
        <span style={{ maxWidth: 380, visibility: infoVisible ? "visible" : "hidden" }}>
          An exploration of{" "}
          <a
            href="https://github.com/chenglou/pretext"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            Cheng Lou&apos;s Pretext
          </a>
          , inspired by a trip to Buenos Aires in 2025. Made by{" "}
          <a
            href="https://neeharavula.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            Neeha Ravula
          </a>
          .
        </span>
      </div>
    </>
  );
}
