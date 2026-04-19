import { models, model, Schema, type HydratedDocument, type Model } from "mongoose";

import { USER_ROLES, type UserRole } from "@/lib/constants";

export interface User {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type UserModelType = Model<User>;

const UserSchema = new Schema<User, UserModelType>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "AUTHOR",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

UserSchema.index({ email: 1 }, { unique: true });

export type UserDocument = HydratedDocument<User>;

export const UserModel =
  (models.User as UserModelType | undefined) || model<User, UserModelType>("User", UserSchema);
