"use client";
import { createContext, useContext, useState } from 'react';

const ChatroomContext = createContext(null);

export const ChatroomProvider = ({ children }) => {
    const [id, setId] = useState();
    const [name, setName] = useState();
    const [ws, setWs] = useState<WebSocket>();

    const setChatroomId = (chatroomId) => {
        setId(chatroomId);
        setWs(new WebSocket(`ws://localhost:8081/ws?chatroomID=${chatroomId.match(/ObjectID\("(.+)"\)/)?.[1]}`));
    };

    const setChatroomName = (roomName) => {
        setName(roomName);
    };

    return (
        <ChatroomContext.Provider value={{ id, name, setChatroomId, setChatroomName, ws }}>
            {children}
        </ChatroomContext.Provider>
    );
};

export const useChatroom = () => {
    return useContext(ChatroomContext);
};