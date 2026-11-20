import { PUBLIC_CACHE_HEADERS, publicJson, publicOptions } from "@/lib/api";
import { getRelatedPosts, getPublicPostBySlug, serializePublicPostCards } from "@/lib/services/posts";
import { serializePost } from "@/lib/blog";
import { getSiteSettings } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { slug } = await params;

  const post = await getPublicPostBySlug(slug);

  if (!post) {
    return publicJson({ error: "Post not found." }, { status: 404 }, request);
  }

  const [relatedPosts, site] = await Promise.all([
    getRelatedPosts(post.slug, post.category, post.tags, 3),
    getSiteSettings(),
  ]);

  return publicJson({
    post: serializePost(post),
    relatedPosts: serializePublicPostCards(relatedPosts),
    site,
  }, { headers: PUBLIC_CACHE_HEADERS }, request);
}

export async function OPTIONS(request: Request) {
  return publicOptions(request);
}
