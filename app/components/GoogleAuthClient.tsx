"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: any;
  }
}

type Props = {
  // Where to go after success
  redirectTo?: string;
  // Optional: hide button and only show One Tap
  buttonOnly?: boolean;
};

export default function GoogleAuthClient({ redirectTo = "/dashboard", buttonOnly = false }: Props) {
  const btnRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  // Load GIS script safely
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => setReady(true);
    document.head.appendChild(s);
    return () => {
      try {
        document.head.removeChild(s);
      } catch {}
    };
  }, []);

  // Initialize button + One Tap once
  useEffect(() => {
    if (!ready || !window.google?.accounts?.id) return;
    const client_id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    if (!client_id) return;

    const handleResponse = async (response: { credential: string }) => {
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || "Google sign-in failed");
        }
        window.dispatchEvent(new Event("agx:auth-changed"));
        window.location.assign(redirectTo);
      } catch (e) {
        console.error(e);
        alert("Google sign-in failed. Please try again.");
      }
    };

    window.google.accounts.id.initialize({
      client_id,
      callback: handleResponse,
      auto_select: false,
      ux_mode: "popup", // or "redirect"
      context: "signin",
    });

    // Render a standard Google button (if desired)
    if (btnRef.current) {
      window.google.accounts.id.renderButton(btnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "left",
        width: 260,
      });
    }

    // One Tap (optional; respects user settings/consent)
    if (!buttonOnly) {
      window.google.accounts.id.prompt((notification: any) => {
        // notification.isNotDisplayed() / isSkippedMoment() can be checked here if needed
      });
    }
  }, [ready, redirectTo, buttonOnly]);

  return <div ref={btnRef} />;
}
