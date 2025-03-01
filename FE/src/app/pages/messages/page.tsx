"use client";
import { useEffect, useState } from "react";
import styles from "./message.module.css";
import { useChatroom } from "../../context/chatSelected";
import { useRouter } from "next/navigation";

const MessagePage = () => {
    const router = useRouter();
    const { id, name } = useChatroom();
    const [error, setError] = useState('');
    const apiUrl = process.env.NEXT_PUBLIC_URL_API;
    const [messages, setMessages] = useState([]);
    const [sendMessage, setSendMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!sendMessage) {
            setError('Please fill message');
            return;
        }
        setError('');
        onSubmit();
    };

    const onSubmit = async () => {
        const userData = JSON.parse(sessionStorage.getItem('loggedUser'));
        if (!userData) {
            router.push('/login');
            return;
        }
        const userId = userData?.id?.match(/ObjectID\("(.+)"\)/)?.[1] || userData?.id;

        const query = {
            query: `mutation { createMessage(chatroomId: "${id.match(/ObjectID\("(.+)"\)/)?.[1]}", userId: "${userId}", description: "${sendMessage}") { id userId user{name} description } }`
        }
        const results = await fetch(apiUrl, {
            method: 'POST',

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(query)
        })
        const response = await results.json();
        if (response.errors) {
            setError("Message doesn't send it")
        } else {
            // setMessages((prevMessages) => [...prevMessages, response.data.createMessage]);
        }
    }

    const handleBack = async (e) => {
        e.preventDefault();
        router.back();
    };

    useEffect(() => {
        if (!id) {
            router.replace('login');
            return;
        }
        const getMessages = async () => {
            const query = {
                query: `mutation { GetMessages(chatroomId: "${id.match(/ObjectID\("(.+)"\)/)?.[1]}") { id userId user{name} description } }`
            }
            const results = await fetch(apiUrl, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(query)
            });

            const response = await results.json();

            if (response.errors) {
                setError("Error getting chat rooms");
            } else {
                setMessages(response.data.GetMessages || []);
            }
        };

        const ws = new WebSocket(`ws://localhost:8081/ws?chatroomID=${id.match(/ObjectID\("(.+)"\)/)?.[1]}`);
        ws.onmessage = (event) => {
            const messageData = JSON.parse(event.data);
            messages.push(messageData);
            console.log('Received message:', messageData);
        };

        getMessages();
    }, [])

    return (
        <div>
            <h1>Chatroom: {name}</h1>
            {messages.map((message) =>
                <div key={message.id}>
                    {message.user?.name}: {message.description}
                </div>
            )}
            <form className={styles.wrapperLogin} onSubmit={handleSubmit}>
                <div className={styles.wrapperLabels}>
                    <div>
                        <label>Message:</label>
                    </div>
                    <input
                        type="send"
                        id="send"
                        value={sendMessage}
                        onChange={(e) => setSendMessage(e.target.value)}
                        required
                    />
                </div>
                {error && <p>{error}</p>}
                <div className={styles.buttonWrapper}>
                    <button className={styles.button} onClick={handleBack}>Back</button>
                    <button className={styles.button} type="submit">Send Message</button>
                </div>
            </form>
        </div>
    )
}

export default MessagePage;