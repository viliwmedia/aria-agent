import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, TrendingUp, Heart, MessageCircle, ChevronDown } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  useEffect(() => { document.title = 'Streak'; }, []);
  return (
    <div className="bg-black text-white">

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-white/5 via-transparent to-transparent" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(255,255,255,0.15) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto">
          <img
            src="/images/logo_s-removebg-preview.png"
            alt="Streak"
            className="h-14 w-auto object-contain mx-auto mb-10"
          />
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-tight tracking-tight mb-6">
            Break Free.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500">
              Start Your Streak.
            </span>
          </h1>
          <p className="text-gray-400 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed mb-10">
            The only app built to help you quit gambling for good — with daily accountability,
            real-time support, and a community that gets it.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#features"
              className="inline-flex items-center gap-2 bg-white text-black px-7 py-3.5 rounded-full font-bold text-sm tracking-wide hover:bg-gray-200 transition-colors duration-200"
            >
              See How It Works <ArrowRight size={16} />
            </a>
            <button
              onClick={() => navigate('/support')}
              className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
            >
              Get Support
            </button>
          </div>
        </div>

        <a
          href="#features"
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-600 hover:text-white transition-colors animate-bounce"
        >
          <ChevronDown size={24} />
        </a>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-white/10">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '400M+', label: 'People worldwide affected by problem gambling' },
            { value: '$450B', label: 'Lost globally to gambling each year' },
            { value: '1 in 5', label: 'Problem gamblers attempt suicide globally' },
            { value: '24/7', label: 'Support available whenever urges strike' },
          ].map(({ value, label }) => (
            <div key={value} className="flex flex-col gap-2">
              <span className="text-3xl md:text-4xl font-black text-white">{value}</span>
              <span className="text-gray-500 text-xs leading-relaxed">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">Everything You Need to Stay Free</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Streak combines accountability tools, real insights, and human-first support into one powerful app.
            </p>
          </div>

          {/* Feature 1 — Home Page */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-5">
                <Shield size={14} className="text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-400 tracking-widest uppercase">Daily Accountability</span>
              </div>
              <h3 className="text-3xl font-black mb-4 leading-tight">Home Page</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-4">
                How we hold you accountable daily. Check in every day, track your streak, and see your savings grow in real-time.
              </p>
              <p className="text-gray-500 leading-relaxed">
                One-tap daily check-ins, a live savings tracker, and an instant SOS button — so help is never more than a tap away.
              </p>
            </div>
            <div className="flex justify-center">
              <img
                src="/images/Home_tab.png"
                alt="Streak Home Page"
                className="w-72 md:w-80 rounded-2xl object-cover shadow-2xl shadow-black/80"
              />
            </div>
          </div>

          {/* Feature 2 — Tracking */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
            <div className="order-2 md:order-1 flex justify-center">
              <img
                src="/images/Tracking_growth.png"
                alt="Tracking Your Growth"
                className="w-72 md:w-80 rounded-2xl object-cover shadow-2xl shadow-black/80"
              />
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-5">
                <TrendingUp size={14} className="text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-400 tracking-widest uppercase">Analytics</span>
              </div>
              <h3 className="text-3xl font-black mb-4 leading-tight">Tracking Your Growth</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-4">
                On the analytics page you can see your growth every day.
              </p>
              <p className="text-gray-500 leading-relaxed">
                Track your days clean, check-in streaks, setbacks, milestones, and the money you've saved — all in one beautiful dashboard.
              </p>
            </div>
          </div>

          {/* Feature 3 — Calculations */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-5">
                <Heart size={14} className="text-red-400" />
                <span className="text-xs font-semibold text-red-400 tracking-widest uppercase">Reality Check</span>
              </div>
              <h3 className="text-3xl font-black mb-4 leading-tight">The Truth About Your Losses</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-4">
                Our Calculations Page shows you the harsh reality.
              </p>
              <p className="text-gray-500 leading-relaxed">
                See exactly what gambling is costing you — money, time, and opportunities. Numbers you can't ignore. Clarity that creates change.
              </p>
            </div>
            <div className="flex justify-center">
              <img
                src="/images/App_Launch_Your_Story_in_Black_Bright_Green_Cool_Corporate_Style.png"
                alt="The Truth About Your Losses"
                className="w-72 md:w-80 rounded-2xl object-cover shadow-2xl shadow-black/80"
              />
            </div>
          </div>

          {/* Feature 4 — SOS */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 flex justify-center">
              <img
                src="/images/spyke_sos_page.png"
                alt="24/7 Relapse Support"
                className="w-72 md:w-80 rounded-2xl object-cover shadow-2xl shadow-black/80"
              />
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-5">
                <MessageCircle size={14} className="text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-400 tracking-widest uppercase">Crisis Support</span>
              </div>
              <h3 className="text-3xl font-black mb-4 leading-tight">24/7 Relapse Support</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-4">
                Our chatbot works around the clock to ensure you don't feel alone when the urges hit.
              </p>
              <p className="text-gray-500 leading-relaxed">
                The Panic Button is always one tap away. Breathe. Read the real cost of relapsing. Then chat with Spyke — anytime, any hour.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Meet Spyke */}
      <section className="py-24 px-6 bg-gradient-to-b from-black via-zinc-950 to-black">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl font-black mb-5 leading-tight">
                Meet Spyke!
              </h2>
              <p className="text-gray-400 text-xl leading-relaxed mb-6">
                He is our 24/7 chatbot who is there for you at any time of the day.
              </p>
              <p className="text-gray-500 leading-relaxed mb-8">
                Spyke never judges. He listens, encourages, and guides you through moments of weakness with science-backed strategies — day or night, rain or shine.
              </p>
              <button
                onClick={() => navigate('/support')}
                className="inline-flex items-center gap-2 border border-white/20 text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-white/10 transition-colors duration-200"
              >
                Get In Touch <ArrowRight size={14} />
              </button>
            </div>
            <div className="flex justify-center">
              <img
                src="/images/spyke_2.png"
                alt="Meet Spyke"
                className="w-72 md:w-80 object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* About us */}
      <section className="py-24 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-6">Who We Are</h2>
          <p className="text-gray-400 text-lg leading-relaxed mb-6">
            Streak was built by a small team who has seen first-hand the devastating impact gambling can have on lives, families, and futures. We believe that recovery isn't about willpower alone — it's about having the right tools, the right information, and the right support system.
          </p>
          <p className="text-gray-500 leading-relaxed mb-6">
            Our mission is simple: to help every person who wants to quit gambling, actually quit — and to celebrate every single day they stay free.
          </p>
          <p className="text-gray-500 leading-relaxed">
            Streak is more than an app. It's a commitment to your future self.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gradient-to-t from-zinc-950 to-black">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-black mb-4">Ready to Start Your Streak?</h2>
          <p className="text-gray-500 mb-10">Every day free is a day won. Let's start today.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/support')}
              className="inline-flex items-center justify-center gap-2 bg-white text-black px-8 py-4 rounded-full font-bold text-sm tracking-wide hover:bg-gray-200 transition-colors duration-200"
            >
              Contact Support <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
