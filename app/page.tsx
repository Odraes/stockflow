import { redirect } from "next/navigation";

/** The app has no public landing page; the proxy already sends guests to login. */
export default function Home() {
  redirect("/dashboard");
}
