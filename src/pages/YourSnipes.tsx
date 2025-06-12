import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Snipe = {
  username: string;
  twitterLink: string;
  tickers: string;
  reliabilityScore: number;
  breakdown: Record<string, boolean>;
};

export default function YourSnipes() {
  const [snipes, setSnipes] = useState<Snipe[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [username, setUsername] = useState("");

  useEffect(() => {
  const fetchUsername = async () => {
    const user = auth.currentUser;
    if (!user) return;
     const snapshot = await getDocs(collection(db, "users", user.uid, "profile")); 

    if (!snapshot.empty) {
      const docData = snapshot.docs[0].data();
      setUsername(docData.username);
    }
  };

  fetchUsername();
}, []);

  useEffect(() => {
    const fetchSnipes = async () => {
      const snapshot = await getDocs(collection(db, `${username}snipe`));
      const data = snapshot.docs.map((doc) => doc.data() as Snipe);
      setSnipes(data);
    };

    fetchSnipes();
  }, []);

  const toggleRow = (username: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [username]: !prev[username],
    }));
  };

  return (
    <div className="px-2 md:px-10 py-10 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Snipes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Tickers</TableHead>
                <TableHead>Reliability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snipes.map((snipe, i) => (
                <>
                  <TableRow
                    key={i}
                    className="cursor-pointer"
                    onClick={() => toggleRow(snipe.username)}
                  >
                    <TableCell>
                      <a
                        href={snipe.twitterLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {snipe.username}
                      </a>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="max-w-[85px] sm:max-w-none overflow-x-auto whitespace-nowrap">
                        {snipe.tickers}
                      </div>
                    </TableCell>{" "}
                    <TableCell>{snipe.reliabilityScore}%</TableCell>
                  </TableRow>

                  {expandedRows[snipe.username] && (
                    <TableRow className="bg-muted">
                      <TableCell colSpan={4}>
                        <div className="pl-4">
                          <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                            Breakdown:
                          </h4>
                          <ul className="grid gap-1 text-sm">
                            {Object.entries(snipe.breakdown).map(
                              ([ticker, isCorrect]) => (
                                <li key={ticker}>
                                  {ticker} —{" "}
                                  <span
                                    className={
                                      isCorrect
                                        ? "text-green-600"
                                        : "text-red-500"
                                    }
                                  >
                                    {isCorrect ? "Correct" : "Incorrect"}
                                  </span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
