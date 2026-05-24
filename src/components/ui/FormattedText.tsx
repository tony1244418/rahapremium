import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text, className = '' }) => {
  if (!text) return null;

  // Split by newlines first
  const lines = text.split('\n');

  return (
    <div className={className}>
      {lines.map((line, i) => {
        // Match standard markdown and WhatsApp styling
        // **bold**, *bold*, _italic_, ~strike~
        const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|_.*?_|~.*?~)/g);
        
        return (
          <React.Fragment key={i}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                return <strong key={j} className="font-bold">{part.slice(2, -2)}</strong>;
              }
              if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
                return <strong key={j} className="font-bold">{part.slice(1, -1)}</strong>;
              }
              if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
                return <em key={j} className="italic">{part.slice(1, -1)}</em>;
              }
              if (part.startsWith('~') && part.endsWith('~') && part.length > 2) {
                return <del key={j} className="line-through">{part.slice(1, -1)}</del>;
              }
              return part;
            })}
            {i < lines.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </div>
  );
};
