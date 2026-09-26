import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true },
};

/** Admin root: no public site chrome. The staff shell lives in (staff)/layout.tsx. */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-dvh bg-surface-base px-0">{children}</div>;
}
