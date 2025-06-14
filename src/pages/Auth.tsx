import { useState } from "react";
import { auth, db } from "../../firebase";
import { toast } from "sonner";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  setDoc,
  query,
  where,
  getDocs,
  getDoc,
  collection,
} from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { trackLogin, trackSignup } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [email, setEmail] = useState("test123@gmail.com");
  const [password, setPassword] = useState("test1234");
  const [isSignup, setIsSignup] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async () => {
    isSignup ? trackSignup() : trackLogin();

    try {
      if (isSignup) {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        const baseUsername = email.split("@")[0];
        let finalUsername = baseUsername;
        let count = 0;

        while (true) {
          const q = query(
            collection(db, "users"),
            where("username", "==", finalUsername)
          );
          const snapshot = await getDocs(q);
          if (snapshot.empty) break;
          count++;
          finalUsername = `${baseUsername}${count}`;
        }

        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          username: finalUsername,
          createdAt: new Date().toISOString(),
        });

        await setDoc(doc(db, `${finalUsername}snipe`, "init"), {
          note: "Collection initialized on signup",
          initializedAt: new Date().toISOString(),
        });

        localStorage.setItem("username", finalUsername);
        localStorage.setItem("email", user.email || "");

        toast.success("Account created! Redirecting to dashboard...");
        navigate("/dashboard");
      } else {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        const docSnap = await getDoc(doc(db, "users", user.uid));
        const username = docSnap.exists() ? docSnap.data().username : "";

        localStorage.setItem("username", username);
        localStorage.setItem("email", user.email || "");

        toast.success("Welcome back! Redirecting to dashboard...");
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("🔥 Login error:", err);
      toast.error(err.message || "Login failed.");
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_2.3fr]">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <h1
              className="text-8xl md:text-8xl font-extrabold tracking-tight 
              bg-gradient-to-t from-gray-600 to-white dark:from-gray-600 dark:to-white
              bg-clip-text text-transparent text-center"
            >
              Snipr
            </h1>
            <p className="mt-3 text-sm text-muted-foreground text-center">
              Every tweet is a claim. <br /> Snipr is the reckoning.
            </p>
            <div className="space-y-4 mt-6">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button className="w-full" onClick={handleAuth}>
                {isSignup ? "Sign Up" : "Log In"}
              </Button>
              <p
                className="text-center text-sm text-muted-foreground cursor-pointer"
                onClick={() => setIsSignup(!isSignup)}
              >
                {isSignup
                  ? "Already have an account? Log in"
                  : "Don't have an account? Sign up"}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/snipr.png"
          alt="Login Illustration"
          className="absolute inset-0 h-full w-80% object-cover dark:brightness-[0.8] dark:grayscale"
        />
      </div>
    </div>
  );
}
