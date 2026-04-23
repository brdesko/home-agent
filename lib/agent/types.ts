export type TaskInput = {
  title: string
  status?: string
  due_date?: string
}

export type BudgetLineInput = {
  description: string
  estimated_amount?: number
  actual_amount?: number
}

export type TimelineEventInput = {
  title: string
  description?: string
  event_date: string
}

export type CreateProjectInput = {
  name: string
  domain: string
  status: string
  priority: string
  effort?: string
  target_year?: number
  target_quarter?: number
  description?: string
  goal_id?: string
  target_budget?: number
  parent_project_id?: string
  tasks?: TaskInput[]
  budget_lines?: BudgetLineInput[]
  timeline_events?: TimelineEventInput[]
}

export type UpdateProjectInput = {
  project_id: string
  name?: string
  domain?: string
  status?: string
  priority?: string
  effort?: string
  target_year?: number
  target_quarter?: number
  description?: string
  goal_id?: string
  actual_spend?: number
  target_budget?: number
  parent_project_id?: string
}

export type CreateGoalInput = {
  name: string
  description?: string
  priority?: string
  target_budget?: number
}

export type UpdateGoalInput = {
  goal_id: string
  name?: string
  description?: string
  status?: string
  priority?: string
  target_budget?: number
}

export type UpdateTaskInput = {
  task_id: string
  title?: string
  status?: string
  due_date?: string | null
}

export type AddTaskInput = {
  project_id: string
  title: string
  status?: string
  due_date?: string
}

export type SetQuarterlyBudgetInput = {
  year: number
  quarter: number
  core_income?: number
  additional_income?: number
  core_expenses?: number
  additional_expenses?: number
  allocation_pct?: number
}

export type GetProjectBudgetLinesInput = { project_id: string }
export type AddBudgetLineInput = { project_id: string; description: string; estimated_amount?: number; actual_amount?: number }
export type RemoveBudgetLineInput = { budget_line_id: string }

export type SaveReferenceInput = {
  type: 'vendor' | 'brand' | 'resource'
  name: string
  notes?: string
  url?: string
}

export type LogPurchaseInput = {
  item_name: string
  vendor?: string
  price?: number
  purchased_at?: string
  project_id?: string
  category?: string
  notes?: string
}

export type ParseListingInput = {
  source: 'url' | 'text'
  url?: string
  text?: string
}

export type UpdatePropertyDetailsInput = {
  name?: string
  address?: string
  year_built?: number | null
  sq_footage?: number | null
  acreage?: number | null
  lot_size?: string | null
  heat_type?: string | null
  well_septic?: string | null
  details_notes?: string | null
}

export type CreateAssetInput = {
  name: string
  asset_type: string
  make?: string
  model?: string
  install_date?: string
  location?: string
  notes?: string
}

export type ProjectCreated = {
  id: string
  name: string
  taskCount: number
  budgetTotal: number
  eventCount: number
}

export type ChangeResult = {
  type: 'project_created' | 'project_updated' | 'task_updated' | 'task_added' | 'budget_updated' | 'reference_saved' | 'purchase_logged'
  summary: string
}
