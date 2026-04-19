import { publicJson, publicOptions } from "@/lib/api";
import { serializePost } from "@/lib/blog";
import { getPublicPosts } from "@/lib/services/posts";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;
  const posts = await getPublicPosts(category);

  return publicJson({
    posts: posts.map(serializePost),
  });
}

export async function OPTIONS() {
  return publicOptions();
}
