import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { auth, db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";

export default function User() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const cachedEmail = localStorage.getItem("email");
      const cachedUsername = localStorage.getItem("username");

      setEmail(cachedEmail || user.email || "");
      setUserId(user.uid);

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setUsername(docSnap.data().username || cachedUsername || "");
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const email = user.email;
      localStorage.setItem("email", email || "");

      setEmail(user.email || "");
      setUserId(user.uid);

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setUsername(docSnap.data().username || "");
      }
    };

    fetchUser();
  }, []);

  const handleSave = async () => {
    try {
      if (!userId) return;

      const updates: any = {};
      if (username) {
        updates.username = username;
        await updateDoc(doc(db, "users", userId), updates);
        toast.success("Username updated!");
      }

      if (password) {
        await updatePassword(auth.currentUser!, password);
        toast.success("Password changed successfully!");
      }
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error.message || "Something went wrong.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 space-y-6 p-4">
      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          className="mt-2"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your username"
        />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled />
      </div>

      <div>
        <Label htmlFor="password">Change Password</Label>
        <Input
          className="mt-2"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
        />
        <Button className="mt-2" onClick={handleSave}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
