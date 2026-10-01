import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-5 py-16 md:px-8">
        <h1 className="font-serif text-4xl">Terms of Service</h1>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-mute">
          <p>MoleculeAI is a research desk. Strategies you deploy here run on a paper book. It is not a broker, and it does not place live orders.</p>
          <p>Numbers on a run come from the engine on recorded history. If a run did not produce a figure, the desk does not print one.</p>
          <p>Accounts on this desk are for the person who signed in. Do not share the admin credentials.</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
