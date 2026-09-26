import type { Metadata } from "next";
import { Placeholder } from "@/components/ui/Placeholder";
import { getSettingsOrNull } from "@/lib/data";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Privacy notice",
  alternates: { canonical: "/privacy" },
};

/**
 * Describes only what the site actually does today. The legally required parts
 * (controller identity, lawful basis, retention, rights) must be written for the
 * business and reviewed; they are deliberately not invented here.
 */
export default async function PrivacyPage() {
  const settings = await getSettingsOrNull();
  return (
    <div className="px-gutter py-space-xl">
      <div className="mx-auto flex max-w-3xl flex-col gap-space-lg">
        <h1 className="font-headline text-headline-xl-mobile text-text-primary md:text-headline-xl">Privacy notice</h1>

        <section className="flex flex-col gap-space-sm text-body-md text-text-muted">
          <h2 className="font-headline text-headline-sm text-text-primary">What this website collects</h2>
          <ul className="list-disc pl-space-lg">
            <li>There are no public forms and no visitor accounts. Reading guides, fault codes and videos needs no personal information.</li>
            <li>The website sets no cookies for visitors. Staff who sign in to manage content receive one essential sign-in cookie.</li>
            <li>
              Videos are embedded from youtube-nocookie.com and only load after you press play. From then on, YouTube&apos;s own
              privacy policy applies.
            </li>
            {settings.email && (
              <li>If you email {settings.email}, your email address and message are received and used to reply to you.</li>
            )}
            <li>Like any website, the hosting provider may log technical request data (such as IP address) for security and reliability.</li>
          </ul>
        </section>

        <Placeholder label="full privacy notice (legal text required)">
          Before launch, add the parts that must be written for this business under UK GDPR: who the data controller
          is, the lawful basis for each use, how long emails and logs are kept, who data is shared with, and how to
          exercise data-protection rights (including the right to complain to the ICO). This page is not legal advice.
        </Placeholder>
      </div>
    </div>
  );
}
