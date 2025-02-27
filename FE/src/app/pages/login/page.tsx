"use client"
import { useRouter } from "next/navigation";
import styles from "./login.module.css";
import { useState } from 'react';


const LoginPage = () => {
    const router = useRouter();
    const [user, setUser] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const onSubmit = async ( user ) => {
        const query = {
            query: `mutation { login(user: "${user.user}", password: "${user.password}") { name user } }`
        }
        let results = await fetch('http://localhost:8081/graphql', {
            method: 'POST',
        
            headers: {
              "Content-Type": "application/json"
            },
        
            body: JSON.stringify(query)
          })
          let logged = await results.json();
          (logged.errors) ? setError("Invalid user or password") : router.push('home');
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


    return (
        <div>
            <form className={styles.wrapperLogin} onSubmit={handleSubmit}>
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
                <button className={styles.buttton} type="submit">Login</button>
            </form>
        </div>
    )
}

export default LoginPage;