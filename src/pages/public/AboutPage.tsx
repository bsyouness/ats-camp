import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/useAuth';
import { Card, CardContent, Button, UndoBar } from '../../components/ui';

type BlockType = 'text' | 'subtitle';

interface AboutBlock {
  id: string;
  type: BlockType;
  content: string;
}

interface AboutSection {
  id: string;
  title: string;
  blocks: AboutBlock[];
}

interface AboutContent {
  sections: AboutSection[];
}

const uid = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_CONTENT: AboutContent = {
  sections: [
    {
      id: 'story',
      title: 'Our Story',
      blocks: [
        {
          id: 'story-1',
          type: 'text',
          content:
            "ATS Camp was founded by a group of friends who wanted to create a welcoming space at Burning Man. Over the years, we've grown into a vibrant community of artists, builders, and dreamers who come together each year to create magic in the dust.",
        },
      ],
    },
    {
      id: 'values',
      title: 'Our Values',
      blocks: [
        { id: 'v1t', type: 'subtitle', content: 'Radical Inclusion' },
        { id: 'v1d', type: 'text', content: 'Everyone is welcome at ATS Camp. We celebrate diversity and create space for all.' },
        { id: 'v2t', type: 'subtitle', content: 'Communal Effort' },
        { id: 'v2d', type: 'text', content: 'We work together to build our camp and create experiences for the community.' },
        { id: 'v3t', type: 'subtitle', content: 'Leave No Trace' },
        { id: 'v3d', type: 'text', content: 'We are committed to environmental responsibility and leave the playa as we found it.' },
        { id: 'v4t', type: 'subtitle', content: 'Participation' },
        { id: 'v4d', type: 'text', content: 'Everyone contributes to camp life through shifts, projects, and creative expression.' },
      ],
    },
    {
      id: 'join',
      title: 'Join Us',
      blocks: [
        {
          id: 'join-1',
          type: 'text',
          content:
            "Interested in joining ATS Camp? We welcome new members who share our values and want to contribute to our community. Reach out through our contact page or join our WhatsApp group to learn more about how to become part of our family.",
        },
      ],
    },
  ],
};

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

export function AboutPage() {
  const { isAdmin } = useAuth();
  const [content, setContent] = useState<AboutContent>(DEFAULT_CONTENT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  // Undo state
  const [undoLabel, setUndoLabel] = useState<string | null>(null);
  const undoSnapshot = useRef<AboutContent | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getDoc(doc(db, 'config', 'about')).then((snap) => {
      if (snap.exists() && snap.data().sections?.length) {
        setContent(snap.data() as AboutContent);
      }
    });
    return () => { if (undoTimer.current) clearTimeout(undoTimer.current); };
  }, []);

  const persist = async (updated: AboutContent) => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'config', 'about'), updated);
      setContent(updated);
    } catch {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Write-only — no state update. Used by soft-delete timer/dismiss to avoid
  // overwriting state that may have changed since the delete was queued.
  const persistOnly = (data: AboutContent) =>
    setDoc(doc(db, 'config', 'about'), data).catch(() => alert('Failed to save'));

  // Optimistic delete with undo window
  const softDelete = (next: AboutContent, label: string) => {
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

  // ——— Section operations ———
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

  const handleRevertToDefault = async () => {
    if (!confirm('Revert to default content? All custom edits will be lost.')) return;
    await deleteDoc(doc(db, 'config', 'about'));
    setContent(DEFAULT_CONTENT);
  };

  // ——— Block operations ———
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
          blocks: [...s.blocks, { id: uid(), type, content: type === 'subtitle' ? 'New Subtitle' : 'New paragraph text.' }],
        }
      ),
    });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">About ATS Camp</h1>
        <p className="text-xl text-gray-400">Our story, values, and what makes our camp special</p>
      </div>

      <div className="space-y-8">
        {content.sections.map((section) => (
          <Card key={section.id}>
            <CardContent>
              {/* Section title */}
              {editingId === `section-title-${section.id}` ? (
                <div className="flex items-center gap-2 mb-4">
                  <input
                    className="flex-1 px-3 py-1.5 bg-playa-card border border-neon-purple rounded-lg text-white focus:outline-none font-semibold text-xl"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') updateSectionTitle(section.id, draft); if (e.key === 'Escape') setEditingId(null); }}
                  />
                  <Button size="sm" onClick={() => updateSectionTitle(section.id, draft)} isLoading={saving}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-2xl font-semibold text-white flex-1">{section.title}</h2>
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
              <div className="space-y-3">
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
                          <h3 className="text-neon-purple font-medium flex-1">{block.content}</h3>
                        ) : (
                          <p className="text-gray-400 leading-relaxed flex-1">{block.content}</p>
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

              {/* Add block buttons */}
              {isAdmin && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-playa-border">
                  <Button size="sm" variant="add" onClick={() => addBlock(section.id, 'subtitle')}>+ Subtitle</Button>
                  <Button size="sm" variant="add" onClick={() => addBlock(section.id, 'text')}>+ Text</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {isAdmin && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <Button variant="add" onClick={addSection} isLoading={saving}>+ Add Section</Button>
          <Button variant="ghost" onClick={handleRevertToDefault} className="text-gray-500 hover:text-red-400 text-sm">
            Revert to default content
          </Button>
        </div>
      )}

      {undoLabel && (
        <UndoBar message={undoLabel} onUndo={handleUndo} onDismiss={dismissUndo} />
      )}
    </div>
  );
}
