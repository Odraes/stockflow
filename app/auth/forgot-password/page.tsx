import { Suspense } from "react";
import { AuthNotice } from "@/components/auth/auth-notice";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function Page() {
  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-sm">
        <Suspense fallback={null}>
          <AuthNotice />
        </Suspense>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
