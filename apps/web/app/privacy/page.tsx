import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-16 md:px-8">
        <h1 className="font-serif text-4xl">Privacy Policy</h1>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-mute">
          <p>Sign-in, the portfolio, and saved chats stay in this browser. MoleculeAI does not send that desk state to a server of ours.</p>
          <p>Email and LinkedIn in the footer are contact links. A message you send there is handled like any other mail or LinkedIn note.</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
