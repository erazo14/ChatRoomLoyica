"use client"
import { useRouter } from "next/navigation";
import styles from "./login.module.css";
import { useState } from 'react';
import { Box, Button, TextField } from "@mui/material";


const LoginPage = () => {
    const router = useRouter();
    const [user, setUser] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const apiUrl = process.env.NEXT_PUBLIC_URL_API;

    const onSubmit = async (user) => {
        const query = {
            query: `mutation { login(user: "${user.user}", password: "${user.password}") { id Name user } }`
        }
        const results = await fetch(apiUrl, {
            method: 'POST',

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(query)
        })
        const logged = await results.json();
        if (logged.errors) {
            setError("Invalid user or password")
        } else {
            sessionStorage.setItem('loggedUser', JSON.stringify(logged['data']['login']))
            router.push('home');
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user || !password) {
            setError('Please fill in both fields');
            return;
        }
        setError('');
        onSubmit({ user, password });
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        router.push('signup');
    };

    return (
        <div className={styles.loginWrapper}>
            <Box
                sx={{ p: 2, border: '1px solid grey' }}
            >
                <form className={styles.wrapperLogin} onSubmit={handleSubmit}>
                    <div className={styles.wrapperLabels}>
                        <TextField

                            label="User"
                            type="text"
                            variant="filled"
                            id="user"
                            value={user}
                            onChange={(e) => setUser(e.target.value)}
                            required
                        />
                    </div>
                    <div className={styles.wrapperLabels}>
                        <TextField
                            label="Password"
                            variant="filled"
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <p>{error}</p>}
                    <div className={styles.buttonWrapper}>
                        <Button variant="contained" className={styles.button} onClick={handleSignUp}>Sign Up</Button>
                        <Button variant="contained" className={styles.button} type="submit">Login</Button>
                    </div>
                </form>
            </Box>
        </div>
    )
}

export default LoginPage;