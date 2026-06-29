# 📊 Quantitative Finance Projects

> A portfolio of 11 end-to-end finance applications built with Python and Streamlit — covering equity analysis, derivatives pricing, portfolio optimisation, quantitative strategies, and NLP-driven trading.

![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white)
![Streamlit](https://img.shields.io/badge/Streamlit-1.35+-red?logo=streamlit&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Projects

| # | Project | Description | Port | Tech |
|---|---------|-------------|------|------|
| 01 | [📈 Stock Dashboard](./01-stock-dashboard/) | Candlestick charts, SMA/BB overlays, 52-week gauge, return distribution | 8501 | `yfinance` `plotly` |
| 02 | [💼 Portfolio Tracker](./02-portfolio-tracker/) | Live P&L, sector allocation, Sharpe/Beta/Calmar vs benchmark | 8502 | `yfinance` `plotly` |
| 03 | [📊 Financial Statement Analyzer](./03-financial-statement-analyzer/) | 24+ auto-computed ratios, margin trends, side-by-side comparison | 8503 | `yfinance` `pandas` |
| 04 | [💰 DCF Valuation Model](./04-dcf-valuation-model/) | CAPM WACC, two-stage FCF, sensitivity heatmap, value bridge | 8504 | `yfinance` `plotly` |
| 05 | [📉 Pairs Trading Strategy](./05-pairs-trading/) | Engle-Granger cointegration, rolling OLS hedge ratio, z-score backtest | 8505 | `statsmodels` |
| 06 | [📐 Fama-French Factor Model](./06-fama-french-factor-model/) | Live FF3/FF5, OLS regression, rolling betas, return attribution | 8506 | `statsmodels` |
| 07 | [⚡ Options Pricing Calculator](./07-options-pricer/) | Black-Scholes from scratch, all 5 Greeks, 3D surface, IV smile, P&L diagrams | 8507 | `scipy` |
| 08 | [🔁 Backtesting Engine](./08-backtesting-engine/) | 5 strategies, slippage/commission, monthly heatmap, trade log | 8508 | `yfinance` `plotly` |
| 09 | [🧠 Sentiment Trading](./09-sentiment-trading/) | LM lexicon + FinBERT NLP, news annotation, sentiment-return correlation | 8509 | NLP |
| 10 | [📄 Equity Research Generator](./10-equity-research/) | Auto-generate full equity research report, one-click HTML download | 8510 | `yfinance` |
| 11 | [🎯 Portfolio Optimizer](./11-portfolio-optimizer/) | Markowitz efficient frontier, Max Sharpe, Min Variance via scipy | 8511 | `scipy` |

---

## Quick Start

Each project is self-contained:

```bash
cd <project-folder>
pip install -r requirements.txt
streamlit run app.py
```

---

## Tech Stack

| Category | Libraries |
|----------|-----------|
| **UI** | Streamlit 1.35+ |
| **Data** | yfinance 1.4+, pandas 2.0+, numpy 1.26+ |
| **Visualisation** | Plotly 5.20+ |
| **Quant/Stats** | scipy 1.12+, statsmodels 0.14+ |
| **NLP** | Loughran-McDonald lexicon; FinBERT (optional) |

---

## Deploying to Streamlit Cloud

1. Push this repo to GitHub
2. Go to [share.streamlit.io](https://share.streamlit.io) → **New app**
3. Set **Main file path** to e.g. `07-options-pricer/app.py`
4. Click **Deploy** — repeat for each project

Replace `YOUR_USERNAME/finance-portfolio` in each project's README with your actual GitHub username and repo name.

---

## License

MIT — free to use, modify, and distribute.
