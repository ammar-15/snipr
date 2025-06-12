import { useEffect, useState, Fragment } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";

type Creator = {
  username: string;
  tickers: string;
  score: number;
  breakdown?: Record<string, boolean>;
};

export default function Dashboard() {
  const [searchUrl, setSearchUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [personalResult, setPersonalResult] = useState<Creator | null>(null);

  const extractUsername = (url: string) => {
    try {
      const match = url.match(/x\.com\/([A-Za-z0-9_]+)/);
      return match ? `@${match[1]}` : "";
    } catch {
      return "";
    }
  };

  const fetchTrendingData = async () => {
    const snapshot = await getDocs(collection(db, "snipes"));
    const data: Creator[] = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        username: d.username,
        tickers: d.tickers,
        score: d.reliabilityScore,
        breakdown: d.breakdown,
      };
    });
    data.sort((a, b) => b.score - a.score);
    setCreators(data);
  };

  const fetchPersonalResult = async () => {
    const username = localStorage.getItem("username")?.replace(/^@/, "");
    if (!username) return;

    const snapshot = await getDocs(collection(db, `${username}snipe`));
    const docs = snapshot.docs.map((doc) => doc.data());

    if (docs.length) {
      const d = docs[0];
      setPersonalResult({
        username: d.username,
        tickers: d.tickers,
        score: d.reliabilityScore,
        breakdown: d.breakdown,
      });
    }
  };

  const handleGoClick = async () => {
    const username = extractUsername(searchUrl);
    if (!username) {
      alert("Invalid Twitter URL");
      return;
    }

    setLoading(true);

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        alert("You must be logged in.");
        return;
      }

      const idToken = await user.getIdToken();
      const res = await fetch("http://127.0.0.1:5274/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ twitterUrl: searchUrl }),
      });

      const result = await res.json();
      if (!result.success) throw new Error("Analysis failed");

      await fetchTrendingData();
      await fetchPersonalResult();
    } catch (err) {
      alert("Something went wrong.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingData();
  }, []);

  const loadingMessages = [
    "Analyzing tweets harder than SEC analyzes filings...",
    "I heard Elon and Trump became besties again...",
    "Cross-referencing with future me to make sure this is legit...",
    "Counting bullish emojis 📈...",
    "Looking for that one perfect ticker...",
    "Checking if this guy’s a financial wizard or just loud...",
  ];

  const [loadingText, setLoadingText] = useState(loadingMessages[0]);

  useEffect(() => {
    if (!loading) return;
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % loadingMessages.length;
      setLoadingText(loadingMessages[i]);
    }, 3000);
    return () => clearInterval(interval);
  }, [loading]);

  const toggleRow = (username: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [username]: !prev[username],
    }));
  };

  return (
    <div className="px-4 md:px-10 py-20 space-y-10">
      <div className="flex flex-col items-center justify-center space-y-6">
        <h1 className="text-8xl md:text-8xl font-extrabold tracking-tight">
          Snipr
        </h1>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Input
            placeholder="Paste Twitter profile URL..."
            value={searchUrl}
            onChange={(e) => setSearchUrl(e.target.value)}
            className="w-full sm:w-[350px] md:w-[500px] bg-white text-black dark:text-white"
          />
          <Button onClick={handleGoClick} className="w-full sm:w-auto">
            Go
          </Button>
        </div>
        {loading && (
          <div className="flex flex-col items-center mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">{loadingText}</p>
            <div className="w-full sm:w-[350px] md:w-[500px] bg-gray-200 rounded h-2 overflow-hidden">
              <div className="bg-blue-500 h-full animate-pulse w-full"></div>
            </div>
          </div>
        )}
      </div>
      {personalResult && (
        <Card>
          <CardHeader>
            <CardTitle>Your Latest Snipe</CardTitle>
            <CardDescription>
              Here’s how accurate your recent stock call was.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Tickers</TableHead>
                  <TableHead>Reliability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <a
                      href={`https://x.com/${
                        personalResult?.username?.replace(/^@/, "") ?? ""
                      }`}
                      className="text-blue-600 hover:underline"
                      target="_blank"
                    >
                      {personalResult.username}
                    </a>
                  </TableCell>
                  <div className="max-w-[85px] sm:max-w-none overflow-x-auto whitespace-nowrap">
                    <TableCell>{personalResult.tickers}</TableCell>
                  </div>
                  <TableCell>{personalResult.score}</TableCell>
                </TableRow>
                {personalResult.breakdown && (
                  <TableRow className="bg-muted">
                    <TableCell colSpan={3}>
                      <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                        Breakdown:
                      </h4>
                      <ul className="grid gap-1 text-sm">
                        {Object.entries(personalResult.breakdown).map(
                          ([ticker, isCorrect]) => (
                            <li key={ticker}>
                              {ticker} —{" "}
                              <span
                                className={
                                  isCorrect ? "text-green-600" : "text-red-500"
                                }
                              >
                                {isCorrect ? "Correct" : "Incorrect"}
                              </span>
                            </li>
                          )
                        )}
                      </ul>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="px-0 md:px-10 py-10 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Trending Searches</CardTitle>
            <CardDescription>
              See who's making waves in the market.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Tickers</TableHead>
                  <TableHead>Reliability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creators.map((creator) => (
                  <Fragment key={creator.username}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => toggleRow(creator.username)}
                    >
                      <TableCell>
                        <a
                          href={`https://x.com/${creator.username.replace(
                            /^@/,
                            ""
                          )}`}
                          className="text-blue-600 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {creator.username}
                        </a>
                      </TableCell>

                      <TableCell>
                        <div className="max-w-[85px] sm:max-w-none overflow-x-auto whitespace-nowrap">
                          {creator.tickers}
                        </div>
                      </TableCell>
                      <TableCell>{creator.score}</TableCell>
                    </TableRow>

                    {expandedRows[creator.username] && creator.breakdown && (
                      <TableRow
                        key={`breakdown-${creator.username}`}
                        className="bg-muted"
                      >
                        <TableCell colSpan={3}>
                          <div className="pl-4">
                            <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                              Breakdown:
                            </h4>
                            <ul className="grid gap-1 text-sm">
                              {Object.entries(creator.breakdown).map(
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
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
