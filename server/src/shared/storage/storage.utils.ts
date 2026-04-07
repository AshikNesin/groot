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
