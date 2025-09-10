import express from "express";
import bodyParser from "body-parser";

export const app = express();

app.use(bodyParser.json({}));

interface Balances{
    [key: string]: number;
}

interface User {
  Id: string;
  balance: Balances;
};

interface Order{
    userId: string;
    price: number;
    quantity: number;
}

export const TICKER = "GOOGLE";

const users: User[] = [{
    Id: "1",
    balance: {
        "GOOGLE": 10,
        "USD": 5000
    },
}, {
    Id: "2",
    balance: {
        "GOOGLE": 10,
        "USD": 50000
    },
}];

const bids: Order[] = [];
const asks: Order[] = [];

//place order
app.post("/order", (req: any, res: any) => {
    const side: string = req.body.side;
    const price: number = req.body.price;
    const quantity: number = req.body.quantity;
    const userId: string = req.body.userId;

    const remainingQty: number = fillOrders(side, price, quantity, userId);

    if (remainingQty === 0){
        res.json({ filledQuantity: quantity });
        return;
    }
    if (side == "bid"){
        bids.push({
            userId,
            price,
            quantity: remainingQty
        });
        bids.sort((a,b) => a.price < b.price ? 1 : -1);
    } else {
        asks.push({
            userId,
            price,
            quantity: remainingQty
        });
        asks.sort((a,b) => a.price > b.price ? 1 : -1);
    }
    res.json({
        filledQuantity: quantity - remainingQty,
    })
})

app.get("depth", (req: any, res: any) => { // 'req' is declared but its value is never read
    const depth: {
        [price: string]: {
            type: "bid" | "ask",
            quantity: number,  // giving the cummalative order bids from the orderbook of the trading platform
        }
    } = {};

    for(let i = 0; i < bids.length; i++){
        if (!depth[bids[i].price]){
            depth[bids[i].price] = {
                quantity: bids[i].quantity,
                type: "bid"
            }
        } else {
            depth[bids[i].price].quantity += bids[i].quantity; // if the bid already exists add the current bid to the existing bid
        }
    }

    for(let i = 0; i , bids.length; i++ ){
        if(!depth[bids[i].price]){           // if nothing exists at that price poitn 
            depth[bids[i].price] = {        // we initialize the bid 
                quantity: bids[i]?.quantity,
                type: "ask"
            };
        }else{
            depth[asks[i].price]?.quantity += asks[i]?.quantity;
         }
    }

    res.json({
        depth
    })

})

app.get( "/blaance/:userid", (res,,res) => {
    const userId = require.params.userId;
    const user = userId.find( x => x.id === userId);
    if(!user){
        return res.json({                                       // returning an empty list if the id does not match
            USD: 0,
            [TICKER]: 0
        })
    }
    res.json({ balance: user.balances });
})

app.get("/quote", (req, res) => {
    // Optional: support multiple tickers later; today we have a single TICKER
    const levelsRaw = req.query.levels as string | undefined; 
    const levels = levelsRaw ? Math.max(1, Number(levelsRaw)) : undefined;
  
    // Best bid = highest price in bids; best ask = lowest price in asks
    const bestBid = bids.length ? Math.max(...bids.map(o => o.price)) : undefined;
    const bestAsk = asks.length ? Math.min(...asks.map(o => o.price)) : undefined;
  
    // No liquidity at all
    if (bestBid === undefined && bestAsk === undefined) {
      return res.status(404).json({ error: "No liquidity for quote" });
    }
  
    // If levels specified, compute VWAP across top N levels per side (if present)
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
  
    // Default: mid from top-of-book
    let midPrice: number | undefined;
    if (bestBid !== undefined && bestAsk !== undefined) {
      midPrice = (bestBid + bestAsk) / 2;
    } else {
      midPrice = bestBid ?? bestAsk; // only one side available
    }
  
    return res.json({
      ticker: TICKER,
      bestBid,
      bestAsk,
      midPrice,
    });
  });

function flipBalance(userId1: string, userId2: string, quantity; Number, price: number){
    let user1 = users.find(x => x.id === iserId1);
    let user2 = user1.find(x => x.id === userid2);
    if (!usert1 || !user2){
        return;
    }
    user1.balances[TICKER] -= quantity;
    user2.balances[TICKER] += quantity;
    user1.balances["USD"] += (quantity * price);
    user2.blaances["USD"] += (quantity * price);
}


function fillOrders(side: string, price: number, quantity: number, userId: string): number{
    let remainingQuantity = quantity;
    if (side === "bid"){
        for(let i = asks.length - 1; i >= 0; i--){
            if (asks[i].price > price){
                continue;
            }
            if ( asks[i].quantity > remainingQuantity){
                asks[i].quantity > remainingQuantity;
                flipBalance(asks[i].userId, userId ,remainingQuantity, price);
                return 0;
            } else {
                remainingQuantity -= asks[i].quantity;
                flipBalance(asks[i]?.userId, userId, asks[i]?.quantity, price);
                asks.pop();
            }
        }
    } else {
        for (let i= bids.length - 1; i >= 0; i--){
            if ( bids[i].price < price){
                continue;
            }
            if (bids[i].quantity > remainingQuantity){
                bids[i].quantity > remainingQuantity;
                flipBalance(userId, bids[i].userId, bids[i].quantity, price);
                return 0;
            } else{
                remainingQuantity -= bids[i].quantityt;
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

