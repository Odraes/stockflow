import { Brand } from "@/components/layout/brand";

/** Shared frame for login, sign-up and password pages. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh w-full flex-col items-center justify-center gap-6 p-6 md:p-10">
      <Brand href="/auth/login" />
      {children}
    </main>
  );
}
