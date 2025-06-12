import { analytics } from "../../firebase";
import { logEvent } from "firebase/analytics";

export const trackLogin = () => {
  logEvent(analytics, "login", { method: "email_password" });
};

export const trackSignup = () => {
  logEvent(analytics, "sign_up", { method: "email_password" });
};

export const trackPageView = (path: string) => {
  logEvent(analytics, "page_view", { path });
};

export const trackStockCallClick = (ticker: string) => {
  logEvent(analytics, "stock_call_click", { ticker });
};
