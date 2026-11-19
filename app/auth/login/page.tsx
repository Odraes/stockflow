import { Suspense } from "react";
import { AuthNotice } from "@/components/auth/auth-notice";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-sm">
        <Suspense fallback={null}>
          <RedirectIfSignedIn />
        </Suspense>
        <Suspense fallback={null}>
          <AuthNotice />
        </Suspense>
        <LoginForm />
      </div>
    </div>
  );
}
