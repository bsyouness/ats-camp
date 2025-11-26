import { useState, FormEvent } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Button, Input, Card, CardContent } from '../../components/ui';

export function ReportIssuePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
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
        subject,
        message,
        type: 'issue_report',
        createdAt: Timestamp.now(),
        handled: false,
      });
      setSubmitted(true);
    } catch (err) {
      setError('Failed to submit report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-neon-orange/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-neon-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Report Submitted!</h2>
            <p className="text-gray-400">
              Thanks for letting us know. We'll look into this.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Report an Issue</h1>
        <p className="text-gray-400">
          Found a problem? Let us know so we can fix it.
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
              label="Subject"
              placeholder="Brief description of the issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Details
              </label>
              <textarea
                className="w-full px-4 py-2.5 bg-playa-card border border-playa-border rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-colors min-h-[150px] resize-y"
                placeholder="Please describe the issue in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Submit Report
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
