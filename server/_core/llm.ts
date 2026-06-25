import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

type LlmProvider = "anthropic" | "openai";

// Resolve provider + credentials from env. `LLM_*` vars take precedence and
// fall back to the Manus Forge vars. Works with any OpenAI-compatible API
// (OpenAI, Gemini, Groq, Together, Ollama, ...) and native Anthropic/Claude.
// Provider is taken from LLM_PROVIDER, else inferred from the key/URL.
export function llmConfig() {
  const apiKey = (process.env.LLM_API_KEY || ENV.forgeApiKey || "").trim();
  const baseUrl = (process.env.LLM_BASE_URL || ENV.forgeApiUrl || "").trim();
  const model = process.env.LLM_MODEL || "gemini-2.5-flash";

  const explicit = (process.env.LLM_PROVIDER || "").toLowerCase();
  let provider: LlmProvider = "openai";
  if (explicit === "anthropic" || explicit === "claude") {
    provider = "anthropic";
  } else if (explicit) {
    provider = "openai"; // openai, gemini, google, groq, ollama, ...
  } else if (/anthropic\.com/i.test(baseUrl) || apiKey.startsWith("sk-ant-")) {
    provider = "anthropic";
  }

  return { apiKey, baseUrl, model, provider };
}

// The Manus Forge proxy accepts a non-standard `thinking` param; other
// OpenAI-compatible providers (e.g. Google Gemini) reject unknown fields.
const isForgeEndpoint = () => {
  const base = process.env.LLM_BASE_URL || ENV.forgeApiUrl;
  return !base || base.includes("manus");
};

const assertApiKey = () => {
  if (!llmConfig().apiKey) {
    throw new Error(
      "No LLM API key configured (set LLM_API_KEY, or BUILT_IN_FORGE_API_KEY)"
    );
  }
};

