# OKX API Documentation

## Endpoints

1. Wallet profile 1 (GET)
- Example: `https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/summary?periodType=3&chainId=501&walletAddress=Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN&t=1763027114250`
- Response:

```json
{
  "code": 0,
  "data": {
    "avgCostBuy": "596.6290897935", // Average buy value
    "datePnlList": [ // PnL per day
      {
        "profit": "777.761406492774185412702342735", // USD
        "timestamp": 1762444800000
      },
      {
        "profit": "11498.024498439337545599959280766",
        "timestamp": 1762531200000
      },
      {
        "profit": "5766.492312482834759521142069",
        "timestamp": 1762617600000
      },
      {
        "profit": "1860.13889133366461157652837872125",
        "timestamp": 1762704000000
      },
      {
        "profit": "1402.368342245542409851015228333",
        "timestamp": 1762790400000
      },
      {
        "profit": "1808.10667691066175634884559088",
        "timestamp": 1762876800000
      },
      {
        "profit": "7956.708400224230202919394567271",
        "timestamp": 1762963200000
      }
    ],
    "favoriteMcapType": "1", // 1 = <$100k, 2 = $100k-$1M, 3 = $1M-$10M, 4 = $10M-$100M, 5 = >$100M
    "mcapTxsBuyList": [451, 147, 22, 1, 3], // number of buy txs per market cap bucket (1 to 5)
    "nativeTokenBalanceAmount": "463.030921865", // amount of native token (e.g. SOL if we fetch chainID = 501 in API url)
    "nativeTokenBalanceUsd": "71872.810208854502329168607289615", // USD value of native token balance
    "newWinRateDistribution": [2, 154, 111, 12], // 1 = >500%, 2 = 0-500%, 3 = -50%-0%, 4 = <-50%
    "topTokens": [ // top traded tokens by PnL
      {
        "innerGotoUrl": "/token/solana/3wppuwUMAGgxnX75Aqr4W91xYWaN6RjxjCUFiPZUpump", // OKX link
        "pnl": "12291.943113024516", // User PnL for token in USD
        "roi": "90.02073917264062", // ROI percent (e.g. 90.02%)
        "tokenAddress": "3wppuwUMAGgxnX75Aqr4W91xYWaN6RjxjCUFiPZUpump",
        "tokenLogo": "https://static.oklink.com/cdn/web3/currency/token/large/501-3wppuwUMAGgxnX75Aqr4W91xYWaN6RjxjCUFiPZUpump-109/type=default_90_0?v=1762572421015",
        "tokenName": "X Bangers",
        "tokenSymbol": "BANGERS"
      },
      {
        "innerGotoUrl": "/token/solana/EKdXpxxLkg9dSBJaYweWNigUBcYHAkGXdUPFhZ9rpump",
        "pnl": "4562.694087976093",
        "roi": "359.2316873971674",
        "tokenAddress": "EKdXpxxLkg9dSBJaYweWNigUBcYHAkGXdUPFhZ9rpump",
        "tokenLogo": "https://static.oklink.com/cdn/web3/currency/token/large/501-EKdXpxxLkg9dSBJaYweWNigUBcYHAkGXdUPFhZ9rpump-109/type=default_90_0?v=1762972305564",
        "tokenName": "The PALs",
        "tokenSymbol": "PALs"
      },
      {
        "innerGotoUrl": "/token/solana/65aP2yHMZ6RxZpXn3iHhfBRnzCpwbZeVDTXAoi1gpump",
        "pnl": "3956.185843947413",
        "roi": "172.4891670621623",
        "tokenAddress": "65aP2yHMZ6RxZpXn3iHhfBRnzCpwbZeVDTXAoi1gpump",
        "tokenLogo": "https://static.oklink.com/cdn/web3/currency/token/large/501-65aP2yHMZ6RxZpXn3iHhfBRnzCpwbZeVDTXAoi1gpump-109/type=default_90_0?v=1762433415926",
        "tokenName": "PEPE",
        "tokenSymbol": "PEPE"
      }
    ],
    "topTokensTotalPnl": "20810.823044948022", // Total PnL from top tokens (sum of above)
    "topTokensTotalRoi": "120.86", // ROI percent of total PnL of top tokens (e.g. 120.86%)
    "totalPnl": "31282.705745762112", // Overall PnL (not just top tokens) in USD
    "totalPnlRoi": "8.63", // Overall ROI percent (e.g. 8.63%)
    "totalProfitPnl": "1837592.014197809043", // Total profit PnL in USD
    "totalProfitPnlRoi": "14.36", // Total profit PnL ROI percent
    "totalTxsBuy": 624, // number of buy transactions
    "totalTxsSell": 499, // number of sell transactions
    "totalVolumeBuy": "372296.5520311535", // Total buy volume
    "totalVolumeSell": "393681.4893642252", // Total sell volume
    "totalWinRate": "54.74", // Overall win rate percentage (e.g. 54.74%)
    "unrealizedPnl": "4256.229420346543", // Unrealized PnL in USD
    "unrealizedPnlRoi": "34.338036395332516", // Unrealized PnL ROI percent (e.g. 34.34%)
    "winRateList": [ // win rate distribution buckets (1 to 6) - exact bucket metric is TBA!
      "0.70", // 1 = 100%
      "1.75", // 2 = 75-100%
      "12.28", // 3 = 50-75%
      "40.00", // 4 = 25-50%
      "38.95", // 5 = 0-25% 
      "4.21" // 6 = 0%
    ]
  },
  "detailMsg": "",
  "error_code": "0",
  "error_message": "",
  "msg": ""
}
```

2. Wallet profile 2 (GET)
- Example: `https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/query/address/info?chainId=501&walletAddress=Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN&t=1763026553471`
- Response:

