"use client";
import { useEffect, useState } from "react";
import styles from "./message.module.css";
import { useChatroom } from "../../context/chatSelected";
import { useRouter } from "next/navigation";
import Image from "next/image";

const MessagePage = () => {
    const router = useRouter();
    const { id, name, ws } = useChatroom();
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
        const user = JSON.parse(sessionStorage.getItem('loggedUser'))

        const query = {
            query: `mutation { createMessage(chatroomId: "${id}", userId: "${user.id}", description: "${sendMessage}") { ID UserId User{Name} Description } }`
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
            console.log(response);
            // setMessages((prevMessages) => [...prevMessages, response.data.createMessage]);
        }
    }

    const handleBack = async (e) => {
        e.preventDefault();
        router.back();
    };

    const handleLikeDislike = async (message, reaction) => {
        const user = JSON.parse(sessionStorage.getItem('loggedUser'))
        const query = {
            query: `mutation { reactMessage(messageId: "${message.ID}", userId:  "${user.id}", reactType: "${reaction}") { Id  MessageId UserId ReactType } }`
        }

        const results = await fetch(apiUrl, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(query)
        });

        const response = await results.json();

        if (response.errors) {
            setError("Error Reacting message");
        } else {
            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg.ID === message.ID
                        ? { ...msg, Reaction: { ...msg.Reaction, ReactType: reaction } }
                        : msg
                )
            );
        };
    };

    useEffect(() => {
        const getMessages = async () => {
            const user = JSON.parse(sessionStorage.getItem('loggedUser'))
            const query = {
                query: `mutation { GetMessages(chatroomId: "${id}", userId: "${user.id}") { ID UserId User{Name} Description Reaction {ReactType} } }`
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
                setMessages(response.data.GetMessages);
            };
        };
        getMessages();
    }, []);

    useEffect(() => {
        if (ws) {
            ws.onmessage = (event) => {
                const messageData = JSON.parse(event.data);
                setMessages((prevMessages) => [...prevMessages, messageData]);
                console.log('Received message:', messageData);
            };
        };
    }, [ws]);

    return (
        <div>
            <h1>Chatroom: {name}</h1>
            {messages.map((message) =>
                <div key={message.ID}>
                    {message?.User?.Name}: {message.Description}
                    {!message.Reaction?.ReactType ? (
                        <></>
                    ) : message.Reaction.ReactType === "like" ? (
                        <Image
                            className={styles.logo}
                            src="/like.png"
                            alt="Like"
                            width={20}
                            height={20}
                        />
                    ) : (
                        <Image
                            className={styles.logo}
                            src="/dislike.png"
                            alt="Dislike"
                            width={20}
                            height={20}
                        />
                    )}
                    {!message.Reaction?.ReactType ? (
                        <>
                            <button className={styles.button} onClick={() => handleLikeDislike(message, "like")}>Like</button>
                            <button className={styles.button} onClick={() => handleLikeDislike(message, "dislike")}>Dislike</button>
                        </>
                    ) : message.Reaction.ReactType === "like" ? (
                        <button className={styles.button} onClick={() => handleLikeDislike(message, "dislike")}>Dislike</button>
                    ) : (
                        <button className={styles.button} onClick={() => handleLikeDislike(message, "like")}>Like</button>
                    )}
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