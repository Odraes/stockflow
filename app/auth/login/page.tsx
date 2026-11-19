import { Suspense } from "react";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-sm">
        <Suspense fallback={null}>
          <RedirectIfSignedIn />
        </Suspense>
        <LoginForm />
      </div>
    </div>
  );
}
