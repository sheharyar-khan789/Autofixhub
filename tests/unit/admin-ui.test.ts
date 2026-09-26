import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { navFor } from "@/app/admin/_components/nav";
import { saveNotice, statusFromForm, withNotice } from "@/lib/admin/forms";
import { applyListQuery, listHref, parseListQuery } from "@/lib/admin/list";
import { safeAdminNext } from "@/lib/auth/roles";

describe("post-login redirect (open-redirect guard)", () => {
  it("accepts same-site admin paths only", () => {
    expect(safeAdminNext("/admin/guides?status=draft")).toBe("/admin/guides?status=draft");
    for (const bad of ["https://evil.example/admin", "//evil.example", "/\\evil.example", "/guides", "/admin/login?next=/x", undefined, 42]) {
      expect(safeAdminNext(bad), String(bad)).toBe("/admin");
    }
  });
});

describe("admin list query", () => {
  const items = [
    { id: "1", title: "DPF warning light", status: "published" as const, updatedAt: "2026-01-03" },
    { id: "2", title: "Turbo whistle", status: "draft" as const, updatedAt: "2026-01-05" },
    { id: "3", title: "DPF regeneration", status: "draft" as const, updatedAt: "2026-01-01" },
  ];
  const cfg = {
    text: (i: (typeof items)[number]) => i.title,
    sorters: {
      updated: (a: (typeof items)[number], b: (typeof items)[number]) => b.updatedAt.localeCompare(a.updatedAt),
      title: (a: (typeof items)[number], b: (typeof items)[number]) => a.title.localeCompare(b.title),
    },
  };
  it("parses and sanitises GET params", () => {
    const q = parseListQuery({ q: "  dpf ", status: "hacked", sort: "evil", page: "2" }, ["updated", "title"], "updated");
    expect(q).toEqual({ q: "dpf", status: "all", sort: "updated", page: "2" });
  });
  it("searches every word, counts statuses of matches, filters, sorts and paginates", () => {
    const r = applyListQuery(items, parseListQuery({ q: "dpf" }, ["updated", "title"], "updated"), cfg);
    expect(r.counts).toEqual({ all: 2, published: 1, draft: 1, archived: 0 });
    expect(r.items.map((i) => i.id)).toEqual(["1", "3"]);
    const drafts = applyListQuery(items, parseListQuery({ status: "draft", sort: "title" }, ["updated", "title"], "updated"), cfg);
    expect(drafts.items.map((i) => i.id)).toEqual(["3", "2"]);
    const paged = applyListQuery(items, parseListQuery({ page: "2" }, ["updated"], "updated"), cfg, 2);
    expect(paged).toMatchObject({ page: 2, pageCount: 2, total: 3 });
  });
  it("builds list URLs that keep filters", () => {
    expect(listHref("/admin/guides", { q: "dpf", status: "draft", sort: "title", page: "1" })).toBe("/admin/guides?q=dpf&status=draft&sort=title");
    expect(listHref("/admin/guides", { status: "all" })).toBe("/admin/guides");
  });
});

describe("editor intent + notices", () => {
  const fd = (entries: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(entries)) f.append(k, v);
    return f;
  };
  it("the clicked button's intent decides the status", () => {
    expect(statusFromForm(fd({ intent: "published", status: "draft" }))).toBe("published");
    expect(statusFromForm(fd({ intent: "draft" }))).toBe("draft");
    expect(statusFromForm(fd({}))).toBe("draft");
    expect(statusFromForm(fd({ intent: "delete-everything" }))).toBe("draft");
  });
  it("chooses the right toast and appends it safely", () => {
    expect(saveNotice(true, "draft")).toBe("created");
    expect(saveNotice(false, "draft")).toBe("saved");
    expect(saveNotice(false, "published")).toBe("published");
    expect(withNotice("/admin/guides", "saved")).toBe("/admin/guides?notice=saved");
    expect(withNotice("/admin/guides?status=draft", "saved")).toBe("/admin/guides?status=draft&notice=saved");
  });
});

describe("admin navigation by role", () => {
  const hrefs = (role: Parameters<typeof navFor>[0], ws = false) => navFor(role, ws).flatMap((g) => g.items.map((i) => i.href));
  it("editors get content + SEO but not settings or the audit log", () => {
    const h = hrefs("editor");
    expect(h).toEqual(expect.arrayContaining(["/admin/guides", "/admin/categories", "/admin/gallery", "/admin/seo"]));
    expect(h).not.toContain("/admin/settings");
    expect(h).not.toContain("/admin/activity");
  });
  it("technicians see no content areas; dormant workshop areas appear only when enabled", () => {
    expect(hrefs("technician")).toEqual(["/admin", "/admin/account"]);
    expect(hrefs("owner")).not.toContain("/admin/bookings");
    expect(hrefs("owner", true)).toEqual(expect.arrayContaining(["/admin/bookings", "/admin/services", "/admin/reviews"]));
  });
});

describe("Firestore index coverage", () => {
  const indexes = JSON.parse(readFileSync("firestore.indexes.json", "utf8")) as {
    indexes: { collectionGroup: string; fields: { fieldPath: string; order?: string }[] }[];
    fieldOverrides: unknown[];
  };
  const has = (coll: string, fields: [string, string][]) =>
    indexes.indexes.some(
      (i) => i.collectionGroup === coll && fields.every(([f, o], n) => i.fields[n]?.fieldPath === f && i.fields[n]?.order === o),
    );
  it("declares the composite indexes the admin queries need (the production FAILED_PRECONDITION)", () => {
    // listAuditLogPage / dashboard activity: where(businessId ==) orderBy(at desc)
    expect(has("auditLogs", [["businessId", "ASCENDING"], ["at", "DESCENDING"]])).toBe(true);
    // listBookingsAdmin / recent bookings: where(businessId ==) orderBy(createdAt desc)
    expect(has("bookings", [["businessId", "ASCENDING"], ["createdAt", "DESCENDING"]])).toBe(true);
  });
  it("stays deployable on the free Spark plan (no TTL overrides)", () => {
    expect(indexes.fieldOverrides).toEqual([]);
  });
});
