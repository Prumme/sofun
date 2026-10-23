import { useEffect, useRef } from 'react';
import type { PointerEvent } from 'react';
import type { DrawingView, Json } from '@party/contracts';
type Point = [number, number];
interface Props { view: DrawingView; canDraw: boolean; send: (action: Record<string, Json>) => Promise<boolean> }
export function DrawingBoard({ view, canDraw, send }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null); const queue = useRef<{ stroke: number; points: Point[] }[]>([]); const stroke = useRef(0); const down = useRef(false); const sequence = useRef(view.nextSequence); const inflight = useRef(false); const lastSample = useRef(0);
  const latest = useRef({ view, send, canDraw }); latest.current = { view, send, canDraw };
  const paint = () => {
    const context = canvas.current?.getContext('2d'); if (!context) return;
    const styles = getComputedStyle(canvas.current!);
    context.fillStyle = styles.getPropertyValue('--drawing-background').trim(); context.fillRect(0, 0, 1024, 1024); context.strokeStyle = styles.getPropertyValue('--drawing-ink').trim(); context.fillStyle = context.strokeStyle; context.lineWidth = 6; context.lineCap = 'round'; context.lineJoin = 'round';
    const paths = [...latest.current.view.strokes.map(s => ({ id: s.id, points: [...s.points] }))];
    for (const batch of queue.current) { const existing = paths.find(s => s.id === batch.stroke); if (existing) existing.points.push(...batch.points); else paths.push({ id: batch.stroke, points: batch.points }); }
    for (const path of paths) { const first = path.points[0]; if (!first) continue; context.beginPath(); context.moveTo(...first); for (const point of path.points.slice(1)) context.lineTo(...point); context.stroke(); if (path.points.length === 1) { context.beginPath(); context.arc(...first, 3, 0, Math.PI * 2); context.fill(); } }
  };
  useEffect(() => { queue.current = []; sequence.current = view.nextSequence; stroke.current = (view.strokes.at(-1)?.id ?? -1) + 1; down.current = false; paint(); }, [view.epoch]);
  useEffect(() => { sequence.current = view.nextSequence; paint(); }, [view.strokes, view.nextSequence]);
  useEffect(() => {
    let active = true;
    const timer = setInterval(() => {
      if (!latest.current.canDraw || inflight.current || !queue.current.length) return;
      const batch = queue.current[0]!; const points = batch.points.slice(0, 50); const seq = sequence.current;
      inflight.current = true;
      void latest.current.send({ type: 'draw', epoch: latest.current.view.epoch, sequence: seq, stroke: batch.stroke, points }).then(ok => {
        if (!active) return;
        if (ok) { sequence.current = seq + 1; batch.points.splice(0, points.length); if (!batch.points.length && queue.current[0] === batch) queue.current.shift(); }
        else { queue.current = []; down.current = false; }
        paint();
      }).finally(() => { inflight.current = false; });
    }, 250);
    return () => { active = false; clearInterval(timer); queue.current = []; };
  }, []);
  function sample(event: PointerEvent<HTMLCanvasElement>, force = false) {
    if (!canDraw || !down.current || (!force && performance.now() - lastSample.current < 100)) return;
    lastSample.current = performance.now(); const rect = event.currentTarget.getBoundingClientRect();
    const point: Point = [Math.round(Math.max(0, Math.min(1024, (event.clientX - rect.left) / rect.width * 1024))), Math.round(Math.max(0, Math.min(1024, (event.clientY - rect.top) / rect.height * 1024)))];
    const last = queue.current.at(-1); if (last?.stroke === stroke.current) last.points.push(point); else queue.current.push({ stroke: stroke.current, points: [point] }); paint();
  }
  return <canvas className={`drawing-board ${canDraw ? 'can-draw' : ''}`} ref={canvas} width={1024} height={1024} role="img" aria-label={canDraw ? 'Zone de dessin tactile' : 'Dessin partagé'} onPointerDown={event => { if (!canDraw) return; stroke.current++; down.current = true; event.currentTarget.setPointerCapture(event.pointerId); sample(event, true); }} onPointerMove={event => sample(event)} onPointerUp={event => { sample(event, true); down.current = false; }} onPointerCancel={() => { down.current = false; }} />;
}
