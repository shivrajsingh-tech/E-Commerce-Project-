
"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Restore the logged-in user after refreshing the page
    useEffect(() => {
        try {
            const savedUser = localStorage.getItem("user");

            if (savedUser) {
                setUser(JSON.parse(savedUser));
            }
        } catch (error) {
            console.error("Unable to restore user:", error);
            localStorage.removeItem("user");
        } finally {
            setLoading(false);
        }
    }, []);

    // Save the user after successful login
    const login = (userData, token) => {
        if (!userData) {
            throw new Error("User information is missing.");
        }

        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));

        // Save the token only if the backend provides one
        if (token) {
            localStorage.setItem("token", token);
        }
    };

    // Logout the user without clearing the cart
    const logout = () => {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
    };

    const role = user?.role || user?.userType || null;

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                role,
                loading,
                login,
                logout,
                isAuthenticated: Boolean(user),
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth must be used inside AuthProvider."
        );
    }

    return context;
}
