import pandas as pd
import numpy as np
from dataclasses import dataclass
from strategies.base import Signal


@dataclass
class Trade:
    entry_date: str
    exit_date: str | None
    entry_price: float
    exit_price: float | None
    pnl_pct: float | None
    pnl_usd: float | None
    status: str  # "closed" or "open"


@dataclass
class BacktestResult:
    symbol: str
    strategy_name: str
    start_date: str
    end_date: str
    initial_capital: float
    final_capital: float
    total_return_pct: float
    buy_hold_return_pct: float
    num_trades: int
    win_rate: float
    max_drawdown_pct: float
    sharpe_ratio: float
    trades: list[Trade]
    equity_curve: list[dict]  # [{date, equity}]
    signals: list[dict]


def run_backtest(
    df: pd.DataFrame,
    signals: list[Signal],
    symbol: str,
    strategy_name: str,
    initial_capital: float = 10000.0,
) -> BacktestResult:
    """
    Simulates trading based on signals. 
    - Fully invests on BUY, fully exits on SELL.
    - No leverage, no fees (can add later).
    """
    capital = initial_capital
    position = 0.0  # units of crypto held
    trades: list[Trade] = []
    equity_curve = []

    # Build a price lookup by date string
    price_by_date = {str(ts.date()): row["close"] for ts, row in df.iterrows()}
    all_dates = sorted(price_by_date.keys())

    # Track open trade
    open_trade: dict | None = None
    signal_by_date = {s.timestamp: s for s in signals}

    for date in all_dates:
        price = price_by_date[date]

        if date in signal_by_date:
            sig = signal_by_date[date]

            if sig.type == "BUY" and position == 0 and capital > 0:
                position = capital / price
                capital = 0.0
                open_trade = {"entry_date": date, "entry_price": price}

            elif sig.type == "SELL" and position > 0:
                exit_value = position * price
                pnl_usd = exit_value - open_trade["entry_price"] * (exit_value / price)
                pnl_pct = (price / open_trade["entry_price"] - 1) * 100

                trades.append(Trade(
                    entry_date=open_trade["entry_date"],
                    exit_date=date,
                    entry_price=open_trade["entry_price"],
                    exit_price=price,
                    pnl_pct=round(pnl_pct, 2),
                    pnl_usd=round(exit_value - (position * open_trade["entry_price"]), 2),
                    status="closed",
                ))

                capital = exit_value
                position = 0.0
                open_trade = None

        # Mark-to-market equity
        current_equity = capital + (position * price if position > 0 else 0)
        equity_curve.append({"date": date, "equity": round(current_equity, 2)})

    # Handle open position at end
    if position > 0 and open_trade:
        last_price = price_by_date[all_dates[-1]]
        trades.append(Trade(
            entry_date=open_trade["entry_date"],
            exit_date=None,
            entry_price=open_trade["entry_price"],
            exit_price=last_price,
            pnl_pct=round((last_price / open_trade["entry_price"] - 1) * 100, 2),
            pnl_usd=round(position * (last_price - open_trade["entry_price"]), 2),
            status="open",
        ))

    final_capital = equity_curve[-1]["equity"] if equity_curve else initial_capital

    # Metrics
    closed_trades = [t for t in trades if t.status == "closed"]
    wins = [t for t in closed_trades if t.pnl_pct and t.pnl_pct > 0]
    win_rate = (len(wins) / len(closed_trades) * 100) if closed_trades else 0.0

    # Max drawdown
    equities = [e["equity"] for e in equity_curve]
    max_drawdown = _compute_max_drawdown(equities)

    # Sharpe ratio (annualized, daily returns, risk-free = 0)
    sharpe = _compute_sharpe(equities)

    # Buy & hold return
    first_price = price_by_date[all_dates[0]]
    last_price = price_by_date[all_dates[-1]]
    buy_hold_return = (last_price / first_price - 1) * 100

    total_return = (final_capital / initial_capital - 1) * 100

    return BacktestResult(
        symbol=symbol,
        strategy_name=strategy_name,
        start_date=all_dates[0],
        end_date=all_dates[-1],
        initial_capital=initial_capital,
        final_capital=round(final_capital, 2),
        total_return_pct=round(total_return, 2),
        buy_hold_return_pct=round(buy_hold_return, 2),
        num_trades=len(trades),
        win_rate=round(win_rate, 2),
        max_drawdown_pct=round(max_drawdown, 2),
        sharpe_ratio=round(sharpe, 3),
        trades=trades,
        equity_curve=equity_curve,
        signals=[{"timestamp": s.timestamp, "type": s.type, "price": s.price, "reason": s.reason} for s in signals],
    )


def _compute_max_drawdown(equities: list[float]) -> float:
    if not equities:
        return 0.0
    peak = equities[0]
    max_dd = 0.0
    for e in equities:
        if e > peak:
            peak = e
        dd = (peak - e) / peak * 100
        if dd > max_dd:
            max_dd = dd
    return max_dd


def _compute_sharpe(equities: list[float], risk_free: float = 0.0) -> float:
    if len(equities) < 2:
        return 0.0
    returns = np.diff(equities) / equities[:-1]
    excess = returns - risk_free / 252
    if np.std(excess) == 0:
        return 0.0
    return float(np.mean(excess) / np.std(excess) * np.sqrt(252))