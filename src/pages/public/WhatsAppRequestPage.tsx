import { useState, FormEvent } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Button, Input, Card, CardContent } from '../../components/ui';

export function WhatsAppRequestPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'contacts'), {
        name,
        email,
        phone,
        message,
        type: 'whatsapp_request',
        createdAt: Timestamp.now(),
        handled: false,
      });
      setSubmitted(true);
    } catch (err) {
      setError('Failed to submit request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Request Submitted!</h2>
            <p className="text-gray-400">
              We'll review your request and add you to the group soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Join Our WhatsApp Group</h1>
        <p className="text-gray-400">
          Request to be added to the ATS Camp WhatsApp group
        </p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              type="tel"
              label="Phone Number (with country code)"
              placeholder="+1 555 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Why do you want to join? (optional)
              </label>
              <textarea
                className="w-full px-4 py-2.5 bg-playa-card border border-playa-border rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-colors min-h-[100px] resize-y"
                placeholder="Tell us a bit about yourself..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Submit Request
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
