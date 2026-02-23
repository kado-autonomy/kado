import { v4 as uuid } from 'uuid';
import type { LLMProvider } from '../llm/provider.js';
import type { Plan, PlanStep, Context, ExecutionResult } from './types.js';
export interface PlannerToolDef {
  name: string;
  description: string;
  parameters: Array<{ name: string; type: string; description?: string; required?: boolean }>;
}

export class Planner {
  private toolDefinitions: PlannerToolDef[];
  private knownToolNames: Set<string>;

  constructor(
    private llmProvider: LLMProvider,
    toolDefinitions: PlannerToolDef[] = [],
    knownToolNames?: Set<string>,
  ) {
    this.toolDefinitions = toolDefinitions;
    this.knownToolNames = knownToolNames ?? new Set(toolDefinitions.map((t) => t.name));
  }

  async createPlan(request: string, context: Context): Promise<Plan> {
    const prompt = this.buildPrompt(request, context);
    const response = await this.llmProvider.complete(
      [{ role: 'user', content: prompt }],
      { maxTokens: 4096 }
    );
    return this.parsePlan(response.content, request);
  }

  async replan(
    request: string,
    context: Context,
    previousPlan: Plan,
    results: ExecutionResult[]
  ): Promise<Plan> {
    const stepSummaries = previousPlan.steps.map((step) => {
      const result = results.find((r) => r.stepId === step.id);
      const status = result
        ? result.success
          ? `SUCCEEDED — output: ${JSON.stringify(result.output)?.slice(0, 500)}`
          : `FAILED — error: ${result.error}`
        : 'NOT EXECUTED';
      return `  [${step.id}] ${step.toolName}(${JSON.stringify(step.toolArgs)}): ${status}`;
    });

    const retryPrompt = this.buildPrompt(request, context) + `

IMPORTANT: A previous plan was attempted but failed. Learn from these results and create a corrected plan.

Previous plan "${previousPlan.title}" results:
${stepSummaries.join('\n')}

Key instructions for the retry:
- Use concrete file paths and values discovered in successful steps (do NOT guess paths that were not found).
- Do NOT repeat steps that already succeeded unless their results are needed by new steps.
- If a search step found no results, try alternative search patterns or different paths.
- If a file was not found at a guessed path, use the actual project structure revealed by successful search/read steps.
- Skip steps that are unnecessary (e.g., don't run tests if no test framework exists).

CRITICAL: If ALL search/discovery steps returned empty results or irrelevant matches, the requested target likely does not exist in this codebase. In that case, respond with ONLY this JSON (no other steps):
{
  "title": "short description",
  "steps": [],
  "infeasible": true,
  "reason": "Clear explanation of what was searched for and why it was not found"
}`;

    const response = await this.llmProvider.complete(
      [{ role: 'user', content: retryPrompt }],
      { maxTokens: 4096 }
    );
    return this.parsePlan(response.content, request);
  }

  private formatToolDefs(): string {
    if (this.toolDefinitions.length === 0) return '';

    const lines = this.toolDefinitions.map((t) => {
      const params = t.parameters
        .map((p) => {
          const opt = p.required === false ? '?' : '';
          return `${p.name}${opt}: ${p.type}`;
        })
        .join(', ');
      return `- ${t.name}(${params}) -- ${t.description}`;
    });

    return `\nAvailable tools (you MUST use ONLY these exact tool names, and toolArgs keys MUST match the parameter names listed):\n${lines.join('\n')}\n`;
  }

