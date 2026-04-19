import { publicJson, publicOptions } from "@/lib/api";
import { getRelatedPosts, getPublicPostBySlug } from "@/lib/services/posts";
import { serializePost } from "@/lib/blog";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const { slug } = await params;

  const post = await getPublicPostBySlug(slug);

  if (!post) {
    return publicJson({ error: "Post not found." }, { status: 404 });
  }

  const relatedPosts = await getRelatedPosts(post.slug, post.category, post.tags, 3);

  return publicJson({
    post: serializePost(post),
    relatedPosts,
  });
}

export async function OPTIONS() {
  return publicOptions();
}
