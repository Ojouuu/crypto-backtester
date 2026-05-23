import pandas as pd
from .base import BaseStrategy, Signal


class MACDStrategy(BaseStrategy):
    """
    BUY when MACD line crosses above signal line.
    SELL when MACD line crosses below signal line.
    """

    def __init__(self, fast: int = 12, slow: int = 26, signal: int = 9):
        self.fast = fast
        self.slow = slow
        self.signal = signal

    @property
    def name(self) -> str:
        return f"MACD ({self.fast}/{self.slow}/{self.signal})"

    def _compute_macd(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        ema_fast = df["close"].ewm(span=self.fast, adjust=False).mean()
        ema_slow = df["close"].ewm(span=self.slow, adjust=False).mean()
        df["macd"] = ema_fast - ema_slow
        df["macd_signal"] = df["macd"].ewm(span=self.signal, adjust=False).mean()
        df["macd_hist"] = df["macd"] - df["macd_signal"]
        return df

    def generate_signals(self, df: pd.DataFrame) -> list[Signal]:
        df = self._compute_macd(df)
        df["above"] = df["macd"] > df["macd_signal"]
        df["crossover"] = df["above"].diff()

        signals = []
        for ts, row in df.iterrows():
            if pd.isna(row["crossover"]):
                continue
            if row["crossover"] and row["above"]:
                signals.append(Signal(
                    timestamp=str(ts.date()),
                    type="BUY",
                    price=round(row["close"], 4),
                    reason="MACD crossed above signal line",
                ))
            elif row["crossover"] and not row["above"]:
                signals.append(Signal(
                    timestamp=str(ts.date()),
                    type="SELL",
                    price=round(row["close"], 4),
                    reason="MACD crossed below signal line",
                ))

        return signals

    def get_indicator_data(self, df: pd.DataFrame) -> dict:
        df = self._compute_macd(df)
        return {
            "MACD": df["macd"].dropna().round(4).to_dict(),
            "Signal": df["macd_signal"].dropna().round(4).to_dict(),
            "Histogram": df["macd_hist"].dropna().round(4).to_dict(),
        }