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

  // ── Visual config ────────────────────────────────────────────────────────────

  {
    name: 'get_property_photos',
    description: 'Lists photos uploaded to this property with their signed URLs. Call this when the user wants to derive or update the site plan from a photo — use it to find available photos, then call derive_visual_from_photo with the chosen URL.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  {
    name: 'derive_visual_from_photo',
    description: 'Analyses a property photo to derive a 2D site plan. Pass an aerial or overhead photo URL (get it from get_property_photos). Saves derived zones to the zones table and building footprints to the visual config. Best results with satellite, drone, or overhead photos.',
    input_schema: {
      type: 'object' as const,
      properties: {
        photo_url:    { type: 'string', description: 'Signed URL of the photo to analyse (from get_property_photos)' },
        config_notes: { type: 'string', description: 'Optional note about the source, e.g. "Derived from drone photo Apr 2026"' },
      },
      required: ['photo_url'],
    },
  },

  {
    name: 'update_visual_config',
    description: 'Saves or updates the property site plan bounds and building footprints. Use this to refine the coordinate space or building positions. To move or resize zones, use manage_zone instead. Coordinate space: 0–100 wide × 0–80 tall.',
    input_schema: {
      type: 'object' as const,
      properties: {
        site_config: {
          type: 'object' as const,
          description: 'Site config shape: { bounds?: { width, height }, buildings?: [{ id, label?, x, y, width, height, color? }] }. Do not include zones here — use manage_zone for zone edits.',
        },
        config_notes: { type: 'string', description: 'Optional note about what changed' },
      },
      required: ['site_config'],
    },
  },

  {
    name: 'get_zones',
    description: 'Returns all zones for this property from the database. Each zone has a UUID id, name, color, x/y/width/height position, and optional description. Call this before manage_zone to get zone IDs.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  {
    name: 'manage_zone',
    description: 'Creates, updates, or deletes a zone on the site plan. Zones are stored in the database. Use update to adjust position or appearance after user feedback ("move the barn further west"). Call get_zones first to get IDs for update/delete.',
    input_schema: {
      type: 'object' as const,
      properties: {
        action:      { type: 'string', enum: ['create', 'update', 'delete'] },
        zone_id:     { type: 'string', description: 'UUID of the zone — required for update and delete (get from get_zones)' },
        name:        { type: 'string', description: 'Zone display name (create/update)' },
        color:       { type: 'string', description: 'Hex color for the zone overlay (create/update)' },
        x:           { type: 'number', description: 'X position in coordinate space 0–100 (create/update)' },
        y:           { type: 'number', description: 'Y position in coordinate space 0–80 (create/update)' },
        width:       { type: 'number', description: 'Width in coordinate space (create/update)' },
        height:      { type: 'number', description: 'Height in coordinate space (create/update)' },
        description: { type: 'string', description: 'Short description of the zone (create/update)' },
        sort_order:  { type: 'number', description: 'Display order in the zone list (create/update)' },
      },
      required: ['action'],
    },
  },

  {
    name: 'get_spaces',
    description: 'Returns spaces (interior areas) for this property. Filter by zone_id (UUID) to see spaces in one zone. Use before manage_space to get space IDs.',
    input_schema: {
      type: 'object' as const,
      properties: {
        zone_id: { type: 'string', description: 'UUID of the zone to filter by. Omit for all zones.' },
      },
      required: [],
    },
  },

  {
    name: 'manage_space',
    description: 'Creates, updates, or deletes a space within a zone. Spaces are interior areas like Kitchen, Living Room, or Primary Bedroom. Call get_spaces first to get IDs for update/delete.',
    input_schema: {
      type: 'object' as const,
      properties: {
        action:     { type: 'string', enum: ['create', 'update', 'delete'] },
        zone_id:    { type: 'string', description: 'UUID of the zone — required for create (get from get_zones)' },
        space_id:   { type: 'string', description: 'UUID of the space — required for update and delete' },
        name:       { type: 'string', description: 'Space name (create/update)' },
        status:     { type: 'string', enum: ['not_started', 'in_progress', 'complete'], description: 'Space status (create/update)' },
        notes:      { type: 'string', description: 'Optional notes (create/update)' },
        sort_order: { type: 'number', description: 'Display order (create/update)' },
        pos_x: { type: 'number', description: 'X position 0–100 within zone floor plan (create/update, omit for schematic tile layout)' },
        pos_y: { type: 'number', description: 'Y position 0–100 within zone floor plan (create/update)' },
        pos_w: { type: 'number', description: 'Width 0–100 within zone floor plan (create/update)' },
        pos_h: { type: 'number', description: 'Height 0–100 within zone floor plan (create/update)' },
      },
      required: ['action'],
    },
  },
]