```json
{
  "code": 0,
  "data": {
    "t": [
      {
        "e": {
          "kolTwitterLink": "https://x.com/nftkeano",
          "kolTwitterImageFullPath": "https://static.okx.com/cdn/trade/content/2025-03-30/image/d313b877-be85-4fd0-a281-f3a8062bc9a7.jpg",
          "name": "Keano",
          "kolTwitterImage": "/cdn/trade/content/2025-03-30/image/d313b877-be85-4fd0-a281-f3a8062bc9a7.jpg"
        },
        "k": "kol",
        "m": 1
      }
    ],
    "walletAddress": "Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN"
  },
  "detailMsg": "",
  "error_code": "0",
  "error_message": "",
  "msg": ""
}
```

3. Wallet Chains (GET)
- Example: `https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/all-chains?walletAddress=Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN&t=1763026553486`
- Response:

```json
{
  "code": 0,
  "data": [ // can be more than just 1 chain
    {
      "chainBWLogoUrl": "https://static.coinall.ltd/cdn/assets/imgs/227/2C597ACB210BFE51.png",
      "chainId": 501,
      "chainLogo": "https://static.coinall.ltd/cdn/wallet/logo/SOL-20220525.png",
      "chainName": "Solana",
      "isSupportBlinksShareUrl": "1",
      "nativeTokenAddress": "11111111111111111111111111111111",
      "nativeTokenLogo": "https://static.oklink.com/cdn/web3/currency/token/501-11111111111111111111111111111111-1.png/type=default_350_0?v=1734571825920",
      "nativeTokenSymbol": "SOL",
      "popularChain": true,
      "popularWeight": "600",
      "sort": 7000
    }
  ],
  "detailMsg": "",
  "error_code": "0",
  "error_message": "",
  "msg": ""
}
```

4. Wallet PnL Token List  (GET)
- Example: `https://web3.okx.com/priapi/v1/dx/market/v2/pnl/token-list?walletAddress=Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN&chainId=501&isAsc=false&sortType=1&filterEmptyBalance=false&offset=0&limit=10&t=1763029024202`
- Response:

```json
{
  "code": 0,
  "data": { // paginated token list
    "hasNext": true, // more pages available (can adjust with `limit` param)
    "offset": 10, // pagination offset (can adjust with `offset` param) - set 20 for next page
    "tokenList": [ // array of tokens
      { // example for a profitable token in portfolio
        "balance": "0", // token balance (can be filtered if `filterEmptyBalance=true`)
        "balanceUsd": "0", // USD value of token balance
        "buyAvgPrice": "0.000018672386814617", // average buy price
        "buyVolume": "376.76222199959", // total buy volume
        "chainId": 501, // chain ID - Solana
        "chainLogo": "https://static.coinall.ltd/cdn/wallet/logo/SOL-20220525.png", // chain logo URL
        "holdAvgPrice": "0", // average hold price - if not holding any, it's 0
        "holdingTime": 0, // holding time in ms
        "holdingTimeTag": "",
        "innerGotoUrl": "/token/solana/CigfjXrHVutRYgFoi57N4EEubAuaykTYjNKycBXNXHnA", // OKX token link
        "isBuyVolumeAboveThreshold": false, // buy volume threshold flag
        "latestTime": 1763010322000, // latest transaction timestamp
        "nativeTokenPrice": "155.694984342063171616", // native token (if chainID is 501 - SOL) price in USD
        "realizedPnl": "91.14887664357436920934704", // realized PnL in USD for Token
        "realizedPnlPercentage": "24.19", // realized PnL percentage (e.g. 24.19%)
        "riskControlLevel": 1, // risk control level (1-5)
        "riskLevel": 2, // risk level (1-5)
        "rowId": 3854108847, // internal row ID
        "sellAvgPrice": "0.000023189737501673", // average sell price
        "sellVolume": "467.91109864317", // total sell volume
        "tokenContractAddress": "CigfjXrHVutRYgFoi57N4EEubAuaykTYjNKycBXNXHnA",
        "tokenLogoUrl": "https://static.oklink.com/cdn/web3/currency/token/large/501-CigfjXrHVutRYgFoi57N4EEubAuaykTYjNKycBXNXHnA-109/type=default_90_0?v=1762941780921",
        "tokenSymbol": "AIdol",
        "totalPnl": "91.14887664357436920934704", // total PnL in USD for Token
        "totalPnlPercentage": "24.19", // total PnL percentage (e.g. 24.19%)
        "totalTxBuy": 1, // total buy transactions for Token
        "totalTxSell": 1, // total sell transactions for Token
        "unrealizedPnl": "0", // unrealized PnL in USD for Token - 0 means sold all
        "unrealizedPnlPercentage": "0", // unrealized PnL percentage (e.g. 0%)
        "walletAddress": "Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN" // wallet address
      },
      { // example for a rugged token in portfolio
        "balance": "24.286062513", // token balance
        "balanceUsd": "0.000002511163266533414088471", // USD value of token balance
        "buyAvgPrice": "318.734253272075483931",
        "buyVolume": "7740.8",
        "chainId": 501,
        "chainLogo": "https://static.coinall.ltd/cdn/wallet/logo/SOL-20220525.png",
        "holdAvgPrice": "318.734253272075483931",
        "holdingTime": 0,
        "holdingTimeTag": "",
        "innerGotoUrl": "/token/solana/songV6qKc3DEo2yWPAGqBW7sVbd4oKkMSMRV6tXDYgL",
        "isBuyVolumeAboveThreshold": false,
        "latestTime": 1761362096000,
        "nativeTokenPrice": "155.820626210153061293",
        "realizedPnl": "0",
        "realizedPnlPercentage": "0",
        "riskControlLevel": 3, // High risk
        "riskLevel": 3, // High risk
        "rowId": 3406707190,
        "sellAvgPrice": "0",
        "sellVolume": "0",
        "tokenContractAddress": "songV6qKc3DEo2yWPAGqBW7sVbd4oKkMSMRV6tXDYgL",
        "tokenLogoUrl": "https://static.oklink.com/cdn/web3/currency/token/large/501-songV6qKc3DEo2yWPAGqBW7sVbd4oKkMSMRV6tXDYgL-108/type=default_90_0?v=1761360191518",
        "tokenSymbol": "SONG",
        "totalPnl": "-7740.799997488836733469578890132",
        "totalPnlPercentage": "-100.00", // lost all = rugged!
        "totalTxBuy": 1, // bought once
        "totalTxSell": 0, // did not sell
        "unrealizedPnl": "-7740.799997488836733469578890132", // still holding, so unrealized loss
        "unrealizedPnlPercentage": "-100.00", // can't sell so full loss
        "walletAddress": "Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN"
      },
      { // example for a profitable but risky token in portfolio
        "balance": "13146477.911061",
        "balanceUsd": "494.168383721620209072764898",
        "buyAvgPrice": "0.000034401362331389",
        "buyVolume": "452.25675",
        "chainId": 501,
        "chainLogo": "https://static.coinall.ltd/cdn/wallet/logo/SOL-20220525.png",
        "holdAvgPrice": "0.000034401362331388",
        "holdingTime": 0,
        "holdingTimeTag": "",
        "innerGotoUrl": "/token/solana/BGigGhH9DefNBNfroczkjQB7SwSfYgddoHdoFwVkpump",
        "isBuyVolumeAboveThreshold": false,
        "latestTime": 1761154848000,
        "nativeTokenPrice": "155.869162996178560697",
        "realizedPnl": "0",
        "realizedPnlPercentage": "0",
        "riskControlLevel": 4, // Very High risk
        "riskLevel": 4, // Very High risk
        "rowId": 3346265790,
        "sellAvgPrice": "0",
        "sellVolume": "0",
        "tokenContractAddress": "BGigGhH9DefNBNfroczkjQB7SwSfYgddoHdoFwVkpump",
        "tokenLogoUrl": "https://static.oklink.com/cdn/web3/currency/token/large/501-BGigGhH9DefNBNfroczkjQB7SwSfYgddoHdoFwVkpump-108/type=default_90_0?v=1761154841281",
        "tokenSymbol": "RIZZMAS",
        "totalPnl": "41.91163372162192200008223",
        "totalPnlPercentage": "9.27",
        "totalTxBuy": 1,
        "totalTxSell": 0, // not sold yet
        "unrealizedPnl": "41.91163372162192200008223", // still holding
        "unrealizedPnlPercentage": "9.27",
        "walletAddress": "Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN"
      }
    ]
  },
  "detailMsg": "",
  "error_code": "0",
  "error_message": "",
  "msg": ""
}
```

