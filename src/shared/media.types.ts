export type MediaOwnerType = "PLAYER" | "COACH" | "BRANCH" | "CONTRACT" | "PAYMENT";

export type MediaKind = "AVATAR" | "DOCUMENT" | "RECEIPT" | "GALLERY";

export interface MediaAsset {
  id: string;
  ownerType: MediaOwnerType;
  ownerId: string;
  kind: MediaKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  originalUrl?: string | null;
  thumbUrl?: string | null;
  mediumUrl?: string | null;
  createdAt?: string | null;
  createdBy?: string | null;
}
