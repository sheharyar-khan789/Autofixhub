/** Renders a `<script type="application/ld+json">` from a server-built, validated object. */
export function JsonLd({ data }: { data: unknown }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      // "<" is escaped to prevent script-tag breakout from embedded strings.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
