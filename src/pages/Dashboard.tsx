import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Send, Plus, Loader2, MessageSquare, Settings, Bot, Pencil, Trash2, Check, X, Paperclip, ChevronLeft } from 'lucide-react';
import { generateAIResponse, availableModels, type AIModel } from '../lib/ai';
import type { User } from '@supabase/supabase-js';
import { CodeBlock } from '../components/CodeBlock';
import { parseMessage } from '../utils/messageParser';
import { ImageAnalysis } from '../components/ImageAnalysis';
import { motion, AnimatePresence } from 'framer-motion';
import { TypewriterMessage } from '../components/TypewriterMessage';
import type { ImageAnalysisResult } from '../components/ImageAnalysis';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  isTyping?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageAnalysisResults, setImageAnalysisResults] = useState<ImageAnalysisResult[] | null>(null);
  const [selectedModel, setSelectedModel] = useState<AIModel>({
    provider: 'openrouter',
    modelId: 'deepseek/deepseek-r1-distill-llama-70b:free'
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setUser(session.user);
        loadConversations();
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation);
    }
  }, [currentConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setConversations(data);
      if (data.length > 0 && !currentConversation) {
        setCurrentConversation(data[0].id);
      }
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const createNewConversation = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('conversations')
      .insert([{ user_id: user.id }])
      .select()
      .single();

    if (!error && data) {
      setConversations([data, ...conversations]);
      setCurrentConversation(data.id);
      setMessages([]);
    }
  };

  const startTitleEdit = (conversation: Conversation) => {
    setEditingTitle(conversation.id);
    setNewTitle(conversation.title);
  };

  const saveTitle = async () => {
    if (!editingTitle || !newTitle.trim()) return;

    const { error } = await supabase
      .from('conversations')
      .update({ title: newTitle.trim() })
      .eq('id', editingTitle);

    if (!error) {
      setConversations(conversations.map(conv =>
        conv.id === editingTitle ? { ...conv, title: newTitle.trim() } : conv
      ));
    }
    setEditingTitle(null);
    setNewTitle('');
  };

  const deleteConversation = async (id: string) => {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);

    if (!error) {
      setConversations(conversations.filter(conv => conv.id !== id));
      if (currentConversation === id) {
        const nextConv = conversations.find(conv => conv.id !== id);
        setCurrentConversation(nextConv?.id ?? null);
        setMessages([]);
      }
    }
  };

  const handleImageAnalysisComplete = (results: ImageAnalysisResult[]) => {
    setImageAnalysisResults(results);
    setShowImageUpload(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !imageAnalysisResults) || !currentConversation || loading) return;

    setLoading(true);

    let messageContent = input.trim();
    if (imageAnalysisResults) {
      messageContent += '\n\nImage Question is:\n' + 
        imageAnalysisResults.map(result => 
          `${result.type.toUpperCase()}:\n${result.content}`
        ).join('\n\n');
    }

    // Insert user message
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert([{
        conversation_id: currentConversation,
        role: 'user',
        content: messageContent
      }])
      .select()
      .single();

    if (!messageError && messageData) {
      setMessages([...messages, messageData]);
      setInput('');
      setImageAnalysisResults(null);

      // Update conversation title if it's the first message
      if (messages.length === 0) {
        const title = messageContent.slice(0, 50) + (messageContent.length > 50 ? '...' : '');
        await supabase
          .from('conversations')
          .update({ title })
          .eq('id', currentConversation);
        
        setConversations(conversations.map(conv =>
          conv.id === currentConversation ? { ...conv, title } : conv
        ));
      }

      setIsThinking(true);

      // Get AI response
      const aiResponse = await generateAIResponse(messageContent, selectedModel);
      
      const { data: aiMessageData, error: aiMessageError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: currentConversation,
          role: 'assistant',
          content: aiResponse
        }])
        .select()
        .single();

      if (!aiMessageError && aiMessageData) {
        setMessages(prev => [...prev, aiMessageData]);
      }

      setIsThinking(false);
    }
    
    setLoading(false);
  };

  const renderMessageContent = (message: Message) => {
    if (message.role === 'assistant') {
      return <TypewriterMessage content={message.content} />;
    }

    const parts = parseMessage(message.content);
    return parts.map((part, index) => {
      if (part.type === 'code') {
        return (
          <div key={index} className="my-4">
            <CodeBlock code={part.content} language={part.language || 'plaintext'} />
          </div>
        );
      }
      return <p key={index} className="whitespace-pre-wrap">{part.content}</p>;
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-indigo-950 to-gray-900 pt-16">
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Sidebar Toggle Button */}
        <motion.button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-20 left-4 z-20 p-2 bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          animate={{ 
            x: sidebarOpen ? 0 : 0,
            rotate: sidebarOpen ? 0 : 180
          }}
          transition={{ duration: 0.3 }}
        >
          <ChevronLeft size={20} />
        </motion.button>

        {/* Sidebar */}
        <motion.div
          className="w-64 bg-black/30 border-r border-white/10 p-4 flex flex-col"
          animate={{ x: sidebarOpen ? 0 : -256 }}
          transition={{ duration: 0.3 }}
        >
          <button
            onClick={createNewConversation}
            className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-white hover:bg-indigo-600/30 transition mb-4"
          >
            <Plus size={20} />
            New Chat
          </button>
          <div className="flex-1 overflow-y-auto space-y-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group relative rounded-lg transition ${
                  currentConversation === conv.id
                    ? 'bg-indigo-600/20'
                    : 'hover:bg-white/5'
                }`}
              >
                {editingTitle === conv.id ? (
                  <div className="flex items-center p-2 gap-2">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="flex-1 bg-black/30 text-white rounded px-2 py-1 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={saveTitle}
                      className="p-1 text-green-400 hover:text-green-300"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setEditingTitle(null)}
                      className="p-1 text-red-400 hover:text-red-300"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCurrentConversation(conv.id)}
                    className="w-full text-left px-4 py-2 flex items-center gap-2"
                  >
                    <MessageSquare size={16} className="text-gray-400" />
                    <span className={`truncate ${
                      currentConversation === conv.id
                        ? 'text-white'
                        : 'text-gray-400'
                    }`}>
                      {conv.title}
                    </span>
                  </button>
                )}
                
                {currentConversation === conv.id && !editingTitle && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startTitleEdit(conv);
                      }}
                      className="p-1 text-gray-400 hover:text-white transition"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      className="p-1 text-red-400 hover:text-red-300 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Model Selection Button */}
          <button
            onClick={() => setShowModelSelect(!showModelSelect)}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 text-gray-300 hover:bg-gray-800/70 transition"
          >
            <Bot size={16} />
            <span className="flex-1 text-left text-sm truncate">
              {availableModels[selectedModel.provider].find(m => m.id === selectedModel.modelId)?.name}
            </span>
            <Settings size={16} />
          </button>
        </motion.div>

        {/* Chat Area */}
        <motion.div 
          className="flex-1 flex flex-col relative"
          animate={{ 
            marginLeft: sidebarOpen ? 0 : -256,
            width: sidebarOpen ? 'calc(100% - 256px)' : '100%'
          }}
          transition={{ duration: 0.3 }}
        >
          {/* Model Selection Dropdown */}
          {showModelSelect && (
            <div className="absolute bottom-20 left-4 right-4 bg-gray-900 rounded-lg border border-white/10 shadow-xl z-10">
              <div className="p-4">
                <h3 className="text-white font-semibold mb-4">Select AI Model</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-gray-400 text-sm mb-2">OpenRouter Models</h4>
                    <div className="space-y-2">
                      {availableModels.openrouter.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            setSelectedModel({ provider: 'openrouter', modelId: model.id });
                            setShowModelSelect(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded ${
                            selectedModel.provider === 'openrouter' && selectedModel.modelId === model.id
                              ? 'bg-indigo-600/20 text-white'
                              : 'text-gray-400 hover:bg-white/5'
                          }`}
                        >
                          {model.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-gray-400 text-sm mb-2">Gemini Models</h4>
                    <div className="space-y-2">
                      {availableModels.gemini.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            setSelectedModel({ provider: 'gemini', modelId: model.id });
                            setShowModelSelect(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded ${
                            selectedModel.provider === 'gemini' && selectedModel.modelId === model.id
                              ? 'bg-indigo-600/20 text-white'
                              : 'text-gray-400 hover:bg-white/5'
                          }`}
                        >
                          {model.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'assistant' ? 'justify-start' : 'justify-end'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'assistant'
                      ? 'bg-gray-800/50 text-white'
                      : 'bg-indigo-600/20 text-white'
                  }`}
                >
                  {renderMessageContent(message)}
                </div>
              </div>
            ))}
            {isThinking && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[80%] rounded-lg p-4 bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                    <span className="text-gray-300">AI is thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={sendMessage} className="p-4 border-t border-white/10 bg-black/30">
            <AnimatePresence>
              {showImageUpload && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  <ImageAnalysis onAnalysisComplete={handleImageAnalysisComplete} />
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.div 
              className={`relative transition-all duration-200 ${
                isFocused ? 'scale-[1.01]' : 'scale-100'
              }`}
              animate={{ y: isFocused ? -2 : 0 }}
            >
              <div className="relative flex items-center">
                <button
                  type="button"
                  onClick={() => setShowImageUpload(!showImageUpload)}
                  className={`absolute left-2 p-2 rounded-full transition-colors ${
                    showImageUpload
                      ? 'text-indigo-400 bg-indigo-400/10'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <Paperclip size={20} className="transition-transform hover:scale-110" />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Type your message..."
                  className="w-full py-3 pl-12 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all duration-200"
                  disabled={loading}
                />
                <AnimatePresence>
                  {input.trim() && (
                    <motion.button
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      type="submit"
                      disabled={loading}
                      className="absolute right-2 p-2 text-white/80 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-full hover:bg-white/5 transition-colors"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}