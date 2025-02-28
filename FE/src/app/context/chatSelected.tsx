"use client";
import { createContext, useContext, useState } from 'react';

const ChatroomContext = createContext(null);

export const ChatroomProvider = ({ children }) => {
    const [id, setId] = useState();

    const setChatroomId = (chatroomId) => {
        setId(chatroomId);
    };

    return (
        <ChatroomContext.Provider value={{ id, setChatroomId }}>
            {children}
        </ChatroomContext.Provider>
    );
};

export const useChatroom = () => {
    return useContext(ChatroomContext);
};