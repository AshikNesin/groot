export function getContentType(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: "application/pdf",
    json: "application/json",
    csv: "text/csv",
    txt: "text/plain",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    svg: "image/svg+xml",
    html: "text/html",
    xml: "application/xml",
  };
  if (!extension) {
    return "application/octet-stream";
  }
  return map[extension] ?? "application/octet-stream";
}

/**
 * Sanitize a filename for safe use in Content-Disposition headers.
 * Strips characters that break the header and applies RFC 5987 encoding for non-ASCII.
 */
export function sanitizeFileName(fileName: string): string {
  const sanitized = fileName.replace(/[\r\n"]/g, "");
  const isAscii = /^[\x20-\x7E]*$/.test(sanitized);
  if (!isAscii) {
    const encoded = encodeURIComponent(sanitized);
    return `filename="download"; filename*=UTF-8''${encoded}`;
  }
  return `filename="${sanitized}"`;
}
