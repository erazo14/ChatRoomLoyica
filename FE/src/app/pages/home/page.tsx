"use client"
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useChatroom } from "../../context/chatSelected";

const HomePage = () => {
    const router = useRouter();
    const [error, setError] = useState('');
    const [chatrooms, setChatrooms] = useState([]);
    const apiUrl = process.env.NEXT_PUBLIC_URL_API;
    const { setChatroomId } = useChatroom();

    const getChatrooms = async () => {
        const userData = JSON.parse(sessionStorage.getItem('loggedUser'));
        if (!userData) {
            router.push('/login');
            return;
        }
        const userId = userData?.id?.match(/ObjectID\("(.+)"\)/)?.[1] || userData?.id;
        const query = {
            query: `mutation { GetChatrooms(userId: "${userId}") { id name users } }`
        }
        try {
            const results = await fetch(apiUrl, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(query)
            });

            const response = await results.json();

            if (response.errors) {
                setError("Error getting chat rooms");
            } else {
                setChatrooms(response.data.GetChatrooms || []);
            }
        } catch (err) {
            setError("Failed to fetch chat rooms");
        }
    }

    const handleChatroomClick = (chatroomId) => {
        setChatroomId(chatroomId);
        router.push(`messages`);
    };

    useEffect(() => {
        getChatrooms();
    }, [])

    return (
        <div>
            {error && <p style={{ color: "red" }}>{error}</p>}
            <h1>
                Chat Rooms
            </h1>
            {chatrooms.length > 0 ? (
                <ul>
                    {chatrooms.map(room => (
                        <li
                            key={room.id}
                            onClick={() => handleChatroomClick(room.id)}
                            style={{ cursor: "pointer", color: "blue", textDecoration: "underline", marginBottom: "10px" }}
                        >
                            {room.name}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No chatrooms available.</p>
            )}
        </div>
    )
}

export default HomePage;