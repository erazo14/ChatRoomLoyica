"use client";
import { useEffect, useState } from "react";
import styles from "./subscribeChatroom.module.css"
import { useRouter } from "next/navigation";

const SubscribeChatroomPage = () => {
    const router = useRouter();
    const [error, setError] = useState<string>('');
    const [chatrooms, setChatrooms] = useState<any[]>([]);
    const [userlogged, setUserLogged] = useState(undefined);
    const apiUrl = process.env.NEXT_PUBLIC_URL_API;

    const handleSusbscribe = async (room) => {
        const query = {
            query: `mutation { subscribeChatrooms(chatroomId: "${room.id}", userId: "${userlogged.id}") { id name users } }`
        };
        const results = await fetch(apiUrl, {
            method: 'POST',

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(query)
        })
        const subscribedChatroom = await results.json();
        if (subscribedChatroom.errors) {
            setError("Error getting users")
        } else {
            room.users.push(userlogged.id)
            router.refresh();
        };
    }

    const handleBack = () => {
        router.back();
    }

    useEffect(() => {
        const getChatrooms = async () => {
            const query = {
                query: `mutation { allChatrooms { id name users } }`
            };
            const results = await fetch(apiUrl, {
                method: 'POST',

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(query)
            })
            const usersGetted = await results.json();
            if (usersGetted.errors) {
                setError("Error getting users")
            } else {
                setChatrooms(usersGetted?.data?.allChatrooms)
            };
        };

        getChatrooms();
        setUserLogged(JSON.parse(sessionStorage.getItem("loggedUser")));
    }, []);

    return (
        <div>
            <h1>
                Subscribing Room
            </h1>
            {error && <p style={{ color: "red" }}>{error}</p>}
            {chatrooms.length > 0 ? (
                <ul>
                    {chatrooms.map(room => (
                        <li
                            key={room.id}
                            className={styles.wrapper}
                            style={{ marginBottom: "10px" }}
                        >
                            {room.name}
                            {!room.users.includes(userlogged.id) ? <button className={styles.button} onClick={() => handleSusbscribe(room)}>subscribe</button> : <p>Subscribed</p>}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No chatrooms available.</p>
            )}
            <div>
                <button className={styles.button} onClick={handleBack}>back</button>
            </div>
        </div>
    );
};

export default SubscribeChatroomPage;