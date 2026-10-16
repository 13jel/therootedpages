import { algoliasearch } from "algoliasearch";

export interface SearchRecord {
  objectID: string;
  id: number;
  sku: string | null;
  name: string;
  description: string | null;
  category: string | null;
  color: string | null;
  price: number;
  stock: number;
  inStock: boolean;
  image_url: string | null;
}

export type SortMode = "relevance" | "price_asc" | "price_desc";

export interface SearchParams {
  q: string;
  page: number;
  pageSize: number;
  category?: string;
  inStock?: boolean;
  sort: SortMode;
}

export interface SearchResult {
  data: Omit<SearchRecord, "objectID">[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export class SearchServiceError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
    this.name = "SearchServiceError";
  }
}

const TIMEOUTS = { connect: 3000, read: 5000, write: 8000 };

function env() {
  const appId = process.env.ALGOLIA_APP_ID;
  const adminKey = process.env.ALGOLIA_ADMIN_KEY;
  const searchKey = process.env.ALGOLIA_SEARCH_KEY;
  const index = process.env.ALGOLIA_INDEX || "products";
  if (!appId || !adminKey || !searchKey) {
    throw new SearchServiceError(
      "Sökningen är inte konfigurerad (ALGOLIA_APP_ID / ALGOLIA_ADMIN_KEY / ALGOLIA_SEARCH_KEY saknas).",
      500,
    );
  }
  return { appId, adminKey, searchKey, index };
}

function adminClient() {
  const { appId, adminKey } = env();
  return algoliasearch(appId, adminKey, {
    timeouts: TIMEOUTS,
  });
}
function searchClient() {
  const { appId, searchKey } = env();
  return algoliasearch(appId, searchKey, {
    timeouts: TIMEOUTS,
  });
}

function indexFor(sort: SortMode): string {
  const { index } = env();
  if (sort === "price_asc") return `${index}_price_asc`;
  if (sort === "price_desc") return `${index}_price_desc`;
  return index;
}

function friendly(err: unknown): SearchServiceError {
  if (err instanceof SearchServiceError) return err;
  const status = (err as { status?: number })?.status;
  if (status === 403) {
    return new SearchServiceError(
      "Sökleverantören nekade åtkomst (kontrollera nycklarna).",
    );
  }
  return new SearchServiceError(
    "Sökningen är inte tillgänglig just nu. Försök igen om en stund.",
    503,
  );
}

export async function indexProducts(records: SearchRecord[]): Promise<void> {
  if (records.length === 0) return;
  try {
    await adminClient().saveObjects({
      indexName: env().index,
      objects: records as unknown as Record<string, unknown>[],
    });
  } catch (err) {
    throw friendly(err);
  }
}

export async function removeProducts(objectIDs: string[]): Promise<void> {
  if (objectIDs.length === 0) return;
  try {
    await adminClient().deleteObjects({ indexName: env().index, objectIDs });
  } catch (err) {
    throw friendly(err);
  }
}

export async function configureIndex(): Promise<void> {
  const client = adminClient();
  const { index } = env();
  try {
    await client.setSettings({
      indexName: index,
      indexSettings: {
        searchableAttributes: [
          "name",
          "category",
          "color",
          "description",
          "sku",
        ],
        attributesForFaceting: ["category", "filterOnly(inStock)"],
        replicas: [`${index}_price_asc`, `${index}_price_desc`],
      },
    });
    for (const [suffix, dir] of [
      ["price_asc", "asc"],
      ["price_desc", "desc"],
    ] as const) {
      await client.setSettings({
        indexName: `${index}_${suffix}`,
        indexSettings: {
          ranking: [
            `${dir}(price)`,
            "typo",
            "geo",
            "words",
            "filters",
            "proximity",
            "attribute",
            "exact",
            "custom",
          ],
        },
      });
    }
  } catch (err) {
    throw friendly(err);
  }
}

export async function clearAndIndex(records: SearchRecord[]): Promise<void> {
  try {
    await adminClient().clearObjects({ indexName: env().index });
  } catch (err) {
    throw friendly(err);
  }
  await indexProducts(records);
}

export async function getCategories(): Promise<string[]> {
  try {
    const res = await searchClient().searchSingleIndex({
      indexName: env().index,
      searchParams: { query: "", hitsPerPage: 0, facets: ["category"] },
    });
    return Object.keys(res.facets?.category ?? {}).sort((a, b) =>
      a.localeCompare(b, "sv"),
    );
  } catch (err) {
    throw friendly(err);
  }
}

export async function searchProducts(p: SearchParams): Promise<SearchResult> {
  const filters: string[] = [];
  if (p.category) filters.push(`category:"${p.category.replace(/"/g, "")}"`);
  if (p.inStock) filters.push("inStock:true");

  try {
    const res = await searchClient().searchSingleIndex<SearchRecord>({
      indexName: indexFor(p.sort),
      searchParams: {
        query: p.q,
        page: p.page - 1,
        hitsPerPage: p.pageSize,
        ...(filters.length ? { filters: filters.join(" AND ") } : {}),
      },
    });

    const total = res.nbHits ?? 0;
    return {
      data: res.hits.map(
        ({ objectID: _omit, ...rest }) =>
          rest as Omit<SearchRecord, "objectID">,
      ),
      meta: {
        page: p.page,
        pageSize: p.pageSize,
        total,
        totalPages: Math.ceil(total / p.pageSize),
      },
    };
  } catch (err) {
    throw friendly(err);
  }
}
