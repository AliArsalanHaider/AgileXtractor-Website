import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-sm text-slate-600">Loading…</div>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
