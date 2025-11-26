import { useState, useEffect } from 'react';
import { getAllContacts, markContactHandled, deleteContact } from '../../services/contacts';
import { ContactSubmission } from '../../types';
import { Card, CardContent, Button, Loading } from '../../components/ui';

export function ContactsPage() {
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'handled'>('pending');

  useEffect(() => {
    fetchContacts();
  }, []);

  async function fetchContacts() {
    try {
      const data = await getAllContacts();
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleMarkHandled = async (contact: ContactSubmission) => {
    try {
      await markContactHandled(contact.id, !contact.handled);
      await fetchContacts();
    } catch (error) {
      console.error('Error updating contact:', error);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;

    try {
      await deleteContact(contactId);
      await fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  const formatDate = (timestamp: { toDate: () => Date }) => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'contact':
        return { label: 'Contact', color: 'neon-cyan' };
      case 'whatsapp_request':
        return { label: 'WhatsApp', color: 'green-500' };
      case 'issue_report':
        return { label: 'Issue', color: 'neon-orange' };
      default:
        return { label: type, color: 'gray-400' };
    }
  };

  const filteredContacts = contacts.filter((c) => {
    if (filter === 'pending') return !c.handled;
    if (filter === 'handled') return c.handled;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Contact Submissions</h1>
        <p className="text-gray-400">
          View and manage contact forms, WhatsApp requests, and issue reports
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-neon-orange text-white'
              : 'bg-playa-card text-gray-400 hover:text-white'
          }`}
        >
          Pending ({contacts.filter((c) => !c.handled).length})
        </button>
        <button
          onClick={() => setFilter('handled')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'handled'
              ? 'bg-neon-orange text-white'
              : 'bg-playa-card text-gray-400 hover:text-white'
          }`}
        >
          Handled ({contacts.filter((c) => c.handled).length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-neon-orange text-white'
              : 'bg-playa-card text-gray-400 hover:text-white'
          }`}
        >
          All ({contacts.length})
        </button>
      </div>

      {filteredContacts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-400">
              {filter === 'pending' ? 'No pending submissions' : 'No submissions found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredContacts.map((contact) => {
            const typeInfo = getTypeLabel(contact.type);
            return (
              <Card key={contact.id} className={contact.handled ? 'opacity-60' : ''}>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 bg-${typeInfo.color}/20 text-${typeInfo.color} text-xs rounded`}>
                          {typeInfo.label}
                        </span>
                        {contact.handled && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-xs rounded">
                            Handled
                          </span>
                        )}
                        <span className="text-gray-500 text-xs">
                          {formatDate(contact.createdAt as { toDate: () => Date })}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1">{contact.name}</h3>
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-neon-cyan text-sm hover:underline"
                      >
                        {contact.email}
                      </a>
                      {(contact as { phone?: string }).phone && (
                        <p className="text-gray-400 text-sm mt-1">
                          Phone: {(contact as { phone?: string }).phone}
                        </p>
                      )}
                      {(contact as { subject?: string }).subject && (
                        <p className="text-gray-300 mt-2 font-medium">
                          {(contact as { subject?: string }).subject}
                        </p>
                      )}
                      <p className="text-gray-400 mt-2">{contact.message}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={contact.handled ? 'ghost' : 'secondary'}
                        size="sm"
                        onClick={() => handleMarkHandled(contact)}
                      >
                        {contact.handled ? 'Mark Pending' : 'Mark Handled'}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(contact.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
