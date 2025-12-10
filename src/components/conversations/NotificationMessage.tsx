import { useState } from 'react';
import { Button } from '@/components/ui/button';

const TRUNCATE_LENGTH = 75;

interface NotificationMessageProps {
  message: string;
}

export function NotificationMessage({ message }: NotificationMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isLongMessage = message.length > TRUNCATE_LENGTH;
  const displayText = isLongMessage && !isExpanded ? `${message.substring(0, TRUNCATE_LENGTH)}...` : message;

  return (
    <div>
      <p className="whitespace-pre-wrap">{displayText}</p>
      {isLongMessage && (
        <Button
          variant="link"
          className="h-auto p-0 mt-1 text-xs text-amber-900 hover:text-amber-700 font-semibold"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Ver menos' : 'Ver mais'}
        </Button>
      )}
    </div>
  );
}