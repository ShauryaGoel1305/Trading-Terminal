import YahooFinance from "yahoo-finance2";

// yahoo-finance2 v3 exports a class; instantiate once and share it.
// suppressNotices silences the one-time survey banner in the console.
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export default yf;
