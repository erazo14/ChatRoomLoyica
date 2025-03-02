"use client";
import { useRouter } from "next/navigation";
import styles from "./createChatroom.module.css";
import { useState } from "react";

const CreateChatroomPage = () => {
    const router = useRouter();
    const [name, setName] = useState('');
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

    return (
        <div>
            <h1>Create Room</h1>
            <form className={styles.wrapperLogin} onSubmit={handleSubmit}>
                <div className={styles.wrapperLabels}>
                    <div>
                        <label>Room Name: </label>
                    </div>
                    <input
                        type="user"
                        id="user"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                {error && <p>{error}</p>}
                <div className={styles.buttonWrapper}>
                    <button className={styles.button} onClick={handleBack}>back</button>
                    <button className={styles.button} type="submit">Create Room</button>
                </div>
            </form>
        </div>
    )
};

export default CreateChatroomPage;