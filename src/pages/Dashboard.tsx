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
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { toast } from "sonner";

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

  const fetchPersonalResult = async (targetUsername: string) => {
    const appUsername = localStorage.getItem("username")?.replace(/^@/, "");
    if (!appUsername) return;

    const snapshot = await getDocs(collection(db, `${appUsername}snipe`));
    const docs = snapshot.docs.map((doc) => doc.data());

    const match = docs.find(
      (doc) => doc.username?.toLowerCase() === targetUsername.toLowerCase()
    );

    if (match) {
      setPersonalResult({
        username: match.username,
        tickers: match.tickers,
        score: match.reliabilityScore,
        breakdown: match.breakdown,
      });
    } else {
      console.warn("⚠️ No match found for", targetUsername);
    }
  };

  const handleGoClick = async () => {
    const username = extractUsername(searchUrl);
    const cleanTwitterUsername = username.replace(/^@/, "");
    if (!username) {
      toast.error("Invalid Twitter URL");
      return;
    }

    setLoading(true);

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        toast.success("You must be logged in.");
        return;
      }

      const idToken = await user.getIdToken();
      const baseUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${baseUrl}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ twitterUrl: searchUrl }),
      });

      const result = await res.json();
      if (!result.success) throw new Error("Analysis failed");

      if (result.message === "No ticker calls found.") {
        setPersonalResult({
          username: result.username,
          tickers: "—",
          score: 0,
          breakdown: {},
        });
        toast("No valid ticker calls were found.");
      } else {
        await fetchPersonalResult(cleanTwitterUsername); // 👈 pass actual username here
        await fetchTrendingData();
      }
    } catch (err) {
      toast.error("Something went wrong.");
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
    "I heard Elon and Trump broke up again...",
    "Asked the Feds for transparency... got silence and a red candle.",
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
        <h1
          className="text-8xl md:text-8xl font-extrabold tracking-tight 
  bg-gradient-to-t from-gray-600 to-white 
  dark:from-gray-600  dark:to-white
  bg-clip-text text-transparent"
        >
          Snipr
        </h1>
        <p className="mt-4 md:px-6 text-sm md:text-md text-muted-foreground max-w-xl">
          Paste the Twitter profile link of someone who shares stock opinions.
          We'll analyze their recent posts and see if their calls on tickers
          were actually accurate.
          <br />
          <span className="text-xs text-gray-400">
            Example: https://x.com/username
          </span>
        </p>{" "}
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
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
