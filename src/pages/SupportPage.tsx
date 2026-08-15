import { useState, useEffect } from 'react';
import { Send, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function SupportPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  useEffect(() => { document.title = 'Support | Streak'; }, []);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (status === 'error') setStatus('idle');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim()) return;

    setStatus('loading');
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-support`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            subject: form.subject.trim(),
            message: form.message.trim(),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
        setStatus('error');
      } else {
        setStatus('success');
        setForm({ name: '', email: '', subject: '', message: '' });
      }
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  };

  return (
    <div className="bg-black text-white min-h-screen pt-28 pb-24 px-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <img src="/images/logo_s-removebg-preview.png" alt="Streak" className="h-24 mx-auto mb-6 object-contain" />
          <h1 className="text-4xl sm:text-5xl font-black mb-4">We're Here For You</h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-lg mx-auto">
            Have a question, feedback, or need help? Send us a message and our team will get back to you as soon as possible.
          </p>
        </div>

        {/* Success state */}
        {status === 'success' ? (
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-10 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle size={48} className="text-green-400" />
            </div>
            <h2 className="text-2xl font-black mb-3">Message Received!</h2>
            <p className="text-gray-400 leading-relaxed mb-6">
              Thanks for reaching out. We'll review your request and get back to you shortly.
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="text-sm text-gray-400 hover:text-white transition-colors underline underline-offset-4"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-zinc-900 border border-white/10 rounded-2xl p-8 flex flex-col gap-6">
            {/* Name */}
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm font-semibold text-gray-300 tracking-wide">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Your full name"
                required
                className="bg-black border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors text-sm"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-semibold text-gray-300 tracking-wide">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-black border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors text-sm"
              />
            </div>

            {/* Subject */}
            <div className="flex flex-col gap-2">
              <label htmlFor="subject" className="text-sm font-semibold text-gray-300 tracking-wide">
                Subject <span className="text-red-400">*</span>
              </label>
              <input
                id="subject"
                type="text"
                value={form.subject}
                onChange={(e) => update('subject', e.target.value)}
                placeholder="What's this about?"
                required
                className="bg-black border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors text-sm"
              />
            </div>

            {/* Message */}
            <div className="flex flex-col gap-2">
              <label htmlFor="message" className="text-sm font-semibold text-gray-300 tracking-wide">
                Message <span className="text-gray-600 font-normal">(optional)</span>
              </label>
              <textarea
                id="message"
                value={form.message}
                onChange={(e) => update('message', e.target.value)}
                placeholder="Tell us more..."
                rows={5}
                className="bg-black border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors text-sm resize-none"
              />
            </div>

            {/* Error */}
            {status === 'error' && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                <AlertCircle size={16} />
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="inline-flex items-center justify-center gap-2 bg-white text-black px-6 py-4 rounded-xl font-bold text-sm tracking-wide hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {status === 'loading' ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={15} />
                  Send Message
                </>
              )}
            </button>
          </form>
        )}

        {/* Extra info */}
        <div className="mt-10 grid sm:grid-cols-2 gap-4 text-center text-sm">
          <div className="bg-zinc-900/60 border border-white/10 rounded-xl p-5">
            <p className="text-white font-semibold mb-1">Response Time</p>
            <p className="text-gray-500">We aim to reply within 24–48 hours.</p>
          </div>
          <div className="bg-zinc-900/60 border border-white/10 rounded-xl p-5">
            <p className="text-white font-semibold mb-1">In Crisis?</p>
            <p className="text-gray-500">Open the app and tap the Panic Button for immediate support from Spyke.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
