"use client";
import { useEffect, useState } from "react";
import styles from "./subscribeChatroom.module.css"
import { useRouter } from "next/navigation";
import { Box, Button, Divider, List, ListItem, ListItemButton, ListItemText } from "@mui/material";

const SubscribeChatroomPage = () => {
    const router = useRouter();
    const [error, setError] = useState<string>('');
    const [chatrooms, setChatrooms] = useState([]);
    const [loggedUser, setLoggedUser] = useState(undefined);
    const apiUrl = process.env.NEXT_PUBLIC_URL_API;

    const handleSusbscribe = async (room) => {
        const query = {
            query: `mutation { subscribeChatrooms(chatroomId: "${room.id}", userId: "${loggedUser.id}") { id name users } }`
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
            room.users.push(loggedUser.id)
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
        setLoggedUser(JSON.parse(sessionStorage.getItem("loggedUser")));
    }, []);

    return (
        <div>
            <Box className={styles.WrapperHeader} component="section" sx={{ p: 2, }}>
                <h1>
                    Joining Rooms
                </h1>
                {loggedUser && (<h1>{loggedUser.Name}</h1>)}
            </Box>

            {chatrooms.length > 0 ? (
                <List
                    component="section"
                    sx={{ p: 2, }}
                >
                    {chatrooms.map((room, index) => (<Box
                        key={room.id}
                    >
                        {index != 0 && <Divider />}
                        <ListItem
                            className={styles.chatBox}
                            key={room.id}
                            style={{ marginBottom: "10px" }}
                        >
                            <ListItemButton>
                                <ListItemText primary={room.name} />
                                {!room.users.includes(loggedUser.id) ? <Button variant="contained" className={styles.button} onClick={() => handleSusbscribe(room)}>Join</Button> : <p>Joined</p>}
                            </ListItemButton>
                        </ListItem>
                    </Box>
                    ))}
                </List>
            ) : (
                <p>No chatrooms available.</p>
            )}
            {error && <p style={{ color: "red" }}>{error}</p>}
            <div className={styles.buttonWrapper}>
                <Button variant="contained" className={styles.button} onClick={handleBack}>back</Button>
            </div>
        </div>
    );
};

export default SubscribeChatroomPage;