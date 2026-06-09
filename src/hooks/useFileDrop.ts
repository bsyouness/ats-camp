import { useCallback, useRef, useState } from 'react';

interface FileDropProps {
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

interface UseFileDropResult {
  isDragging: boolean;
  dropProps: FileDropProps;
}

/**
 * Adds drag-and-drop file support to any element. Spread `dropProps` onto the
 * drop target and use `isDragging` for visual feedback. Only the first dropped
 * file is passed to `onFile`. A depth counter keeps `isDragging` stable while
 * the cursor moves over child elements.
 */
export function useFileDrop(
  onFile: (file: File) => void,
  disabled = false,
): UseFileDropResult {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (disabled || !e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  }, [disabled]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (disabled || !e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
  }, [disabled]);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  }, [disabled]);

  const onDrop = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }, [disabled, onFile]);

  return { isDragging, dropProps: { onDragEnter, onDragOver, onDragLeave, onDrop } };
}
