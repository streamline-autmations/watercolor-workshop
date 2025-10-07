import { LegalPageLayout } from '@/components/LegalPageLayout';

const Terms = () => {
  return (
    <LegalPageLayout title="Terms & Conditions">
      <p className="text-sm text-body-text/80">Last Updated: September 22, 2025</p>
      <p>
        Welcome to BLOM Academy. These terms and conditions outline the rules and regulations for the use of our online learning platform. By accessing this website and enrolling in our courses, you accept these terms and conditions in full.
      </p>

      <h2>1. Intellectual Property</h2>
      <p>
        Unless otherwise stated, BLOM Academy and/or its licensors own the intellectual property rights for all material on this platform. All intellectual property rights are reserved. This includes, but is not limited to, all video content, course materials, text, graphics, and downloadable resources.
      </p>
      <p>
        <strong>You are expressly forbidden from:</strong>
      </p>
      <ul>
        <li>Recording, screen-capturing, or otherwise creating copies of any video content.</li>
        <li>Republishing, selling, renting, or sub-licensing material from the platform.</li>
        <li>Reproducing, duplicating, or copying material for commercial purposes.</li>
        <li>Redistributing content from BLOM Academy (unless content is specifically made for redistribution).</li>
      </ul>
      <p>
        Violation of these terms will result in immediate termination of your account without a refund and may subject you to legal action for copyright infringement.
      </p>

      <h2>2. Account Responsibility</h2>
      <p>
        You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account. Access is limited to a single registered device to prevent account sharing.
      </p>

      <h2>3. Limitation of Liability</h2>
      <p>
        The information and techniques provided in our courses are for educational purposes. BLOM Academy is not liable for any outcomes, damages, or losses resulting from the application of these techniques.
      </p>

      <h2>4. Termination</h2>
      <p>
        We may terminate or suspend your access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
      </p>

      <h2>5. Governing Law</h2>
      <p>
        These terms will be governed by and construed in accordance with the laws of South Africa, and you submit to the non-exclusive jurisdiction of the state and federal courts located in South Africa for the resolution of any disputes.
      </p>
    </LegalPageLayout>
  );
};

export default Terms;