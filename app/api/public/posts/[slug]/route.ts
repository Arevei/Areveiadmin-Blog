import { publicJson, publicOptions } from "@/lib/api";
import { getRelatedPosts, getPublicPostBySlug, serializePublicPostCards } from "@/lib/services/posts";
import { serializePost } from "@/lib/blog";

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

  const relatedPosts = await getRelatedPosts(post.slug, post.category, post.tags, 3);

  return publicJson({
    post: serializePost(post),
    relatedPosts: serializePublicPostCards(relatedPosts),
  }, undefined, request);
}

export async function OPTIONS(request: Request) {
  return publicOptions(request);
}
