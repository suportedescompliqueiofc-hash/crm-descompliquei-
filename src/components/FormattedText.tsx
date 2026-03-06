"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { cn } from '@/lib/utils';

interface FormattedTextProps {
  content: string;
  className?: string;
}

export function FormattedText({ content, className }: FormattedTextProps) {
  if (!content) return null;

  // Limpeza de caracteres de escape literais (\n) que podem vir do banco/IA
  const cleanContent = content.replace(/\\n/g, '\n');

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-strong:text-primary", className)}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          // Customização de elementos para garantir que sigam o design do sistema
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-inherit">{children}</li>,
          strong: ({ children }) => <strong className="font-bold text-foreground/90">{children}</strong>,
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
}