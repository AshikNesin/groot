# AI Inference

The groot boilerplate provides built-in AI inference capabilities powered by [`@mariozechner/pi-ai`](https://github.com/badlogic/pi-mono/tree/main/packages/ai). This provides a unified API to interact with various Large Language Models (LLMs) such as OpenAI, Anthropic, Google (Gemini), and many more.

The AI adapter simplifies the developer experience for common operations like text completion, streaming, and extracting structured data using Zod schemas.

## Overview

The core adapter is located in `server/src/core/ai/`. It provides an `AI` class that you can instantiate with a specific provider and model.

### Key Features
- **Unified API**: Switch providers and models without changing your application code.
- **Streaming Support**: Stream responses chunk-by-chunk for better UX.
- **Structured Output**: Extract typed, structured data from LLMs easily using Zod schemas. The adapter automatically handles converting the Zod schema to a tool definition and validating the response.
- **Native Env Vars**: API keys are read automatically from environment variables (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`). No extra configuration needed.
- **Escape Hatch**: Full access to the underlying `pi-ai` primitives when you need advanced control.

## Basic Usage

First, instantiate the AI class with your desired provider and model:

```typescript
import { AI } from "@/core/ai";

const ai = new AI({ provider: "anthropic", model: "claude-sonnet-4-6" });
```

### Simple text completion
```typescript
const text = await ai.complete("Translate 'hello world' to French.");
// Returns: "Bonjour le monde"
```

### Streaming text completion
```typescript
for await (const chunk of ai.stream("Write a short story about a brave knight...")) {
  process.stdout.write(chunk);
}
```

### Multimodal Inputs (Images & Documents)

You can pass an array of content blocks instead of a simple string to provide images or documents to the model. Note that pi-ai currently scopes `base64` attachments under `type: "image"`, but you can pass `"application/pdf"` as the `mimeType` for models that support it.

```typescript
import fs from "fs";

const imageBuffer = fs.readFileSync("path/to/image.png");
const pdfBuffer = fs.readFileSync("path/to/document.pdf");

const response = await ai.complete([
  { type: "text", text: "What is in these files?" },
  { 
    type: "image", 
    mimeType: "image/png", 
    data: imageBuffer.toString("base64") 
  },
  { 
    type: "image", 
    mimeType: "application/pdf", 
    data: pdfBuffer.toString("base64") 
  }
]);
```

### Structured Output Generation (with Zod)
This is one of the most powerful features. Define a Zod schema, and the AI will guarantee the response matches it.

```typescript
import { z } from "zod";

const personSchema = z.object({
  name: z.string(),
  age: z.number(),
  occupation: z.string().optional()
});

const data = await ai.generateObject(
  "Extract the info: John Doe is a 30-year-old software engineer.",
  personSchema
);

// Returns strongly typed:
// { name: "John Doe", age: 30, occupation: "software engineer" }
```

### Using Models with Thinking/Reasoning
For models that support "thinking" (like `claude-sonnet-4-6` or `gpt-5.4`), you can specify a reasoning effort:

```typescript
const response = await ai.complete("Solve this complex math problem...", {
  reasoning: "high"
});
```

### Escape Hatch: Raw pi-ai API
If the adapter's abstraction is too limiting, use the `.raw()` method to access the underlying pi-ai primitives:

```typescript
const { model, complete, stream } = ai.raw();

// Use pi-ai's complete function directly with full control over Context and options
const response = await complete(model, {
  messages: [{ role: "user", content: "Hello" }],
  systemPrompt: "You are a helpful assistant"
});
```

## Example Endpoint

A working example endpoint is provided at `POST /api/v1/ai/chat`.

**Request Structure:**
```json
{
  "message": "Hello, AI",
  "stream": false,
  "provider": "openai",
  "model": "gpt-5.4",
  "systemPrompt": "You are a helpful assistant."
}
```

Check `server/src/controllers/ai.controller.ts` and `server/src/services/ai.service.ts` to see how it's implemented.

## Environment Variables

The adapter automatically picks up API keys from your environment using standard naming conventions:
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `XAI_API_KEY`
- `DEEPSEEK_API_KEY`
- etc.

You can also pass an `apiKey` explicitly when instantiating the `AI` class, which overrides the environment variable.

```typescript
const ai = new AI({ 
  provider: "anthropic", 
  model: "claude-sonnet-4-6",
  apiKey: "custom-key" 
});
```
