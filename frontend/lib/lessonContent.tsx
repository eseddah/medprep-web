import { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ArrowDown } from 'lucide-react';

type ContentBlock = { markdown: string } | { steps: string[] };

function cleanFlowLabel(value: string) {
  return value.trim()
    .replace(/^\[(.*)\]$/, '$1')
    .replace(/^#{1,6}\s*/, '')
    .replace(/^(?:[-*+]\s+|\d+[.)]\s+)/, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^[\s|:_\-│┃├└┌┬─┤┘┐┴┼]+|[\s|:_\-│┃├└┌┬─┤┘┐┴┼]+$/g, '')
    .trim();
}

function parseArrowFlow(value: string): string[] | null {
  if (!/(?:->|→|▼|↓)/.test(value)) return null;
  const steps = value.split(/\s*(?:->|→|▼|↓)\s*/).map(cleanFlowLabel).filter(Boolean);
  return steps.length > 1 ? steps : null;
}

function isFlowConnector(line: string) {
  const connector = line.replace(/\s/g, '');
  return /^[|vV▼↓:.-]+$/.test(connector) && /[vV▼↓]/.test(connector);
}

function parseVerticalFlow(lines: string[], start: number) {
  const first = cleanFlowLabel(lines[start]);
  if (!first || /^```/.test(first) || first.startsWith('|')) return null;

  const steps = [first];
  let cursor = start + 1;
  while (cursor < lines.length && isFlowConnector(lines[cursor])) {
    while (cursor < lines.length && isFlowConnector(lines[cursor])) cursor += 1;
    if (cursor >= lines.length || !lines[cursor].trim()) break;
    const next = cleanFlowLabel(lines[cursor]);
    if (!next || next.startsWith('|') || /^```/.test(next)) break;
    steps.push(next);
    cursor += 1;
  }

  return steps.length > 1 ? { steps, end: cursor - 1 } : null;
}

function parseLegacyFlow(value: string): string[] | null {
  const lines = value.split(/\r?\n/).filter(line => line.trim());
  const treeLines = lines.filter(line => /[│┃├└┌┬─┤┘┐┴┼]/.test(line));
  if (treeLines.length > 1) {
    const steps = lines.map(cleanFlowLabel).filter(Boolean);
    if (steps.length > 1) return steps;
  }
  const vertical = parseVerticalFlow(lines, 0);
  if (vertical && vertical.end === lines.length - 1) return vertical.steps;
  const arrowLines = lines.filter(line => /(?:->|→|▼|↓)/.test(line));
  if (!arrowLines.length) return null;
  const steps = arrowLines.flatMap(line => parseArrowFlow(line) || []);
  return steps.length > 1 ? steps : null;
}