// OpenAI-compatible chat-completions endpoint.
function openAiUrl(baseUrl: string): string {
  if (!baseUrl) return "https://forge.manus.im/v1/chat/completions";
  if (baseUrl.endsWith("/chat/completions")) return baseUrl;
  return `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
}

// Anthropic Messages endpoint.
function anthropicUrl(baseUrl: string): string {
  if (!baseUrl) return "https://api.anthropic.com/v1/messages";
  if (baseUrl.endsWith("/messages")) return baseUrl;
  return `${baseUrl.replace(/\/$/, "")}/v1/messages`;
}

// Flatten OpenAI-style message content to plain text (for the Anthropic path).
function contentToText(content: MessageContent | MessageContent[]): string {
  const arr = Array.isArray(content) ? content : [content];
  return arr
    .map(part => {
      if (typeof part === "string") return part;
      if (part.type === "text") return part.text;
      return "";
    })
    .join("")
    .trim();
}

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();
  const cfg = llmConfig();

  const built =
    cfg.provider === "anthropic"
      ? buildAnthropicRequest(params, cfg)
      : buildOpenAIRequest(params, cfg);

  // Space requests out to respect provider rate limits (free tiers especially).
  await throttle();

  const json = await fetchWithRetry(built.url, built.headers, built.body);

  return cfg.provider === "anthropic"
    ? parseAnthropicResponse(json, built.structuredToolName)
    : (json as InvokeResult);
}

type BuiltRequest = {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  structuredToolName?: string;
};

// OpenAI-compatible request (OpenAI, Gemini, Groq, Ollama, Forge, ...).
function buildOpenAIRequest(params: InvokeParams, cfg: ReturnType<typeof llmConfig>): BuiltRequest {
  const { messages, tools, toolChoice, tool_choice, outputSchema, output_schema, responseFormat, response_format } = params;

  const payload: Record<string, unknown> = {
    model: cfg.model,
    messages: messages.map(normalizeMessage),
    max_tokens: 32768,
  };

  if (tools && tools.length > 0) payload.tools = tools;

  const normalizedToolChoice = normalizeToolChoice(toolChoice || tool_choice, tools);
  if (normalizedToolChoice) payload.tool_choice = normalizedToolChoice;

  if (isForgeEndpoint()) payload.thinking = { budget_tokens: 128 };

  const normalizedResponseFormat = normalizeResponseFormat({ responseFormat, response_format, outputSchema, output_schema });
  if (normalizedResponseFormat) payload.response_format = normalizedResponseFormat;

  return {
    url: openAiUrl(cfg.baseUrl),
    headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
    body: payload,
  };
}

// Native Anthropic Messages request. Structured output (json_schema) and
// OpenAI-style function tools are mapped onto Anthropic tools.
function buildAnthropicRequest(params: InvokeParams, cfg: ReturnType<typeof llmConfig>): BuiltRequest {
  const { messages, tools, toolChoice, tool_choice, outputSchema, output_schema, responseFormat, response_format } = params;

  const systemText = messages
    .filter(m => m.role === "system")
    .map(m => contentToText(m.content))
    .filter(Boolean)
    .join("\n\n");

  const convMessages = messages
    .filter(m => m.role === "user" || m.role === "assistant")
    .map(m => ({ role: m.role, content: contentToText(m.content) }));

  const body: Record<string, unknown> = {
    model: cfg.model,
    max_tokens: Number(process.env.LLM_MAX_TOKENS ?? 8192),
    messages: convMessages,
  };
  if (systemText) body.system = systemText;

  let structuredToolName: string | undefined;

  const normalizedResponseFormat = normalizeResponseFormat({ responseFormat, response_format, outputSchema, output_schema });
  if (normalizedResponseFormat && normalizedResponseFormat.type === "json_schema") {
    // Force a single tool whose input IS the structured result.
    structuredToolName = normalizedResponseFormat.json_schema.name;
    body.tools = [{
      name: normalizedResponseFormat.json_schema.name,
      description: "Return the result strictly matching the provided JSON schema.",
      input_schema: normalizedResponseFormat.json_schema.schema,
    }];
    body.tool_choice = { type: "tool", name: normalizedResponseFormat.json_schema.name };
  } else if (tools && tools.length > 0) {
    body.tools = tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters ?? { type: "object", properties: {} },
    }));
    const ntc = normalizeToolChoice(toolChoice || tool_choice, tools);
    if (ntc && typeof ntc === "object" && "function" in ntc) {
      body.tool_choice = { type: "tool", name: ntc.function.name };
    } else if (ntc === "auto") {
      body.tool_choice = { type: "auto" };
    }
  }

  return {
    url: anthropicUrl(cfg.baseUrl),
    headers: {
      "content-type": "application/json",
      "x-api-key": cfg.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body,
    structuredToolName,
  };
}

// Map an Anthropic Messages response onto the OpenAI-shaped InvokeResult that
// callers expect. Structured output is returned as JSON-stringified tool input.
function parseAnthropicResponse(json: any, structuredToolName?: string): InvokeResult {
  const blocks: any[] = Array.isArray(json?.content) ? json.content : [];
  let content = "";
  let tool_calls: ToolCall[] | undefined;

  if (structuredToolName) {
    const block =
      blocks.find(b => b.type === "tool_use" && b.name === structuredToolName) ||
      blocks.find(b => b.type === "tool_use");
    content = block
      ? JSON.stringify(block.input ?? {})
      : blocks.filter(b => b.type === "text").map(b => b.text).join("");
  } else {
    content = blocks.filter(b => b.type === "text").map(b => b.text).join("");
    const toolUses = blocks.filter(b => b.type === "tool_use");
    if (toolUses.length > 0) {
      tool_calls = toolUses.map(b => ({
        id: b.id,
        type: "function" as const,
        function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) },
      }));
    }
  }

  return {
    id: json?.id ?? "",
    created: 0,
    model: json?.model ?? "",
    choices: [{
      index: 0,
      message: { role: "assistant", content, ...(tool_calls ? { tool_calls } : {}) },
      finish_reason: json?.stop_reason ?? null,
    }],
    usage: json?.usage
      ? {
          prompt_tokens: json.usage.input_tokens ?? 0,
          completion_tokens: json.usage.output_tokens ?? 0,
          total_tokens: (json.usage.input_tokens ?? 0) + (json.usage.output_tokens ?? 0),
        }
      : undefined,
  };
}

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  body: unknown
): Promise<any> {
  const maxRetries = 5;
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (response.ok) return await response.json();

    const errorText = await response.text();
    // 429 rate-limit, 503 unavailable, 529 Anthropic overloaded.
    const retryable = response.status === 429 || response.status === 503 || response.status === 529;

    if (retryable && attempt < maxRetries) {
      const waitMs = retryDelayFromError(errorText) ?? Math.min(2000 * 2 ** attempt, 30000);
      console.warn(
        `[LLM] ${response.status} ${response.statusText}; retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${maxRetries})`
      );
      await sleep(waitMs);
      continue;
    }

    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Minimum spacing between LLM request starts. ~4.5s keeps us under the free
// tier's per-minute cap (gemini-2.0-flash allows ~15/min).
// Override with LLM_MIN_INTERVAL_MS (e.g. "0" on a paid tier) to remove spacing.
const MIN_REQUEST_INTERVAL_MS = Number(process.env.LLM_MIN_INTERVAL_MS ?? 4500);
let throttleChain: Promise<void> = Promise.resolve();
let lastRequestStart = 0;

// Serialises callers through a chain so concurrent uploads don't burst the API.
function throttle(): Promise<void> {
  const result = throttleChain.then(async () => {
    const wait = Math.max(0, lastRequestStart + MIN_REQUEST_INTERVAL_MS - Date.now());
    if (wait > 0) await sleep(wait);
    lastRequestStart = Date.now();
  });
  // Keep the chain alive regardless of individual outcomes.
  throttleChain = result.catch(() => {});
  return result;
}

// Google returns a RetryInfo with a "retryDelay" like "27s" on 429s — honour it.
function retryDelayFromError(errorText: string): number | null {
  const match = errorText.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  if (!match) return null;
  // Add a small buffer so we don't race the quota window edge.
  return Math.ceil(parseFloat(match[1]) * 1000) + 1000;
}