5. Wallet PnL Token (targeted) (GET)
- Example: `https://web3.okx.com/priapi/v1/dx/market/v2/trading-history/statistics?chainId=501&tokenAddress=7tWAwLXjcTfDXqedWzQxNc274huxq38xB16MNFQ5bonk&walletAddress=Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN&t=1763030788362`
- Result:

```json
{
  "code": 0,
  "data": { // detailed trading stats for specific wallet of a token
    "boughtAvgPrice": "0.00005899704574865", // average buy price
    "boughtVolume": "2316.0948679564", // total buy volume
    "buyAmount": "39257810.938939000000000000", // total buy amount (token)
    "buyCount": "4", // number of buy transactions
    "buyValue": "2316.094867956401993129", // total buy value in USD price
    "chainId": 501, // chain ID
    "holdAmount": "0", // current hold amount (token)
    "holdAmountPercentage": "0.000000000000000000", // hold amount percentage
    "holdAvgPrice": "0", // average hold price (0 is not holding)
    "holdVolume": "0.000000000000000000", // hold volume
    "holderRank": 0, // holder rank (0 is none)
    "holdingTime": "1760823697", // holding time in seconds
    "isPnlSupported": true, // is PnL supported
    "lastTradeTime": "1760825984000", // last trade timestamp
    "maxHoldAmount": "11705212.748442", // max hold amount (token)
    "realizedProfit": "7389.749704360700366194367032", // realized profit in USD
    "sellAmount": "39257810.938939000000000000", // total sell amount (token) - sold all if matches buyAmount - if not, and holding is 0 it means transferred out, if sold more than bought it means there was a transfer in! Important context!
    "sellCount": "20", // number of sell transactions
    "sellValue": "9705.844572317097243701", // total sell value in USD price
    "soldAvgPrice": "0.000247233463613481", // average sell price (token price)
    "spotBalance": "0", // Spot balance
    "tokenAddress": "7tWAwLXjcTfDXqedWzQxNc274huxq38xB16MNFQ5bonk", // token contract
    "totalProfit": "7389.749704360700366194367032", // total profit in USD
    "totalProfitPercentage": "319.06", // total profit percentage (e.g. 319.06%)
    "unRealizedProfit": "0.000000000000000000", // unrealized profit in USD
    "unRealizedProfitPercentage": "0", // 0 percent since not holding
    "walletAddress": "Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN" 
  },
  "detailMsg": "",
  "error_code": "0",
  "error_message": "",
  "msg": ""
}
```

6. Wallet Trading History for Token (targeted) (GET)
- Example: `https://web3.okx.com/priapi/v1/dx/market/v2/trading/kline-bs-point?chainId=501&tokenAddress=7tWAwLXjcTfDXqedWzQxNc274huxq38xB16MNFQ5bonk&fromAddress=Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN&after=1763031429258&bar=1m&limit=240&t=1763031429940`
- Response:

```json
{
  "code": 0,
  "data": [ // array of trading history points (can be many - example is 1 buy and 1 sell)
    {
      "bsExtInfo": null, // extra info
      "buyAmount": "0", // buy amount 0 - this is a sell only trade
      "buyCount": "0", 
      "buyPrice": "0",
      "buyValue": "0",
      "fromAddress": "Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN", // who traded
      "fromAddressTag": "my-trade-for-bs", // user tag
      "lastTime": "1760825984000", // last trade time
      "sellAmount": "11705212.74844199977815151214599609375", // sell amount (token)
      "sellCount": "1", // number of sells
      "sellPrice": "0.0001024573434393259946210974487001976740430109202861785888671875", // sell price (token)
      "sellValue": "1199.28500259749898759764619171619415283203125", // sell value in USD
      "time": "1760825940000" // trade time (`time` to `lastTime` is duration of trade?)
    },
    {
      "bsExtInfo": null,
      "buyAmount": "167435.89668400000664405524730682373046875", // buy amount (token)
      "buyCount": "1", // number of buys
      "buyPrice": "0.000110163353830938990350098161119518636041902936995029449462890625", // buy price (token)
      "buyValue": "18.445299930400036458877366385422646999359130859375", // buy value in USD
      "fromAddress": "Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN", // who traded
      "fromAddressTag": "my-trade-for-bs", // user tag
      "lastTime": "1760823964000", // last trade time
      "sellAmount": "0", // sell amount 0 - this is a buy only trade
      "sellCount": "0",
      "sellPrice": "0",
      "sellValue": "0",
      "time": "1760823960000" // trade time (`time` to `lastTime` is duration of trade?)
    },
  ],
  "detailMsg": "",
  "error_code": "0",
  "error_message": "",
  "msg": ""
}
```

