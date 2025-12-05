import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sendChatMessage, subscribeToChat } from '../services/chat';
import { TEAMS } from '../constants/teams'; // Assuming TEAM exists
import { ROLE_IDS } from '../constants/roleIds'; // Assuming ROLE_IDS exists
import { PHASES } from '../constants/phases'; // Assuming PHASES exists

const CHAT_CHANNELS = {
    GLOBAL: 'global',
    WOLF: 'wolf',
    DEAD: 'dead',
};

const ChatBox = ({ roomCode, myPlayer, playerRole, isAlive }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentChannel, setCurrentChannel] = useState(CHAT_CHANNELS.GLOBAL);
    const messagesEndRef = useRef(null);

    const availableChannels = [];
    if (isAlive) {
        availableChannels.push(CHAT_CHANNELS.GLOBAL);
        if (playerRole?.team === TEAMS.WEREWOLF || playerRole?.id === ROLE_IDS.MINION) {
            availableChannels.push(CHAT_CHANNELS.WOLF);
        }
    } else {
        // If dead, only allow dead chat
        availableChannels.push(CHAT_CHANNELS.DEAD);
    }

    // If player becomes dead, switch to dead chat automatically
    useEffect(() => {
        if (!isAlive && currentChannel !== CHAT_CHANNELS.DEAD) {
            setCurrentChannel(CHAT_CHANNELS.DEAD);
        }
    }, [isAlive, currentChannel]);

    useEffect(() => {
        if (!roomCode || !myPlayer?.id || !currentChannel) return;

        const unsubscribe = subscribeToChat(roomCode, currentChannel, (newMessages) => {
            setMessages(newMessages);
        });

        return () => unsubscribe();
    }, [roomCode, myPlayer?.id, currentChannel]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
                // Optionally show a toast notification
            }
        },
        [newMessage, roomCode, myPlayer, currentChannel]
    );

    const getChannelColorClass = (channel) => {
        switch (channel) {
            case CHAT_CHANNELS.WOLF:
                return 'bg-red-900/30 text-red-300';
            case CHAT_CHANNELS.DEAD:
                return 'bg-gray-800/30 text-gray-400';
            case CHAT_CHANNELS.GLOBAL:
            default:
                return 'bg-blue-900/30 text-blue-300';
        }
    };

    const getMessageColorClass = (message) => {
        // Distinguish messages from self
        if (message.senderId === myPlayer.id) {
            return 'text-white self-end';
        }
        // Distinguish global chat from wolf/dead chat
        if (currentChannel === CHAT_CHANNELS.WOLF) {
            return 'text-red-200';
        }
        if (currentChannel === CHAT_CHANNELS.DEAD) {
            return 'text-gray-300';
        }
        return 'text-gray-200';
    };

    return (
        <div className="flex flex-col h-full bg-slate-800 rounded-lg shadow-lg">
            {/* Channel Tabs */}
            <div className="flex justify-around p-2 bg-slate-700 rounded-t-lg">
                {availableChannels.map((channel) => (
                    <button
                        key={channel}
                        onClick={() => setCurrentChannel(channel)}
                        className={`flex-1 text-center py-2 rounded-md mx-1 capitalize font-semibold transition-colors duration-200
              ${currentChannel === channel
                                ? getChannelColorClass(channel) + ' ring-2 ring-offset-2 ring-offset-slate-700'
                                : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                            }`}
                    >
                        {channel}
                    </button>
                ))}
            </div>

            {/* Messages Display */}
            <div
                className={`flex-1 overflow-y-auto p-4 space-y-3 ${getChannelColorClass(currentChannel)}`}
            >
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex flex-col ${msg.senderId === myPlayer.id ? 'items-end' : 'items-start'}`}
                    >
                        <span className="text-xs font-semibold" style={{ color: msg.senderColor || 'white' }}>
                            {msg.senderName}
                        </span>
                        <div
                            className={`p-2 rounded-lg max-w-[80%] ${msg.senderId === myPlayer.id ? 'bg-blue-600' : 'bg-slate-700'
                                } ${getMessageColorClass(msg)}`}
                        >
                            {msg.text}
                            <span className="block text-right text-[0.6rem] opacity-70 mt-1">
                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : 'Sending...'}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-slate-700 rounded-b-lg flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Chat in ${currentChannel} channel...`}
                    className="flex-1 p-2 rounded-md bg-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    Send
                </button>
            </form>
        </div>
    );
};

export default ChatBox;