  private buildPrompt(request: string, context: Context): string {
    const fileContext = context.files.length > 0
      ? `\nRelevant files in the project: ${context.files.join(', ')}`
      : '';

    const codeContext = (context.codeSnippets && context.codeSnippets.length > 0)
      ? '\n\nRelevant code snippets:\n' + context.codeSnippets.map((s) =>
          `--- ${s.filePath} (lines ${s.startLine}-${s.endLine}) ---\n${s.content}`
        ).join('\n\n')
      : '';

    const structureContext = context.projectStructure
      ? `\n\nProject directory structure:\n${context.projectStructure}`
      : '';

    const toolDefs = this.formatToolDefs();

    return `You are an autonomous coding agent. Create a step-by-step plan to accomplish the following request by using the available tools.

Your plan should:
1. Use the project directory structure below to target your searches — prefer searching paths and files that actually exist rather than guessing common conventions.
2. First use grep_search or glob_search to find the relevant files if they are not already provided in context.
3. ALWAYS use file_read to read a file's full contents before editing it. You need the exact text to construct a correct file_edit oldString.
4. Use file_edit for targeted string replacements (oldString must be an exact, unique substring from the file — not a single word). Use file_write for creating new files.
5. Each step must use one of the available tools listed below.
6. When a step needs data from a previous step (e.g., a file path found by a search), list those step IDs in "dependsOn" and use a placeholder reference like "{{step-1}}" in toolArgs. The executor will resolve these to concrete values at runtime using the actual results.
7. Only include steps that are strictly necessary. Do NOT include speculative or conditional steps (e.g., "if applicable" steps). Focus on the direct path to completing the request.
8. Use multiple diverse search patterns in the initial discovery step(s). For example, search for component names, tag names, text content, and file naming conventions — not just one pattern.
${toolDefs}
Output ONLY valid JSON (no markdown fences, no explanation) with this structure:
{
  "title": "short description of the plan",
  "steps": [
    {
      "id": "step-1",
      "description": "what this step does",
      "toolName": "exact_tool_name",
      "toolArgs": { "paramName": "value" },
      "dependsOn": []
    },
    {
      "id": "step-2",
      "description": "read the file found in step 1",
      "toolName": "file_read",
      "toolArgs": { "path": "{{step-1}}" },
      "dependsOn": ["step-1"]
    }
  ]
}

Request: ${request}${fileContext}${codeContext}${structureContext}`;
  }

  private parsePlan(response: string, fallbackTitle: string): Plan {
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    let parsed: {
      title?: string;
      steps?: Array<{ id?: string; description?: string; toolName?: string; toolArgs?: Record<string, unknown>; dependsOn?: string[] }>;
      infeasible?: boolean;
      reason?: string;
    };
    try {
      parsed = JSON.parse(cleaned) as typeof parsed;
    } catch {
      parsed = { title: fallbackTitle, steps: [] };
    }

    if (parsed.infeasible && (!parsed.steps || parsed.steps.length === 0)) {
      return {
        id: uuid(),
        title: parsed.title ?? fallbackTitle,
        steps: [],
        status: 'infeasible',
        infeasibleReason: parsed.reason,
      };
    }

    const validToolNames = this.knownToolNames;
    const rawSteps = parsed.steps ?? [];

    const invalidSteps: Array<{ toolName: string; description: string }> = [];
    const validSteps = rawSteps.filter((s) => {
      if (validToolNames.size === 0) return true;
      if (s.toolName && validToolNames.has(s.toolName)) return true;
      invalidSteps.push({
        toolName: s.toolName ?? 'unknown',
        description: s.description ?? '',
      });
      return false;
    });

    if (rawSteps.length > 0 && validSteps.length === 0 && validToolNames.size > 0) {
      const badNames = invalidSteps.map((s) => s.toolName);
      const available = [...validToolNames].join(', ');
      throw new Error(
        `Plan has ${rawSteps.length} step(s) but none use valid tool names. ` +
        `Invalid names: ${badNames.join(', ')}. Available tools: ${available}`
      );
    }

    const steps: PlanStep[] = validSteps
      .map((s, i) => ({
        id: s.id ?? `step-${i + 1}`,
        description: s.description ?? '',
        toolName: s.toolName ?? 'unknown',
        toolArgs: s.toolArgs ?? {},
        dependsOn: s.dependsOn ?? [],
        status: 'pending' as const,
      }));

    return {
      id: uuid(),
      title: parsed.title ?? fallbackTitle,
      steps,
      status: 'draft',
    };
  }
}
