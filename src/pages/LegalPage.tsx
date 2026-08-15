import { useState, useEffect } from 'react';

type Tab = 'privacy' | 'terms';

export default function LegalPage() {
  const [tab, setTab] = useState<Tab>('privacy');
  useEffect(() => { document.title = 'Privacy & Terms | Streak'; }, []);

  return (
    <div className="bg-black text-white min-h-screen pt-28 pb-24 px-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-black mb-4">Legal</h1>
          <p className="text-gray-500">Last updated: July 2, 2026</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 border border-white/10 rounded-xl p-1 mb-10 w-fit mx-auto">
          {(['privacy', 'terms'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                tab === t ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 sm:p-10 prose prose-invert max-w-none">
          {tab === 'privacy' ? <PrivacyPolicy /> : <TermsOfService />}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-white mb-3 mt-0">{title}</h2>
      <div className="text-gray-400 leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-inside space-y-1 ml-2">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

function PrivacyPolicy() {
  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-2 mt-0">Streak Privacy Policy</h1>
      <p className="text-gray-500 text-sm mb-8">Effective Date: July 2, 2026</p>

      <Section title="1. Introduction">
        <p>Streak Pty Ltd ("Streak", "we", "us", "Company" or "our") respects your privacy and is committed to protecting your personal information.</p>
        <p>This Privacy Policy explains how we collect, use, disclose, store, and protect your information when you use the Streak application and related services.</p>
        <p>This policy is intended to comply with the Privacy Act 1988 (Cth), the Australian Privacy Principles, and other applicable privacy laws.</p>
      </Section>

      <Section title="2. Contact Information">
        <p>Privacy enquiries can be directed to:</p>
        <p>Email: <a href="mailto:streakappofficial@gmail.com" className="text-white underline underline-offset-2 hover:text-gray-300 transition-colors">streakappofficial@gmail.com</a></p>
      </Section>

      <Section title="3. Information We Collect">
        <p><strong className="text-white">Identity &amp; Contact Information</strong></p>
        <p>We may collect:</p>
        <BulletList items={['Name', 'Email address', 'Phone number', 'Billing information', 'Date of birth or age verification information']} />

        <p className="mt-4"><strong className="text-white">Account Information</strong></p>
        <p>We may collect:</p>
        <BulletList items={['Username', 'Profile information', 'Subscription status', 'Account preferences']} />
        <p>Passwords are securely encrypted and are not stored in plain text.</p>

        <p className="mt-4"><strong className="text-white">Recovery Information</strong></p>
        <p>To provide our services, we may collect:</p>
        <BulletList items={['Recovery streak data', 'Relapse events', 'Daily check-ins', 'Goal tracking information', 'Educational module completion', 'Progress metrics', 'Accountability activity', 'Support requests']} />

        <p className="mt-4"><strong className="text-white">Community Information</strong></p>
        <p>We may collect information voluntarily submitted through community discussions, comments, direct messages, and accountability groups.</p>

        <p className="mt-4"><strong className="text-white">Payment Information</strong></p>
        <p>Payments are processed by authorised third-party providers including Apple App Store and Google Play Store. We do not store complete payment card information. We may receive transaction identifiers, subscription status, and billing-related information.</p>

        <p className="mt-4"><strong className="text-white">Technical Information</strong></p>
        <p>We may collect:</p>
        <BulletList items={['IP address', 'Device identifiers', 'Operating system information', 'Application version', 'Time zone', 'Usage analytics', 'Crash reports', 'Diagnostic information']} />
      </Section>

      <Section title="4. How We Collect Information">
        <p>We collect information through:</p>
        <BulletList items={['Account registration', 'Subscription purchases', 'User submissions', 'Community participation', 'Customer support interactions', 'Analytics technologies', 'Third-party integrations']} />
      </Section>

      <Section title="5. How We Use Information">
        <p>We use information to:</p>
        <BulletList items={['Provide the Service', 'Manage accounts', 'Process subscriptions', 'Deliver customer support', 'Track progress', 'Improve user experience', 'Maintain community safety', 'Prevent fraud', 'Comply with legal obligations', 'Conduct analytics and performance monitoring']} />
      </Section>

      <Section title="6. AI Features">
        <p>Where AI-assisted features are provided, information submitted by users may be processed by automated systems to generate responses, educational content, or recovery-related guidance. AI-generated outputs are intended for informational purposes only.</p>
      </Section>

      <Section title="7. Community Features">
        <p>Information shared within community features may be visible to other users. Users should exercise caution before sharing sensitive personal information publicly.</p>
      </Section>

      <Section title="8. Disclosure of Information">
        <p>We may disclose information to:</p>
        <BulletList items={['Payment processors', 'Cloud hosting providers', 'Analytics providers', 'Customer support providers', 'Professional advisers', 'Regulatory authorities where legally required']} />
        <p>We do not sell personal information to third parties.</p>
      </Section>

      <Section title="9. International Data Transfers">
        <p>Some service providers may process information outside Australia. Where international transfers occur, we take reasonable steps to ensure information receives protections substantially similar to those required under Australian law.</p>
      </Section>

      <Section title="10. Data Retention">
        <p>We retain information only as long as reasonably necessary. Typical retention periods include:</p>
        <BulletList items={['Account information: While account remains active', 'Transaction records: Up to 7 years', 'Support records: Up to 3 years', 'Analytics data: Up to 26 months']} />
      </Section>

      <Section title="11. Security">
        <p>We implement reasonable safeguards including:</p>
        <BulletList items={['Encryption in transit', 'Encryption at rest', 'Access controls', 'Secure hosting', 'Authentication protections', 'Security monitoring']} />
        <p>Despite our efforts, no system can guarantee absolute security.</p>
      </Section>

      <Section title="12. Your Privacy Rights">
        <p>Subject to applicable laws, you may request:</p>
        <BulletList items={['Access to personal information', 'Correction of inaccurate information', 'Deletion of personal information', 'Withdrawal of consent where applicable']} />
        <p>Requests may be submitted to: <a href="mailto:streakappofficial@gmail.com" className="text-white underline underline-offset-2 hover:text-gray-300 transition-colors">streakappofficial@gmail.com</a></p>
      </Section>

      <Section title="13. Account Deletion">
        <p>Users may request deletion of their account and associated personal information by contacting support or using any in-app deletion tools we provide. Certain information may be retained where required by law.</p>
      </Section>

      <Section title="14. Marketing Communications">
        <p>Users may opt out of marketing communications at any time by clicking unsubscribe links, updating preferences, or contacting support. Service-related communications may still be sent where necessary.</p>
      </Section>

      <Section title="15. Children's Privacy">
        <p>The Service is intended only for individuals aged 18 years or older. We do not knowingly collect personal information from children.</p>
      </Section>

      <Section title="16. Data Breaches">
        <p>Where required under Australian law, we will notify affected individuals and the Office of the Australian Information Commissioner (OAIC) of eligible data breaches.</p>
      </Section>

      <Section title="17. Complaints">
        <p>If you believe we have breached applicable privacy laws, please contact us first. If you are dissatisfied with our response, you may contact the Office of the Australian Information Commissioner (OAIC).</p>
      </Section>

      <Section title="18. Changes to This Policy">
        <p>We may update this Privacy Policy from time to time. Updated versions will be published through the Service.</p>
      </Section>

      <Section title="19. Contact">
        <p>Privacy enquiries: <a href="mailto:streakappofficial@gmail.com" className="text-white underline underline-offset-2 hover:text-gray-300 transition-colors">streakappofficial@gmail.com</a></p>
      </Section>
    </div>
  );
}

function TermsOfService() {
  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-2 mt-0">Streak Terms of Service</h1>
      <p className="text-gray-500 text-sm mb-8">Effective Date: July 2, 2026</p>

      <Section title="1. Introduction">
        <p>These Terms of Service ("Terms") govern your access to and use of the Streak mobile application, website, community features, educational content, support tools, and related services (collectively, the "Service") operated by Streak Pty Ltd ("Streak", "we", "us", or "our").</p>
        <p>By creating an account, accessing, or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, you must not use the Service.</p>
      </Section>

      <Section title="2. Eligibility">
        <p>You must be at least 18 years old to access or use the Service. By using the Service, you represent and warrant that:</p>
        <BulletList items={['You are at least 18 years old', 'You have the legal capacity to enter into a binding agreement', 'You will comply with all applicable laws and regulations']} />
      </Section>

      <Section title="3. Purpose of the Service">
        <p>Streak is designed to provide educational resources, behavioural support tools, accountability features, progress tracking, relapse prevention tools, community support, and recovery-related content for individuals seeking to reduce or stop gambling behaviour.</p>
        <p>The Service is intended for informational and self-improvement purposes only.</p>
      </Section>

      <Section title="4. Health & Medical Disclaimer">
        <p>Streak is not a healthcare provider. The Service does not provide:</p>
        <BulletList items={['Medical treatment', 'Psychological treatment', 'Counselling', 'Psychiatric services', 'Addiction therapy', 'Crisis intervention services']} />
        <p>Information provided through the Service is for educational purposes only and should not be relied upon as medical, psychological, financial, or legal advice. You should consult qualified professionals regarding your individual circumstances.</p>
      </Section>

      <Section title="5. Emergency Disclaimer">
        <p>The Service is not monitored continuously and is not intended for emergency situations. If you are experiencing suicidal thoughts, mental health emergencies, risk of self-harm, or immediate danger — <strong className="text-white">contact emergency services or a qualified healthcare professional immediately.</strong></p>
        <p>Streak cannot guarantee immediate responses to support requests, messages, or community interactions.</p>
      </Section>

      <Section title="6. Account Registration">
        <p>To access certain features, you may be required to create an account. You agree to:</p>
        <BulletList items={['Provide accurate information', 'Keep your information up to date', 'Maintain the confidentiality of your login credentials', 'Accept responsibility for activities occurring under your account']} />
        <p>You must notify us immediately if you believe your account has been compromised.</p>
      </Section>

      <Section title="7. Subscription Services">
        <p>Streak offers recurring subscription plans, including monthly and annual subscriptions. By purchasing a subscription, you authorise the applicable app store or payment provider to charge your selected payment method.</p>
        <p><strong className="text-white">Automatic Renewal:</strong> Subscriptions automatically renew unless cancelled before the renewal date.</p>
        <p><strong className="text-white">Cancellation:</strong> Subscriptions may be cancelled through Apple App Store, Google Play Store, or other authorised payment providers. Cancellation prevents future renewals but does not typically provide refunds for the current billing period.</p>
        <p><strong className="text-white">Price Changes:</strong> We may modify subscription pricing from time to time. Any changes will be communicated in accordance with applicable laws and platform requirements.</p>
      </Section>

      <Section title="8. Payments and Refunds">
        <p>Payments are processed by third-party payment providers including Apple App Store and Google Play. We do not store complete payment card information. Refund requests for purchases made through Apple App Store or Google Play are governed by the policies of those platforms.</p>
        <p>Nothing in these Terms excludes any rights you may have under Australian Consumer Law.</p>
      </Section>

      <Section title="9. Community Features">
        <p>The Service may include community discussions, accountability groups, comments, messages, and other social features. Users are responsible for content they voluntarily submit. You acknowledge that information shared within community areas may be visible to other users. You should avoid sharing highly sensitive personal information publicly.</p>
      </Section>

      <Section title="10. User Content">
        <p>You retain ownership of content you submit to the Service. By submitting content, you grant Streak a non-exclusive, worldwide, royalty-free licence to use, host, store, reproduce, and display such content solely for operating and improving the Service.</p>
        <p>You must not post content that:</p>
        <BulletList items={['Is unlawful', 'Promotes gambling', 'Encourages relapse', 'Harasses other users', 'Contains threats or hate speech', 'Violates intellectual property rights', 'Contains misleading or fraudulent information']} />
      </Section>

      <Section title="11. Community Safety & Moderation">
        <p>We reserve the right to remove content, restrict features, suspend or terminate accounts where we reasonably believe such action is necessary to protect users, maintain community safety, enforce these Terms, or comply with legal obligations.</p>
      </Section>

      <Section title="12. Acceptable Use">
        <p>You agree not to:</p>
        <BulletList items={['Reverse engineer the Service', 'Scrape data', 'Share account access', 'Disrupt the Service', 'Attempt unauthorised access', 'Promote gambling activities', 'Exploit vulnerable users', 'Engage in fraud', 'Violate applicable laws']} />
      </Section>

      <Section title="13. Intellectual Property">
        <p>All intellectual property rights relating to the Service — including software, branding, content, systems, methodologies, educational materials, graphics, and designs — remain the property of Streak or its licensors. You are granted a limited, revocable, non-transferable, non-exclusive licence to use the Service for personal use.</p>
      </Section>

      <Section title="14. AI-Assisted Features">
        <p>Certain features may utilise artificial intelligence or automated systems. AI-generated content may contain inaccuracies and should not be relied upon as professional advice. Users remain responsible for decisions made based on information provided by AI-powered features.</p>
      </Section>

      <Section title="15. Service Availability">
        <p>We strive to provide reliable access to the Service but do not guarantee uninterrupted availability. The Service may occasionally experience maintenance, outages, technical issues, or third-party service disruptions.</p>
      </Section>

      <Section title="16. Termination">
        <p>We may suspend or terminate your access if you breach these Terms, engage in fraud, abuse other users, misuse the Service, or fail to pay applicable fees. You may stop using the Service at any time. Termination does not affect rights or obligations accrued before termination.</p>
      </Section>

      <Section title="17. Limitation of Liability">
        <p>To the maximum extent permitted by law:</p>
        <BulletList items={['We do not guarantee that users will stop gambling', 'We do not guarantee specific recovery outcomes', 'We do not guarantee continuous abstinence or relapse prevention']} />
        <p>Our liability is limited to the amount paid by you for the Service during the twelve months preceding the event giving rise to the claim. Nothing in these Terms excludes liability that cannot be excluded under Australian law.</p>
      </Section>

      <Section title="18. Indemnity">
        <p>You agree to indemnify and hold harmless Streak, its directors, officers, employees, contractors, and affiliates from claims arising from your use of the Service, your breach of these Terms, or your violation of applicable laws.</p>
      </Section>

      <Section title="19. Third-Party Services">
        <p>The Service may integrate with third-party providers. We are not responsible for the practices, availability, or actions of third-party services.</p>
      </Section>

      <Section title="20. Governing Law">
        <p>These Terms are governed by the laws of Australia. Any dispute arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Australia.</p>
      </Section>

      <Section title="21. Changes to Terms">
        <p>We may update these Terms periodically. Continued use of the Service following updates constitutes acceptance of the revised Terms.</p>
      </Section>

      <Section title="22. Contact">
        <p>For support or legal enquiries:</p>
        <p>Email: <a href="mailto:streakappofficial@gmail.com" className="text-white underline underline-offset-2 hover:text-gray-300 transition-colors">streakappofficial@gmail.com</a></p>
      </Section>
    </div>
  );
}
