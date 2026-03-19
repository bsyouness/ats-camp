import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, UndoBar } from '../../components/ui';

interface UsefulLink {
  title: string;
  url: string;
  description: string;
}

interface PackingCategory {
  category: string;
  items: string[];
}

const DEFAULT_USEFUL_LINKS: UsefulLink[] = [
  { title: 'Burning Man Official', url: 'https://burningman.org', description: 'Official Burning Man website' },
  { title: 'Survival Guide', url: 'https://survival.burningman.org', description: 'Everything you need to survive and thrive on the playa' },
  { title: 'iBurn App', url: 'https://iburn.app', description: 'The essential app for navigating Black Rock City' },
  { title: 'Playa Bike Repair', url: 'https://playabikerepair.com', description: 'Rent bikes for the playa' },
];

const DEFAULT_PACKING: PackingCategory[] = [
  { category: 'Essentials', items: ['Ticket & Vehicle Pass', 'ID / Passport', 'Cash (for ice sales)', 'Water (1.5 gallons per day)', 'Food for the week', 'Sunscreen (SPF 50+)', 'Goggles & Dust Mask'] },
  { category: 'Shelter', items: ['Tent or shade structure', 'Sleeping bag / bedding', 'Pillow', 'Rebar stakes', 'Tapestries / shade cloth', 'Lights for your tent'] },
  { category: 'Clothing', items: ['Costumes & fun outfits', 'Warm layers for night', 'Sturdy closed-toe shoes', 'Comfortable boots', 'Socks (lots of them)', 'Underwear', 'Hats / head coverings'] },
  { category: 'Hygiene', items: ['Biodegradable soap', 'Wet wipes (lots)', 'Hand sanitizer', 'Toothbrush & toothpaste', 'Medications', 'First aid kit', 'Lip balm with SPF'] },
  { category: 'Gear', items: ['Bike with lights', 'Bike lock', 'Headlamp / flashlight', 'Portable charger', 'Reusable water bottle', 'Cup / mug (for gifted drinks)', 'Trash bags (MOOP bags)'] },
];

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

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

