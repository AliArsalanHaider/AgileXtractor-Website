// app/components/Footer.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { FiMail, FiPhone, FiMapPin } from "react-icons/fi";
import { FaYoutube, FaFacebookF, FaLinkedinIn, FaInstagram } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="relative text-white overflow-hidden">
      {/* ---- Top band (plain white) + Robot ---- */}
      <div className="relative bg-white ">
        {/* same height as before, just a plain white band */}
        <div
          className="relative block w-full h-[170px] md:h-[190px] lg:h-[210px] z-10"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[170px] md:h-[190px] lg:h-[210px]">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[170px] md:h-[190px] lg:h-[210px]">
            <Image
              src="/robot.png"
              alt="Robot"
              fill
              className="object-contain object-right"
              priority
            />
          </div>
        </div>
      </div>

      {/* ---- Main blue footer; video behind ---- */}
      <div className="relative overflow-hidden bg-[#0B3658]
                      -mt-[100px] md:-mt-[140px] lg:-mt-[160px]">
        <video
          src="/God%20rays%20new.mp4"
          className="absolute inset-0 w-full h-full object-cover object-top"
          autoPlay
          muted
          loop
          playsInline
          /* remove top fade so background reaches up to robot band */
          style={{
            WebkitMaskImage: "none",
            maskImage: "none",
          }}
        />
        <div className="absolute inset-0 bg-[#0B3658]/70" />

        {/* === Faded background logo watermark === */}
        <div className="absolute bottom-0 left-0 z-0 opacity-5 pointer-events-none select-none">
          <Image
            src="/Logo.png"
            alt="AgileXtract watermark"
            width={700}
            height={250}
            className="object-contain -translate-x-38 translate-y-24"
            priority
          />
        </div>

        {/* ===== CONTENT ===== */}
        <div className="relative z-10 mx-auto max-w-[1280px] 2xl:max-w-[1560px] px-5 sm:px-8
                        pt-[170px] md:pt-[190px] lg:pt-[210px] pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: logo + slogan */}
            <div className="lg:col-span-4 relative z-20 -mt-2 md:-mt-3 lg:-mt-4">
              <div className="w-[220px] sm:w-[240px] lg:w-[250px]">
                <Image
                  src="/Logo.png"
                  alt="AgileXtract"
                  width={250}
                  height={90}
                  className="w-full h-auto"
                  priority
                />
                <p className="mt-3 text-[15px] leading-6 text-white/90 relative z-20">
                  Delivering innovative IT solutions, advanced cybersecurity services,
                  <br />
                  and seamless digital transformation tools to drive business growth and operational excellence.
                </p>
              </div>
            </div>

            {/* Middle links */}
            <div className="lg:col-span-4 lg:-ml-4 md:-ml-2">
              <div className="grid grid-cols-2 gap-x-10">
                <ul className="space-y-3 text-[15px] leading-6">
                  <li className="flex items-center h-8"></li>
                  <li className="flex items-center h-8">
                    <FooterLink href="/">Home</FooterLink>
                  </li>
                  <li className="flex items-center h-8">
                    <FooterLink href="#EID">Features</FooterLink>
                  </li>
                  <li className="flex items-center h-8">
                    <FooterLink href="#pricing">Pricing</FooterLink>
                  </li>
                </ul>
                <ul className="space-y-3 text-[15px] leading-6">
                  <li className="flex items-center h-8"></li>
                  <li className="flex items-center h-8">
                    <FooterLink href="#contact">Contact Us</FooterLink>
                  </li>
                  <li className="flex items-center h-8">
                    <FooterLink href="#test-drive">Document Extract</FooterLink>
                  </li>
                  <li className="flex items-center h-8">
                    <FooterLink href="/privacy-policy">Privacy Policy</FooterLink>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right: socials + contact */}
            <div className="lg:col-span-4">
              <div className="mb-2 flex h-8 items-center gap-3 lg:justify-end">
                <Social href="https://www.youtube.com/@agilemtech" label="YouTube">
                  <FaYoutube className="w-5 h-5"/>
                </Social>
                <Social href="https://www.facebook.com/agile.mtech/" label="Facebook">
                  <FaFacebookF className="w-5 h-5" />
                </Social>
                <Social href="https://www.linkedin.com/company/agile-managex-technologies-llc/" label="LinkedIn">
                  <FaLinkedinIn className="w-5 h-5" />
                </Social>
                <Social href="https://www.instagram.com/agile.mtech/" label="Instagram">
                  <FaInstagram className="w-5 h-5" />
                </Social>
              </div>

              <ul className="space-y-3 text-[15px] leading-6">
                <li className="flex items-center gap-3 h-8">
                  <FiMail className="w-4 h-4 shrink-0" />
                  <a href="mailto:agile@agilemtech.ae" className="hover:text-white transition">
                    agile@agilemtech.ae
                  </a>
                </li>
                <li className="flex items-center gap-3 h-8">
                  <FiPhone className="w-4 h-4 shrink-0" />
                  <a href="tel:+97145474711" className="hover:text-white transition">
                    +971 4 547 4711
                  </a>
                </li>
                <li className="flex items-center gap-3 h-8">
                  <FiMapPin className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">
                    Office 2113 Silicon IT Tower Dubai Silicon Oasis UAE
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 h-px w-full bg-white/35" />
          <div className="mt-3 text-sm text-white/90 justify-center flex">
            © 2025 <span className="font-semibold">AgileXtract</span>. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

/* helpers */
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="hover:text-white/100 text-white/90 transition-colors">
      {children}
    </Link>
  );
}

function Social({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-white/10 hover:bg-white/20 backdrop-blur-sm transition"
    >
      <span className="text-white text-base">{children}</span>
    </Link>
  );
}
