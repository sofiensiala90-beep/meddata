import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../services/firebase';
import { User, MedicalField } from '../types';
import { mockAdminUser } from '../data/mockData';

interface AuthContextType {
    currentUser: User | null;
    isLoading: boolean;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
    logout: () => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    loginWithGoogle: () => Promise<any>; // Returns firebase user if new, null otherwise
    register: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    setCurrentUser({ id: user.uid, ...userDoc.data() } as User);
                } else {
                    // If user is authenticated but no doc exists (e.g. mid-registration or error), 
                    // we don't set currentUser yet, or we handle it in the component.
                    // For now, let's assume if no doc, not fully logged in as 'User'.
                    setCurrentUser(null);
                }
            } else {
                setCurrentUser(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        await auth.signInWithEmailAndPassword(email, password);
    };

    const loginWithGoogle = async () => {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;
        if (!user) throw new Error("User not found after Google sign-in.");

        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            return user;
        }
        return null;
    };

    const register = async (signupData: any) => {
        let user;
        // Check if we are completing a Google signup (user already auth'd)
        if (auth.currentUser) {
            user = auth.currentUser;
        } else {
            const userCredential = await auth.createUserWithEmailAndPassword(signupData.email.trim(), signupData.password);
            user = userCredential.user;
        }

        if (user) {
            const usersCollection = db.collection('users');
            const isAdmin = signupData.email.trim().toLowerCase() === mockAdminUser.email.toLowerCase();
            const role = isAdmin ? 'admin' : 'student';
            const coinBalance = isAdmin ? Infinity : 500;
            const welcomeMessage = isAdmin
                ? 'Bienvenue, Administrateur ! Votre compte a été créé avec les droits d\'administration.'
                : 'Bienvenue sur MedataAI ! Votre solde de départ est de 500 coins.';

            const newUser: Omit<User, 'id' | 'password'> = {
                name: signupData.name,
                email: signupData.email.trim().toLowerCase(),
                university: signupData.university,
                field: signupData.field,
                studyYear: Number(signupData.studyYear),
                phoneNumber: signupData.phoneNumber,
                createdAt: new Date().toISOString(),
                role: role,
                coinBalance: coinBalance,
                status: 'active',
            };

            await usersCollection.doc(user.uid).set(newUser);

            const welcomeNotification = {
                userId: user.uid,
                message: welcomeMessage,
                read: false,
                createdAt: new Date().toISOString(),
            };
            await db.collection('notifications').add(welcomeNotification);

            const newActivity = {
                userId: user.uid,
                type: 'ACCOUNT_CREATED',
                details: `Le compte de ${newUser.name} a été créé${isAdmin ? ' en tant qu\'administrateur' : ''}.`,
                createdAt: new Date().toISOString(),
            };
            await db.collection('activities').add(newActivity);

            // Force update currentUser since onAuthStateChanged might have fired before DB write
            setCurrentUser({ id: user.uid, ...newUser } as User);
        }
    };

    const logout = async () => {
        await auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ currentUser, isLoading, setCurrentUser, logout, login, loginWithGoogle, register }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
