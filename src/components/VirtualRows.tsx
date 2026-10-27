import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

/**
 * Windowed list for fixed-height rows. Only the rows near the viewport are in the DOM,
 * so libraries with thousands of links stay fast.
 */
export function VirtualRows<T extends { id: string }>({
  items,
  rowHeight,
  scrollRef,
  render,
  overscan = 8,
}: {
  items: T[];
  rowHeight: number;
  scrollRef: RefObject<HTMLElement>;
  render: (item: T) => ReactNode;
  overscan?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ start: 0, end: 40 });

  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    let raf = 0;
    const calc = () => {
      raf = 0;
      const h = host.current;
      if (!h) return;
      // How far the top of this list is above the top of the scroll area.
      const offset = Math.max(0, sc.getBoundingClientRect().top - h.getBoundingClientRect().top);
      const start = Math.max(0, Math.floor(offset / rowHeight) - overscan);
      const end = Math.max(start, Math.min(items.length, Math.ceil((offset + sc.clientHeight) / rowHeight) + overscan));
      setRange((r) => (r.start === start && r.end === end ? r : { start, end }));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(calc);
    };
    calc();
    sc.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      sc.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [items, rowHeight, overscan, scrollRef]);

  return (
    <div ref={host} style={{ height: items.length * rowHeight, position: 'relative' }}>
      <div style={{ transform: `translateY(${range.start * rowHeight}px)` }}>
        {items.slice(range.start, range.end).map(render)}
      </div>
    </div>
  );
}
