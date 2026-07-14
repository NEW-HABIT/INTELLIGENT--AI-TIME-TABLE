"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bot, Send, Loader2, Sparkles, User, ChevronDown, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: any[];
  suggestions?: string[];
  timestamp: Date;
}

interface AIAssistantChatProps {
  isOpen: boolean;
  onClose: () => void;
  semesterId?: string;
}

const STARTER_PROMPTS = [
  "Which rooms are free on Monday between 10am and 12pm?",
  "Show me Dr. Smith's teaching schedule this week",
  "Why is the CS Section A timetable showing conflicts?",
  "What's the room utilization for this semester?",
];

export function AIAssistantChat({ isOpen, onClose, semesterId }: AIAssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your AI timetable assistant powered by Google Gemini. I can help you query schedules, explain conflicts, and make changes to the timetable using natural language.\n\nWhat would you like to know?",
      suggestions: STARTER_PROMPTS,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await apiClient.post("/ai/chat/", {
        message: messageText,
        semester_id: semesterId,
        history: messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res.data.reply,
        actions: res.data.actions,
        suggestions: res.data.suggestions,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm having trouble connecting right now. Please check your API configuration or try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      toast.error("AI assistant unavailable");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Chat Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[420px] z-50 flex flex-col"
            style={{ background: "linear-gradient(180deg, #0d1f35 0%, #0a1628 100%)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tnu-accent/30 to-purple-600/30 border border-tnu-accent/30 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-tnu-accent" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">AI Timetable Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-emerald-400 text-xs">Powered by Gemini</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                    msg.role === "assistant"
                      ? "bg-gradient-to-br from-tnu-accent/30 to-purple-600/30 border border-tnu-accent/30"
                      : "bg-gradient-to-br from-tnu-primary to-blue-700"
                  }`}>
                    {msg.role === "assistant"
                      ? <Sparkles className="w-4 h-4 text-tnu-accent" />
                      : <User className="w-4 h-4 text-white" />
                    }
                  </div>

                  <div className={`flex-1 max-w-[85%] space-y-2 ${msg.role === "user" ? "items-end" : ""}`}>
                    {/* Message bubble */}
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "assistant"
                        ? "bg-white/8 border border-white/10 text-white"
                        : "bg-gradient-to-r from-tnu-primary to-blue-700 text-white rounded-tr-sm"
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>

                    {/* Actions executed */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="space-y-1.5">
                        {msg.actions.map((action, i) => (
                          <div key={i} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
                            action.success
                              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                              : "bg-red-500/10 border border-red-500/20 text-red-400"
                          }`}>
                            {action.success ? "✓" : "✗"} {action.tool.replace(/_/g, " ")}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Suggestions */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {msg.suggestions.map((sug, i) => (
                          <button
                            key={i}
                            onClick={() => sendMessage(sug)}
                            className="w-full text-left text-xs px-3 py-2 rounded-lg
                                       bg-white/5 border border-white/10 text-white/60
                                       hover:bg-white/10 hover:text-white hover:border-white/20
                                       transition-all duration-200"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    )}

                    <p className="text-white/20 text-xs">
                      {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-tnu-accent/30 to-purple-600/30 border border-tnu-accent/30 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-tnu-accent" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-white/8 border border-white/10">
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                          className="w-2 h-2 bg-tnu-accent rounded-full"
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-3 p-1 rounded-2xl bg-white/8 border border-white/20 focus-within:border-tnu-accent/60 transition-colors">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Ask about schedules, rooms, conflicts..."
                  className="flex-1 bg-transparent px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none"
                  disabled={isLoading}
                />
                <motion.button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-tnu-accent to-tnu-primary flex items-center justify-center flex-shrink-0 mr-1 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  {isLoading
                    ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                    : <Send className="w-4 h-4 text-white" />
                  }
                </motion.button>
              </div>
              <p className="text-white/20 text-xs text-center mt-2">
                Powered by Google Gemini — Natural Language Scheduling
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
