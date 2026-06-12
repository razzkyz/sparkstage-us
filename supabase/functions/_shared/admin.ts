import { json } from './http.ts'
import { createServiceClient } from './supabase.ts'
import { requireAuthenticatedRequest } from './auth.ts'

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'super-admin', 'starguide', 'kasir', 'dressing_room_admin', 'ticket_admin', 'retail_admin'])

type AdminContext = {
  user: { id: string; email?: string | null }
  supabaseService: ReturnType<typeof createServiceClient>
}

export async function requireAdminContext(req: Request): Promise<{ context?: AdminContext; response?: Response }> {
  const authResult = await requireAuthenticatedRequest(req)
  if (authResult.response) return { response: authResult.response }

  const authContext = authResult.context
  if (!authContext) {
    return {
      response: json(req, { error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const supabaseService = createServiceClient(authContext.supabaseEnv.url, authContext.supabaseEnv.serviceRoleKey)
  const { data: roleRows, error: roleError } = await supabaseService
    .from('user_role_assignments')
    .select('role_name')
    .eq('user_id', authContext.user.id)

  if (roleError) {
    return {
      response: json(req, { error: 'Failed to verify role' }, { status: 500 }),
    }
  }

  const isAdmin =
    Array.isArray(roleRows) &&
    roleRows.some((row) => {
      const roleName = String((row as { role_name?: string }).role_name ?? '').toLowerCase()
      return ADMIN_ROLES.has(roleName)
    })

  if (!isAdmin) {
    return {
      response: json(req, { error: 'Forbidden' }, { status: 403 }),
    }
  }

  return {
    context: {
      user: {
        id: authContext.user.id,
        email: authContext.user.email,
      },
      supabaseService,
    },
  }
}

// ========== DIVISION SYSTEM ==========

export type DivisionType = "tiket" | "dressing_room" | "retail"

export interface AdminDivision {
  division_id: string
  division_name: DivisionType
  display_name: string
}

export interface DivisionContext {
  userId: string
  divisions: AdminDivision[]
  isSuperAdmin: boolean
}

/**
 * Get all divisions a user has access to
 */
export async function getUserDivisions(supabaseService: AdminContext["supabaseService"], userId: string): Promise<AdminDivision[]> {
  if (!userId) return []

  try {
    // Check if super admin first
    const { data: roleData } = await supabaseService.from("user_role_assignments").select("role_name").eq("user_id", userId).maybeSingle()

    if (roleData?.role_name === "super_admin") {
      // Super admin has all divisions
      const { data } = await supabaseService.from("divisions").select("id, name, display_name")
      return (
        data?.map((d: any) => ({
          division_id: d.id,
          division_name: d.name as DivisionType,
          display_name: d.display_name,
        })) || []
      )
    }

    // Regular admin - get assigned divisions
    const { data } = await supabaseService.rpc("get_user_divisions", {
      p_user_id: userId,
    })

    return (
      data?.map((d: any) => ({
        division_id: d.division_id,
        division_name: d.division_name as DivisionType,
        display_name: d.display_name,
      })) || []
    )
  } catch (error) {
    console.error("Error getting user divisions:", error)
    return []
  }
}

/**
 * Check if user has access to a specific division
 */
export async function checkDivisionAccess(supabaseService: AdminContext["supabaseService"], userId: string, divisionName: DivisionType): Promise<boolean> {
  if (!userId) return false

  try {
    const { data } = await supabaseService.rpc("user_has_division_access", {
      p_user_id: userId,
      p_division_name: divisionName,
    })

    return data === true
  } catch (error) {
    console.error("Error checking division access:", error)
    return false
  }
}

/**
 * Assign a division to an admin
 */
export async function assignAdminToDivision(supabaseService: AdminContext["supabaseService"], userId: string, divisionName: DivisionType): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: "User ID required" }

  try {
    // Get division ID
    const { data: divisionData } = await supabaseService.from("divisions").select("id").eq("name", divisionName).maybeSingle()

    if (!divisionData) {
      return { success: false, error: "Division not found" }
    }

    // Assign division
    const { error } = await supabaseService.from("admin_divisions").insert({
      user_id: userId,
      division_id: divisionData.id,
    })

    if (error) {
      if ((error as any).code === "23505") {
        return { success: false, error: "User already assigned to this division" }
      }
      return { success: false, error: (error as any).message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Remove a division from an admin
 */
export async function removeAdminFromDivision(supabaseService: AdminContext["supabaseService"], userId: string, divisionName: DivisionType): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: "User ID required" }

  try {
    // Get division ID
    const { data: divisionData } = await supabaseService.from("divisions").select("id").eq("name", divisionName).maybeSingle()

    if (!divisionData) {
      return { success: false, error: "Division not found" }
    }

    // Remove division
    const { error } = await supabaseService.from("admin_divisions").delete().eq("user_id", userId).eq("division_id", divisionData.id)

    if (error) {
      return { success: false, error: (error as any).message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Get all divisions (for admin UI)
 */
export async function getAllDivisions(supabaseService: AdminContext["supabaseService"]): Promise<AdminDivision[]> {
  try {
    const { data } = await supabaseService.from("divisions").select("id, name, display_name").order("name")

    return (
      data?.map((d: any) => ({
        division_id: d.id,
        division_name: d.name as DivisionType,
        display_name: d.display_name,
      })) || []
    )
  } catch (error) {
    console.error("Error getting divisions:", error)
    return []
  }
}
