// Real-time Chat Component for User-Provider Communication
import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import socketService, { ChatMessage } from '../services/socketService';
import toast from 'react-hot-toast';
import {
  ChatBubbleLeftIcon,
  PaperAirplaneIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface ChatComponentProps {
  bookingId: string;
  recipientId: string;
  recipientName: string;
  isOpen: boolean;
  onClose: () => void;
  isProvider?: boolean;
}

const ChatComponent: React.FC<ChatComponentProps> = ({
  bookingId,
  recipientId,
  recipientName,
  isOpen,
  onClose,
  isProvider = false
}) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !user) return;

    const initializeChat = async () => {
      try {
        // Connect to socket if not already connected
        await socketService.connect({
          userId: user._id,
          name: user.name,
          email: user.email,
          role: isProvider ? 'provider' : 'customer'
        });

        setIsConnected(socketService.isConnected());

        // Join booking chat room
        socketService.joinBookingRoom(bookingId);

        // Listen for new messages
        socketService.onMessage((message) => {
          console.log('💬 [CLIENT DEBUG] Chat message received:', message);
          console.log('💬 [CLIENT DEBUG] Expected bookingId:', bookingId);
          console.log('💬 [CLIENT DEBUG] Message bookingId:', message.bookingId);
          console.log('💬 [CLIENT DEBUG] User ID:', user._id);
          console.log('💬 [CLIENT DEBUG] Sender ID:', message.senderId);
          
          if (message.bookingId === bookingId) {
            console.log('💬 [CLIENT DEBUG] Message matches booking ID, adding to messages');
            setMessages(prev => [...prev, message]);
            
            // Show notification if message is from other person
            if (message.senderId !== user._id) {
              toast.success(`New message from ${message.senderName}`);
            }
          } else {
            console.log('💬 [CLIENT DEBUG] Message booking ID does not match, ignoring');
          }
        });

        // Listen for typing indicators
        socketService.onTyping((data) => {
          if (data.bookingId === bookingId && data.userId !== user._id) {
            setIsTyping(data.isTyping);
          }
        });

        // Load initial messages (you can implement this with an API call)
        // For now, we'll start with empty messages
        setMessages([]);

      } catch (error) {
        console.error('Failed to initialize chat:', error);
        toast.error('Failed to connect to chat');
      }
    };

    initializeChat();

    return () => {
      // Cleanup
      socketService.leaveBookingRoom(bookingId);
      socketService.off('receive_message');
      socketService.off('user_typing');
    };
  }, [isOpen, bookingId, user, isProvider]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Focus input when chat opens
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      bookingId,
      senderId: user._id,
      senderName: user.name,
      recipientId,
      recipientName,
      message: newMessage.trim(),
      timestamp: new Date(),
      type: 'text'
    };

    // Send message via socket
    socketService.sendMessage(message);

    // Add to local messages
    setMessages(prev => [...prev, message]);

    // Clear input
    setNewMessage('');

    // Stop typing indicator
    socketService.sendTyping(bookingId, false);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator
    if (e.target.value.trim()) {
      socketService.sendTyping(bookingId, true);
    } else {
      socketService.sendTyping(bookingId, false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center">
            <ChatBubbleLeftIcon className="w-5 h-5 mr-2" />
            <div>
              <h3 className="font-semibold">{recipientName}</h3>
              <p className="text-xs text-blue-100">
                {isConnected ? 'Online' : 'Connecting...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderId === user?._id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                    msg.senderId === user?._id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm break-words">{msg.message}</p>
                  <p className={`text-xs mt-1 ${
                    msg.senderId === user?._id ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-2xl">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={handleTyping}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!isConnected}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !isConnected}
              className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
          {!isConnected && (
            <p className="text-xs text-red-500 mt-2">Connecting to chat...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