- NOTE: Based on the timeframe knowing the trade times (across the trade data in this result) we can map a buy-sell pattern and calculate holding duration, profit, win rate etc. VERY IMPORTANT for trading analytics!

7. Wallet Trading History list (GET)
- Example: `https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/trade-history?walletAddress=Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN&chainId=501&pageSize=10&tradeType=1%2C2&filterRisk=true&t=1763038248660`
- Response:

```json
{
    "code": 0,
    "data": {
        "chainId": 501, // chain ID - e.g. Solana
        "hasNext": true, // more pages available
        "rows": [
            {
                "amount": "20177507.33959", // trade amount (token)
                "blockHeight": 379741312, // block height
                "blockTime": 1763010322000, // block timestamp
                "chainLogo": "https://static.coinall.ltd/cdn/wallet/logo/SOL-20220525.png",
                "globalIndex": "3797413120302030000", // global index for pagination (use `&globalIndex=` param for next page - the last item's globalIndex sets from where the url loads next, e.g. `&globalIndex=3797406810296040000`)
                "innerGotoUrl": "/token/solana/CigfjXrHVutRYgFoi57N4EEubAuaykTYjNKycBXNXHnA",
                "mcap": "23114.027527677289733652348257", // token market cap at time of trade
                "nativeTokenPrice": "156.370597982806871341", // native token (e.g. SOL) price in USD at time of trade
                "openLink": "https://web3.okx.com/explorer/solana/tx/5fxkkDSbPAYU4Nn3Sb2Jg1PQZCPeJZ3vCD4bZgxPMNoHjbFEqQziGCv5RJdpqHdGJ7Hjy7Q1yukZbmqQjYsYa3MR", // OKX explorer link
                "price": "0.000023189737501673", // token price at time of trade
                "riskControlLevel": "1", // risk control level (1-5)
                "singleRealizedProfit": "91.14887664357436920934704", // realized profit in USD for this trade
                "tokenContractAddress": "CigfjXrHVutRYgFoi57N4EEubAuaykTYjNKycBXNXHnA", // token contract address
                "tokenLogo": "https://static.oklink.com/cdn/web3/currency/token/large/501-CigfjXrHVutRYgFoi57N4EEubAuaykTYjNKycBXNXHnA-109/type=default_90_0?v=1762941780921", // token logo URL
                "tokenSymbol": "AIdol", // token symbol
                "turnover": "467.91109864317", // trade turnover in USD
                "txHash":  "5fxkkDSbPAYU4Nn3Sb2Jg1PQZCPeJZ3vCD4bZgxPMNoHjbFEqQziGCv5RJdpqHdGJ7Hjy7Q1yukZbmqQjYsYa3MR", // transaction hash
                "type": 2 // Type 2 = SELL
            },
            { ... }, // other trades
            {
                "amount": "20177507.33959",
                "blockHeight": 379740681,
                "blockTime": 1763010070000,
                "chainLogo": "https://static.coinall.ltd/cdn/wallet/logo/SOL-20220525.png",
                "globalIndex": "3797406810296040000",
                "innerGotoUrl": "/token/solana/CigfjXrHVutRYgFoi57N4EEubAuaykTYjNKycBXNXHnA",
                "mcap": "18611.425110325586291992734353",
                "nativeTokenPrice": "156.370597982806871341",
                "openLink": "https://web3.okx.com/explorer/solana/tx/3kDKs2eLKagLDqXBxLB6qoLtQGoLfQroAXa6EiPHP7q9n93U7znWxPtdJ1BHnSLxLvEaeGhpvzQkAf2vBTFtsSnG",
                "price": "0.000018672386814617",
                "riskControlLevel": "1",
                "singleRealizedProfit": "0",
                "tokenContractAddress": "CigfjXrHVutRYgFoi57N4EEubAuaykTYjNKycBXNXHnA",
                "tokenLogo": "https://static.oklink.com/cdn/web3/currency/token/large/501-CigfjXrHVutRYgFoi57N4EEubAuaykTYjNKycBXNXHnA-109/type=default_90_0?v=1762941780921",
                "tokenSymbol": "AIdol",
                "turnover": "376.76222199959",
                "txHash": "3kDKs2eLKagLDqXBxLB6qoLtQGoLfQroAXa6EiPHP7q9n93U7znWxPtdJ1BHnSLxLvEaeGhpvzQkAf2vBTFtsSnG",
                "type": 1 // Type 1 = BUY
            }
        ],
        "walletAddress": "Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN" // trader wallet
    },
    "detailMsg": "",
    "error_code": "0",
    "error_message": "",
    "msg": ""
}
```

