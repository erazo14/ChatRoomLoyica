"use client";
import { useRouter } from "next/navigation";
import styles from "./createChatroom.module.css";
import { useEffect, useState } from "react";
import { Box, Button, ButtonGroup, Card, CardContent, TextField } from "@mui/material";

const CreateChatroomPage = () => {
    const router = useRouter();
    const [name, setName] = useState<string>('');
    const [loggedUser, setLoggedUser] = useState(null);
    const [error, setError] = useState('');
    const apiUrl = process.env.NEXT_PUBLIC_URL_API;

    const onSubmit = async () => {
        const user = JSON.parse(sessionStorage.getItem("loggedUser"));
        const query = {
            query: `mutation { createChatroom(name: "${name}" ,users: ["${user.id}"]) { name users } }`
        }
        const results = await fetch(apiUrl, {
            method: 'POST',

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(query)
        })
        const chatroomCreated = await results.json();
        if (chatroomCreated.errors) {
            setError("Error creating Chatroom")
        } else {
            router.back();
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name) {
            setError('Please fill fields');
            return;
        }
        setError('');
        onSubmit();
    };

    const handleBack = async (e) => {
        e.preventDefault();
        router.back();
    };
    useEffect(() => {
        setLoggedUser(JSON.parse(sessionStorage.getItem("loggedUser")));
    }, []);

    return (
        <div className={styles.loginWrapper}>
            <Box className={styles.WrapperHeader} component="section" sx={{ p: 2, }}>
                <h1>
                    Create Room
                </h1>
                {loggedUser && (<h1>{loggedUser.Name}</h1>)}
            </Box>
            <Card>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <Box
                            sx={{ marginBottom: '1rem' }}
                        >
                            <TextField
                                label="Name"
                                variant="filled"
                                type="user"
                                id="user"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </Box>
                        {error && <p style={{ color: "red" }}>{error}</p>}
                        <Box
                            sx={{ display: "flex", justifyContent: "flex-end" }}
                        >
                            <ButtonGroup
                                variant="contained"
                            >
                                <Button onClick={handleBack}>back</Button>
                                <Button type="submit">Create Room</Button>
                            </ButtonGroup>
                        </Box>
                    </form>
                </CardContent>
            </Card>
        </div >
    )
};

export default CreateChatroomPage;