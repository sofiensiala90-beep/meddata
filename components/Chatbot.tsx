
import React, { useState, useRef, useEffect } from 'react';
import ChatIcon from './icons/ChatIcon';
import Button from './Button';
import Spinner from './Spinner';
import { getChatbotResponseStream } from '../services/geminiService';
import { User, ChatMessage, ChatbotResponse, SystemSettings } from '../types';

interface ChatbotProps {
  user: User;
  onNavigate: (page: string) => void;
  systemSettings: SystemSettings;
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  action?: ChatbotResponse['action'];
  actionTaken?: boolean;
  isError?: boolean;
}

const Chatbot: React.FC<ChatbotProps> = ({ user, onNavigate, systemSettings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: `Bonjour ${user.name} ! Je suis DASS (from JS GATE). Comment puis-je vous aider aujourd'hui ?`, sender: 'ai' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatbotRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) return;
      if (buttonRef.current && buttonRef.current.contains(event.target as Node)) {
        return;
      }
      if (chatbotRef.current && !chatbotRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  useEffect(() => {
    if (isOpen) {
      // Use a timeout to ensure the input is rendered before focusing, especially with CSS transitions.
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);


  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now(), text: inputValue, sender: 'user' };
    const aiMessagePlaceholder: Message = { id: Date.now() + 1, text: '', sender: 'ai' };

    const currentMessagesWithUser = [...messages, userMessage];
    setMessages([...currentMessagesWithUser, aiMessagePlaceholder]);
    setInputValue('');
    setIsLoading(true);

    const history: ChatMessage[] = currentMessagesWithUser.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
    }));
    
    let fullText = '';
    try {
        const stream = await getChatbotResponseStream(user.role, history, systemSettings);

        for await (const chunk of stream) {
            fullText += chunk.text;
            setMessages(prev => 
                prev.map(m => m.id === aiMessagePlaceholder.id ? { ...m, text: fullText } : m)
            );
            // Add a small delay to make the streaming effect visible
            await new Promise(r => setTimeout(r, 50));
        }
        
        const actionRegex = /\[ACTION:(\w+)\]/;
        const match = fullText.match(actionRegex);
        
        if (match && match[1]) {
            const action = match[1] as NonNullable<ChatbotResponse['action']>;
            const cleanedText = fullText.replace(actionRegex, '').trim();

            setMessages(prev => 
                prev.map(m => 
                    m.id === aiMessagePlaceholder.id 
                    ? { ...m, text: cleanedText, action, actionTaken: false } 
                    : m
                )
            );
        }

    } catch (error: any) {
        console.error("Chatbot stream error:", error);
        // Display the actual error message from the service (e.g., 403 Forbidden)
        const errorMessage = error.message || "Désolé, une erreur technique est survenue.";
        setMessages(prev => 
            prev.map(m => 
                m.id === aiMessagePlaceholder.id 
                ? { ...m, text: `⚠️ Erreur : ${errorMessage}`, isError: true } 
                : m
            )
        );
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendMessage();
    }
  };

  const handleActionClick = (action: NonNullable<ChatbotResponse['action']>, messageId: number) => {
    let page = '';
    switch(action) {
      case 'navigate_formulaires':
        page = 'formulaires';
        break;
      case 'navigate_bibliotheque':
        page = 'bibliotheque';
        break;
      case 'navigate_analyse':
        page = 'analyse';
        break;
      case 'navigate_portefeuille':
        page = 'portefeuille';
        break;
    }
    if (page) {
        onNavigate(page);
        setIsOpen(false); 
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, actionTaken: true } : m));
    }
  };

  const getActionText = (action: NonNullable<ChatbotResponse['action']>) => {
    switch(action) {
      case 'navigate_formulaires':
        return 'Aller aux Formulaires';
      case 'navigate_bibliotheque':
        return 'Aller à la Bibliothèque';
      case 'navigate_analyse':
        return 'Aller à l\'Analyse IA';
      case 'navigate_portefeuille':
        return 'Aller au Portefeuille';
      default:
        return 'Aller';
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="bg-primary-600 text-white rounded-full p-4 shadow-lg hover:bg-primary-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          aria-label={isOpen ? "Fermer le chatbot" : "Ouvrir le chatbot"}
        >
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <ChatIcon className="w-8 h-8" />
          )}
        </button>
      </div>

      {isOpen && (
        <div ref={chatbotRef} className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] sm:w-full max-w-sm h-[70vh] sm:h-[60vh] bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col z-40">
          <header className="bg-primary-600 text-white p-4 rounded-t-xl flex justify-between items-center">
            <h3 className="font-bold text-lg">Assistant DASS</h3>
          </header>

          <main className="flex-1 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-900">
            <div className="space-y-4">
              {messages.map(message => (
                <div key={message.id} className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      message.sender === 'user' 
                        ? 'bg-primary-500 text-white' 
                        : message.isError 
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                    }`}>
                    {message.sender === 'ai' && message.text === '' && isLoading ? (
                        <span className="blinking-cursor"></span>
                    ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    )}
                  </div>
                   {message.sender === 'ai' && message.action && !message.actionTaken && (
                      <div className="mt-2">
                          <Button 
                              variant="secondary" 
                              className="!text-xs !py-1.5 !px-3"
                              onClick={() => handleActionClick(message.action!, message.id)}
                          >
                            {getActionText(message.action)} →
                          </Button>
                      </div>
                  )}
                </div>
              ))}
               <div ref={messagesEndRef} />
            </div>
          </main>

          <footer className="p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Posez votre question..."
                className="flex-grow w-full shadow sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                disabled={isLoading}
              />
              <Button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()}>
                {isLoading ? <Spinner className="w-5 h-5" /> : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                )}
              </Button>
            </div>
          </footer>
        </div>
      )}
    </>
  );
};

export default Chatbot;