import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sendChatMessage, subscribeToChat } from '../services/chat';
import { TEAMS } from '../constants/teams';
import { ROLE_IDS } from '../constants/roleIds';
import { ChevronDown, MessageSquare, Send, X, Minimize2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { roleRegistry } from '../roles/RoleRegistry';

const CHAT_CHANNELS = {
  GLOBAL: 'global',
  WOLF: 'wolf',
  DEAD: 'dead',
};

const ChatBox = ({ roomCode, myPlayer, playerRole, isAlive, isChatOpen, setIsChatOpen }) => {
  console.log('DEBUG: ChatBox - setIsChatOpen:', setIsChatOpen);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentChannel, setCurrentChannel] = useState(CHAT_CHANNELS.GLOBAL);
  const messagesEndRef = useRef(null);

  const myFullRole = playerRole ? roleRegistry.getRole(playerRole) : null;
  console.log('DEBUG: ChatBox - playerRole:', playerRole);
  console.log('DEBUG: ChatBox - myFullRole:', myFullRole);
  console.log('DEBUG: ChatBox - myFullRole?.team:', myFullRole?.team);
  console.log('DEBUG: ChatBox - TEAMS.WEREWOLF:', TEAMS.WEREWOLF);
  console.log('DEBUG: ChatBox - ROLE_IDS.MINION:', ROLE_IDS.MINION);
  console.log('DEBUG: ChatBox - isAlive:', isAlive);

  const getAvailableChannelsForPlayer = useCallback(() => {
    const channels = [];
    if (isAlive) {
      channels.push(CHAT_CHANNELS.GLOBAL);
      if (myFullRole?.team === TEAMS.WEREWOLF || myFullRole?.id === ROLE_IDS.MINION) {
        console.log('DEBUG: ChatBox - Adding WOLF channel');
        channels.push(CHAT_CHANNELS.WOLF);
      }
    } else {
      channels.push(CHAT_CHANNELS.DEAD);
      channels.push(CHAT_CHANNELS.GLOBAL); // Dead players can see global chat but not send
    }
    return channels;
  }, [isAlive, myFullRole]);

  const availableChannels = getAvailableChannelsForPlayer();

  // Effect to manage channel availability and automatic switching
  useEffect(() => {
    const newlyAvailableChannels = getAvailableChannelsForPlayer();

    // If current channel is no longer available, switch to a valid one
    if (!newlyAvailableChannels.includes(currentChannel)) {
      if (isAlive && newlyAvailableChannels.includes(CHAT_CHANNELS.GLOBAL)) {
        setCurrentChannel(CHAT_CHANNELS.GLOBAL);
      } else if (!isAlive && newlyAvailableChannels.includes(CHAT_CHANNELS.DEAD)) {
        setCurrentChannel(CHAT_CHANNELS.DEAD);
      } else {
        // Fallback, though ideally one of the above should always be true
        setCurrentChannel(newlyAvailableChannels[0] || CHAT_CHANNELS.GLOBAL);
      }
    } else if (
      isAlive &&
      (myFullRole?.team === TEAMS.WEREWOLF || myFullRole?.id === ROLE_IDS.MINION) &&
      currentChannel === CHAT_CHANNELS.GLOBAL
    ) {
      // If wolf chat becomes available and player is in global, switch them to wolf chat for convenience
      setCurrentChannel(CHAT_CHANNELS.WOLF);
    }
  }, [
    isAlive,
    playerRole,
    currentChannel,
    getAvailableChannelsForPlayer,
    myFullRole?.team,
    myFullRole?.id,
  ]);

  useEffect(() => {
    if (!roomCode || !myPlayer?.id || !currentChannel) return;

    const unsubscribe = subscribeToChat(roomCode, currentChannel, (newMessages) => {
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [roomCode, myPlayer?.id, currentChannel]);

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  const handleSendMessage = useCallback(
    async (e) => {
      e.preventDefault();
      if (!newMessage.trim() || !roomCode || !myPlayer) return;

      const messageObj = {
        senderId: myPlayer.id,
        senderName: myPlayer.name,
        senderColor: myPlayer.avatarColor,
        text: newMessage.trim(),
      };

      try {
        await sendChatMessage(roomCode, currentChannel, messageObj);
        setNewMessage('');
      } catch (error) {
        console.error('Error sending chat message:', error);
      }
    },
    [newMessage, roomCode, myPlayer, currentChannel]
  );

  const getChannelStyle = (channel) => {
    switch (channel) {
      case CHAT_CHANNELS.WOLF:
        return 'text-red-400 bg-red-900/20 hover:bg-red-900/40 border-red-900/50';
      case CHAT_CHANNELS.DEAD:
        return 'text-gray-400 bg-gray-800/20 hover:bg-gray-800/40 border-gray-700/50';
      case CHAT_CHANNELS.GLOBAL:
      default:
        return 'text-blue-300 bg-blue-900/20 hover:bg-blue-900/40 border-blue-900/50';
    }
  };

  const getMessageColorClass = (message) => {
    if (message.senderId === myPlayer.id) return 'text-white';
    if (currentChannel === CHAT_CHANNELS.WOLF) return 'text-red-200';
    if (currentChannel === CHAT_CHANNELS.DEAD) return 'text-gray-300';
    return 'text-gray-200';
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed bottom-4 right-4 z-[100] flex flex-col bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl transition-all duration-300 ease-in-out font-sans ${
        isChatOpen
          ? 'w-96 h-[32rem] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)]'
          : 'w-auto h-auto'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between p-3 cursor-pointer ${
          isChatOpen ? 'border-b border-slate-700/50' : ''
        }`}
        onClick={() => setIsChatOpen(!isChatOpen)}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl ${isChatOpen ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'}`}
          >
            <MessageSquare size={isChatOpen ? 18 : 20} />
          </div>
          {isChatOpen ? (
            <span className="text-slate-200 font-bold tracking-wide text-sm">Game Chat</span>
          ) : (
            <span className="font-bold text-white pr-2">Chat</span>
          )}
        </div>

        {isChatOpen && (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsChatOpen(false);
              }}
              className="p-1.5 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <Minimize2 size={16} />
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Tabs */}
            <div className="flex gap-2 p-2 bg-slate-950/30">
              {availableChannels.map((channel) => (
                <button
                  key={channel}
                  onClick={() => setCurrentChannel(channel)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                    currentChannel === channel
                      ? getChannelStyle(channel) + ' shadow-inner'
                      : 'text-slate-500 hover:bg-slate-800/50 border-transparent'
                  }`}
                >
                  {channel}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                  <MessageSquare className="w-8 h-8 opacity-20" />
                  <span className="text-xs font-medium">No messages yet</span>
                </div>
              )}
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === myPlayer.id;
                const showHeader = idx === 0 || messages[idx - 1].senderId !== msg.senderId;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {showHeader && !isMe && (
                      <span
                        className="text-[10px] font-bold text-slate-400 mb-1 ml-1"
                        style={{ color: msg.senderColor }}
                      >
                        {msg.senderName}
                      </span>
                    )}
                    <div
                      className={`relative px-3 py-2 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm ${
                        isMe
                          ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-br-none'
                          : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-bl-none'
                      } ${getMessageColorClass(msg)}`}
                    >
                      {msg.text}
                      <div
                        className={`text-[9px] mt-1 opacity-50 ${isMe ? 'text-indigo-100 text-right' : 'text-slate-400'}`}
                      >
                        {msg.timestamp
                          ? new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '...'}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-slate-950/50 border-t border-slate-800/50"
            >
              <div className="flex items-center gap-2 bg-slate-900/80 rounded-xl border border-slate-700/50 p-1 pl-3 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all shadow-inner">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={
                    !isAlive && currentChannel === CHAT_CHANNELS.GLOBAL
                      ? 'Messaging disabled (Dead)'
                      : `Message ${currentChannel}...`
                  }
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none min-w-0"
                  disabled={!isAlive && currentChannel === CHAT_CHANNELS.GLOBAL}
                />
                <button
                  type="submit"
                  disabled={
                    (!isAlive && currentChannel === CHAT_CHANNELS.GLOBAL) || !newMessage.trim()
                  }
                  className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-700 text-white transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ChatBox;
