import express from "express";
import bodyParser from "body-parser";

export const app = express();

app.use(bodyParser.json({}));

interface Balances {
  [key: string]: number;
}

interface User {
  Id: string;
  balance: Balances;
}

interface Order {
  userId: string;
  price: number;
  quantity: number;
}

export const TICKER = "GOOGLE";

const users: User[] = [
  {
    Id: "1",
    balance: {
      GOOGLE: 10,
      USD: 5000,
    },
  },
  {
    Id: "2",
    balance: {
      GOOGLE: 10,
      USD: 50000,
    },
  },
];

const bids: Order[] = [];
const asks: Order[] = [];

// Place order
app.post("/order", (req: any, res: any) => {
  const side: string = req.body.side;
  const price: number = req.body.price;
  const quantity: number = req.body.quantity;
  const userId: string = req.body.userId;

  const remainingQty: number = fillOrders(side, price, quantity, userId);

  if (remainingQty === 0) {
    res.json({ filledQuantity: quantity });
    return;
  }
  if (side === "bid") {
    bids.push({
      userId,
      price,
      quantity: remainingQty,
    });
    bids.sort((a, b) => (a.price < b.price ? 1 : -1));
  } else {
    asks.push({
      userId,
      price,
      quantity: remainingQty,
    });
    asks.sort((a, b) => (a.price > b.price ? 1 : -1));
  }
  res.json({
    filledQuantity: quantity - remainingQty,
  });
});

app.get("/depth", (req: any, res: any) => {
  const depth: {
    [price: string]: {
      type: "bid" | "ask";
      quantity: number;
    };
  } = {};

  for (let i = 0; i < bids.length; i++) {
    if (!depth[bids[i].price]) {
      depth[bids[i].price] = {
        quantity: bids[i].quantity,
        type: "bid",
      };
    } else {
      depth[bids[i].price].quantity += bids[i].quantity;
    }
  }

  for (let i = 0; i < asks.length; i++) {
    if (!depth[asks[i].price]) {
      depth[asks[i].price] = {
        quantity: asks[i].quantity,
        type: "ask",
      };
    } else {
      depth[asks[i].price].quantity += asks[i].quantity;
    }
  }

  res.json({
    depth,
  });
});

app.get("/balance/:userId", (req, res) => {
  const userId = req.params.userId;
  const user = users.find((x) => x.Id === userId);
  if (!user) {
    return res.json({
      USD: 0,
      [TICKER]: 0,
    });
  }
  res.json({ balance: user.balance });
});

app.get("/quote", (req, res) => {
  const levelsRaw = req.query.levels as string | undefined;
  const levels = levelsRaw ? Math.max(1, Number(levelsRaw)) : undefined;

  const bestBid = bids.length ? Math.max(...bids.map((o) => o.price)) : undefined;
  const bestAsk = asks.length ? Math.min(...asks.map((o) => o.price)) : undefined;

  if (bestBid === undefined && bestAsk === undefined) {
    return res.status(404).json({ error: "No liquidity for quote" });
  }

  if (levels && levels > 0) {
    const topBids = [...bids].sort((a, b) => b.price - a.price).slice(0, levels);
    const topAsks = [...asks].sort((a, b) => a.price - b.price).slice(0, levels);

    const vwap = (orders: typeof bids) => {
      const totalNotional = orders.reduce((s, o) => s + o.price * o.quantity, 0);
      const totalQty = orders.reduce((s, o) => s + o.quantity, 0);
      return totalQty ? totalNotional / totalQty : undefined;
    };

    const bidVwap = topBids.length ? vwap(topBids) : undefined;
    const askVwap = topAsks.length ? vwap(topAsks) : undefined;

    let mid: number | undefined;
    if (bidVwap !== undefined && askVwap !== undefined) {
      mid = (bidVwap + askVwap) / 2;
    } else {
      mid = bidVwap ?? askVwap;
    }

    return res.json({
      ticker: TICKER,
      levels,
      bestBid,
      bestAsk,
      bidVwap,
      askVwap,
      midPrice: mid,
    });
  }

  let midPrice: number | undefined;
  if (bestBid !== undefined && bestAsk !== undefined) {
    midPrice = (bestBid + bestAsk) / 2;
  } else {
    midPrice = bestBid ?? bestAsk;
  }

  return res.json({
    ticker: TICKER,
    bestBid,
    bestAsk,
    midPrice,
  });
});

function flipBalance(userId1: string, userId2: string, quantity: number, price: number) {
  let user1 = users.find((x) => x.Id === userId1);
  let user2 = users.find((x) => x.Id === userId2);
  if (!user1 || !user2) {
    return;
  }
  user1.balance[TICKER] -= quantity;
  user2.balance[TICKER] += quantity;
  user1.balance["USD"] += quantity * price;
  user2.balance["USD"] -= quantity * price;
}

function fillOrders(side: string, price: number, quantity: number, userId: string): number {
  let remainingQuantity = quantity;
  if (side === "bid") {
    for (let i = asks.length - 1; i >= 0; i--) {
      if (asks[i].price > price) {
        continue;
      }
      if (asks[i].quantity > remainingQuantity) {
        asks[i].quantity -= remainingQuantity;
        flipBalance(asks[i].userId, userId, remainingQuantity, price);
        return 0;
      } else {
        remainingQuantity -= asks[i].quantity;
        flipBalance(asks[i].userId, userId, asks[i].quantity, price);
        asks.pop();
      }
    }
  } else {
    for (let i = bids.length - 1; i >= 0; i--) {
      if (bids[i].price < price) {
        continue;
      }
      if (bids[i].quantity > remainingQuantity) {
        bids[i].quantity -= remainingQuantity;
        flipBalance(userId, bids[i].userId, remainingQuantity, price);
        return 0;
      } else {
        remainingQuantity -= bids[i].quantity;
        flipBalance(userId, bids[i].userId, bids[i].quantity, price);
        bids.pop();
      }
    }
  }
  return remainingQuantity;
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Trading system server running on port ${PORT}`);
});
