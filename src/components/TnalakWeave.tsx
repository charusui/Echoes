import { useEffect, useRef } from 'react';

// T'nalak colors
const COLORS = ['#0f0c0c', '#da2d46', '#f0dde0'];

export function TnalakWeave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rowsRef = useRef<number[][]>([]);
  const yOffsetRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      draw();
    };
    window.addEventListener('resize', resize);
    resize();

    function generateRow() {
      const cols = Math.ceil(window.innerWidth / 40);
      const row = [];
      for (let i = 0; i < cols; i++) {
        // Simple geometric pattern logic based on position
        const val = (i % 4 === 0) ? 1 : (Math.random() > 0.8 ? 2 : 0);
        row.push(val);
      }
      return row;
    }

    // Init rows
    const numRows = Math.ceil(window.innerHeight / 20) + 2;
    for (let i = 0; i < numRows; i++) {
      rowsRef.current.push(generateRow());
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const rows = rowsRef.current;
      const size = 40;
      const height = 20;
      
      ctx.globalAlpha = 0.15; // Keep it subtle in the background

      for (let r = 0; r < rows.length; r++) {
        const y = canvas.height - ((rows.length - r) * height) + yOffsetRef.current;
        for (let c = 0; c < rows[r].length; c++) {
          const colorIdx = rows[r][c];
          ctx.fillStyle = COLORS[colorIdx];
          
          // Draw diamond/triangle shapes to simulate weaving
          ctx.beginPath();
          if (colorIdx === 1) { // Crimson diamonds
            ctx.moveTo(c * size + size/2, y);
            ctx.lineTo(c * size + size, y + height/2);
            ctx.lineTo(c * size + size/2, y + height);
            ctx.lineTo(c * size, y + height/2);
          } else {
            ctx.rect(c * size, y, size, height);
          }
          ctx.fill();
        }
      }
    }

    // Animation when struck
    let animFrame: number;
    let targetYOffset = 0;

    const animate = () => {
      if (yOffsetRef.current < targetYOffset) {
        yOffsetRef.current += 2; // Scroll speed
        if (yOffsetRef.current >= 20) {
          yOffsetRef.current = 0;
          targetYOffset -= 20;
          rowsRef.current.shift();
          rowsRef.current.push(generateRow());
        }
        draw();
      }
      animFrame = requestAnimationFrame(animate);
    };
    animFrame = requestAnimationFrame(animate);

    const handleStrike = () => {
      targetYOffset += 20; // Move up one row
    };

    window.addEventListener('instrument-strike', handleStrike);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('instrument-strike', handleStrike);
      cancelAnimationFrame(animFrame);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 mix-blend-screen"
    />
  );
}
