from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal, Optional
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from data import get_ohlcv, get_supported_symbols
from engine import run_backtest
from strategies.ma_crossover import MovingAverageCrossover
from strategies.macd import MACDStrategy
from strategies.bollinger import BollingerBandsStrategy

app = FastAPI(
    title="Crypto Backtester API",
    description="Backtest simple crypto trading strategies against historical data",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict to your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ──────────────────────────────────────────────────

class MAParams(BaseModel):
    fast_period: int = Field(default=20, ge=2, le=100, description="Fast SMA period")
    slow_period: int = Field(default=50, ge=5, le=200, description="Slow SMA period")

class MACDParams(BaseModel):
    fast: int = Field(default=12, ge=2, le=50)
    slow: int = Field(default=26, ge=5, le=100)
    signal: int = Field(default=9, ge=2, le=30)

class BBParams(BaseModel):
    period: int = Field(default=20, ge=5, le=100)
    std_dev: float = Field(default=2.0, ge=0.5, le=4.0)

class BacktestRequest(BaseModel):
    symbol: str = Field(default="BTC", description="Crypto symbol e.g. BTC, ETH")
    days: int = Field(default=365, ge=30, le=365, description="Lookback period in days")
    initial_capital: float = Field(default=10000.0, ge=100)
    strategy: Literal["ma_crossover", "macd", "bollinger"]
    ma_params: Optional[MAParams] = MAParams()
    macd_params: Optional[MACDParams] = MACDParams()
    bb_params: Optional[BBParams] = BBParams()


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "message": "Crypto Backtester API is running"}


@app.get("/symbols")
def list_symbols():
    """Return all supported crypto symbols."""
    return {"symbols": get_supported_symbols()}


@app.get("/price/{symbol}")
def get_price_data(symbol: str, days: int = Query(default=365, ge=30, le=365)):
    """Fetch raw OHLCV data for a symbol."""
    try:
        df = get_ohlcv(symbol.upper(), days=days)
        records = df.reset_index().rename(columns={"timestamp": "date"})
        records["date"] = records["date"].astype(str)
        return {
            "symbol": symbol.upper(),
            "days": days,
            "data": records.to_dict(orient="records"),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch price data: {str(e)}")


@app.post("/backtest")
def backtest(req: BacktestRequest):
    """Run a backtest for a given strategy and return results + equity curve."""
    try:
        df = get_ohlcv(req.symbol.upper(), days=req.days)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch price data: {str(e)}")

    # Instantiate the chosen strategy
    if req.strategy == "ma_crossover":
        p = req.ma_params or MAParams()
        if p.fast_period >= p.slow_period:
            raise HTTPException(status_code=400, detail="fast_period must be less than slow_period")
        strategy = MovingAverageCrossover(fast_period=p.fast_period, slow_period=p.slow_period)

    elif req.strategy == "macd":
        p = req.macd_params or MACDParams()
        strategy = MACDStrategy(fast=p.fast, slow=p.slow, signal=p.signal)

    elif req.strategy == "bollinger":
        p = req.bb_params or BBParams()
        strategy = BollingerBandsStrategy(period=p.period, std_dev=p.std_dev)

    else:
        raise HTTPException(status_code=400, detail="Unknown strategy")

    signals = strategy.generate_signals(df)
    result = run_backtest(
        df=df,
        signals=signals,
        symbol=req.symbol.upper(),
        strategy_name=strategy.name,
        initial_capital=req.initial_capital,
    )

    # Serialize trades
    trades_out = []
    for t in result.trades:
        trades_out.append({
            "entry_date": t.entry_date,
            "exit_date": t.exit_date,
            "entry_price": t.entry_price,
            "exit_price": t.exit_price,
            "pnl_pct": t.pnl_pct,
            "pnl_usd": t.pnl_usd,
            "status": t.status,
        })

    # Get indicator overlay data
    indicator_data = strategy.get_indicator_data(df)
    indicators_serialized = {}
    for key, val in indicator_data.items():
        indicators_serialized[key] = {str(k.date()): v for k, v in val.items()}

    # Price data for chart
    price_data = df.reset_index()[["timestamp", "close", "volume"]].copy()
    price_data["timestamp"] = price_data["timestamp"].astype(str)

    return {
        "summary": {
            "symbol": result.symbol,
            "strategy": result.strategy_name,
            "start_date": result.start_date,
            "end_date": result.end_date,
            "initial_capital": result.initial_capital,
            "final_capital": result.final_capital,
            "total_return_pct": result.total_return_pct,
            "buy_hold_return_pct": result.buy_hold_return_pct,
            "num_trades": result.num_trades,
            "win_rate": result.win_rate,
            "max_drawdown_pct": result.max_drawdown_pct,
            "sharpe_ratio": result.sharpe_ratio,
        },
        "equity_curve": result.equity_curve,
        "trades": trades_out,
        "signals": result.signals,
        "price_data": price_data.to_dict(orient="records"),
        "indicators": indicators_serialized,
    }


@app.get("/strategies")
def list_strategies():
    """List available strategies and their configurable parameters."""
    return {
        "strategies": [
            {
                "id": "ma_crossover",
                "name": "Moving Average Crossover",
                "description": "BUY on golden cross (fast SMA > slow SMA), SELL on death cross",
                "params": [
                    {"name": "fast_period", "type": "int", "default": 20, "min": 2, "max": 100},
                    {"name": "slow_period", "type": "int", "default": 50, "min": 5, "max": 200},
                ],
            },
            {
                "id": "macd",
                "name": "MACD Signal Cross",
                "description": "BUY when MACD crosses above signal line, SELL when it crosses below",
                "params": [
                    {"name": "fast", "type": "int", "default": 12, "min": 2, "max": 50},
                    {"name": "slow", "type": "int", "default": 26, "min": 5, "max": 100},
                    {"name": "signal", "type": "int", "default": 9, "min": 2, "max": 30},
                ],
            },
            {
                "id": "bollinger",
                "name": "Bollinger Bands",
                "description": "BUY when price closes below lower band, SELL when above upper band",
                "params": [
                    {"name": "period", "type": "int", "default": 20, "min": 5, "max": 100},
                    {"name": "std_dev", "type": "float", "default": 2.0, "min": 0.5, "max": 4.0},
                ],
            },
        ]
    }