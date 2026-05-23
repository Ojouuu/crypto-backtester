from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Literal
import pandas as pd


@dataclass
class Signal:
    timestamp: str
    type: Literal["BUY", "SELL"]
    price: float
    reason: str


class BaseStrategy(ABC):
    """
    All strategies inherit from this. They receive a price DataFrame
    and return a list of Signal objects.
    """

    @abstractmethod
    def generate_signals(self, df: pd.DataFrame) -> list[Signal]:
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        pass
    