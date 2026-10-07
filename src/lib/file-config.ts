// v1 is deliberately a single-process service on one persistent local volume.
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_REQUEST_BYTES = 11 * 1024 * 1024;
export const FILE_TTL_MINUTES = 1440;
export const MAX_FILE_TTL_MINUTES = 10080;
export const FILE_QUOTA_BYTES = 1024 * 1024 * 1024;
export const MIN_FREE_DISK_BYTES = 128 * 1024 * 1024;
export const GRANT_TTL_MS = 15 * 60 * 1000;
export const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
export const UPLOAD_TIMEOUT_MS = 60 * 1000;
export const PAYLOAD_TIMEOUT_MS = 120 * 1000;
export const ORPHAN_GRACE_MS = UPLOAD_TIMEOUT_MS + 60 * 1000;
export const MAX_PAYLOADS = 2;
export const MAX_FILE_NAME_BYTES = 180;
