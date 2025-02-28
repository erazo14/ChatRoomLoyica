"use client";
import { useRouter } from "next/navigation";
import styles from "./signup.module.css";
import { useState } from "react";

const signUpPage = () => {
    const router = useRouter();
    const [name, setName] = useState('');
    const [user, setUser] = useState('');
    const [error, setError] = useState('');
    const [password, setPassword] = useState('');
    const apiUrl = process.env.NEXT_PUBLIC_URL_API;

    const onSubmit = async () => {
        const query = {
            query: `mutation { signup(name: "${name}" ,user: "${user}", password: "${password}") { id name user } }`
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
            router.push('login');
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
        <div>
            <h1>Sign Up</h1>
            <form className={styles.wrapperLogin} onSubmit={handleSubmit}>
                <div className={styles.wrapperLabels}>
                    <div>
                        <label>Name:</label>
                    </div>
                    <input
                        type="name"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                <div className={styles.wrapperLabels}>
                    <div>
                        <label>User:</label>
                    </div>
                    <input
                        type="user"
                        id="user"
                        value={user}
                        onChange={(e) => setUser(e.target.value)}
                        required
                    />
                </div>
                <div className={styles.wrapperLabels}>
                    <div>
                        <label>Password:</label>
                    </div>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                {error && <p>{error}</p>}
                <div className={styles.buttonWrapper}>
                    <button className={styles.button} onClick={handleBack}>back</button>
                    <button className={styles.button} type="submit">sign Up</button>
                </div>
            </form>
        </div>
    )
};

export default signUpPage;