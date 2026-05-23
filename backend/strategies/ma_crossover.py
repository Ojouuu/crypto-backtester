import pandas as pd
from .base import BaseStrategy, Signal


class MovingAverageCrossover(BaseStrategy):
    """
    BUY when fast SMA crosses above slow SMA (golden cross).
    SELL when fast SMA crosses below slow SMA (death cross).
    """

    def __init__(self, fast_period: int = 20, slow_period: int = 50):
        if fast_period >= slow_period:
            raise ValueError("fast_period must be less than slow_period")
        self.fast_period = fast_period
        self.slow_period = slow_period

    @property
    def name(self) -> str:
        return f"MA Crossover ({self.fast_period}/{self.slow_period})"

    def generate_signals(self, df: pd.DataFrame) -> list[Signal]:
        df = df.copy()
        df["sma_fast"] = df["close"].rolling(self.fast_period).mean()
        df["sma_slow"] = df["close"].rolling(self.slow_period).mean()

        # Detect crossovers
        df["above"] = df["sma_fast"] > df["sma_slow"]
        df["crossover"] = df["above"].diff()

        signals = []
        for ts, row in df.iterrows():
            if pd.isna(row["crossover"]) or pd.isna(row["sma_slow"]):
                continue
            if row["crossover"] and row["above"]:
                signals.append(Signal(
                    timestamp=str(ts.date()),
                    type="BUY",
                    price=round(row["close"], 4),
                    reason=f"Golden cross: SMA{self.fast_period} crossed above SMA{self.slow_period}",
                ))
            elif row["crossover"] and not row["above"]:
                signals.append(Signal(
                    timestamp=str(ts.date()),
                    type="SELL",
                    price=round(row["close"], 4),
                    reason=f"Death cross: SMA{self.fast_period} crossed below SMA{self.slow_period}",
                ))

        return signals

    def get_indicator_data(self, df: pd.DataFrame) -> dict:
        df = df.copy()
        df["sma_fast"] = df["close"].rolling(self.fast_period).mean()
        df["sma_slow"] = df["close"].rolling(self.slow_period).mean()
        return {
            f"SMA{self.fast_period}": df["sma_fast"].dropna().round(4).to_dict(),
            f"SMA{self.slow_period}": df["sma_slow"].dropna().round(4).to_dict(),
        }
        