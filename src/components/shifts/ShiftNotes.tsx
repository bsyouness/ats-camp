import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, Button, UndoBar } from '../../components/ui';

type BlockType = 'text' | 'subtitle';

interface NoteBlock {
  id: string;
  type: BlockType;
  content: string;
}

interface NoteSection {
  id: string;
  title: string;
  blocks: NoteBlock[];
}

interface NotesContent {
  sections: NoteSection[];
}

const uid = () => Math.random().toString(36).slice(2, 9);

const PencilIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export function ShiftNotes() {
  const { isAdmin } = useAuth();
  const [content, setContent] = useState<NotesContent>({ sections: [] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const [undoLabel, setUndoLabel] = useState<string | null>(null);
  const undoSnapshot = useRef<NotesContent | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getDoc(doc(db, 'config', 'shiftNotes')).then((snap) => {
      if (snap.exists() && snap.data().sections?.length) {
        setContent(snap.data() as NotesContent);
      }
    });
    return () => { if (undoTimer.current) clearTimeout(undoTimer.current); };
  }, []);

  const persist = async (updated: NotesContent) => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'config', 'shiftNotes'), updated);
      setContent(updated);
    } catch {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const persistOnly = (data: NotesContent) =>
    setDoc(doc(db, 'config', 'shiftNotes'), data).catch(() => alert('Failed to save'));

  const softDelete = (next: NotesContent, label: string) => {
    undoSnapshot.current = content;
    setContent(next);
    setUndoLabel(label);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => {
      persistOnly(next);
      setUndoLabel(null);
      undoSnapshot.current = null;
      undoTimer.current = null;
    }, 5000);
  };

  const handleUndo = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    if (undoSnapshot.current) setContent(undoSnapshot.current);
    setUndoLabel(null);
    undoSnapshot.current = null;
  };

  const dismissUndo = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    if (undoSnapshot.current) persistOnly(content);
    setUndoLabel(null);
    undoSnapshot.current = null;
  };

  const updateSectionTitle = async (sectionId: string, title: string) => {
    await persist({ sections: content.sections.map((s) => (s.id === sectionId ? { ...s, title } : s)) });
    setEditingId(null);
  };

  const deleteSection = (sectionId: string) => {
    const section = content.sections.find((s) => s.id === sectionId)!;
    softDelete({ sections: content.sections.filter((s) => s.id !== sectionId) }, `Section "${section.title}" deleted`);
  };

  const addSection = () =>
    persist({ sections: [...content.sections, { id: uid(), title: 'New Section', blocks: [] }] });

  const updateBlock = async (sectionId: string, blockId: string, value: string) => {
    await persist({
      sections: content.sections.map((s) =>
        s.id !== sectionId ? s : { ...s, blocks: s.blocks.map((b) => (b.id === blockId ? { ...b, content: value } : b)) }
      ),
    });
    setEditingId(null);
  };

  const deleteBlock = (sectionId: string, blockId: string) => {
    const block = content.sections.find((s) => s.id === sectionId)!.blocks.find((b) => b.id === blockId)!;
    softDelete(
      { sections: content.sections.map((s) => s.id !== sectionId ? s : { ...s, blocks: s.blocks.filter((b) => b.id !== blockId) }) },
      `${block.type === 'subtitle' ? 'Subtitle' : 'Text'} deleted`
    );
  };

  const addBlock = (sectionId: string, type: BlockType) =>
    persist({
      sections: content.sections.map((s) =>
        s.id !== sectionId ? s : {
          ...s,
          blocks: [...s.blocks, { id: uid(), type, content: type === 'subtitle' ? 'New Subtitle' : 'New note text.' }],
        }
      ),
    });

  if (content.sections.length === 0 && !isAdmin) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Notes</h2>
        {isAdmin && (
          <Button size="sm" variant="add" onClick={addSection} isLoading={saving}>
            + Add Section
          </Button>
        )}
      </div>

      {content.sections.length === 0 && isAdmin && (
        <p className="text-gray-500 text-sm">No notes yet. Add a section to get started.</p>
      )}

      <div className="space-y-4">
        {content.sections.map((section) => (
          <Card key={section.id}>
            <CardContent>
              {/* Section title */}
              {editingId === `section-title-${section.id}` ? (
                <div className="flex items-center gap-2 mb-3">
                  <input
                    className="flex-1 px-3 py-1.5 bg-playa-card border border-neon-purple rounded-lg text-white focus:outline-none font-semibold"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') updateSectionTitle(section.id, draft); if (e.key === 'Escape') setEditingId(null); }}
                  />
                  <Button size="sm" onClick={() => updateSectionTitle(section.id, draft)} isLoading={saving}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-white flex-1">{section.title}</h3>
                  {isAdmin && (
                    <>
                      <button onClick={() => { setEditingId(`section-title-${section.id}`); setDraft(section.title); }} className="p-1 rounded bg-neon-purple/20 hover:bg-neon-purple/40 text-neon-purple">
                        <PencilIcon />
                      </button>
                      <button onClick={() => deleteSection(section.id)} className="p-1 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400">
                        <TrashIcon />
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Blocks */}
              <div className="space-y-2">
                {section.blocks.map((block) => (
                  <div key={block.id}>
                    {editingId === block.id ? (
                      <div className="space-y-2">
                        {block.type === 'text' ? (
                          <textarea
                            className="w-full px-3 py-2 bg-playa-card border border-neon-purple rounded-lg text-gray-200 focus:outline-none resize-y min-h-[80px] text-sm"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            autoFocus
                          />
                        ) : (
                          <input
                            className="w-full px-3 py-2 bg-playa-card border border-neon-purple rounded-lg text-white focus:outline-none text-sm font-medium"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') updateBlock(section.id, block.id, draft); if (e.key === 'Escape') setEditingId(null); }}
                          />
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => updateBlock(section.id, block.id, draft)} isLoading={saving}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        {block.type === 'subtitle' ? (
                          <h4 className="text-neon-purple font-medium flex-1">{block.content}</h4>
                        ) : (
                          <p className="text-gray-400 leading-relaxed flex-1 text-sm">{block.content}</p>
                        )}
                        {isAdmin && (
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => { setEditingId(block.id); setDraft(block.content); }} className="p-1 rounded bg-neon-purple/20 hover:bg-neon-purple/40 text-neon-purple">
                              <PencilIcon />
                            </button>
                            <button onClick={() => deleteBlock(section.id, block.id)} className="p-1 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400">
                              <TrashIcon />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {isAdmin && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-playa-border">
                  <Button size="sm" variant="add" onClick={() => addBlock(section.id, 'subtitle')}>+ Subtitle</Button>
                  <Button size="sm" variant="add" onClick={() => addBlock(section.id, 'text')}>+ Text</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {undoLabel && <UndoBar message={undoLabel} onUndo={handleUndo} onDismiss={dismissUndo} />}
    </div>
  );
}
