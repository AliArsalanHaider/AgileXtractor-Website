// app/(site)/signup/page.tsx
import SignupClient from "./SignupClient";

export default function Page() {
  return (
    <section id="signup" className="min-h-screen flex items-center justify-center py-20">
      <SignupClient />
    </section>
  );
}
