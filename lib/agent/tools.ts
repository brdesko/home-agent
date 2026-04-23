import Anthropic from '@anthropic-ai/sdk'

export const tools: Anthropic.Tool[] = [
  {
    name: 'create_project',
    description: 'Creates a new project with optional initial tasks, budget lines, and timeline events. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name:           { type: 'string' },
        domain:         { type: 'string' },
        status:         { type: 'string', enum: ['planned', 'active', 'on_hold'] },
        priority:       { type: 'string', enum: ['low', 'medium', 'high'] },
        effort:         { type: 'string', enum: ['low', 'medium', 'high', 'very_high'], description: 'Owner effort level: low = mostly hired out, very_high = intensive DIY' },
        target_year:        { type: 'number', description: 'Year this project is planned for' },
        target_quarter:     { type: 'number', enum: [1, 2, 3, 4], description: 'Quarter this project is planned for' },
        description:        { type: 'string' },
        goal_id:            { type: 'string', description: 'Assign to a goal by ID' },
        target_budget:      { type: 'number', description: 'Owner\'s intended spend ceiling for this project' },
        parent_project_id:  { type: 'string', description: 'ID of a predecessor project whose target_budget becomes this project\'s inherited estimated spend' },
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title:    { type: 'string' },
              status:   { type: 'string', enum: ['todo', 'in_progress', 'blocked'] },
              due_date: { type: 'string' },
            },
            required: ['title'],
          },
        },
        budget_lines: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description:      { type: 'string' },
              estimated_amount: { type: 'number', description: 'Planned cost for this item' },
              actual_amount:    { type: 'number', description: 'Actual recorded cost for this item' },
            },
            required: ['description'],
          },
        },
        timeline_events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title:       { type: 'string' },
              description: { type: 'string' },
              event_date:  { type: 'string' },
            },
            required: ['title', 'event_date'],
          },
        },
      },
      required: ['name', 'domain', 'status', 'priority'],
    },
  },
  {
    name: 'get_project_tasks',
    description: 'Returns the current tasks for a project. Call this before updating tasks so you know the task IDs.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'update_project',
    description: 'Updates fields on an existing project. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id:     { type: 'string' },
        name:           { type: 'string' },
        domain:         { type: 'string' },
        status:         { type: 'string', enum: ['planned', 'active', 'on_hold', 'complete', 'cancelled'] },
        priority:       { type: 'string', enum: ['low', 'medium', 'high'] },
        effort:         { type: 'string', enum: ['low', 'medium', 'high', 'very_high'], description: 'Owner effort level' },
        target_year:    { type: 'number', description: 'Year this project is planned for' },
        target_quarter: { type: 'number', enum: [1, 2, 3, 4], description: 'Quarter this project is planned for' },
        description:    { type: 'string' },
        goal_id:           { type: 'string', description: 'Assign to a goal by ID, or omit to leave unchanged' },
        actual_spend:      { type: 'number', description: 'Recorded actual spend for this project (total, not a line item)' },
        target_budget:     { type: 'number', description: 'Owner\'s intended spend ceiling for this project' },
        parent_project_id: { type: 'string', description: 'ID of a predecessor project whose target_budget becomes this project\'s inherited estimated spend' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'create_goal',
    description: 'Creates a new goal for this property. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name:          { type: 'string' },
        description:   { type: 'string' },
        priority:      { type: 'string', enum: ['low', 'medium', 'high'] },
        target_budget: { type: 'number', description: 'Total budget target for this goal' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_goal',
    description: 'Updates fields on an existing goal, including its target budget. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        goal_id:       { type: 'string' },
        name:          { type: 'string' },
        description:   { type: 'string' },
        status:        { type: 'string', enum: ['active', 'complete', 'paused'] },
        priority:      { type: 'string', enum: ['low', 'medium', 'high'] },
        target_budget: { type: 'number', description: 'Total budget target for this goal across all linked projects' },
      },
      required: ['goal_id'],
    },
  },
  {
    name: 'update_task',
    description: 'Updates fields on an existing task. Call get_project_tasks first to get task IDs. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id:  { type: 'string' },
        title:    { type: 'string' },
        status:   { type: 'string', enum: ['todo', 'in_progress', 'done', 'blocked'] },
        due_date: { type: 'string', description: 'ISO date YYYY-MM-DD, or null to clear' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'get_project_budget_lines',
    description: 'Returns current budget lines for a project. Call before adding or removing lines so you know what exists.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'add_budget_line',
    description: 'Adds a budget line item to a project. Each line has a description plus optional estimated and/or actual amounts. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id:       { type: 'string' },
        description:      { type: 'string', description: 'Name of this cost item (e.g. "Lumber", "Contractor labor")' },
        estimated_amount: { type: 'number', description: 'Planned/budgeted cost for this item' },
        actual_amount:    { type: 'number', description: 'Recorded actual cost for this item' },
      },
      required: ['project_id', 'description'],
    },
  },
  {
    name: 'remove_budget_line',
    description: 'Removes a budget line by ID. Call get_project_budget_lines first to get IDs. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        budget_line_id: { type: 'string' },
      },
      required: ['budget_line_id'],
    },
  },
  {
    name: 'set_quarterly_budget',
    description: 'Sets one or more fields on a quarterly budget entry. Creates the quarter if it does not exist. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        year:               { type: 'number', description: 'e.g. 2026' },
        quarter:            { type: 'number', enum: [1, 2, 3, 4] },
        core_income:        { type: 'number', description: 'Post-tax salary and bonus aggregate' },
        additional_income:  { type: 'number', description: 'Investment accounts, side income, etc.' },
        core_expenses:      { type: 'number', description: 'Fixed recurring expenses (utilities, internet, etc.)' },
        additional_expenses:{ type: 'number', description: 'Variable expenses (food, entertainment, travel, etc.)' },
        allocation_pct:     { type: 'number', description: 'Percentage of net income allocated to home improvement (0-100)' },
      },
      required: ['year', 'quarter'],
    },
  },
  {
    name: 'get_saved_references',
    description: 'Returns all saved references (vendors, brands, resources) for this property. Use when you need the full list with details mid-conversation.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'save_reference',
    description: 'Saves a trusted vendor, preferred brand, or useful resource to the property references list. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type:  { type: 'string', enum: ['vendor', 'brand', 'resource'], description: 'vendor = contractor/service provider, brand = product brand, resource = link/guide/tool' },
        name:  { type: 'string', description: 'Name of the vendor, brand, or resource' },
        notes: { type: 'string', description: 'Why they are trusted, what they were used for, any contact info or details' },
        url:   { type: 'string', description: 'Website or contact URL, optional' },
      },
      required: ['type', 'name'],
    },
  },
  {
    name: 'get_all_tasks',
    description: 'Returns all tasks across every project for this property, grouped by project_id. Use this for a full Notebook assessment — e.g., after a task completion to find cascade implications across all projects.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'log_purchase',
    description: 'Logs a purchase to the property purchase history. Use when the user mentions buying something for the property. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        item_name:    { type: 'string', description: 'What was purchased' },
        vendor:       { type: 'string', description: 'Where it was purchased (store name, website, etc.)' },
        price:        { type: 'number', description: 'Total price paid in USD' },
        purchased_at: { type: 'string', description: 'Date purchased, ISO format YYYY-MM-DD. Default to today if not specified.' },
        project_id:   { type: 'string', description: 'ID of the project this purchase is for, if known' },
        category:     { type: 'string', description: 'Category such as Materials, Lumber, Hardware, Tools & Equipment, Plants & Seeds, Labor, etc.' },
        notes:        { type: 'string', description: 'Quantity, specs, or any other relevant context' },
      },
      required: ['item_name'],
    },
  },
  {
    name: 'get_purchases',
    description: 'Returns purchase history for this property, optionally filtered. Use when you need context about past buying patterns — pricing, preferred vendors, or category spend.',
    input_schema: {
      type: 'object' as const,
      properties: {
        category:   { type: 'string', description: 'Filter by category' },
        vendor:     { type: 'string', description: 'Filter by vendor name (partial match)' },
        project_id: { type: 'string', description: 'Filter by project ID' },
        limit:      { type: 'number', description: 'Max number of results to return (default 20)' },
      },
      required: [],
    },
  },
  {
    name: 'add_task',
    description: 'Adds a new task to an existing project. Only call after explicit user approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string' },
        title:      { type: 'string' },
        status:     { type: 'string', enum: ['todo', 'in_progress', 'blocked'] },
        due_date:   { type: 'string', description: 'ISO date YYYY-MM-DD, optional' },
      },
      required: ['project_id', 'title'],
    },
  },
  {
    name: 'parse_listing',
    description: 'Parses a property listing from a URL or pasted text. Returns structured property details, assets, and project suggestions. Call immediately when the user shares listing content — do not ask for manual details when you can parse.',
    input_schema: {
      type: 'object' as const,
      properties: {
        source: { type: 'string', enum: ['url', 'text'], description: '"url" to fetch a webpage, "text" for content the user pasted into the chat' },
        url:    { type: 'string', description: 'URL to fetch and parse. Note: Zillow and Redfin block automated access — the tool will handle this.' },
        text:   { type: 'string', description: 'Raw text the user pasted (listing page, inspection report, etc.)' },
      },
      required: ['source'],
    },
  },
  {
    name: 'update_property_details',
    description: 'Saves physical details to the property profile (year built, square footage, acreage, heat type, etc.). Call after parse_listing returns propertyDetails, or when the user provides these facts directly. Does not require approval — these are factual records.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name:          { type: 'string', description: 'Property name' },
        address:       { type: 'string', description: 'Property address' },
        year_built:    { type: 'number', description: 'Year the main structure was built' },
        sq_footage:    { type: 'number', description: 'Interior square footage' },
        acreage:       { type: 'number', description: 'Total acreage' },
        lot_size:      { type: 'string', description: 'Lot size as descriptive text, e.g. "5.3 acres"' },
        heat_type:     { type: 'string', enum: ['oil', 'gas', 'propane', 'electric', 'heat pump', 'wood/pellet', 'other'] },
        well_septic:   { type: 'string', description: 'Description of water source and sewer system' },
        details_notes: { type: 'string', description: 'Other notable facts about the property' },
      },
      required: [],
    },
  },
  {
    name: 'create_asset',
    description: 'Saves a property asset (appliance, system, structure) to the property profile. Call for each asset returned by parse_listing, or when the user mentions a specific asset. Does not require approval — these are factual records.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name:         { type: 'string', description: 'Descriptive name, e.g. "Carrier Gas Furnace" or "Well Pump"' },
        asset_type:   { type: 'string', enum: ['hvac', 'water-heater', 'roof', 'well-pump', 'septic', 'electrical', 'plumbing', 'appliance', 'vehicle', 'equipment', 'structure', 'other'] },
        make:         { type: 'string', description: 'Manufacturer or brand' },
        model:        { type: 'string', description: 'Model number or name' },
        install_date: { type: 'string', description: 'Year or date installed, e.g. "2015" or "2015-06"' },
        location:     { type: 'string', description: 'Where on the property, e.g. "Basement", "Detached garage"' },
        notes:        { type: 'string', description: 'Condition, service history, or other relevant notes' },
      },
      required: ['name', 'asset_type'],
    },
  },
]
