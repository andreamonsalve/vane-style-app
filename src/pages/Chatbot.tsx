import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import { useDiagnosisStore } from '@/src/lib/diagnosisStore';
import { chatWithVane, ChatMessage } from '@/src/lib/geminiService';
import { supabase } from '@/src/lib/supabaseClient';

export const Chatbot = () => {
  const { user } = useAuth();
  const { faceDiagnosis, colorDiagnosis, styleGoal } = useDiagnosisStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load initial session or create a new one
  useEffect(() => {
    if (!user) return;

    const initChat = async () => {
      try {
        // Find existing today's session or create a new one
        const { data: existingSessions, error: fetchError } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;

        if (existingSessions && existingSessions.length > 0) {
          const session = existingSessions[0];
          setSessionId(session.id);
          setMessages(session.messages as ChatMessage[]);
        } else {
          // Create new session with initial Vane message
          const initialMessage: ChatMessage = {
             role: 'assistant', 
             content: 'Hola, soy Vane. Estoy aquí para explorar tu relación emocional con tu imagen y ayudarte a lograr tu objetivo de estilo. ¿Por qué sientes que te vistes como lo haces hoy?' 
          };
          
          const { data: newSession, error: insertError } = await supabase
            .from('chat_sessions')
            .insert({
              user_id: user.id,
              messages: [initialMessage]
            })
            .select()
            .single();
            
          if (insertError) throw insertError;
          setSessionId(newSession.id);
          setMessages([initialMessage]);
        }
      } catch (err) {
        console.error('Error initializing chat:', err);
        // Fallback if db fails
        setMessages([{ role: 'assistant', content: 'Hola, soy Vane. Hubo un problema conectando al servidor, pero podemos charlar.' }]);
      }
    };

    initChat();
  }, [user]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: ChatMessage = { role: 'user', content: input };
    const newContext = [...messages, userMessage];
    
    setMessages(newContext);
    setInput('');
    setIsLoading(true);

    try {
      // Create user profile context from diagnosisStore
      const userProfile = {
        faceType: faceDiagnosis?.faceType,
        season: colorDiagnosis?.season,
        styleGoal: styleGoal || undefined
      };

      // Call Gemini API
      const aiResponseText = await chatWithVane(newContext, userProfile);
      
      const assistantMessage: ChatMessage = { role: 'assistant', content: aiResponseText };
      const updatedMessages = [...newContext, assistantMessage];
      setMessages(updatedMessages);

      // Save to Supabase
      if (sessionId && user) {
        await supabase
          .from('chat_sessions')
          .update({ messages: updatedMessages })
          .eq('id', sessionId);
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Lo siento, estoy teniendo problemas de conexión. Por favor intenta de nuevo.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-white">
      <header className="px-6 pt-12 pb-6 border-b border-light-gray shrink-0">
        <span className="overline-text text-mid-gray mb-2 block">MÓDULO EMOCIONAL</span>
        <h1 className="display-md">DIAGNÓSTICO PROFUNDO</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
        {messages.map((msg, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "max-w-[85%] space-y-2",
              msg.role === 'user' ? "ml-auto text-right" : "mr-auto text-left"
            )}
          >
            <span className="overline-text text-[10px] text-mid-gray">
              {msg.role === 'user' ? 'TÚ' : 'VANE AI'}
            </span>
            <div className={cn(
              "p-4 body text-[14px]",
              msg.role === 'user' ? "bg-black text-white" : "bg-off-white text-black"
            )}>
              {msg.content}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mr-auto text-left max-w-[85%] space-y-2"
          >
            <span className="overline-text text-[10px] text-mid-gray">VANE AI</span>
            <div className="p-4 bg-off-white w-16 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-mid-gray" />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 border-t border-light-gray bg-white shrink-0">
        <div className="flex gap-4 items-center">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="ESCRIBE AQUÍ..."
            className="flex-1 border-b border-light-gray py-2 focus:border-black outline-none body uppercase text-[12px]"
            disabled={isLoading}
          />
          <button 
            onClick={handleSend} 
            className="p-2 disabled:opacity-50"
            disabled={isLoading || !input.trim()}
          >
            <Send className="w-5 h-5 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
};
