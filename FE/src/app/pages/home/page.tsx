"use client"
import styles from "./home.module.css";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useChatroom } from "../../context/chatSelected";


const HomePage = () => {
    const router = useRouter();
    const [error, setError] = useState('');
    const [chatrooms, setChatrooms] = useState([]);
    const apiUrl = process.env.NEXT_PUBLIC_URL_API;
    const { setChatroomId, setChatroomName } = useChatroom();

    const handleChatroomClick = (room) => {
        setChatroomId(room.id);
        setChatroomName(room.name);
        router.push(`messages`);
    };

    const logOut = () => {
        sessionStorage.removeItem("loggedUser");
        router.replace('login');
    }

    const createRoom = () => {
        router.push('createChatroom');
    }

    useEffect(() => {
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
                if (err) {
                    setError(`Failed to get chat rooms`);
                }
            }
        }

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
                            onClick={() => handleChatroomClick(room)}
                            style={{ cursor: "pointer", color: "blue", textDecoration: "underline", marginBottom: "10px" }}
                        >
                            {room.name}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No chatrooms available.</p>
            )}
            <div className={styles.buttonWrapper}>
                <button className={styles.button} onClick={logOut}>Log Out</button>
                <button className={styles.button} onClick={createRoom}>Create Room</button>
            </div>
        </div>
    )
}

export default HomePage;