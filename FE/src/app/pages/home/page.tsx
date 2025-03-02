"use client"
import styles from "./home.module.css";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useChatroom } from "../../context/chatSelected";
import { Box, Button } from "@mui/material";


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
        <div>
            <Box className={styles.WrapperHeader} component="section" sx={{ p: 2, }}>
                <h1>
                    Chat Rooms
                </h1>
                {loggedUser && (<h1>{loggedUser.Name}</h1>)}
            </Box>

            {chatrooms.length > 0 ? (
                <Box
                    component="section"
                    sx={{ p: 2, }}
                >
                    {chatrooms.map(room => (
                        <Box
                            sx={{ p: 2, border: '1px solid grey' }}
                            className={styles.chatBox}
                            key={room.id}
                            onClick={() => handleChatroomClick(room)}
                            style={{ cursor: "pointer", marginBottom: "10px" }}
                        >
                            <h2 className={styles.labelName} >
                                Nombre del Chat:
                            </h2>
                            <h3>
                                {room.name}
                            </h3>
                        </Box>
                    ))}
                </Box>
            ) : (
                <p>No chatrooms available.</p>
            )}
            {error && <p style={{ color: "red" }}>{error}</p>}
            <div className={styles.buttonWrapper}>
                <Button variant="contained" className={styles.button} onClick={logOut}>Log Out</Button>
                <Button variant="contained" className={styles.button} onClick={subscribeRoom}>Join Room</Button>
                <Button variant="contained" className={styles.button} onClick={createRoom}>Create Room</Button>
            </div>
        </div>
    )
}

export default HomePage;