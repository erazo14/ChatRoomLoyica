"use client";
import { useRouter } from "next/navigation";
import styles from "./createChatroom.module.css";
import { useEffect, useState } from "react";

const CreateChatroomPage = () => {
    const router = useRouter();
    const [name, setName] = useState('');
    const [userSelected, setUserSelected] = useState([]);
    const [error, setError] = useState('');
    const [userGetted, setUserGetted] = useState([]);
    const apiUrl = process.env.NEXT_PUBLIC_URL_API;

    const onSubmit = async () => {
        const userName = JSON.parse(sessionStorage.getItem("loggedUser"));
        userSelected.push(`"${userName.id.match(/ObjectID\("(.+)"\)/)?.[1]}"`);
        const query = {
            query: `mutation { createChatroom(name: "${name}" ,users: [${userSelected}]) { name users } }`
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

    const handleSelectChange = (e) => {
        userGetted.map((user) => {
            if (user.id == e.target.value) {
                setName(user.name);
            }
        })
        setUserSelected([`"${e.target.value.match(/ObjectID\("(.+)"\)/)?.[1]}"`])
    }

    useEffect(() => {
        const getUsers = async () => {
            const userName = sessionStorage.getItem("loggedUser") ? JSON.parse(sessionStorage.getItem("loggedUser")) : router.replace('home');
            const query = {
                query: `mutation { getUsers(user: "${userName?.user}") { id name user } }`
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
                setUserGetted(usersGetted?.data?.getUsers)
            };
        };

        getUsers();
    }, []);

    return (
        <div>
            <h1>Create Room</h1>
            <form className={styles.wrapperLogin} onSubmit={handleSubmit}>
                <div className={styles.wrapperLabels}>
                    <div>
                        <label>Room Name: </label>
                    </div>
                    <label>{name}</label>
                </div>
                <div className={styles.wrapperLabels}>
                    <div>
                        <label>User:</label>
                    </div>
                    <select
                        onChange={(e) => handleSelectChange(e)}
                    >
                        {userGetted.length && userGetted.map((user) =>
                            <option key={user.id} value={user.id}>{user.name}</option>
                        )}
                    </select>
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