function normalizeMathDelimiters(text: string) {
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, expression: string) => `$$${expression}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, expression: string) => `$${expression}$`);
}

function splitContent(text: string): ContentBlock[] {
  const lines = text.split(/\r?\n/);
  const blocks: ContentBlock[] = [];
  let markdown: string[] = [];
  const flushMarkdown = () => {
    if (markdown.length) blocks.push({ markdown: markdown.join('\n') });
    markdown = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    if (/^\s*```/.test(lines[index])) {
      const closing = lines.findIndex((line, lineIndex) => lineIndex > index && /^\s*```/.test(line));
      if (closing > index) {
        const fencedContent = lines.slice(index + 1, closing).join('\n');
        const flow = parseLegacyFlow(fencedContent);
        if (flow) {
          flushMarkdown();
          blocks.push({ steps: flow });
        } else {
          markdown.push(...lines.slice(index, closing + 1));
        }
        index = closing;
        continue;
      }
    }

    const vertical = parseVerticalFlow(lines, index);
    if (vertical) {
      flushMarkdown();
      blocks.push({ steps: vertical.steps });
      index = vertical.end;
      continue;
    }

    const arrowFlow = parseArrowFlow(lines[index]);
    if (arrowFlow) {
      flushMarkdown();
      blocks.push({ steps: arrowFlow });
      continue;
    }

    markdown.push(lines[index]);
  }

  flushMarkdown();
  return blocks;
}

function FlowDiagram({ steps }: { steps: string[] }) {
  return (
    <div className="my-5 rounded-md border border-border bg-surface2 px-3 py-4 sm:px-5" role="img" aria-label={`Process steps: ${steps.join(', ')}`}>
      <ol className="flex flex-col items-center">
        {steps.map((step, index) => (
          <li key={`${step}-${index}`} className="flex w-full flex-col items-center">
            <div className="w-full max-w-xl break-words rounded-md border border-border bg-surface px-4 py-3 text-center text-[13px] leading-relaxed text-text shadow-none">
              {step}
            </div>
            {index < steps.length - 1 && <ArrowDown aria-hidden="true" className="my-1.5 h-4 w-4 shrink-0 text-text3" strokeWidth={1.5} />}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, { strict: 'ignore', throwOnError: false }]]}
      components={{
        h1: ({ children }) => <h2 className="mb-3 mt-7 font-dm-serif text-[22px] leading-snug text-text first:mt-0">{children}</h2>,
        h2: ({ children }) => <h3 className="mb-2 mt-6 font-dm-serif text-[19px] leading-snug text-text">{children}</h3>,
        h3: ({ children }) => <h4 className="mb-1.5 mt-4 text-[15px] font-semibold text-text">{children}</h4>,
        p: ({ children }) => <p className="mb-3 text-[14px] leading-[1.75] text-text2">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
        ul: ({ children }) => <ul className="mb-4 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-text2 marker:text-accent">{children}</ul>,
        ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-[14px] leading-relaxed text-text2 marker:font-semibold marker:text-accent">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        blockquote: ({ children }) => <blockquote className="my-4 border-l-2 border-accent px-4 py-2 text-[13px] leading-relaxed text-text2">{children}</blockquote>,
        table: ({ children }) => <div className="my-5 max-w-full overflow-x-auto rounded-md border border-border"><table className="w-full border-collapse text-left text-[12px]">{children}</table></div>,
        thead: ({ children }) => <thead className="bg-surface2 text-text">{children}</thead>,
        th: ({ children }) => <th className="border-b border-border px-3 py-2.5 font-semibold">{children}</th>,
        td: ({ children }) => <td className="border-b border-border px-3 py-2.5 align-top text-text2 last:border-0">{children}</td>,
        tr: ({ children }) => <tr className="odd:bg-surface even:bg-surface2/40">{children}</tr>,
        a: ({ children, href }) => <a href={href} className="font-medium text-accent underline decoration-border2 underline-offset-2">{children}</a>,
        pre: ({ children }) => <pre className="my-4 max-w-full overflow-x-auto rounded-md border border-border bg-surface2 p-4 font-mono text-[12px] leading-relaxed text-text">{children}</pre>,
        code: ({ children, className }) => <code className={className || 'rounded bg-surface2 px-1 py-0.5 font-mono text-[12px] text-text'}>{children}</code>,
        hr: () => <hr className="my-6 border-border" />,
      }}
    >
      {normalizeMathDelimiters(children)}
    </ReactMarkdown>
  );
}

export function formatInline(text: string): ReactNode {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, { strict: 'ignore', throwOnError: false }]]}
      components={{
        p: ({ children }) => <>{children}</>,
        strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
        em: ({ children }) => <em>{children}</em>,
        del: ({ children }) => <del>{children}</del>,
        code: ({ children }) => <code className="rounded bg-surface2 px-1 py-0.5 font-mono text-[12px] text-text">{children}</code>,
        a: ({ children, href }) => <a href={href} className="font-medium text-accent underline decoration-border2 underline-offset-2">{children}</a>,
      }}
    >
      {normalizeMathDelimiters(text)}
    </ReactMarkdown>
  );
}

export function formatLesson(text: string): ReactNode[] {
  if (typeof text !== 'string' || !text.trim()) return [];
  return splitContent(text).map((block, index) => 'steps' in block
    ? <FlowDiagram key={`flow-${index}`} steps={block.steps} />
    : <Markdown key={`markdown-${index}`}>{block.markdown}</Markdown>);
}
