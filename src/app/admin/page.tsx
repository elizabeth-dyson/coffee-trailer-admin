export const metadata = {
  title: "Coffee Trailer Admin Home",
};

export default function AdminHome() {
  const Card = ({ href, title, desc }: { href: string; title: string; desc: string; }) => (
    <a className="p-6 rounded-xl border bg-white hover:shadow transition" href={href}>
      <h2 className="font-semibold">{title}</h2>
      <p className="text-sm text-gray-600">{desc}</p>
    </a>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card href="/admin/menu" title="Menu Manager" desc="Categories, items, variants, modifiers" />
      <Card href="/admin/inventory" title="Inventory" desc="Add ingredients, toggle sold out" />
      <Card href="/admin/settings" title="Settings" desc="Business name, tax, tip presets, logo" />
      <Card href="/admin/preview" title="Preview" desc="Read-only menu view" />
    </div>
  );
}