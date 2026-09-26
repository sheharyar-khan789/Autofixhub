import type { Metadata } from "next";
import Link from "next/link";
import { ContactDetails } from "@/components/home/ContactLocation";
import { YouTubeChannelLink } from "@/components/content/YouTubeChannelLink";
import { getSettings, getSettingsOrNull } from "@/lib/data";
import { StateNotice } from "@/components/ui/Section";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Contact",
  description: "Contact AutoFixHub by email, or follow the repair videos on YouTube.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const [res, settings] = await Promise.all([getSettings(), getSettingsOrNull()]);
  return (
    <div className="px-gutter py-space-xl">
      <div className="mx-auto flex max-w-5xl flex-col gap-space-xl">
        <header className="flex flex-col gap-space-sm">
          <h1 className="font-headline text-headline-xl-mobile text-text-primary md:text-headline-xl">Contact</h1>
          <p className="max-w-2xl text-body-lg text-text-muted">
            Questions about a guide or a video, or a topic you would like covered? Get in touch by email.
          </p>
        </header>
        {!res.ok && (
          <StateNotice title="Some contact details could not be loaded" tone={res.reason === "error" ? "error" : "neutral"}>
            Refresh the page to try again.
          </StateNotice>
        )}
        {/* Email always shows (confirmed fact); phone/address/hours appear only if the owner adds them in settings. */}
        <ContactDetails settings={settings} />
        <div className="flex flex-col items-start gap-space-sm rounded border border-border-subtle bg-surface-raised p-space-lg">
          <p className="font-headline text-headline-sm text-text-primary">Repair videos</p>
          <p className="text-body-md text-text-muted">
            New videos are posted on YouTube; the written guides here go into more detail.
          </p>
          <div className="flex flex-wrap items-center gap-space-md">
            <YouTubeChannelLink href={settings.socialLinks?.youtube} />
            <Link href="/guides" className="font-code text-body-sm font-semibold underline underline-offset-4">Read the guides</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
