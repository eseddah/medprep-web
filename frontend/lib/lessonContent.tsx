import { Fragment, ReactNode } from 'react';

function renderInlineMarkdown(text: string): ReactNode[] {
  if (!text) return [];

  const fragments: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) fragments.push(text.slice(lastIndex, match.index));

    const token = match[0];
    const inner = token.replace(/^(`|\*\*|__)/, '').replace(/(\*\*|__|`)$/, '');
    fragments.push(token.startsWith('`') ? <code key={`${token}-${lastIndex}`} className="rounded bg-surface2 px-1 py-0.5 font-mono text-[11px] text-text">{inner}</code> : <strong key={`${token}-${lastIndex}`} className="font-semibold text-text">{inner}</strong>);
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) fragments.push(text.slice(lastIndex));
  return fragments;
}

function tableCells(line: string) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
}

export function formatLesson(text: string): ReactNode[] {
  if (typeof text !== 'string') return [];
  const lines = text.split('\n');
  const output: ReactNode[] = [];
  let codeLines: string[] | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim().startsWith('```')) {
      if (codeLines) {
        output.push(<pre key={`diagram-${index}`} className="my-4 overflow-x-auto rounded-lg border border-border bg-surface2 p-4 font-mono text-[12px] leading-relaxed text-text whitespace-pre">{codeLines.join('\n')}</pre>);
        codeLines = null;
      } else {
        codeLines = [];
      }
      continue;
    }
    if (codeLines) {
      codeLines.push(line);
      continue;
    }
    if (!line.trim()) {
      output.push(<div key={`space-${index}`} className="h-2" />);
      continue;
    }
    if (line.trim().startsWith('|')) {
      const tableLines = [];
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        tableLines.push(lines[index]);
        index += 1;
      }
      index -= 1;
      const rows = tableLines.map(tableCells).filter(cells => !cells.every(cell => /^:?-{3,}:?$/.test(cell)));
      const [header, ...body] = rows;
      if (header?.length) output.push(
        <div key={`table-${index}`} className="my-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-left text-[12px]">
            <thead className="bg-surface2 text-text"><tr>{header.map((cell, cellIndex) => <th key={cellIndex} className="border-b border-border px-3 py-2 font-semibold">{cell}</th>)}</tr></thead>
            <tbody>{body.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} className="border-b border-border px-3 py-2 align-top text-text2 last:border-0">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    const trimmed = line.trim();

    if (line.startsWith('# ')) output.push(<h2 key={index} className="font-dm-serif text-[22px] text-text mt-6 mb-2">{renderInlineMarkdown(line.slice(2))}</h2>);
    else if (line.startsWith('## ')) output.push(<h3 key={index} className="font-semibold text-[15px] text-text mt-4 mb-1.5">{renderInlineMarkdown(line.slice(3))}</h3>);
    else if (line.startsWith('### ')) output.push(<h4 key={index} className="font-semibold text-[14px] text-text mt-3 mb-1">{renderInlineMarkdown(line.slice(4))}</h4>);
    else if (line.startsWith('> ')) output.push(<div key={index} className="my-3 rounded-r-lg border-l-[3px] border-accent bg-accent/10 px-4 py-3 text-[13px] leading-relaxed text-text">{renderInlineMarkdown(line.slice(2))}</div>);
    else if (line.startsWith('- ') || line.startsWith('* ')) output.push(<div key={index} className="flex gap-2 text-[14px] leading-relaxed text-text2 pl-3"><span className="text-accent">•</span><span>{renderInlineMarkdown(line.slice(2))}</span></div>);
    else if (/^\d+\. /.test(trimmed)) output.push(<p key={index} className="text-[14px] leading-relaxed text-text2 pl-3">{renderInlineMarkdown(trimmed.replace(/^\d+\.\s*/, ''))}</p>);
    else output.push(<p key={index} className="text-[14px] leading-[1.75] text-text2 mb-1">{renderInlineMarkdown(trimmed)}</p>);
  }

  if (codeLines?.length) output.push(<pre key="diagram-final" className="my-4 overflow-x-auto rounded-lg border border-border bg-surface2 p-4 font-mono text-[12px] leading-relaxed text-text whitespace-pre">{codeLines.join('\n')}</pre>);
  return output.map((node, index) => <Fragment key={index}>{node}</Fragment>);
}
