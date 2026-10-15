/**
 * The reading order INSIDE a category: the services most people connect first (mail,
 * agenda, documents, storage, notes) lead, whatever transport carries them. Without it
 * the grid followed the source tables (remote presets before the desktop-direct ones), so
 * « Productivité » opened on Superhuman and Asana and put Gmail and Outlook after them.
 *
 * Categories themselves are ordered by `MCP_CATEGORIES` (developer tools last). An id not
 * listed here keeps its catalogue order, after the listed ones. Every surface that lists
 * connectors sorts with `mcpConnectorRank`, so the Settings grid and the admin console agree.
 */
const EVERYDAY: readonly string[] = [
  "gmail",
  "microsoft-outlook",
  "google-calendar",
  "google-drive",
  "microsoft-onedrive",
  "dropbox",
  "google-docs",
  "google-sheets",
  "notion",
  "microsoft-teams",
  "slack",
  "microsoft-sharepoint",
  "google-tasks",
  "fireflies",
  "airtable",
  "attio",
  "close",
  "intercom",
  "stripe",
  "paypal",
];

/** Lower comes first; unlisted ids share the last rank (a stable sort keeps their order). */
export function mcpConnectorRank(id: string): number {
  const i = EVERYDAY.indexOf(id);
  return i === -1 ? EVERYDAY.length : i;
}
