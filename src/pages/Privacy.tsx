import { LegalPageLayout } from '@/components/LegalPageLayout';

const Privacy = () => {
  return (
    <LegalPageLayout title="Privacy Policy">
      <p className="text-sm text-body-text/80">Last Updated: September 22, 2025</p>
      <p>
        Your privacy is important to us. It is BLOM Academy's policy to respect your privacy regarding any information we may collect from you across our website.
      </p>

      <h2>1. Information We Collect</h2>
      <p>We collect information you directly provide to us. This includes:</p>
      <ul>
        <li><strong>Account Information:</strong> Your first name, last name, email address, phone number, and password when you create an account.</li>
        <li><strong>Profile Information:</strong> Your Facebook name for access to our private student group.</li>
        <li><strong>Usage Data:</strong> Information about your progress in courses, including lessons viewed and completed.</li>
        <li><strong>Device Information:</strong> A unique, anonymized fingerprint of your device to ensure account security.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide, maintain, and improve our services.</li>
        <li>Grant you access to the private Facebook student group.</li>
        <li>Communicate with you, including sending you service-related notifications.</li>
        <li>Monitor and analyze trends, usage, and activities in connection with our services.</li>
        <li>Secure your account and prevent unauthorized access.</li>
      </ul>

      <h2>3. Data Storage and Security</h2>
      <p>
        Your data is securely stored using Supabase, our backend service provider. We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction.
      </p>

      <h2>4. Sharing of Information</h2>
      <p>
        We do not share your personal information with third parties except as necessary to provide our services (e.g., with Supabase for backend functionality) or as required by law.
      </p>

      <h2>5. Your Rights</h2>
      <p>
        You have the right to access, update, or delete your personal information. You can manage your profile details directly from your account page. For any other requests, please contact us directly.
      </p>
    </LegalPageLayout>
  );
};

export default Privacy;