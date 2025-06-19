import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmailMessage } from '@/types/negotiation';
import { SENDER_COLORS, SENDER_ICONS } from '@/constants/negotiation';
import { format } from 'date-fns';

interface EmailThreadProps {
  messages: EmailMessage[];
}

const EmailThread: React.FC<EmailThreadProps> = ({ messages }) => {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="text-6xl mb-4">📧</div>
          <h3 className="text-lg font-semibold mb-2">No Messages Yet</h3>
          <p className="text-sm">Start a negotiation to see the conversation here</p>
        </div>
      </div>
    );
  }

  const getSenderDisplayName = (sender: EmailMessage['sender']): string => {
    switch (sender) {
      case 'ai':
        return 'AI Assistant';
      case 'human':
      case 'user':
        return 'You (Alex)';
      case 'sanjay':
        return 'Sanjay Malladi';
      case 'system':
        return 'System';
      default:
        return sender;
    }
  };

  const getSenderColor = (sender: EmailMessage['sender']): string => {
    return SENDER_COLORS[sender] || SENDER_COLORS.system;
  };

  const getSenderIcon = (sender: EmailMessage['sender']): string => {
    return SENDER_ICONS[sender] || SENDER_ICONS.system;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold">Email Conversation</h2>
        <p className="text-sm text-muted-foreground">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <Card 
              key={message.id} 
              className={`${getSenderColor(message.sender)} transition-all duration-200 hover:shadow-md`}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl flex-shrink-0">
                    {getSenderIcon(message.sender)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {getSenderDisplayName(message.sender)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(message.timestamp, 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      
                      {message.isHumanActionPrompt && (
                        <Badge variant="secondary" className="text-xs">
                          Action Required
                        </Badge>
                      )}
                    </div>
                    
                    {message.subject && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Subject: </span>
                        <span className="text-sm font-semibold">{message.subject}</span>
                      </div>
                    )}
                    
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans bg-transparent border-none p-0 m-0">
                        {message.content}
                      </pre>
                    </div>
                    
                    {message.humanActionResponse && (
                      <div className="mt-3 p-3 bg-muted rounded-md border-l-4 border-primary">
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          Your Response:
                        </div>
                        <div className="text-sm">
                          {message.humanActionResponse}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default EmailThread; 