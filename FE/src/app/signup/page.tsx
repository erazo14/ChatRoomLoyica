"use client";
import { useRouter } from "next/navigation";
import styles from "./signup.module.css";
import { useState } from "react";
import { Box, Button, ButtonGroup, Card, CardContent, TextField } from "@mui/material";

const SignUpPage = () => {
    const router = useRouter();
    const [name, setName] = useState('');
    const [user, setUser] = useState('');
    const [error, setError] = useState('');
    const [password, setPassword] = useState('');
    const apiUrl = process.env.NEXT_PUBLIC_URL_API;

    const onSubmit = async () => {
        const query = {
            query: `mutation { signup(name: "${name}" ,user: "${user}", password: "${password}") { id Name user } }`
        }
        const results = await fetch(apiUrl, {
            method: 'POST',

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(query)
        })
        const userCreated = await results.json();
        if (userCreated.errors) {
            setError("Missing field")
        } else {
            router.back();
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !user || !password) {
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

    return (
        <Box className={styles.loginWrapper}>
            <Box className={styles.WrapperHeader} component="section" sx={{ p: 2, }}>
                <h1>
                    Sign Up
                </h1>
            </Box>
            <Card
                sx={{ p: 2, width: "20rem", display: "flex", justifyContent: "center", alignItems: "center" }}
            >
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <Box
                            sx={{ marginBottom: '1rem' }}
                        >

                            <TextField
                                label="Name"
                                variant="filled"
                                type="name"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </Box>
                        <Box
                            sx={{ marginBottom: '1rem' }}
                        >

                            <TextField
                                label="User"
                                variant="filled"
                                type="user"
                                id="user"
                                value={user}
                                onChange={(e) => setUser(e.target.value)}
                                required
                            />
                        </Box>
                        <Box
                            sx={{ marginBottom: '1rem' }}
                        >
                            <TextField
                                label="Password"
                                variant="filled"
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </Box>
                        {error && <p>{error}</p>}
                        <Box
                            sx={{ display: "flex", justifyContent: "flex-end" }}
                        >
                            <ButtonGroup
                                variant="contained"
                            >
                                <Button onClick={handleBack}>back</Button>
                                <Button type="submit">sign Up</Button>
                            </ButtonGroup>
                        </Box>
                    </form>
                </CardContent>
            </Card>
        </Box>
    )
};

export default SignUpPage;