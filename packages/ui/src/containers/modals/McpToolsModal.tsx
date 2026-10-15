import { useEffect, useMemo, useState } from "react";
import type { McpTool } from "@openmasq/mcp";
import { useHost } from "../../host";
import { ModalShell } from "./ModalShell";
import { Markdown } from "../../components/markdown/Markdown";
import { BrandLoader } from "../../components/media/BrandLogo";
import { LayersIcon, XIcon, IconButton, ChevDownIcon } from "../../components/brand";

import { useT } from "../../i18n";
import { humanToolLabel } from "../../agent/humanToolLabel";
/** A short, markdown-stripped one-liner for the collapsed preview. */
function previewOf(desc: string): string {
  const flat = desc
    .replace(/```[\s\S]*?```/g, " ") // drop fenced code
    .replace(/[#>*_`~-]/g, "") // strip markdown emphasis/marks
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > 140 ? `${flat.slice(0, 140)}…` : flat;
}

/**
 * Tool catalogue for one connected MCP integration. Pulls the aggregated tool
 * list from the host and filters to this server (tools are namespaced
 * `${serverId}__${tool}`). Each tool is a COLLAPSIBLE row — its name IN WORDS + a one-line
 * preview, expanding to its full description RENDERED AS MARKDOWN (the connectors
 * ship markdown: bold, lists, ```code``` examples) so a 26-tool server like
 * Firecrawl is scannable instead of a wall of raw text. Read-only.
 */
export function McpToolsModal({
  serverId,
  serverName,
  onClose,
}: {
  serverId: string;
  serverName: string;
  onClose: () => void;
}) {
  const t = useT();
  const host = useHost();
  const [tools, setTools] = useState<McpTool[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    host.mcp
      ?.listTools()
      .then((all) => {
        if (alive) setTools(all.filter((t) => t.serverId === serverId));
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, [host, serverId]);

  const strip = (name: string) =>
    name.startsWith(`${serverId}__`) ? name.slice(serverId.length + 2) : name;

  const toggle = (name: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const allOpen = useMemo(
    () => !!tools && tools.length > 0 && tools.every((t) => open.has(t.name)),
    [tools, open],
  );
  const toggleAll = () =>
    setOpen(() => (allOpen ? new Set() : new Set((tools ?? []).map((tool) => tool.name))));

  return (
    <ModalShell onClose={onClose} width="560px" maxHeight="80vh">
      <div className="rlog-head">
        <span className="rlog-icon">
          <LayersIcon size={18} />
        </span>
        <div className="rlog-head-text">
          <div className="rlog-title">{serverName}</div>
          <div className="rlog-sub">
            {tools == null ? t.mcpTab.loadingTools : t.mcpTab.toolsAvailable(tools.length)}
          </div>
        </div>
        {!!tools?.length && (
          <button type="button" className="mcp-tool-allbtn" onClick={toggleAll}>
            {allOpen ? t.mcpTab.collapseAll : t.mcpTab.expandAll}
          </button>
        )}
        <IconButton label={t.mcpTab.close} size="sm" onClick={onClose}>
          <XIcon size={18} />
        </IconButton>
      </div>
      <div className="rlog-body">
        {error ? (
          <div className="rlog-empty">{error}</div>
        ) : tools == null ? (
          <div className="mcp-tool-loading">
            <BrandLoader size={40} mono />
            <span>{t.mcpTab.loadingTools}</span>
          </div>
        ) : tools.length === 0 ? (
          <div className="rlog-empty">{t.mcpTab.noTools}</div>
        ) : (
          <div className="mcp-tool-list">
            {tools.map((tool) => {
              const isOpen = open.has(tool.name);
              return (
                <div key={tool.name} className={`mcp-tool${isOpen ? " open" : ""}`}>
                  <button
                    type="button"
                    className="mcp-tool-head"
                    onClick={() => toggle(tool.name)}
                    aria-expanded={isOpen}
                  >
                    <span className="mcp-tool-head-text">
                      {/* The tool in words — the server's own title when it declares one,
                          else the app's one vocabulary (`humanToolLabel`). The raw id is a
                          technical detail, shown only once the row is opened. */}
                      <span className="mcp-tool-name">
                        {tool.annotations?.title?.trim() || humanToolLabel(serverId, strip(tool.name), t)}
                      </span>
                      {!isOpen && tool.description && (
                        <span className="mcp-tool-preview">{previewOf(tool.description)}</span>
                      )}
                    </span>
                    <span className="mcp-tool-chev" aria-hidden="true">
                      <ChevDownIcon size={14} />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="mcp-tool-md">
                      {tool.description && (
                        <>
                          <p className="mcp-tool-by">{t.mcpTab.toolDescBy(serverName)}</p>
                          <Markdown content={tool.description} />
                        </>
                      )}
                      <p className="mcp-tool-by">
                        {t.mcpTab.toolTechName} <code>{strip(tool.name)}</code>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
