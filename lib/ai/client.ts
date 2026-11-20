import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim() || process.env.ANTHROPIC_AUTH_TOKEN?.trim());
}

export function getAnthropic() {
  client ??= new Anthropic();
  return client;
}

/** Turns SDK errors into a message an editor can act on. */
export function describeAiError(error: unknown) {
  if (error instanceof Anthropic.AuthenticationError) {
    return "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in the admin environment.";
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return "This API key is not allowed to use the configured model.";
  }
  if (error instanceof Anthropic.NotFoundError) {
    return "The configured AI model was not found. Check ANTHROPIC_MODEL.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "The AI service is rate limited right now. Wait a minute and try again.";
  }
  if (error instanceof Anthropic.BadRequestError) {
    return `The AI request was rejected: ${error.message}`;
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "Could not reach the AI service. Check the network and try again.";
  }
  if (error instanceof Anthropic.APIError) {
    return `The AI service returned an error (${error.status ?? "unknown"}). Try again shortly.`;
  }
  return error instanceof Error ? error.message : "AI request failed.";
}

export const AI_NOT_CONFIGURED =
  "AI is not configured yet. Add ANTHROPIC_API_KEY to the admin environment variables and redeploy.";
