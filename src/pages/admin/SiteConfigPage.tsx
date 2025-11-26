import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { SiteConfig } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Loading } from '../../components/ui';

export function SiteConfigPage() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [campDuesLink, setCampDuesLink] = useState('');
  const [notionLink, setNotionLink] = useState('');
  const [whatsappGroupLink, setWhatsappGroupLink] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const configRef = doc(db, 'config', 'site');
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
        const data = configSnap.data() as SiteConfig;
        setConfig(data);
        setCampDuesLink(data.campDuesLink || '');
        setNotionLink(data.notionLink || '');
        setWhatsappGroupLink(data.whatsappGroupLink || '');
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const configRef = doc(db, 'config', 'site');
      await setDoc(configRef, {
        campDuesLink,
        notionLink,
        whatsappGroupLink,
        packingList: config?.packingList || [],
        usefulLinks: config?.usefulLinks || [],
      }, { merge: true });
      alert('Configuration saved!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Site Configuration</h1>
        <p className="text-gray-400">Edit site-wide settings and links</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Important Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Camp Dues Payment Link"
              placeholder="https://..."
              value={campDuesLink}
              onChange={(e) => setCampDuesLink(e.target.value)}
            />
            <p className="text-sm text-gray-500 -mt-2">
              Link where members can pay their camp dues (Venmo, PayPal, etc.)
            </p>

            <Input
              label="Notion Workspace Link"
              placeholder="https://notion.so/..."
              value={notionLink}
              onChange={(e) => setNotionLink(e.target.value)}
            />
            <p className="text-sm text-gray-500 -mt-2">
              Link to your camp's shared Notion workspace
            </p>

            <Input
              label="WhatsApp Group Link"
              placeholder="https://chat.whatsapp.com/..."
              value={whatsappGroupLink}
              onChange={(e) => setWhatsappGroupLink(e.target.value)}
            />
            <p className="text-sm text-gray-500 -mt-2">
              Direct link to join the camp WhatsApp group
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm">
              Additional configuration options like packing list items and useful links
              can be managed directly in the Firebase console or through future updates
              to this admin panel.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} isLoading={saving}>
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
