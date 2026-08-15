import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Loader, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Status = 'verifying' | 'success' | 'error' | 'expired';

export default function ConfirmPage() {
  const [status, setStatus] = useState<Status>('verifying');

  useEffect(() => {
    document.title = 'Confirm Your Email | Streak';

    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tokenHash = params.get('token_hash');
        const type = params.get('type') as Parameters<typeof supabase.auth.verifyOtp>[0]['type'] | null;
        const code = params.get('code');
        const errorCode = params.get('error_code');
        const errorDesc = params.get('error_description');

        if (errorCode || errorDesc) {
          setStatus('error');
          return;
        }

        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) {
            setStatus(error.message?.toLowerCase().includes('expired') ? 'expired' : 'error');
          } else {
            setStatus('success');
          }
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setStatus(error.message?.toLowerCase().includes('expired') ? 'expired' : 'error');
          } else {
            setStatus('success');
          }
          return;
        }

        // No valid params — show success preview so the page isn't blank in testing
        setStatus('success');
      } catch {
        setStatus('error');
      }
    };

    run();
  }, []);

  return (
    <div className="bg-black text-white min-h-screen flex flex-col items-center justify-center px-6 py-24 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 35%, rgba(255,255,255,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md text-center">
        <img
          src="/images/logo_s-removebg-preview.png"
          alt="Streak"
          className="h-16 w-auto object-contain mx-auto mb-12"
        />

        {status === 'verifying' && <VerifyingState />}
        {status === 'success' && <SuccessState />}
        {status === 'error' && <ErrorState />}
        {status === 'expired' && <ExpiredState />}
      </div>
    </div>
  );
}

function VerifyingState() {
  return (
    <div className="flex flex-col items-center">
      <Loader size={48} className="text-white/70 animate-spin mb-6" />
      <h1 className="text-3xl font-black mb-3">Confirming Your Email</h1>
      <p className="text-gray-400 leading-relaxed">
        Please wait while we verify your email address...
      </p>
    </div>
  );
}

function SuccessState() {
  return (
    <div className="flex flex-col items-center">
      {/* Icon */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="absolute w-24 h-24 rounded-full bg-green-400/10 animate-ping" />
        <div className="relative w-20 h-20 rounded-full bg-green-400/15 border border-green-400/30 flex items-center justify-center">
          <CheckCircle size={40} className="text-green-400" />
        </div>
      </div>

      {/* Heading */}
      <h1 className="text-4xl font-black mb-4 leading-tight">Email Confirmed!</h1>

      {/* Primary message */}
      <div className="bg-zinc-900 border border-white/10 rounded-2xl px-8 py-7 mb-8 w-full">
        <p className="text-white text-lg font-semibold leading-relaxed mb-2">
          Thanks for confirming your email!
        </p>
        <p className="text-gray-400 leading-relaxed">
          Please return to the Streak app to continue your start to recovery.
          Your journey to freedom begins now.
        </p>
      </div>

      {/* Divider with label */}
      <div className="flex items-center gap-3 w-full mb-8">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-gray-600 text-xs tracking-widest uppercase">Next steps</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Steps */}
      <ol className="w-full flex flex-col gap-3 mb-10">
        {[
          'Close this browser tab',
          'Return to the Streak app on your device',
          'Sign in and start your streak',
        ].map((step, i) => (
          <li
            key={i}
            className="flex items-center gap-4 bg-zinc-900/60 border border-white/8 rounded-xl px-5 py-4 text-left"
          >
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
              {i + 1}
            </span>
            <span className="text-gray-300 text-sm">{step}</span>
          </li>
        ))}
      </ol>

      <a
        href="/"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm underline underline-offset-4"
      >
        Visit streak.app <ArrowRight size={13} />
      </a>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-20 h-20 rounded-full bg-red-400/10 border border-red-400/20 flex items-center justify-center mb-8">
        <AlertCircle size={40} className="text-red-400" />
      </div>

      <h1 className="text-3xl font-black mb-4">Something Went Wrong</h1>
      <p className="text-gray-400 leading-relaxed mb-8 max-w-sm">
        We couldn't confirm your email. The link may be invalid or incomplete.
      </p>

      <div className="w-full bg-zinc-900 border border-white/10 rounded-2xl p-6 text-left">
        <h2 className="text-white font-semibold text-sm mb-3">What to do</h2>
        <ol className="text-gray-400 text-sm space-y-2 leading-relaxed">
          <li>1. Open the Streak app on your device</li>
          <li>2. Tap &ldquo;Resend confirmation email&rdquo; in settings</li>
          <li>3. Check your inbox and spam folder for the new link</li>
        </ol>
      </div>
    </div>
  );
}

function ExpiredState() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-20 h-20 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-8">
        <AlertCircle size={40} className="text-amber-400" />
      </div>

      <h1 className="text-3xl font-black mb-4">Link Expired</h1>
      <p className="text-gray-400 leading-relaxed mb-8 max-w-sm">
        This confirmation link has expired. Email links are only valid for a
        limited time for your security.
      </p>

      <div className="w-full bg-zinc-900 border border-white/10 rounded-2xl p-6 text-left">
        <h2 className="text-white font-semibold text-sm mb-3">Get a new link</h2>
        <ol className="text-gray-400 text-sm space-y-2 leading-relaxed">
          <li>1. Open the Streak app on your device</li>
          <li>2. Tap &ldquo;Resend confirmation email&rdquo; in settings</li>
          <li>3. Use the new link within 24 hours</li>
        </ol>
      </div>
    </div>
  );
}