8. Wallet Portfolio (POST)
- Example: `https://web3.okx.com/priapi/v2/wallet/asset/profile/all/explorer?t=1763038772117`
- Header:
```
Request URL: https://web3.okx.com/priapi/v2/wallet/asset/profile/all/explorer?t=1763038772117
Request Method: POST
Status Code: 200 OK
Remote Address: 104.18.43.174:443
Referrer Policy: strict-origin-when-cross-origin
b-locale: en_US
cache-control: no-cache, no-store, max-age=0, must-revalidate
cf-cache-status: DYNAMIC
cf-ray: 99de7267ee6368b5-BUD
content-encoding: gzip
content-security-policy: frame-ancestors 'self'
content-type: application/json;charset=UTF-8
date: Thu, 13 Nov 2025 12:59:32 GMT
expires: 0
pragma: no-cache
server: cloudflare
strict-transport-security: max-age=31536000 ; includeSubDomains
strict-transport-security: max-age=31536000; includeSubDomains
vary: Accept-Encoding
vary: Origin
vary: Access-Control-Request-Method
vary: Access-Control-Request-Headers
x-brokerid: 0
x-content-type-options: nosniff
x-content-type-options: nosniff
x-frame-options: SAMEORIGIN
x-frame-options: DENY
x-xss-protection: 1; mode=block
x-xss-protection: 1; mode=block
:authority: web3.okx.com
:method: POST
:path: /priapi/v2/wallet/asset/profile/all/explorer?t=1763038772117
:scheme: https
accept: application/json
accept-encoding: gzip, deflate, br, zstd
accept-language: en-GB,en-US;q=0.9,en;q=0.8,es;q=0.7
app-type: web
content-length: 194
content-type: application/json
cookie: ok-exp-time=1763026551538; devId=320de54c-3be1-4922-b23c-e3a5e37ee94f; ok_site_info===QfxojI5RXa05WZiwiIMFkQPx0Rfh1SPJiOiUGZvNmIsISVIJiOi42bpdWZyJye; ok_prefer_udColor=0; ok_prefer_udTimeZone=1; fingerprint_id=320de54c-3be1-4922-b23c-e3a5e37ee94f; connectedWallet=0; fp_s=0; OptanonAlertBoxClosed=2025-11-13T09:36:29.838Z; tmx_session_id=6huxv0oh1mp_1763026639332; first_ref=https%3A%2F%2Fwww.google.com%2F; ok_global={%22g_t%22:2%2C%22okg_m%22:%22sm%22}; okg.currentMedia=sm; locale=en_US; OptanonConsent=isGpcEnabled=0&datestamp=Thu+Nov+13+2025+13%3A50%3A46+GMT%2B0100+(Central+European+Standard+Time)&version=202405.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=f987b59b-c157-4217-ad44-b61e7e5ad616&interactionCount=3&isAnonUser=1&landingPath=NotLandingPage&groups=C0004%3A1%2CC0002%3A1%2CC0003%3A1%2CC0001%3A1&intType=3&geolocation=HU%3BPE&AwaitingReconsent=false; __cf_bm=vPaem3lZVUiZ12xYh3m.m1JCux_c.bULdsTBQR494wk-1763038256-1.0.1.1-JtkpVBnPEVXViptmCdPnZ9Rjrh3HvOqrDAI7iUeL5my8xHuuk6RUoqdHo7CCCLiUps4H5J7b9hiyGvjk1UylqJd181XNaizwYBOQ5KDQcBY; ok_prefer_currency=7%7C0%7Cfalse%7CEUR%7C2%7C%E2%82%AC%7C0.8616%7C0.8616%7CEUR; traceId=2130830387712910003; _monitor_extras={"deviceId":"q0hWeCR1M9CgvAs4DUuDQG","eventId":495,"sequenceNumber":495}; ok-ses-id=GlMBCqaP4LxDzIp1jFuJWFPLmZKg2G4/IroCVjfZK0/Ptz5nGVwR4+Ka42fC1cBj2XKvQOOnyZ64aCKZgJVxrXcDzmlI1dudiG9210Mx8IjGUEMiq2PFUXSp5ZIqdcHM
device-token: 320de54c-3be1-4922-b23c-e3a5e37ee94f
devid: 320de54c-3be1-4922-b23c-e3a5e37ee94f
origin: https://web3.okx.com
platform: web
priority: u=1, i
referer: https://web3.okx.com/portfolio/Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN
sec-ch-ua: "Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "macOS"
sec-fetch-dest: empty
sec-fetch-mode: cors
sec-fetch-site: same-origin
user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36
x-cdn: https://web3.okx.com
x-fptoken: eyJraWQiOiIxNjgzMzgiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE3NjMwMjY2NDMsImVmcCI6IlFyT0pXTnVUWXMvd0FFdFl3RCtwVVNvS3l1QXBmbUN5YmVUdE1jcFAwcEMwOHpqdjZtNHZKbk9rZkhKL21EU3IiLCJkaWQiOiIzMjBkZTU0Yy0zYmUxLTQ5MjItYjIzYy1lM2E1ZTM3ZWU5NGYiLCJjcGsiOiJNRmt3RXdZSEtvWkl6ajBDQVFZSUtvWkl6ajBEQVFjRFFnQUVORUNTYTVMdzNMQ2xOOEdIcmRGdEQ0NlZ2WDdGUzJCTUNUcE1MSVpqS0JaL2V4RjZQdXJiREhOcXdwcUJ4VTRCRzB4U01PeFRCY2YrUWwxcWFVcDNYQT09In0.xlMxvXPSpj3hrmkpmfx2Ml6ZpacEmAN-JlYXmBtqQzoCyPjTAcmhjbpG8rCl7lzVvVaNhKZ08-aKQL7kTDgW0g
x-fptoken-signature: {P1363}JGRMFvZLsV/rQzBxObSR5CHScm4gKJOqcIaYNX2iQ0Fy1O5BUWsRlUknbh9sW6B0UowCHcebxW+Z2hFECE10hQ==
x-id-group: 2140930387690360003-c-10
x-locale: en_US
x-request-timestamp: 1763038772117
x-simulated-trading: undefined
x-site-info: ==QfxojI5RXa05WZiwiIMFkQPx0Rfh1SPJiOiUGZvNmIsISVIJiOi42bpdWZyJye
x-utc: 1
x-zkdex-env: 0
```
- Response:

