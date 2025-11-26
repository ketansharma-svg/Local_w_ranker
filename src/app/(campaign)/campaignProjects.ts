// src/utils/campaignProjects.ts
export type UnifiedCampaignProject = {
  id: string
  name: string
  domain: string
  url: string
  is_shared: boolean
  membership: "as_manager" | "as_member"
  accesses: { dashboard_type?: string; access_level?: string }[]
}

export function buildUnifiedCampaignProjects(overview: any | null | undefined): UnifiedCampaignProject[] {
  if (!overview) return []

  const normalize = (proj: any, membership: "as_manager" | "as_member"): UnifiedCampaignProject => {
    const id = String(proj?.project_id ?? proj?.id ?? "")
    return {
      id,
      name: proj?.project_name || proj?.domain || proj?.url || `Project ${id}`,
      domain: proj?.domain || "",
      url: proj?.url || "",
      is_shared: membership === "as_member",
      membership,
      accesses: Array.isArray(proj?.accesses) ? proj.accesses : [],
    }
  }

  const mine = (overview.as_manager || []).map((p: any) => normalize(p, "as_manager"))
  const shared = (overview.as_member || []).map((p: any) => normalize(p, "as_member"))

  // de‑dupe by id, prefer "as_manager" version if both exist
  const map = new Map<string, UnifiedCampaignProject>()
  mine.forEach((p) => map.set(p.id, p))
  shared.forEach((p) => {
    if (!map.has(p.id)) map.set(p.id, p)
  })

  return Array.from(map.values())
}
