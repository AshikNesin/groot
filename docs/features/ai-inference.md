# AI Inference

Built-in LLM access via [`@earendil-works/pi-ai`](https://github.com/earendil-works/pi), giving you one API across providers (OpenAI, Anthropic, and more).

The adapter simplifies common operations: text completion, streaming, and structured data extraction using Zod schemas.

## Overview

The core adapter lives in `packages/core/src/ai/`. It exports an `AI` class you instantiate with a provider and model.

### Key Features

| Feature           | What it gives you                                                                 |
| ----------------- | --------------------------------------------------------------------------------- |
| Unified API       | Switch providers/models without changing application code                         |
| Streaming         | Stream responses chunk-by-chunk                                                   |
| Structured output | Extract typed data from LLMs via Zod schemas (auto-converted to tool definitions) |
| Native env vars   | API keys are read automatically (e.g. `OPENAI_API_KEY`) — no extra config         |
| Escape hatch      | Full access to the underlying `pi-ai` primitives when you need more control       |

## Basic Usage

First, instantiate the AI class with your desired provider and model:

```typescript
import { AI } from "@groot/core/ai";

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
    data: imageBuffer.toString("base64"),
  },
  {
    type: "image",
    mimeType: "application/pdf",
    data: pdfBuffer.toString("base64"),
  },
]);
```

### Structured Output Generation (with Zod)

This is one of the most powerful features. Define a Zod schema, and the AI will guarantee the response matches it.

```typescript
import { z } from "zod";

const personSchema = z.object({
  name: z.string(),
  age: z.number(),
  occupation: z.string().optional(),
});

const data = await ai.generateObject(
  "Extract the info: John Doe is a 30-year-old software engineer.",
  personSchema,
);

// Returns strongly typed:
// { name: "John Doe", age: 30, occupation: "software engineer" }
```

### Using Models with Thinking/Reasoning

For models that support "thinking" (like `claude-sonnet-4-6` or `gpt-5.4`), you can specify a reasoning effort:

```typescript
const response = await ai.complete("Solve this complex math problem...", {
  reasoning: "high",
});
```

### Escape Hatch: Raw pi-ai API

If the adapter's abstraction is too limiting, use the `.raw()` method to access the underlying pi-ai primitives:

```typescript
const { model, complete, stream } = ai.raw();

// Use pi-ai's complete function directly with full control over Context and options
const response = await complete(model, {
  messages: [{ role: "user", content: "Hello" }],
  systemPrompt: "You are a helpful assistant",
});
```

## Environment Variables

The adapter automatically picks up API keys from your environment using standard naming conventions:

- `OPENAI_API_KEY`

You can also pass an `apiKey` explicitly when instantiating the `AI` class, which overrides the environment variable.

```typescript
const ai = new AI({
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  apiKey: "custom-key",
});
```
