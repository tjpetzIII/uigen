# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Style

Use comments sparingly. Only comment complex code.

## Commands

```bash
# First-time setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development server (uses Turbopack)

npm run dev

# Run tests (Vitest)
npm test

# Run a single test file
npx vitest run src/lib/__tests__/file-system.test.ts

# Lint
npm run lint

# Build for production
npm run build

# Reset database
npm run db:reset
```

`NODE_OPTIONS='--require ./node-compat.cjs'` is prepended to all Next.js commands — this is required for compatibility and must not be removed.

Set `ANTHROPIC_API_KEY` in `.env` to enable real AI generation. Without it, a `MockLanguageModel` in `src/lib/provider.ts` returns static component examples.

## Architecture

UIGen is an AI-powered React component generator. Users describe components in a chat interface; the AI uses tool calls to write files into a virtual file system; those files are immediately transpiled in-browser and rendered in an iframe preview.

### Request / AI flow

1. **Client** (`src/lib/contexts/chat-context.tsx`) calls `/api/chat` via the Vercel AI SDK `useChat` hook, serializing the current virtual file system state in the request body.
2. **API route** (`src/app/api/chat/route.ts`) reconstructs a `VirtualFileSystem` from the serialized nodes, calls `streamText` with two tools (`str_replace_editor`, `file_manager`), and streams back tool calls alongside text.
3. The **AI model** (`src/lib/provider.ts`) is `claude-haiku-4-5` via `@ai-sdk/anthropic`, or `MockLanguageModel` when no API key is present.
4. The system prompt (`src/lib/prompts/generation.tsx`) instructs the AI to always create `/App.jsx` as the entry point and use `@/` aliases for local imports.
5. On finish, if the user is authenticated the route persists messages + file system to the Prisma `Project` record.

### Virtual File System

`VirtualFileSystem` (`src/lib/file-system.ts`) is an in-memory tree (root `FileNode` with `Map<string, FileNode>` children). It lives in client-side React state inside `FileSystemProvider` (`src/lib/contexts/file-system-context.tsx`).

- `handleToolCall` in the context listens for `str_replace_editor` (create/str_replace/insert) and `file_manager` (rename/delete) tool calls from the AI stream and applies them to the VFS.
- The VFS is serialized to a plain `Record<string, FileNode>` to pass over the network (Maps are not JSON-serializable).

### Preview

`PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) renders an iframe whose `srcdoc` is rebuilt whenever `refreshTrigger` increments.

`createImportMap` + `createPreviewHTML` (`src/lib/transform/jsx-transformer.ts`) handle the in-browser pipeline:
- All `.jsx`/`.tsx`/`.js`/`.ts` files are transpiled with `@babel/standalone` (JSX + optional TypeScript).
- Each transpiled file becomes a `blob:` URL registered in an ES module import map.
- Third-party imports are automatically routed to `esm.sh`.
- Missing local imports get auto-generated placeholder modules.
- Tailwind CSS is loaded from CDN (`cdn.tailwindcss.com`) in the iframe.
- The preview entry point is looked up in this order: `/App.jsx`, `/App.tsx`, `/index.jsx`, `/index.tsx`, `/src/App.jsx`, `/src/App.tsx`.

### Authentication & Projects

- JWT sessions stored in an `httpOnly` cookie (`auth-token`), managed in `src/lib/auth.ts` using `jose`.
- Anonymous users can generate components; work is tracked in `sessionStorage` via `src/lib/anon-work-tracker.ts` and can be migrated on sign-up.
- Authenticated users get projects persisted in SQLite via Prisma. `Project.messages` and `Project.data` are JSON-serialized strings.
- Prisma client is generated to `src/generated/prisma` (not the default location).
- The database schema is defined in `prisma/schema.prisma`. Reference it whenever working with data models or queries.

### UI Layout

`MainContent` (`src/app/main-content.tsx`) is the root client component:
- Left panel: `ChatInterface` (chat messages + input)
- Right panel: tabbed `PreviewFrame` (iframe) or Code view (`FileTree` + `CodeEditor` via Monaco)
- Both panels are resizable via `react-resizable-panels`

### Key paths

| Path | Purpose |
|------|---------|
| `src/app/api/chat/route.ts` | AI streaming endpoint |
| `src/lib/file-system.ts` | VirtualFileSystem class |
| `src/lib/contexts/file-system-context.tsx` | VFS React context + tool call handler |
| `src/lib/contexts/chat-context.tsx` | Vercel AI SDK `useChat` wrapper |
| `src/lib/transform/jsx-transformer.ts` | Babel transpile + import map generation |
| `src/lib/provider.ts` | Language model selection (real vs mock) |
| `src/lib/prompts/generation.tsx` | System prompt for the AI |
| `src/lib/tools/str-replace.ts` | `str_replace_editor` tool definition |
| `src/lib/tools/file-manager.ts` | `file_manager` tool definition |
| `src/lib/auth.ts` | JWT session management (server-only) |
| `prisma/schema.prisma` | DB schema (User, Project) |
