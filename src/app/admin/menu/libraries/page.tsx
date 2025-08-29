export const metadat = {
  title: "Coffee Trailer Libraries",
};

export default function LibraryHome() {
  const Card = ({ href, title, desc }: { href: string; title: string; desc: string; }) => (
    <a className="p-6 rounded-xl border bg-white hover:shadow transition" href={href}>
      <h2 className="font-semibold">{title}</h2>
      <p className="text-sm text-gray-600">{desc}</p>
    </a>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card href="/admin/menu/libraries/modifier-groups" title="Modifier Groups" desc="Add, edit, or delete modifier groups" />

    </div>
  );
}