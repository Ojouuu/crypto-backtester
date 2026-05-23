import requests
import pandas as pd
from datetime import datetime, timedelta


COINGECKO_BASE = "https://api.coingecko.com/api/v3"

# Map common symbols to CoinGecko IDs
SYMBOL_TO_ID = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "SOL": "solana",
    "BNB": "binancecoin",
    "XRP": "ripple",
    "ADA": "cardano",
    "AVAX": "avalanche-2",
    "DOGE": "dogecoin",
    "DOT": "polkadot",
    "MATIC": "matic-network",
    "LINK": "chainlink",
    "UNI": "uniswap",
    "LTC": "litecoin",
    "ATOM": "cosmos",
    "ARB": "arbitrum",
}

# Yahoo Finance ticker mapping (crypto vs USD)
YAHOO_TICKERS = {
    "BTC": "BTC-USD",
    "ETH": "ETH-USD",
    "SOL": "SOL-USD",
    "BNB": "BNB-USD",
    "XRP": "XRP-USD",
    "ADA": "ADA-USD",
    "AVAX": "AVAX-USD",
    "DOGE": "DOGE-USD",
    "DOT": "DOT-USD",
    "MATIC": "MATIC-USD",
    "LINK": "LINK-USD",
    "UNI": "UNI-USD",
    "LTC": "LTC-USD",
    "ATOM": "ATOM-USD",
    "ARB": "ARB-USD",
}


def _fetch_from_yahoo(symbol: str, days: int) -> pd.DataFrame:
    """Fetch OHLCV from Yahoo Finance as a fallback."""
    ticker = YAHOO_TICKERS.get(symbol.upper())
    if not ticker:
        raise ValueError(f"Unsupported symbol: {symbol}")

    end = datetime.utcnow()
    start = end - timedelta(days=days)

    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
    params = {
        "interval": "1d",
        "period1": int(start.timestamp()),
        "period2": int(end.timestamp()),
    }
    headers = {"User-Agent": "Mozilla/5.0"}
    resp = requests.get(url, params=params, headers=headers, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    result = data["chart"]["result"][0]
    timestamps = result["timestamp"]
    indicators = result["indicators"]["quote"][0]

    df = pd.DataFrame({
        "timestamp": pd.to_datetime(timestamps, unit="s"),
        "open": indicators["open"],
        "high": indicators["high"],
        "low": indicators["low"],
        "close": indicators["close"],
        "volume": indicators["volume"],
    })
    df = df.set_index("timestamp").sort_index().dropna()
    return df


def _fetch_from_coingecko(symbol: str, days: int) -> pd.DataFrame:
    """Primary data source: CoinGecko free API."""
    coin_id = SYMBOL_TO_ID.get(symbol.upper())
    if not coin_id:
        raise ValueError(f"Unsupported symbol: {symbol}. Supported: {list(SYMBOL_TO_ID.keys())}")

    url = f"{COINGECKO_BASE}/coins/{coin_id}/ohlc"
    params = {"vs_currency": "usd", "days": min(days, 365)}
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    raw = resp.json()

    df = pd.DataFrame(raw, columns=["timestamp", "open", "high", "low", "close"])
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
    df = df.set_index("timestamp").sort_index()

    url_chart = f"{COINGECKO_BASE}/coins/{coin_id}/market_chart"
    params_chart = {"vs_currency": "usd", "days": min(days, 365)}
    resp_chart = requests.get(url_chart, params=params_chart, timeout=15)
    resp_chart.raise_for_status()
    chart_data = resp_chart.json()

    volumes = pd.DataFrame(chart_data["total_volumes"], columns=["timestamp", "volume"])
    volumes["timestamp"] = pd.to_datetime(volumes["timestamp"], unit="ms")
    volumes = volumes.set_index("timestamp").sort_index()
    volumes_daily = volumes["volume"].resample("D").sum()

    df_daily = df.resample("D").agg({"open": "first", "high": "max", "low": "min", "close": "last"}).dropna()
    df_daily = df_daily.join(volumes_daily, how="left")
    df_daily["volume"] = df_daily["volume"].fillna(0)
    return df_daily


def get_ohlcv(symbol: str, days: int = 365, vs_currency: str = "usd") -> pd.DataFrame:
    """
    Fetch OHLCV data. Tries CoinGecko first, falls back to Yahoo Finance.
    Returns DataFrame with index=timestamp, columns=[open, high, low, close, volume]
    """
    symbol = symbol.upper()
    if symbol not in SYMBOL_TO_ID:
        raise ValueError(f"Unsupported symbol: {symbol}. Supported: {list(SYMBOL_TO_ID.keys())}")

    try:
        return _fetch_from_coingecko(symbol, days)
    except Exception:
        pass  # fall through to Yahoo

    try:
        return _fetch_from_yahoo(symbol, days)
    except Exception as e:
        raise RuntimeError(f"Failed to fetch data for {symbol} from all sources: {str(e)}")


def get_supported_symbols() -> list:
    return list(SYMBOL_TO_ID.keys())