import { publicJson, publicOptions } from "@/lib/api";
import { getPublicPosts, serializePublicPostCards } from "@/lib/services/posts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;
  const posts = await getPublicPosts(category);

  return publicJson({
    posts: serializePublicPostCards(posts),
  }, undefined, request);
}

export async function OPTIONS(request: Request) {
  return publicOptions(request);
}
