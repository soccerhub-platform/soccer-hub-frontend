# Backend task: Media assets and student avatars

## Goal

Add a reusable media layer for photos/files. Start with student avatars, but keep the model generic enough for coaches, branches, contracts, payments, and future document uploads.

## Storage model

Do not store image bytes in player/student tables. Store files in private object storage or a private local storage adapter for dev, and keep metadata in DB.

Suggested entity:

```ts
MediaAsset {
  id: string;
  ownerType: "PLAYER" | "COACH" | "BRANCH" | "CONTRACT" | "PAYMENT";
  ownerId: string;
  kind: "AVATAR" | "DOCUMENT" | "RECEIPT" | "GALLERY";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  storageKey: string;
  createdBy?: string | null;
  createdAt: string;
}
```

For avatars, enforce one active `AVATAR` per `PLAYER`.

## API contract needed by frontend

Include avatar metadata in existing student DTOs:

```ts
avatar?: {
  id: string;
  ownerType: "PLAYER";
  ownerId: string;
  kind: "AVATAR";
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
} | null;
```

Endpoints:

```http
POST /admin/students/{playerId}/avatar
Content-Type: multipart/form-data
field: file
Response: MediaAsset

DELETE /admin/students/{playerId}/avatar
Response: 204

GET /admin/students/{playerId}/avatar/download-url
Response: { "url": "https://..." }
```

Add `avatar` to:

```http
GET /admin/students
GET /admin/students/{playerId}
```

## Validation

- Accept only `image/jpeg`, `image/png`, `image/webp`.
- Max upload size: 5 MB.
- Reject empty files and non-image MIME types.
- Verify file content server-side, do not trust only `Content-Type`.
- Recommended output versions:
  - `thumb`: 96x96, square, object-cover/cropped.
  - `medium`: 320x320, square.
  - `original`: optional, private.

## Access control

Photos of students are sensitive. Keep bucket private.

- Admin can access only students in their branch scope.
- Coach access should be decided separately; if allowed, only assigned groups/students.
- Download URL should be signed and short-lived, e.g. 5-30 minutes.
- Upload/delete must audit `createdBy`/actor.

## Frontend assumptions already implemented

The frontend now calls:

```ts
StudentApi.uploadAvatar(playerId, file)
StudentApi.deleteAvatar(playerId)
StudentApi.getAvatarDownloadUrl(playerId)
```

The UI gracefully falls back to initials when `avatar` is missing.
