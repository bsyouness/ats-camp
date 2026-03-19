interface UndoBarProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UndoBar({ message, onUndo, onDismiss }: UndoBarProps) {
  return (
    <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-3 bg-playa-card border border-playa-border rounded-lg shadow-xl">
      <span className="text-gray-300 text-sm">{message}</span>
      <button onClick={onUndo} className="text-neon-cyan text-sm font-medium hover:text-neon-cyan/80 transition-colors">
        Undo
      </button>
      <button onClick={onDismiss} className="text-gray-500 hover:text-gray-300 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
