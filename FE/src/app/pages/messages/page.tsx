"use client";
import { ChatroomProvider, useChatroom } from "../../context/chatSelected";

const MessagePage = () => {
    const { id } = useChatroom();

    return (
        <div>
            Chatroom: {id}
        </div>
    )
}

export default MessagePage;