export function InfoPage() {
  const { isAdmin } = useAuth();

  // Camp links state
  const [campDuesLink, setCampDuesLink] = useState('');
  const [notionLink, setNotionLink] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');
  const [editingDues, setEditingDues] = useState(false);
  const [editingNotion, setEditingNotion] = useState(false);
  const [editingWhatsapp, setEditingWhatsapp] = useState(false);
  const [duesDraft, setDuesDraft] = useState('');
  const [notionDraft, setNotionDraft] = useState('');
  const [whatsappDraft, setWhatsappDraft] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  // Useful links state
  const [usefulLinks, setUsefulLinks] = useState<UsefulLink[]>(DEFAULT_USEFUL_LINKS);
  const [editingLinkIdx, setEditingLinkIdx] = useState<number | null>(null);
  const [addingLink, setAddingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState<UsefulLink>({ title: '', url: '', description: '' });
  const [savingLinks, setSavingLinks] = useState(false);

  // Packing state
  const [packing, setPacking] = useState<PackingCategory[]>(DEFAULT_PACKING);
  const [editingCatIdx, setEditingCatIdx] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [addingNewCat, setAddingNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingItem, setEditingItem] = useState<{ cat: number; item: number } | null>(null);
  const [itemDraft, setItemDraft] = useState('');
  const [addingItemCat, setAddingItemCat] = useState<number | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [savingPacking, setSavingPacking] = useState(false);

  // Undo state
  const [undoLabel, setUndoLabel] = useState<string | null>(null);
  const undoLinksSnapshot = useRef<UsefulLink[] | null>(null);
  const undoPackingSnapshot = useRef<PackingCategory[] | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getDoc(doc(db, 'config', 'site')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.campDuesLink) setCampDuesLink(data.campDuesLink);
        if (data.notionLink) setNotionLink(data.notionLink);
        if (data.whatsappGroupLink) setWhatsappLink(data.whatsappGroupLink);
        if (data.usefulLinks?.length > 0) setUsefulLinks(data.usefulLinks as UsefulLink[]);
        if (data.packingCategories?.length > 0) setPacking(data.packingCategories as PackingCategory[]);
      }
    });
    return () => { if (undoTimer.current) clearTimeout(undoTimer.current); };
  }, []);

  // ——— Camp links helpers ———
  const saveCampLink = async (field: 'campDuesLink' | 'notionLink' | 'whatsappGroupLink', value: string) => {
    setSavingLink(true);
    try {
      await setDoc(doc(db, 'config', 'site'), { [field]: value }, { merge: true });
      if (field === 'campDuesLink') { setCampDuesLink(value); setEditingDues(false); }
      else if (field === 'notionLink') { setNotionLink(value); setEditingNotion(false); }
      else { setWhatsappLink(value); setEditingWhatsapp(false); }
    } catch { alert('Failed to save'); }
    finally { setSavingLink(false); }
  };

  // ——— Useful links helpers ———
  const persistLinks = async (links: UsefulLink[]) => {
    setSavingLinks(true);
    try {
      await setDoc(doc(db, 'config', 'site'), { usefulLinks: links }, { merge: true });
      // Skip state update if a soft-delete is pending (its state takes precedence)
      if (!undoLinksSnapshot.current) setUsefulLinks(links);
    } catch { alert('Failed to save'); }
    finally { setSavingLinks(false); }
  };

  const softDeleteLink = (next: UsefulLink[], label: string) => {
    undoLinksSnapshot.current = usefulLinks;
    undoPackingSnapshot.current = null;
    setUsefulLinks(next);
    setUndoLabel(label);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => {
      setDoc(doc(db, 'config', 'site'), { usefulLinks: next }, { merge: true });
      setUndoLabel(null);
      undoLinksSnapshot.current = null;
      undoTimer.current = null;
    }, 5000);
  };

  const handleSaveLinkEdit = async () => {
    if (editingLinkIdx === null) return;
    await persistLinks(usefulLinks.map((l, i) => (i === editingLinkIdx ? linkDraft : l)));
    setEditingLinkIdx(null);
  };

  const handleAddLink = async () => {
    if (!linkDraft.title || !linkDraft.url) return;
    await persistLinks([...usefulLinks, linkDraft]);
    setAddingLink(false);
    setLinkDraft({ title: '', url: '', description: '' });
  };

  const handleDeleteLink = (idx: number) => {
    softDeleteLink(usefulLinks.filter((_, i) => i !== idx), `"${usefulLinks[idx].title}" deleted`);
  };

  // ——— Packing helpers ———
  const softDeletePacking = (next: PackingCategory[], label: string) => {
    undoPackingSnapshot.current = packing;
    undoLinksSnapshot.current = null;
    setPacking(next);
    setUndoLabel(label);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => {
      setDoc(doc(db, 'config', 'site'), { packingCategories: next }, { merge: true });
      setUndoLabel(null);
      undoPackingSnapshot.current = null;
      undoTimer.current = null;
    }, 5000);
  };

  const handleUndo = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    if (undoLinksSnapshot.current) setUsefulLinks(undoLinksSnapshot.current);
    if (undoPackingSnapshot.current) setPacking(undoPackingSnapshot.current);
    undoLinksSnapshot.current = null;
    undoPackingSnapshot.current = null;
    setUndoLabel(null);
  };

  const dismissUndo = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    if (undoLinksSnapshot.current) setDoc(doc(db, 'config', 'site'), { usefulLinks }, { merge: true });
    if (undoPackingSnapshot.current) setDoc(doc(db, 'config', 'site'), { packingCategories: packing }, { merge: true });
    undoLinksSnapshot.current = null;
    undoPackingSnapshot.current = null;
    setUndoLabel(null);
  };

  const savePacking = async (categories: PackingCategory[]) => {
    setSavingPacking(true);
    try {
      await setDoc(doc(db, 'config', 'site'), { packingCategories: categories }, { merge: true });
      if (!undoPackingSnapshot.current) setPacking(categories);
    } catch { alert('Failed to save'); }
    finally { setSavingPacking(false); }
  };

  const handleRenameCat = async (idx: number) => {
    if (!editingCatName.trim()) return;
    await savePacking(packing.map((c, i) => (i === idx ? { ...c, category: editingCatName } : c)));
    setEditingCatIdx(null);
  };

  const handleDeleteCat = (idx: number) => {
    softDeletePacking(packing.filter((_, i) => i !== idx), `Category "${packing[idx].category}" deleted`);
  };

  const handleAddCat = async () => {
    if (!newCatName.trim()) return;
    await savePacking([...packing, { category: newCatName, items: [] }]);
    setAddingNewCat(false);
    setNewCatName('');
  };

  const handleSaveItem = async (catIdx: number, itemIdx: number) => {
    if (!itemDraft.trim()) return;
    await savePacking(packing.map((c, ci) =>
      ci !== catIdx ? c : { ...c, items: c.items.map((it, ii) => (ii === itemIdx ? itemDraft : it)) }
    ));
    setEditingItem(null);
  };

  const handleDeleteItem = (catIdx: number, itemIdx: number) => {
    softDeletePacking(
      packing.map((c, ci) => ci !== catIdx ? c : { ...c, items: c.items.filter((_, ii) => ii !== itemIdx) }),
      `"${packing[catIdx].items[itemIdx]}" deleted`
    );
  };

  const handleAddItem = async (catIdx: number) => {
    if (!newItemText.trim()) return;
    await savePacking(packing.map((c, ci) =>
      ci !== catIdx ? c : { ...c, items: [...c.items, newItemText] }
    ));
    setAddingItemCat(null);
    setNewItemText('');
  };

  const handleRevertToDefault = async () => {
    if (!confirm('Revert useful links and packing list to default content? All custom edits will be lost.')) return;
    await deleteDoc(doc(db, 'config', 'site'));
    setUsefulLinks(DEFAULT_USEFUL_LINKS);
    setPacking(DEFAULT_PACKING);
    setCampDuesLink('');
    setNotionLink('');
    setWhatsappLink('');
  };

  const LinkForm = ({ onSave, onCancel, saving }: { onSave: () => void; onCancel: () => void; saving: boolean }) => (
    <div className="space-y-3 p-4 bg-playa-surface rounded-lg border border-neon-purple/30">
      <Input label="Title" value={linkDraft.title} onChange={(e) => setLinkDraft({ ...linkDraft, title: e.target.value })} placeholder="Link title" />
      <Input label="URL" value={linkDraft.url} onChange={(e) => setLinkDraft({ ...linkDraft, url: e.target.value })} placeholder="https://..." />
      <Input label="Description (optional)" value={linkDraft.description} onChange={(e) => setLinkDraft({ ...linkDraft, description: e.target.value })} placeholder="Short description" />
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} isLoading={saving} disabled={!linkDraft.title || !linkDraft.url}>Save</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Resources</h1>
        <p className="text-xl text-gray-400">Everything you need to prepare for the burn</p>
      </div>

      {/* Camp */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">Camp</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Camp Dues */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Camp Dues</CardTitle>
                {isAdmin && !editingDues && (
                  <button onClick={() => { setEditingDues(true); setDuesDraft(campDuesLink); }} className="p-1 rounded bg-neon-purple/20 hover:bg-neon-purple/40 text-neon-purple">
                    <PencilIcon />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-4">
                Camp dues help cover shared expenses like infrastructure, food, and supplies.
                Please make sure your dues are paid before the burn.
              </p>
              {editingDues ? (
                <div className="space-y-2">
                  <Input
                    placeholder="https://..."
                    value={duesDraft}
                    onChange={(e) => setDuesDraft(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveCampLink('campDuesLink', duesDraft)} isLoading={savingLink}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingDues(false)}>Cancel</Button>
                  </div>
                </div>
              ) : campDuesLink ? (
                <a href={campDuesLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-neon-orange text-white rounded-lg hover:bg-neon-orange/90 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Pay Camp Dues
                </a>
              ) : (
                <p className="text-sm text-gray-500">{isAdmin ? 'Click the pencil icon to add a payment link.' : 'Payment link coming soon.'}</p>
              )}
            </CardContent>
          </Card>

          {/* Camp Notion */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Camp Notion</CardTitle>
                {isAdmin && !editingNotion && (
                  <button onClick={() => { setEditingNotion(true); setNotionDraft(notionLink); }} className="p-1 rounded bg-neon-purple/20 hover:bg-neon-purple/40 text-neon-purple">
                    <PencilIcon />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-4">
                Our shared Notion workspace contains planning documents, shopping lists,
                build schedules, and more.
              </p>
              {editingNotion ? (
                <div className="space-y-2">
                  <Input
                    placeholder="https://notion.so/..."
                    value={notionDraft}
                    onChange={(e) => setNotionDraft(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveCampLink('notionLink', notionDraft)} isLoading={savingLink}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingNotion(false)}>Cancel</Button>
                  </div>
                </div>
              ) : notionLink ? (
                <a href={notionLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-playa-card border border-playa-border text-gray-200 rounded-lg hover:border-neon-purple hover:text-neon-purple transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Open Notion
                </a>
              ) : (
                <p className="text-sm text-gray-500">{isAdmin ? 'Click the pencil icon to add the Notion link.' : 'Notion workspace link coming soon.'}</p>
              )}
            </CardContent>
          </Card>

          {/* WhatsApp */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>WhatsApp Group</CardTitle>
                {isAdmin && !editingWhatsapp && (
                  <button onClick={() => { setEditingWhatsapp(true); setWhatsappDraft(whatsappLink); }} className="p-1 rounded bg-neon-purple/20 hover:bg-neon-purple/40 text-neon-purple">
                    <PencilIcon />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-4">
                Join the camp WhatsApp group to stay connected with your fellow campers.
              </p>
              {editingWhatsapp ? (
                <div className="space-y-2">
                  <Input
                    placeholder="https://chat.whatsapp.com/..."
                    value={whatsappDraft}
                    onChange={(e) => setWhatsappDraft(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveCampLink('whatsappGroupLink', whatsappDraft)} isLoading={savingLink}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingWhatsapp(false)}>Cancel</Button>
                  </div>
                </div>
              ) : whatsappLink ? (
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-600/40 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.113 1.528 5.836L.057 23.215a.75.75 0 00.928.928l5.379-1.471A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.726 9.726 0 01-5.031-1.4l-.36-.214-3.732 1.02 1.02-3.732-.214-.36A9.726 9.726 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                  </svg>
                  Join WhatsApp
                </a>
              ) : (
                <p className="text-sm text-gray-500">{isAdmin ? 'Click the pencil icon to add the WhatsApp invite link.' : 'WhatsApp group link coming soon.'}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Useful Links */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Useful Links</h2>
          {isAdmin && !addingLink && (
            <Button size="sm" variant="add" onClick={() => { setAddingLink(true); setLinkDraft({ title: '', url: '', description: '' }); }}>
              + Add Link
            </Button>
          )}
        </div>

        {addingLink && (
          <div className="mb-4">
            <LinkForm onSave={handleAddLink} onCancel={() => setAddingLink(false)} saving={savingLinks} />
          </div>
        )}

        <div className="space-y-3">
          {usefulLinks.map((link, idx) => (
            <div key={idx}>
              {isAdmin && editingLinkIdx === idx ? (
                <LinkForm
                  onSave={handleSaveLinkEdit}
                  onCancel={() => setEditingLinkIdx(null)}
                  saving={savingLinks}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-playa-surface rounded-lg hover:bg-playa-card transition-colors group flex-1 min-w-0"
                  >
                    <div className="min-w-0">
                      <span className="text-gray-300 group-hover:text-white font-medium">{link.title}</span>
                      {link.description && (
                        <p className="text-gray-500 text-sm truncate">{link.description}</p>
                      )}
                    </div>
                    <ExternalLinkIcon />
                  </a>
                  {isAdmin && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditingLinkIdx(idx); setLinkDraft({ ...link }); }}
                        className="p-1.5 rounded bg-neon-purple/20 hover:bg-neon-purple/40 text-neon-purple"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        onClick={() => handleDeleteLink(idx)}
                        className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Packing List */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Packing List</h2>
          {isAdmin && !addingNewCat && (
            <Button size="sm" variant="add" onClick={() => setAddingNewCat(true)}>+ Add Category</Button>
          )}
        </div>

        {addingNewCat && (
          <div className="mb-4 flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="Category Name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g., Electronics"
                autoFocus
              />
            </div>
            <Button size="sm" onClick={handleAddCat} isLoading={savingPacking}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAddingNewCat(false); setNewCatName(''); }}>Cancel</Button>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packing.map((cat, catIdx) => (
            <Card key={catIdx}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  {isAdmin && editingCatIdx === catIdx ? (
                    <div className="flex gap-2 items-center w-full">
                      <input
                        className="flex-1 px-2 py-1 bg-playa-card border border-neon-purple rounded text-white text-sm focus:outline-none"
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCat(catIdx); if (e.key === 'Escape') setEditingCatIdx(null); }}
                      />
                      <button onClick={() => handleRenameCat(catIdx)} className="text-neon-purple hover:text-neon-purple/80 text-xs font-medium">Save</button>
                      <button onClick={() => setEditingCatIdx(null)} className="text-gray-500 hover:text-gray-300 text-xs">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <CardTitle>{cat.category}</CardTitle>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditingCatIdx(catIdx); setEditingCatName(cat.category); }}
                            className="p-1 rounded bg-neon-purple/20 hover:bg-neon-purple/40 text-neon-purple"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteCat(catIdx)}
                            className="p-1 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {cat.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-center gap-2 text-gray-400">
                      {isAdmin && editingItem?.cat === catIdx && editingItem?.item === itemIdx ? (
                        <div className="flex gap-1 w-full">
                          <input
                            className="flex-1 px-2 py-0.5 bg-playa-card border border-neon-purple rounded text-gray-200 text-sm focus:outline-none"
                            value={itemDraft}
                            onChange={(e) => setItemDraft(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveItem(catIdx, itemIdx); if (e.key === 'Escape') setEditingItem(null); }}
                          />
                          <button onClick={() => handleSaveItem(catIdx, itemIdx)} className="text-neon-purple text-xs font-medium">Save</button>
                          <button onClick={() => setEditingItem(null)} className="text-gray-500 text-xs">✕</button>
                        </div>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-neon-cyan flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span className="text-sm flex-1">{item}</span>
                          {isAdmin && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => { setEditingItem({ cat: catIdx, item: itemIdx }); setItemDraft(item); }}
                                className="p-0.5 rounded bg-neon-purple/20 hover:bg-neon-purple/40 text-neon-purple"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteItem(catIdx, itemIdx)}
                                className="p-0.5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>

                {isAdmin && (
                  <div className="mt-3">
                    {addingItemCat === catIdx ? (
                      <div className="flex gap-1 items-center">
                        <input
                          className="flex-1 px-2 py-1 bg-playa-card border border-neon-purple/40 rounded text-gray-200 text-sm focus:outline-none focus:border-neon-purple"
                          value={newItemText}
                          onChange={(e) => setNewItemText(e.target.value)}
                          placeholder="New item..."
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(catIdx); if (e.key === 'Escape') { setAddingItemCat(null); setNewItemText(''); } }}
                        />
                        <button onClick={() => handleAddItem(catIdx)} className="text-neon-purple text-xs font-medium px-1">Add</button>
                        <button onClick={() => { setAddingItemCat(null); setNewItemText(''); }} className="text-gray-500 text-xs">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingItemCat(catIdx); setNewItemText(''); }}
                        className="text-xs text-neon-orange hover:text-neon-orange/80 transition-colors mt-1 font-medium"
                      >
                        + Add item
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {isAdmin && (
        <div className="mt-10 text-center">
          <Button variant="ghost" onClick={handleRevertToDefault} className="text-gray-500 hover:text-red-400">
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