```json
{
  "code" : 0,
  "msg" : "",
  "error_code" : "0",
  "error_message" : "",
  "detailMsg" : "",
  "data" : { // wallet portfolio data
    "tokens" : { // token list data
      "total" : 2, // total number of tokens in portfolio
      "pageSize" : 10, // page size
      "currentPage" : 1, // current page
      "isOverExplorerLimit" : false, // is over explorer limit
      "tokenlist" : [ { // first token data
        "coinAmount" : "463.030923809", // token amount in portfolio
        "currencyAmount" : "72408.77586525142", // USD value of token amount
        "symbol" : "SOL", // token symbol
        "subBalanceType" : 0, // sub balance type
        "rank" : 0, // rank
        "imageUrl" : "https://web3.okx.com/cdn/wallet/logo/SOL-20220525.png", // token image URL
        "name" : "Solana", // token name
        "voucherToken" : false, // is voucher token
        "coinBalanceDetails" : [ { // coin balance details array 
          "coinId" : 1800, 
          "name" : "Solana",
          "symbol" : "SOL",
          "baseCoinId" : 0,
          "imageUrl" : "https://web3.okx.com/cdn/wallet/logo/SOL-20220525.png",
          "riskType" : 0,
          "chainName" : "Solana", // chain name
          "tokenType" : "Solana",
          "userRelation" : false,
          "supportPush" : false,
          "chainId" : 501, // chain ID
          "chainIndex" : 501,
          "supportShowDetail" : true,
          "explorerUrl" : "/explorer/solana/token/Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN",
          "isCaseSensitivity" : false,
          "mpcSignType" : 0,
          "systemToken" : false,
          "chainImageUrl" : "https://web3.okx.com/cdn/wallet/logo/SOL-20220525.png",
          "voucherToken" : false,
          "coinPriceVo" : { // coin price information
            "hasPrice" : true, 
            "price" : "156.38", // current price in USD
            "hasPercent" : true, // has percentage change
            "priceChangePercent24h" : "0", // 24h price change percentage
            "chainId" : 501
          },
          "isHighQuality" : 1, // is high quality token
          "isRiskType" : false, // is risk type
          "stableCoin" : false, // is stable coin
          "supportStableCoinInterest" : false, // supports stable coin interest
          "userAddress" : "Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN", // user wallet address
          "coinAmount" : "463.030923809", // coin amount
          "currencyAmount" : "72408.77586525142", // currency amount in USD
          "addressType" : 1, // address type
          "isOverExplorerLimit" : false, // is over explorer limit
          "vdecimalNum" : 9 // decimal number
        } ],
        "coinPriceInfo" : { // coin price info
          "hasPrice" : true, // has price
          "price" : "156.38", // current price in USD
          "hasPercent" : true,
          "priceChangePercent24h" : "0",
          "chainId" : 501
        },
        "investInfo" : null,
        "isOverExplorerLimit" : false,
        "default" : false
      }, {
        "coinAmount" : "57000000",
        "currencyAmount" : "160.51065726012",
        "symbol" : "GMGN",
        "subBalanceType" : 0,
        "rank" : 0,
        "imageUrl" : "https://web3.okx.com/cdn/web3/currency/token/large/501-9awmCvEjRtzvqyGgt3t3CgiH1kPNJZHW9s51Bx1W3TFn-107/type=default_90_0?v=1762999703707",
        "name" : "Solana",
        "voucherToken" : false,
        "coinBalanceDetails" : [ {
          "coinId" : 26541753,
          "name" : "Solana",
          "symbol" : "GMGN",
          "baseCoinId" : 1800,
          "address" : "9awmCvEjRtzvqyGgt3t3CgiH1kPNJZHW9s51Bx1W3TFn",
          "imageUrl" : "https://web3.okx.com/cdn/web3/currency/token/large/501-9awmCvEjRtzvqyGgt3t3CgiH1kPNJZHW9s51Bx1W3TFn-107/type=default_90_0?v=1762999703707",
          "riskType" : 0,
          "chainName" : "Solana",
          "tokenType" : "Solana",
          "userRelation" : false,
          "supportPush" : false,
          "chainId" : 501,
          "chainIndex" : 501,
          "supportShowDetail" : true,
          "explorerUrl" : "/explorer/solana/token/9awmCvEjRtzvqyGgt3t3CgiH1kPNJZHW9s51Bx1W3TFn",
          "isCaseSensitivity" : false,
          "mpcSignType" : 0,
          "systemToken" : false,
          "chainImageUrl" : "https://web3.okx.com/cdn/wallet/logo/SOL-20220525.png",
          "voucherToken" : false,
          "coinPriceVo" : {
            "address" : "9awmCvEjRtzvqyGgt3t3CgiH1kPNJZHW9s51Bx1W3TFn",
            "hasPrice" : true,
            "price" : "0.00000281597644316",
            "hasPercent" : true,
            "priceChangePercent24h" : "0",
            "chainId" : 501
          },
          "isHighQuality" : 0,
          "isRiskType" : false,
          "stableCoin" : false,
          "supportStableCoinInterest" : false,
          "userAddress" : "Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN",
          "coinAmount" : "57000000",
          "currencyAmount" : "160.51065726012",
          "addressType" : 1,
          "isOverExplorerLimit" : false,
          "vdecimalNum" : 9
        } ],
        "coinPriceInfo" : {
          "address" : "9awmCvEjRtzvqyGgt3t3CgiH1kPNJZHW9s51Bx1W3TFn",
          "hasPrice" : true,
          "price" : "0.00000281597644316",
          "hasPercent" : true,
          "priceChangePercent24h" : "0",
          "chainId" : 501
        },
        "investInfo" : null,
        "isOverExplorerLimit" : false,
        "default" : false
      } ]
    },
    "chainAssets" : [ {
      "chainIndex" : 501,
      "chainName" : "Solana",
      "chainImageUrl" : "https://static.coinall.ltd/cdn/wallet/logo/SOL-20220525.png",
      "currencyAmount" : "72569.28652251154"
    } ],
    "walletAssetSummary" : { // wallet asset summary
      "tokenTotalCurrencyAmount" : "72569.286522511540000000000000" // total balance in USD
    },
    "defis" : [ ], // defi data
    "nfts" : [ { // NFT collection data
      "created" : 0,
      "collections" : [ ],
      "networkValuations" : [ {
        "chainId" : 501,
        "name" : "Solana",
        "valuation" : "2.885580000000000000"
      } ],
      "valuation" : "2.885580000000000000", // In native token (e.g. SOL)
      "walletId" : "Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN",
      "accountId" : "Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN"
    } ]
  }
}
```

