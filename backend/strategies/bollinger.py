import pandas as pd
from .base import BaseStrategy, Signal


class BollingerBandsStrategy(BaseStrategy):
    """
    BUY when price closes below the lower band (oversold).
    SELL when price closes above the upper band (overbought).
    """

    def __init__(self, period: int = 20, std_dev: float = 2.0):
        self.period = period
        self.std_dev = std_dev

    @property
    def name(self) -> str:
        return f"Bollinger Bands ({self.period}, {self.std_dev}σ)"

    def _compute_bands(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        df["bb_mid"] = df["close"].rolling(self.period).mean()
        rolling_std = df["close"].rolling(self.period).std()
        df["bb_upper"] = df["bb_mid"] + self.std_dev * rolling_std
        df["bb_lower"] = df["bb_mid"] - self.std_dev * rolling_std
        df["bb_width"] = (df["bb_upper"] - df["bb_lower"]) / df["bb_mid"]
        return df

    def generate_signals(self, df: pd.DataFrame) -> list[Signal]:
        df = self._compute_bands(df)

        signals = []
        in_trade = False

        for ts, row in df.iterrows():
            if pd.isna(row["bb_lower"]):
                continue

            if not in_trade and row["close"] < row["bb_lower"]:
                signals.append(Signal(
                    timestamp=str(ts.date()),
                    type="BUY",
                    price=round(row["close"], 4),
                    reason=f"Price closed below lower band ({round(row['bb_lower'], 2)})",
                ))
                in_trade = True

            elif in_trade and row["close"] > row["bb_upper"]:
                signals.append(Signal(
                    timestamp=str(ts.date()),
                    type="SELL",
                    price=round(row["close"], 4),
                    reason=f"Price closed above upper band ({round(row['bb_upper'], 2)})",
                ))
                in_trade = False

        return signals

    def get_indicator_data(self, df: pd.DataFrame) -> dict:
        df = self._compute_bands(df)
        return {
            "BB_Upper": df["bb_upper"].dropna().round(4).to_dict(),
            "BB_Mid": df["bb_mid"].dropna().round(4).to_dict(),
            "BB_Lower": df["bb_lower"].dropna().round(4).to_dict(),
        }
        