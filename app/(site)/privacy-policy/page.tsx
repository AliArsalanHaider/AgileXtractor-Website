// app/privacy-policy/page.tsx
import Link from "next/link";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

export const metadata = {
  title: "Privacy Policy | Agile Managex Technologies",
  description: "Read Agile Managex Technologies’ privacy policy.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      {/* If Header/Footer are already in your root layout, you can remove these two lines */}
      <Header />

      <main className="bg-white">
        <section className="mx-auto max-w-4xl px-6 md:px-0 py-12 md:py-16">
          <h1 className="text-3xl md:text-5xl font-bold text-[#2BAEFF] text-left">
            Privacy Policy
          </h1>

          <p className="mt-6 text-gray-700 leading-relaxed">
            At Agile Managex Technologies, we are committed to protecting the
            privacy and confidentiality of our clients, website visitors, and
            partners. This Privacy Policy outlines how we collect, use,
            disclose, and safeguard your information when you visit our website{" "}
            <Link
              href="https://agilemtech.ae"
              className="text-sky-600 underline decoration-transparent hover:decoration-inherit"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://agilemtech.ae
            </Link>{" "}
             or use our services. By accessing or using our Site,
            you agree to the terms of this Privacy Policy.
          </p>

          {/* Information We Collect */}
          <section className="mt-10">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
              Information We Collect
            </h2>
            <p className="mt-4 text-gray-700">
              We may collect personal information that you provide to us
              voluntarily, including but not limited to:
            </p>
            <ul className="mt-4 list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Contact Information:</strong> Name, email address, phone
                number, and postal address.
              </li>
              <li>
                <strong>Professional Information:</strong> Company name, job
                title, and industry.
              </li>
              <li>
                <strong>Technical Data:</strong> IP address, browser type,
                operating system, and other details collected via cookies or
                other tracking technologies.
              </li>
              <li>
                <strong>Usage Data:</strong> Information on how you use our
                website, including pages visited, time spent on pages, and
                navigation patterns.
              </li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section className="mt-10">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
              How We Use Your Information
            </h2>
            <p className="mt-4 text-gray-700">We use the information we collect for various purposes, including:</p>
            <ul className="mt-4 list-disc pl-6 space-y-2 text-gray-700">
              <li>To provide, maintain, and improve our services.</li>
              <li>To communicate with you, respond to inquiries, and provide customer support.</li>
              <li>
                To send you marketing communications, newsletters, and updates if you have opted to receive them.
              </li>
              <li>To personalize your experience on our Site.</li>
              <li>To analyze and monitor website usage and trends to enhance our services.</li>
              <li>
                To comply with legal obligations and protect the rights and interests of Agile Managex Technologies.
              </li>
            </ul>
          </section>

          {/* How We Share Your Information */}
          <section className="mt-10">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
              How We Share Your Information
            </h2>
            <p className="mt-4 text-gray-700">
              We do not sell or rent your personal information to third parties. We may share your information in the
              following circumstances:
            </p>
            <ul className="mt-4 list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Service Providers:</strong> We may share your information with trusted service providers to
                assist us in operating our Site, conducting our business, and serving you.
              </li>
              <li>
                <strong>Legal Compliance:</strong> We may disclose your information if required to do so by law or in
                response to valid requests by public authorities.
              </li>
              <li>
                <strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of all or a portion
                of our assets, your personal information may be transferred as part of the business transaction.
              </li>
            </ul>
          </section>

          {/* Cookies */}
          <section className="mt-10">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
              Cookies and Tracking Technologies
            </h2>
            <p className="mt-4 text-gray-700">
              Our Site uses cookies and similar tracking technologies to enhance your experience. You can choose to
              accept or decline cookies through your browser settings. However, declining cookies may prevent you from
              taking full advantage of our Site’s features.
            </p>
          </section>

          {/* Your Rights */}
          <section className="mt-10">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
              Your Privacy Rights
            </h2>
            <p className="mt-4 text-gray-700">Depending on your location, you may have certain rights regarding your personal information, including:</p>
            <ul className="mt-4 list-disc pl-6 space-y-2 text-gray-700">
              <li>The right to access, update, or delete your personal information.</li>
              <li>The right to object to or restrict the processing of your personal information.</li>
              <li>The right to withdraw your consent for data processing at any time.</li>
            </ul>
            <p className="mt-4 text-gray-700">
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:agile@agilemtech.ae" className="text-sky-600 underline decoration-transparent hover:decoration-inherit">
                agile@agilemtech.ae
              </a>.
            </p>
          </section>

          {/* Data Security */}
          <section className="mt-10">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">Data Security</h2>
            <p className="mt-4 text-gray-700">
              We implement a variety of security measures to protect your personal information. However, please be aware
              that no method of transmission over the internet or electronic storage is 100% secure. We strive to use
              commercially acceptable means to protect your information, but we cannot guarantee its absolute security.
            </p>
          </section>

          {/* Third-Party Links */}
          <section className="mt-10">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">Third-Party Links</h2>
            <p className="mt-4 text-gray-700">
              Our Site may contain links to third-party websites. We do not control and are not responsible for the
              privacy practices or content of these websites. We encourage you to review the privacy policies of any
              third-party sites you visit.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="mt-10">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">Children&apos;s Privacy</h2>
            <p className="mt-4 text-gray-700">
              Our services are not directed to individuals under the age of 18. We do not knowingly collect personal
              information from children under 18. If we become aware that a child under 18 has provided us with personal
              information, we will take steps to delete such information.
            </p>
          </section>

          {/* Changes */}
          <section className="mt-10">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">Changes to This Privacy Policy</h2>
            <p className="mt-4 text-gray-700">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new
              Privacy Policy on this page. You are encouraged to review this Privacy Policy periodically for any
              changes.
            </p>
          </section>

          {/* Contact */}
          <section className="mt-10">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">Contact Us</h2>
            <p className="mt-4 text-gray-700">
              If you have any questions or concerns about this Privacy Policy or our data practices, please contact us
              at:
            </p>
            <address className="mt-4 not-italic text-gray-700">
              Agile Managex Technologies
              <br />
              Office 2113 Silicon IT Tower Dubai Silicon Oasis UAE
              <br />
              <a href="mailto:info@agileaehub.ae" className="text-sky-600 underline decoration-transparent hover:decoration-inherit">
                info@agileaehub.ae
              </a>
              <br />
              <a href="tel:+97145474711" className="text-sky-600 underline decoration-transparent hover:decoration-inherit">
                +971 4 547 4711
              </a>
            </address>
            <p className="mt-6 text-gray-700">
              By using our Site, you consent to this Privacy Policy.
            </p>
          </section>
        </section>
      </main>

      <Footer />
    </>
  );
}