9. Token Info (general) (GET)
- Example: `https://web3.okx.com/priapi/v1/dx/market/v2/latest/info?chainId=501&tokenContractAddress=7tWAwLXjcTfDXqedWzQxNc274huxq38xB16MNFQ5bonk&t=1763031429275`
- Response:

```json
{
  "code": 0,
  "data": {
    "bundleHoldingRatio": "0",
    "chainBWLogoUrl": "https://static.coinall.ltd/cdn/assets/imgs/227/2C597ACB210BFE51.png",
    "chainLogoUrl": "https://static.coinall.ltd/cdn/wallet/logo/SOL-20220525.png",
    "chainName": "Solana",
    "change": "",
    "change1H": "",
    "change4H": "",
    "change5M": "",
    "changeUtc0": "",
    "changeUtc8": "",
    "circulatingSupply": "999749116.8248230000",
    "dappList": [],
    "devHoldingRatio": "0",
    "earlyBuyerStatisticsInfo": {
      "chainId": 501,
      "earlyBuyerHoldAmount": "0",
      "tokenContractAddress": "7tWAwLXjcTfDXqedWzQxNc274huxq38xB16MNFQ5bonk",
      "totalEarlyBuyerAmount": "70"
    },
    "holders": "280",
    "isCollected": "",
    "isNotSupportTxNativeToken": "0",
    "isSubscribe": "0",
    "isSupportBlinksShareUrl": "1",
    "isSupportHolder": "1",
    "isSupportHolderExpandData": "1",
    "isSupportMarketCapKline": "1",
    "isTxPrice": "1",
    "liquidity": "7599.456132168487739354770705106",
    "marketCap": "4536.249581813579911918",
    "maxPrice": "",
    "minPrice": "",
    "moduleType": "0",
    "nativeTokenSymbol": "SOL",
    "price": "0.000004537387936106",
    "riskControlLevel": "3",
    "riskLevel": "3",
    "snipersClear": "10",
    "snipersTotal": "18",
    "supportLimitOrder": "0",
    "supportMemeMode": "0",
    "supportSingleChainSwap": "1",
    "supportSwap": "1",
    "supportTrader": "1",
    "suspiciousHoldingRatio": "0",
    "t": [
      {
        "e": {

        },
        "k": "lowLiquidity",
        "m": 1
      },
      {
        "e": {

        },
        "k": "devHoldingStatus_sellAll",
        "m": 1
      },
      {
        "e": {

        },
        "k": "smartMoneyBuy",
        "m": 1
      }
    ],
    "tagList": [
      [
        "lowLiquidity"
      ],
      [
        "suspiciousHoldingRatio_0"
      ],
      [
        "devHoldingStatus_sellAll"
      ],
      [
        "devHoldingRatio_0"
      ],
      [
        "snipersClear_10"
      ],
      [
        "snipersTotal_18"
      ],
      [
        "smartMoneyBuy"
      ]
    ],
    "tokenContractAddress": "7tWAwLXjcTfDXqedWzQxNc274huxq38xB16MNFQ5bonk",
    "tokenFee": "44.68607827",
    "tokenLargeLogoUrl": "https://static.oklink.com/cdn/web3/currency/token/large/501-7tWAwLXjcTfDXqedWzQxNc274huxq38xB16MNFQ5bonk-107/type=default_350_0?v=1762914861849",
    "tokenLogoUrl": "https://static.oklink.com/cdn/web3/currency/token/large/501-7tWAwLXjcTfDXqedWzQxNc274huxq38xB16MNFQ5bonk-107/type=default_90_0?v=1762914861849",
    "tokenName": "King Cult",
    "tokenSymbol": "King",
    "tokenThirdPartInfo": {
      "okxDarkDefaultLogo": "https://static.coinall.ltd/cdn/web3/dex/market/okxmaps-dark-default.png",
      "okxDarkHoverLogo": "https://static.coinall.ltd/cdn/web3/dex/market/okmaps-dark-hover.png",
      "okxLightDefaultLogo": "https://static.coinall.ltd/cdn/web3/dex/market/okmaps-light-default.png",
      "okxLightHoverLogo": "https://static.coinall.ltd/cdn/web3/dex/market/okxmaps-light-hover.png",
      "okxWebSiteName": "Holder maps",
      "okxWebSiteUrl": "https://web3.okx.com/holder-intelligence/solana/7tWAwLXjcTfDXqedWzQxNc274huxq38xB16MNFQ5bonk",
      "thirdPartyWebSiteColorLogo": "https://static.coinall.ltd/cdn/web3/dex/market/faster100-color.png",
      "thirdPartyWebSiteGreyLogo": "https://static.coinall.ltd/cdn/web3/dex/market/faster100-grey.png",
      "thirdPartyWebSiteName": "FasterMaps",
      "thirdPartyWebSiteUrl": "https://faster100x.com/en/embedded?source=okx.com&tokenAddress=7tWAwLXjcTfDXqedWzQxNc274huxq38xB16MNFQ5bonk"
    },
    "top10HoldAmountPercentage": "9.0795295507646092",
    "tradeNum": "0",
    "transactionNum": "0",
    "volume": "0",
    "wrapperTokenContractAddress": ""
  },
  "detailMsg": "",
  "error_code": "0",
  "error_message": "",
  "msg": ""
}
```

10. Holder Ranking of Token (GET)
- Example: `https://web3.okx.com/priapi/v1/dx/market/v2/holders/ranking-list?chainId=501&tokenAddress=7tWAwLXjcTfDXqedWzQxNc274huxq38xB16MNFQ5bonk&t=1763032112185`
- Response:

