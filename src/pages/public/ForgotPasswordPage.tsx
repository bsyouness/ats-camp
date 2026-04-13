import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { resetPassword } from '../../services/auth';
import { Button, Input } from '../../components/ui';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await resetPassword(email);
      setSubmitted(true);
    } catch (err) {
      const error = err as { code?: string };
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        // Don't reveal whether the email exists
        setSubmitted(true);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-gray-400">
            {submitted
              ? 'Check your inbox'
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        <div className="bg-playa-surface border border-playa-border rounded-xl p-8">
          {submitted ? (
            <div className="text-center space-y-4">
              <p className="text-gray-300 text-sm">
                If an account exists for <span className="text-white font-medium">{email}</span>,
                you'll receive a password reset email shortly.
              </p>
              <Link
                to="/login"
                className="block text-neon-cyan hover:underline text-sm mt-4"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <Button type="submit" className="w-full" isLoading={isLoading}>
                Send Reset Link
              </Button>

              <p className="text-center text-gray-400 text-sm">
                <Link to="/login" className="text-neon-cyan hover:underline">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
