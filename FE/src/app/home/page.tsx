"use client"
import styles from "./home.module.css";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useChatroom } from "../context/chatSelected";
import { Box, Button, ButtonGroup, Divider, List, ListItem, ListItemButton, ListItemText } from "@mui/material";


const HomePage = () => {
    const router = useRouter();
    const [error, setError] = useState<string>('');
    const [loggedUser, setLoggedUser] = useState(null);
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
        router.back();
    }

    const subscribeRoom = () => {
        router.push('subscribeChatroom');
    }

    const createRoom = () => {
        router.push('createChatroom');
    }

    useEffect(() => {
        const getChatrooms = async () => {
            const userData = JSON.parse(sessionStorage.getItem('loggedUser'));
            setLoggedUser(userData);
            if (!userData) {
                router.push('/login');
                return;
            }
            const userId = userData?.id;
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
        <Box
            sx={{ padding: "1rem" }}
        >
            <Box className={styles.WrapperHeader} component="section" sx={{ p: 2, }}>
                <h1>
                    Chat Rooms
                </h1>
                {loggedUser && (<h1>{loggedUser.Name}</h1>)}
            </Box>

            {chatrooms.length > 0 ? (
                <List
                    component="section"
                    sx={{ p: 2, }}
                >
                    {chatrooms.map((room, index) => (
                        <Box
                            key={room.id}
                        >
                            {index != 0 && <Divider />}
                            <ListItem
                                sx={{ cursor: "pointer" }}
                                key={room.id}
                                onClick={() => handleChatroomClick(room)}
                            >
                                <ListItemButton>
                                    <ListItemText primary={room.name} />
                                </ListItemButton>
                            </ListItem>
                        </Box>
                    ))}
                </List>
            ) : (
                <p>No chatrooms available.</p>
            )
            }
            {error && <p style={{ color: "red" }}>{error}</p>}
            <Box
                sx={{ display: "flex", justifyContent: "flex-end" }}
            >
                <ButtonGroup
                    variant="contained"
                >
                    <Button onClick={logOut}>Log Out</Button>
                    <Button onClick={subscribeRoom}>Join Room</Button>
                    <Button onClick={createRoom}>Create Room</Button>
                </ButtonGroup>
            </Box>
        </Box>
    )
}

export default HomePage;