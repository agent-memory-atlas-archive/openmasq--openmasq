/**
 * The EN catalogue's « connectorCatalog » slice — translated from the source (`../fr/connectorCatalog.ts`).
 * `satisfies` per entry.
 */
import type { Messages } from "../messages";

export const connectorCatalog = {
  connectors: {
    demo: { desc: "A demo with sample data, no account needed" },
    gmail: { desc: "Read, search and send your emails" },
    slack: { desc: "Browse your channels and read recent messages" },
    github: { desc: "Your code projects and their issues" },
    "google-calendar": { name: "Google Calendar", desc: "Your events and appointments" },
    "google-drive": { desc: "Search, read and upload files in Drive" },
    "google-docs": { desc: "Create, read and edit your Google Docs" },
    "google-sheets": { desc: "Read and fill in your spreadsheets, or create new ones" },
    "google-tasks": { desc: "List, create and complete your tasks" },
    "google-analytics": { desc: "See how many people visit your websites (read-only)" },
    "microsoft-outlook": { desc: "Search, read and send your Outlook emails" },
    "microsoft-onedrive": { desc: "Search and read your OneDrive files" },
    "microsoft-sharepoint": { desc: "Search and read the documents on your SharePoint sites" },
    "microsoft-teams": { desc: "Your Teams teams, channels and messages" },
    exa: { desc: "Search the web and read pages" },
    tavily: { desc: "Search the web in real time and read pages" },
    firecrawl: { desc: "Read the content of whole websites" },
    notion: { desc: "Search, read and create your Notion pages and databases" },
    superhuman: { desc: "Search, read and send emails, manage your calendar" },
    linear: { desc: "Create and track your team's tasks and projects" },
    atlassian: { desc: "Search and manage your Jira tickets and Confluence pages" },
    asana: { desc: "Manage your tasks and projects" },
    fireflies: { desc: "Notes, summaries and action items from your meetings" },
    monday: { desc: "Read and update your tracking boards" },
    sentry: { desc: "Track the errors in your applications" },
    vercel: { desc: "Follow your website releases and their logs" },
    neon: { desc: "Query your Neon databases" },
    supabase: { desc: "Your Supabase database and its logs" },
    semgrep: { desc: "Check your code for security issues" },
    stripe: { desc: "Browse payments, customers and invoices" },
    paypal: { desc: "Browse payments, invoices and orders" },
    square: { desc: "Browse payments, products and orders" },
    close: { desc: "Follow your leads, contacts and ongoing sales" },
    intercom: { desc: "Browse your customers' conversations and requests" },
    attio: { desc: "Your contacts, companies, ongoing sales and notes" },
    zapier: { desc: "Run automations across more than 8,000 apps" },
    canva: { desc: "Create and export your Canva designs" },
    wix: { desc: "Manage your Wix sites, stores and bookings" },
    webflow: { desc: "Manage your Webflow sites and their content" },
    dropbox: { desc: "Search and read your Dropbox files" },
    huggingface: { desc: "Explore AI models and datasets" },
    amplitude: { desc: "Usage statistics and dashboards for your product" },
    posthog: { desc: "Usage statistics and dashboards for your product" },
    apify: { desc: "Collect data from websites with ready-made tools" },
    brightdata: { desc: "Collect public web data in real time" },
    cloudflare: { desc: "Manage the services you host with Cloudflare" },
    netlify: { desc: "Publish and manage your Netlify sites" },
    "prisma-postgres": { desc: "Query and manage your Prisma database" },
    cloudinary: { desc: "Manage and edit your images and videos" },
    jotform: { desc: "Build forms and analyze the answers" },
    websitepublisher: { desc: "Build and publish a website by chatting" },
    morningstar: { desc: "Investment and financial market data" },
    vantage: { desc: "See what your online services cost you" },
    synapse: { desc: "Search scientific research data" },
    airtable: { desc: "Read, create and edit the records in your Airtable bases" },
    filesystem: {
      name: "Your folders",
      desc: "Read and edit the files in the folders you allow",
    },
    browser: {
      name: "Browser",
      desc: "Let the assistant act in a browser (fill in forms, click) on your connected sites.",
    },
  },
  categories: {
    search: "Search & web",
    dev: "For developers",
    data: "Files & data",
    productivity: "Productivity",
    crm: "Customers & support",
    finance: "Finance & payments",
    design: "Design & sites",
    automation: "Automation",
    ai: "AI & models",
    other: "Other",
  },
  auth: {
    builtin: {
      label: "Built-in",
      title:
        "Included with the app. No account needed. Turn it on to use it.",
    },
    directFull:
      "Sign in on the service's page and approve access. No key needed.",
    comingSoon: {
      label: "Advanced option",
      title: (brand) =>
        `One-click connection is on its way: Google is still reviewing ${brand}. Until then, an advanced option lets you connect it with your own Google keys. It requires a Google Cloud account.`,
    },
    byoOnly: {
      label: "Your keys",
      title: (what, reason) => `For ${what}, you need your own keys: ${reason}.`,
    },
    byoLimited: {
      label: "1-click (partial)",
      title: (what, reason) =>
        `One-click sign-in. For ${what}, you need your own keys: ${reason}.`,
    },
    device: {
      label: "Paste a code",
      title:
        "A code appears and is copied for you: paste it on the service's website, then approve access. No key to create.",
    },
    oneClick: "1-click",
    local: {
      label: "On this computer",
      title:
        "This tool runs on your computer, with no online account. What it reads in your folders is masked before it is sent to the model, just like your messages.",
    },
    broker: {
      label: (brand) => `Via ${brand}`,
      title: (brand) =>
        `Sign in to your account and ${brand} handles the rest. No key or code needed.`,
    },
    apikey: {
      label: "Key required",
      title:
        "This service needs an access key. Get it from its website, then paste it here.",
    },
    oneClickRemote: {
      label: "1-click",
      title:
        "Sign in on the service's page in your browser and approve access. No key needed.",
    },
    byoSafe: (brand) =>
      `Your credentials stay encrypted on your device and never pass through ${brand} servers.`,
    reasonAdminConsent: "only an administrator in your organization can approve it",
    reasonGoogleReview: (brand) =>
      `Google is still reviewing ${brand} for one-click access`,
    thisAccess: "this feature",
  },
} satisfies Messages["connectorCatalog"];
