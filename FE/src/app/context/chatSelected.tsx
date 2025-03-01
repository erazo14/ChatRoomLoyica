"use client";
import { createContext, useContext, useState } from 'react';

const ChatroomContext = createContext(null);

export const ChatroomProvider = ({ children }) => {
    const [id, setId] = useState();
    const [name, setName] = useState();

    const setChatroomId = (chatroomId) => {
        setId(chatroomId);
    };

    const setChatroomName = (roomName) => {
        setName(roomName);
    };

    return (
        <ChatroomContext.Provider value={{ id, name, setChatroomId, setChatroomName }}>
            {children}
        </ChatroomContext.Provider>
    );
};

export const useChatroom = () => {
    return useContext(ChatroomContext);
};