export const TYPE_ORDER = ["Posters", "Tyg", "Tapet"];

export function sortTypes(types) {
  const rank = (t) => {
    const i = TYPE_ORDER.indexOf(t);
    return i === -1 ? 99 : i;
  };
  return [...types].sort((a, b) => rank(a) - rank(b));
}

// T.ex. "Tyg · Grön"
export function variantLabel(product) {
  return [product.category, product.color].filter(Boolean).join(" · ");
}

// Hittar varianten av en viss typ, helst med samma färg, annars första av typen
export function findVariant(variants, type, color) {
  const sameType = variants.filter((v) => v.category === type);
  return (
    sameType.find((v) => (v.color || "") === (color || "")) ||
    sameType[0] ||
    null
  );
}

// Slår ihop produkter i samma kollektion till en grupp (ett kort i butiken)
export function buildGroups(products) {
  const byCollection = new Map();
  const groups = [];

  for (const product of products) {
    if (!product.collection_id) {
      groups.push({ key: `p-${product.id}`, variants: [product] });
      continue;
    }
    const key = `c-${product.collection_id}`;
    let group = byCollection.get(key);
    if (!group) {
      group = { key, variants: [] };
      byCollection.set(key, group);
      groups.push(group);
    }
    group.variants.push(product);
  }

  return groups.map((group) => {
    const variants = [...group.variants].sort((a, b) => a.id - b.id);
    const rep = variants.find((v) => v.image_url) || variants[0];
    const prices = variants.map((v) => Number(v.price));
    return {
      key: group.key,
      variants,
      rep,
      isGroup: variants.length > 1,
      name: rep.collections?.name || rep.name,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      createdAt: Math.max(
        ...variants.map((v) => new Date(v.created_at).getTime()),
      ),
      inStock: variants.some((v) => v.stock > 0),
    };
  });
}
