import Link from "next/link";

export interface Crumb {
  name: string;
  href: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-body-sm text-text-muted">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={item.href}>
            {i > 0 && <span aria-hidden="true"> / </span>}
            {last ? (
              <span aria-current="page" className="text-text-primary">
                {item.name}
              </span>
            ) : (
              <Link href={item.href} className="hover:text-text-primary">
                {item.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
