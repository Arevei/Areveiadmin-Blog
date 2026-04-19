import {
  models,
  model,
  Schema,
  Types,
  type HydratedDocument,
  type Model,
} from "mongoose";

import { EDITOR_MODES, POST_STATUSES, type EditorMode, type PostStatus } from "@/lib/constants";

export interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  seoTitle?: string;
  seoDescription?: string;
  category: string;
  tags: string[];
  keyTakeaways: string[];
  coverImageUrl: string;
  coverImageAlt?: string;
  contentHtml: string;
  editorMode: EditorMode;
  authorName: string;
  authorRole: string;
  status: PostStatus;
  publishedAt?: Date | null;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

type BlogPostModelType = Model<BlogPost>;

const BlogPostSchema = new Schema<BlogPost, BlogPostModelType>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    excerpt: {
      type: String,
      required: true,
      trim: true,
    },
    seoTitle: {
      type: String,
      trim: true,
      default: "",
    },
    seoDescription: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    keyTakeaways: {
      type: [String],
      default: [],
    },
    coverImageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    coverImageAlt: {
      type: String,
      trim: true,
      default: "",
    },
    contentHtml: {
      type: String,
      required: true,
    },
    editorMode: {
      type: String,
      enum: EDITOR_MODES,
      default: "FROALA",
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
    },
    authorRole: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: POST_STATUSES,
      default: "DRAFT",
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

BlogPostSchema.index({ slug: 1 }, { unique: true });
BlogPostSchema.index({ status: 1, publishedAt: -1 });
BlogPostSchema.index({ category: 1, status: 1 });

export type BlogPostDocument = HydratedDocument<BlogPost>;

export const BlogPostModel =
  (models.BlogPost as BlogPostModelType | undefined) ||
  model<BlogPost, BlogPostModelType>("BlogPost", BlogPostSchema);