```json
{
    "code": 0,
    "data": { // detailed holder ranking data for specific token
        "holderRankingList": [ // array of holders
            {
                "boughtAmount": "8907185.214843", // total bought amount (token)
                "boughtAvgPrice": "0.00003321504582287", // average buy price
                "boughtVolume": "295.8525650638", // total bought volume in USD
                "buyCount": "2", // number of buy transactions
                "buyValue": "295.852565063799867393", // total buy value in USD
                "chainId": "501", // chain ID
                "explorerUrl": "https://web3.okx.com/explorer/solana/account/DAwAkCbMne9ihf6UrBHf5ZGaZHZDGAtjNibA764aN4iQ", // explorer link for holder address
                "extraOne": "0",
                "fundingSourceAddress": "8uaxunvb2PUU1TPSGNbaWn7PVSPH3Htw5X9ZhmKDytuk", // funding source address of holder
                "fundingSourceAddressShowName": "", // funding source display name (if any)
                "fundingSourceTime": "1728890132000", // first funding time
                "holdAmount": "7626485.214843", // current hold amount (token)
                "holdAmount1HChange": "", // 1H change in hold amount
                "holdAmount24HChange": "", // 24H change in hold amount 
                "holdAmount4HChange": "", // 4H change in hold amount
                "holdAmountPercentage": "0.762839905181863700", // hold amount percentage (of total supply - e.g. 0.76%)
                "holdAvgPrice": "0.0000273839585381", // average hold price
                "holdCreateTime": "1728890346000", // hold create time
                "holdVolume": "34.604322008719403766821358", // hold volume in USD
                "holderTagVO": null,
                "holderWalletAddress": "DAwAkCbMne9ihf6UrBHf5ZGaZHZDGAtjNibA764aN4iQ", // holder wallet address
                "holdingTime": "1760836936", // holding time
                "inFlowAmount": "7626485.214843", // inflow amount (token)
                "inFlowValue": "-40.669275728000438907", // inflow value in USD
                "isPnlSupported": true, // is PnL supported
                "lastTradeTime": "1760907046000", // last trade time
                "maxHoldAmount": "7626485.214843", // max hold amount (token)
                "nativeTokenBalance": "0.076176014", // native token balance (e.g. SOL)
                "nativeTokenHoldTime": "1762775141000", // native token hold time
                "nativeTokenPrice": "156.270909554926837268", // native token price in USD (e.g. SOL)
                "price": "0.000004537387936106", // token price in USD
                "realizedProfit": "249.5014188425913888", // realized profit in USD
                "realizedProfitPercentage": "286.75", // realized profit percentage (e.g. 286.75%)
                "sellCount": "3", // number of sell transactions
                "sellOffTime": "", // sell off time
                "sellValue": "336.521840791800306300", // total sell value in USD
                "soldAmount": "1280700", // total sold amount (token)
                "soldAvgPrice": "0.000262755234630827", // average sold price
                "soldVolume": "336.5106289917", // total sold volume in USD
                "spotBalance": "7626485.214843", // spot balance (token)
                "t": [ // Tags
                    {
                        "e": {},
                        "k": "topHolder",
                        "m": 1
                    },
                    {
                        "e": {},
                        "k": "diamondHands",
                        "m": 1
                    },
                    {
                        "e": {},
                        "k": "tradingBot_Pepeboost",
                        "m": 1
                    }
                ],
                "tagList": [
                    [
                        "topHolder"
                    ],
                    [
                        "diamondHands"
                    ],
                    [
                        "tradingBot_Pepeboost"
                    ]
                ],
                "tokenContractAddress": "7tWAwLXjcTfDXqedWzQxNc274huxq38xB16MNFQ5bonk", // token contract
                "tokenHoldPercentage": "",
                "tokenHoldVolume": "",
                "totalProfit": "75.262385936617409865803058", // total profit in USD
                "totalProfitPercentage": "25.44", // total profit percentage (e.g. 25.44%)
                "unrealizedProfit": "-174.239032905973978934196942", // unrealized profit in USD
                "unrealizedProfitPercentage": "-83.43", // unrealized profit percentage (e.g. -83.43%)
                "userAddressTagVO": {
                    "diamondHands": {
                        "tagExt": null,
                        "tagType": "NO_VALUE",
                        "tagValue": ""
                    },
                    "topHolder": {
                        "tagExt": null,
                        "tagType": "NO_VALUE",
                        "tagValue": ""
                    },
                    "tradingBot_Pepeboost": {
                        "tagExt": null,
                        "tagType": "NO_VALUE",
                        "tagValue": ""
                    },
                    "tradingBot": {
                        "tagExt": null,
                        "tagType": "NO_VALUE",
                        "tagValue": ""
                    }
                }
            },
            { ... } // more holders
        ],
        "ownedVO": {
            "greaterThan10Amount": "22", // number of holders with >10$
            "greaterThan10AmountPercentage": "7.8600", // percentage of holders with >10$
            "nativeTokenSymbol": "SOL" // native token symbol
        },
        "summaryVO": {
            "avgHoldValue": "16.2009", // average hold value in USD
            "devHoldPercentage": "0", // token developer supply share
            "isPnlSupported": true, 
            "sniperTagHolderAmount": "", // token sniper(s) holder amount
            "suspectedRatTradingHoldPercentage": "", // suspected insider(?) supply share
            "suspiciousHoldPercentage": "0", // suspicious holder supply share
            "suspiciousTagHolderAmount": "", // suspicious holder amount
            "top100BoughtAvgPrice": "0.00021", // top 100 holders average buy price
            "top100BoughtAvgPricePercentage": "-97.8393", // top 100 holders average buy price percentage
            "top100HoldAmountPercentage": "16.9232613369060532", // top 100 holders amount percentage
            "top100SoldAvgPrice": "0.000217", // top 100 holders average sell price
            "top100SoldAvgPricePercentage": "-97.909", // top 100 holders average sell price percentage
            "top10HoldAmountPercentage": "8.5863835738380921", // top 10 holders amount percentage
            "totalHolderAmount": "280" // total number of top holders
        }
    },
    "detailMsg": "",
    "error_code": "0",
    "error_message": "",
    "msg": ""
}
```