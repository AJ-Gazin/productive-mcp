import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Zod schema for timesheet prompt arguments
const timesheetPromptSchema = z.object({
  project_name: z.string().optional().describe('Optional project name or ID to start with'),
  date: z.string().optional().describe('Date for time entry (today, yesterday, or YYYY-MM-DD)'),
  time: z.string().optional().describe('Time duration (e.g., "2h", "120m", "1.5h")'),
  work_description: z.string().optional().describe('Brief description of work performed'),
});

/**
 * Generate a guided timesheet entry prompt that walks users through the complete workflow
 */
export async function generateTimesheetPrompt(args: unknown): Promise<{
  description: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text';
      text: string;
    };
  }>;
}> {
  try {
    const params = timesheetPromptSchema.parse(args);
    
    const projectHint = params.project_name ? `for project "${params.project_name}"` : '';
    const dateHint = params.date ? ` on ${params.date}` : '';
    const timeHint = params.time ? ` (${params.time})` : '';
    
    const workflowGuidance = `I'll help you create a timesheet entry${projectHint}${dateHint}${timeHint}. 

**TIMESHEET WORKFLOW OVERVIEW:**
This requires 4 steps to ensure your time is logged to the correct service:

1. **🏢 Project Selection** - Find the right project
2. **⚙️ Service Selection** - Pick the correct service for this work (via get_project_services)
3. **📋 Task Selection** - Link to a specific task (recommended)
4. **📝 Time Entry Creation** - Preview and confirm your time entry before creation

**IMPORTANT: CONFIRMATION REQUIRED**
In Step 5, I will show you exactly what will be created and ask for your confirmation before actually logging the time. This prevents accidental entries.

**WHY THIS WORKFLOW?**
Productive.io follows a hierarchy: Project → Service → Time Entry
Each time entry must be linked to a specific service to ensure proper billing and tracking.

Let's start the workflow:`;

    let messages: Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }> = [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Please help me create a timesheet entry${projectHint}${dateHint}${timeHint}${params.work_description ? ` for: ${params.work_description}` : ''}`
        }
      },
      {
        role: 'assistant',
        content: {
          type: 'text',
          text: workflowGuidance
        }
      }
    ];

    // Add project-specific guidance if project name provided
    if (params.project_name) {
      messages.push({
        role: 'assistant',
        content: {
          type: 'text',
          text: `**STEP 1: 🏢 Project Selection**
Since you mentioned "${params.project_name}", let me search for matching projects:

\`\`\`
I'll use: list_projects to find projects matching "${params.project_name}"
\`\`\`

Once we find your project, we'll move to budget selection.`
        }
      });
    } else {
      messages.push({
        role: 'assistant',
        content: {
          type: 'text',
          text: `**STEP 1: 🏢 Project Selection**
First, let's find the project you worked on:

\`\`\`
I'll use: list_projects to show available projects
\`\`\`

Please tell me which project you worked on, or I can list all active projects for you to choose from.`
        }
      });
    }

    messages.push({
      role: 'assistant',
      content: {
        type: 'text',
        text: `**NEXT STEPS PREVIEW:**

**Step 2:** Once we have your project_id, I'll run:
\`get_project_services project_id="[PROJECT_ID]"\` to show available services for that project

**Step 3:** With the project_id, I'll run:
\`get_project_tasks project_id="[PROJECT_ID]"\` to show tasks you can link to (recommended)

**Step 4:** Finally, I'll prepare your time entry for confirmation:
\`create_time_entry\` with all the selected details plus your detailed work description

**CONFIRMATION PROCESS:**
Before any time is logged, you'll see:
- The exact date, time, and duration
- Which project, service, and task it's linked to
- Your work description
- Who the time is being logged for

Only after you explicitly confirm will the time entry be created.

**READY TO START?**
Tell me the project name or say "list projects" to see all available projects.`
      }
    });

    return {
      description: `Guided timesheet entry workflow${projectHint}${dateHint}${timeHint}`,
      messages
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid prompt arguments: ${error.errors.map(e => e.message).join(', ')}`
      );
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

// Schema for quick timesheet prompt
const quickTimesheetSchema = z.object({
  step: z.enum(['project', 'service', 'task', 'create']).describe('Current step in workflow'),
  project_id: z.string().optional().describe('Selected project ID'),
  service_id: z.string().optional().describe('Selected service ID'),
  task_id: z.string().optional().describe('Selected task ID'),
});

/**
 * Generate step-by-step guidance for timesheet workflow
 */
export async function generateQuickTimesheetPrompt(args: unknown): Promise<{
  description: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text';
      text: string;
    };
  }>;
}> {
  try {
    const params = quickTimesheetSchema.parse(args);
    
    let stepGuidance = '';
    let nextAction = '';
    
    switch (params.step) {
      case 'project':
        stepGuidance = '**STEP 1: 🏢 PROJECT SELECTION**\nI need to find the project you worked on.';
        nextAction = 'Use: `list_projects` to see available projects, then tell me the project name or ID.';
        break;
        
      case 'service':
        stepGuidance = '**STEP 2: ⚙️ SERVICE SELECTION**\nI need to find the available services for this project.';
        nextAction = `Use: \`get_project_services project_id="${params.project_id}"\` to see services for this project.`;
        break;

      case 'task':
        stepGuidance = '**STEP 3: 📋 TASK SELECTION (Recommended)**\nLet\'s link your time to a specific task.';
        nextAction = `Use: \`get_project_tasks project_id="${params.project_id}"\` to see available tasks.`;
        break;

      case 'create':
        stepGuidance = '**STEP 4: 📝 CREATE TIME ENTRY WITH CONFIRMATION**\nReady to preview and confirm your time entry before creation.';
        nextAction = `Use: \`create_time_entry\` with service_id="${params.service_id}"${params.task_id ? `, task_id="${params.task_id}"` : ''}, detailed notes, date, and time.`;
        break;
    }

    return {
      description: `Timesheet workflow step: ${params.step}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Help me with timesheet entry step: ${params.step}`
          }
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: `${stepGuidance}

**NEXT ACTION:**
${nextAction}

**PROGRESS:** ${getProgressIndicator(params.step)}

**REMEMBER:** Each timesheet entry requires:
- ✅ Valid service_id from the project → budget → service hierarchy
- ✅ Detailed work description (minimum 10 characters)
- ✅ Specific date and time duration
- 📝 Optional but recommended: task_id for better tracking`
          }
        }
      ]
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid prompt arguments: ${error.errors.map(e => e.message).join(', ')}`
      );
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

function getProgressIndicator(currentStep: string): string {
  const steps = ['project', 'service', 'task', 'create'];
  const currentIndex = steps.indexOf(currentStep);

  return steps.map((_, index) => {
    if (index < currentIndex) return '✅';
    if (index === currentIndex) return '🔄';
    return '⏳';
  }).join(' ') + ` (Step ${currentIndex + 1}/4)`;
}

export const timesheetPromptDefinition = {
  name: 'timesheet_entry',
  description: 'Guided workflow for creating timesheet entries in Productive.io. Walks you through project → budget → service → task → time entry selection with proper validation.',
  arguments: [
    {
      name: 'project_name',
      description: 'Optional: Project name or ID to start with',
      required: false,
    },
    {
      name: 'date',
      description: 'Optional: Date for time entry (today, yesterday, or YYYY-MM-DD format)',
      required: false,
    },
    {
      name: 'time',
      description: 'Optional: Time duration (e.g., "2h", "120m", "1.5h")',
      required: false,
    },
    {
      name: 'work_description',
      description: 'Optional: Brief description of work performed',
      required: false,
    },
  ],
};

export const quickTimesheetPromptDefinition = {
  name: 'timesheet_step',
  description: 'Step-by-step guidance for timesheet workflow. Use this to get specific help for each step: project, budget, service, task, or create.',
  arguments: [
    {
      name: 'step',
      description: 'Current workflow step: project, budget, service, task, or create',
      required: true,
    },
    {
      name: 'project_id',
      description: 'Project ID if already selected',
      required: false,
    },
    {
      name: 'service_id',
      description: 'Service ID if already selected',
      required: false,
    },
    {
      name: 'task_id',
      description: 'Task ID if already selected',
      required: false,
    },
  ],
};