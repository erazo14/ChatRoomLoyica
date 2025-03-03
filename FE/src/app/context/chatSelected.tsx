"use client";
import { createContext, useContext, useState } from 'react';

const ChatroomContext = createContext(null);

export const ChatroomProvider = ({ children }) => {
    const [id, setId] = useState();
    const [name, setName] = useState();
    const [ws, setWs] = useState<WebSocket>();

    const setChatroomId = (chatroomId) => {
        if (ws) {
            ws.close();
            setWs(undefined);
        }
        setId(chatroomId);
        setWs(new WebSocket(`${process.env.NEXT_PUBLIC_URL_WS}?chatroomID=${chatroomId}`));
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