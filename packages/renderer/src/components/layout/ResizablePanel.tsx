import { useState, useCallback, useRef, type ReactNode } from 'react';
import clsx from 'clsx';

interface ResizablePanelProps {
  direction: 'horizontal' | 'vertical';
  initialSize: number;
  minSize: number;
  maxSize: number;
  children: ReactNode;
  resizerPosition: 'start' | 'end';
  className?: string;
}

export function ResizablePanel({
  direction,
  initialSize,
  minSize,
  maxSize,
  children,
  resizerPosition,
  className,
}: ResizablePanelProps) {
  const [size, setSize] = useState(initialSize);
  const dragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
      startSize.current = size;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta =
          direction === 'horizontal'
            ? ev.clientX - startPos.current
            : ev.clientY - startPos.current;
        const multiplier = resizerPosition === 'end' ? 1 : -1;
        const newSize = Math.min(maxSize, Math.max(minSize, startSize.current + delta * multiplier));
        setSize(newSize);
      };

      const handleMouseUp = () => {
        dragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [direction, maxSize, minSize, resizerPosition, size],
  );

  const sizeStyle =
    direction === 'horizontal' ? { width: size, minWidth: minSize } : { height: size, minHeight: minSize };

  const resizer = (
    <div
      onMouseDown={handleMouseDown}
      className={clsx(
        'flex-shrink-0 transition-colors group',
        direction === 'horizontal'
          ? 'w-px bg-line-2 cursor-col-resize hover:w-0.5 hover:bg-primary/60'
          : 'h-px bg-line-2 cursor-row-resize hover:h-0.5 hover:bg-primary/60',
      )}
    />
  );

  return (
    <div
      className={clsx('flex flex-shrink-0', direction === 'vertical' ? 'flex-col' : '', className)}
      style={sizeStyle}
    >
      {resizerPosition === 'start' && resizer}
      <div className="flex-1 min-w-0 min-h-0 overflow-hidden">{children}</div>
      {resizerPosition === 'end' && resizer}
    </div>
  );
}
