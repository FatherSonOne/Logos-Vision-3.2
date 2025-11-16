import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { chatWithBot } from '../services/geminiService';

interface AiChatBotProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AiChatBot: React.FC<AiChatBotProps> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: 'init', roomId: 'ai-chat', senderId: 'AI', text: 'Hello! How can I help you today?', timestamp: new Date().toISOString() }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if(isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            roomId: 'ai-chat',
            senderId: 'USER',
            text: userInput.trim(),
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setIsLoading(true);

        const responseText = await chatWithBot(messages, userMessage.text);

        const aiMessage: ChatMessage = {
            id: `msg-${Date.now() + 1}`,
            roomId: 'ai-chat',
            senderId: 'AI',
            text: responseText,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity animate-in fade-in-0 duration-300" onClick={onClose} />
            <div className="relative w-full max-w-sm h-[32rem] bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col border border-white/20 dark:border-slate-700 animate-in slide-in-from-bottom-4 duration-300">
                <header className="p-4 bg-transparent flex justify-between items-center border-b border-white/20 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">AI Assistant</h3>
                    <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-1 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                <div className="flex-1 p-3 overflow-y-auto bg-transparent">
                    <div className="space-y-4">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex items-start gap-2.5 ${msg.senderId === 'USER' ? 'justify-end' : ''}`}>
                                {msg.senderId === 'AI' && <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">AI</div>}
                                <div className={`p-3 rounded-lg max-w-[85%] text-sm shadow-sm ${msg.senderId === 'USER' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex items-start gap-2.5">
                                 <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">AI</div>
                                 <div className="p-3 rounded-lg bg-white dark:bg-slate-700 shadow-sm">
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                                    </div>
                                 </div>
                            </div>
                        )}
                    </div>
                     <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="p-3 border-t border-white/20 dark:border-slate-700">
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Ask something..."
                        className="w-full text-sm p-2 bg-white/50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </form>
            </div>
        </div>
    );
};
