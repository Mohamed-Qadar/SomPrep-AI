import api from "../services/api";

/**
 * Download a protected file through the authenticated API client and hand it
 * to the browser as a normal file download. A plain <a href> cannot carry the
 * JWT header, so every gated download must go through here.
 */
export async function downloadAuthenticatedFile(url, filename) {
  const res = await api.get(url, { responseType: "blob" });
  const objectUrl = URL.createObjectURL(res.data);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
