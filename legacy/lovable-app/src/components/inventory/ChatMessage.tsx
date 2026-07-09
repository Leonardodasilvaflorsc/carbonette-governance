import { Message } from "@/types/chat";

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  return (
    <div
      className={`flex ${
        message.role === 'user' ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
          message.role === 'user'
            ? 'bg-primary text-white shadow-sm'
            : 'bg-secondary/50 text-gray-900 shadow-sm'
        }`}
      >
        <div className="text-sm font-medium mb-2">
          {message.role === 'user' ? 'Você' : 'Inctus IA'}
        </div>
        <div className="leading-relaxed whitespace-pre-line">
          {message.content}
        </div>
        <div className="text-xs opacity-70 mt-2">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};