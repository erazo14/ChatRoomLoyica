"use client";
import { useEffect, useState } from "react";
import styles from "./message.module.css";
import { useChatroom } from "../context/chatSelected";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Box, Button, ButtonGroup, Card, CardContent, TextField } from "@mui/material";

const MessagePage = () => {
    const router = useRouter();
    const { id, name, ws } = useChatroom();
    const [error, setError] = useState('');
    const [loggedUser, setLoggedUser] = useState(null);
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
            setSendMessage("");
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
            setLoggedUser(user)
            const query = {
                query: `mutation { GetMessages(chatroomId: "${id}", userId: "${user.id}") { ID UserId User{Name} Description Reaction {ReactType} LikeCount DislikeCount } }`
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
            };
        };
    }, [ws]);

    return (
        <Box>
            <Box className={styles.WrapperHeader} component="section" sx={{ p: 2, }}>
                <h1>
                    Chat Room: {name}
                </h1>
                {loggedUser && (<h1>{loggedUser.Name}</h1>)}
            </Box>
            <Card
                sx={{ margin: "2rem;", maxHeight: "40rem", overflow: "hidden", display: "flex", flexDirection: "column" }}
            >
                <CardContent
                    sx={{ flex: 1, overflowY: "auto" }}
                >
                    {messages.map((message) =>
                        <Box
                            key={message.ID}
                            className={message?.UserId == loggedUser.id ? styles.mineFather : styles.otherFather}
                        >
                            {!message.Reaction?.ReactType ? (
                                <></>
                            ) : message.Reaction.ReactType === "like" ? (
                                <Box
                                    className={styles.countWrapper}
                                >
                                    <Image

                                        className={styles.logo}
                                        src="/like.png"
                                        alt="Like"
                                        width={20}
                                        height={20}
                                    />
                                </Box >
                            ) : (
                                <Box
                                    className={styles.countWrapper}
                                >
                                    <Image
                                        className={styles.logo}
                                        src="/dislike.png"
                                        alt="Dislike"
                                        width={20}
                                        height={20}
                                    />
                                </Box>
                            )}

                            <Box
                                className={message?.UserId == loggedUser.id ? styles.mine : styles.other}
                            >
                                {message?.UserId != loggedUser.id && (<span>  {message?.User?.Name}:  </span>)}
                                <span>{message.Description}</span>
                            </Box>
                            <>
                                <Box
                                    className={styles.countWrapper}
                                >
                                    <Image
                                        className={styles.logo}
                                        src="/like.png"
                                        alt="Like"
                                        width={20}
                                        height={20}
                                        onClick={() => handleLikeDislike(message, "like")}
                                    />
                                    {message?.LikeCount}
                                </Box>
                                <Box
                                    className={styles.countWrapper}
                                >
                                    <Image
                                        className={styles.logo}
                                        src="/dislike.png"
                                        alt="Dislike"
                                        width={20}
                                        height={20}
                                        onClick={() => handleLikeDislike(message, "dislike")}
                                    />
                                    {message?.DislikeCount}
                                </Box>
                            </>
                        </Box>
                    )}
                </CardContent>
            </Card>
            <Box
                sx={{
                    position: "sticky",
                    bottom: 0,
                    background: "white",
                    padding: 1,
                    borderTop: "1px solid #ddd",
                }}
            >
                <form className={styles.wrapperLogin} onSubmit={handleSubmit}>
                    <Box className={styles.wrapperLabels}>
                        <TextField
                            label="Message"
                            variant="filled"
                            fullWidth
                            type="send"
                            id="send"
                            value={sendMessage}
                            onChange={(e) => setSendMessage(e.target.value)}
                            required
                        />
                    </Box>
                    {error && <p>{error}</p>}
                    <Box className={styles.buttonWrapper}>
                        <ButtonGroup
                            variant="contained"
                        >
                            <Button onClick={handleBack}>Back</Button>
                            <Button type="submit">Send Message</Button>
                        </ButtonGroup>
                    </Box>
                </form>
            </Box>
        </Box>
    )
}

export default MessagePage;