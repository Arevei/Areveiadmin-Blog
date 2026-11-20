import { PUBLIC_CACHE_HEADERS, publicJson, publicOptions } from "@/lib/api";
import { getPublicPostWindow, getPublicPosts, serializePublicPostCards } from "@/lib/services/posts";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 50;

/**
 * GET /api/public/posts
 *   no paging params        every published post (sitemap and prerender use this)
 *   ?limit=10&offset=0      one window, plus total / totalAll / categories for the pager
 *   &category=Name          restrict either form to one category
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;
  const limitParam = searchParams.get("limit");

  if (limitParam === null) {
    const posts = await getPublicPosts(category);
    return publicJson({ posts: serializePublicPostCards(posts) }, { headers: PUBLIC_CACHE_HEADERS }, request);
  }

  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(limitParam, 10) || 10));
  const offset = Math.max(0, Number.parseInt(searchParams.get("offset") || "0", 10) || 0);
  const page = await getPublicPostWindow({ category, offset, limit });

  return publicJson(
    {
      posts: serializePublicPostCards(page.posts),
      total: page.total,
      totalAll: page.totalAll,
      categories: page.categories,
      offset,
      limit,
    },
    { headers: PUBLIC_CACHE_HEADERS },
    request,
  );
}

export async function OPTIONS(request: Request) {
  return publicOptions(request);
}
