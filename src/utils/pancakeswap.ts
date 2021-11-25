/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {MaxUint256} from '@ethersproject/constants';
import {parseUnits} from '@ethersproject/units';
import {ChainId, ETHER, Fetcher, Percent, Router, Token, Trade, WETH} from "@godtoy/pancakeswap-sdk-v2";
import {abi as IUniswapV2Router02ABI} from '@uniswap/v2-periphery/build/IUniswapV2Router02.json';
import {Contract, ethers} from "ethers";
import ERC20 from '../abis/ERC20.json';
import {config, provider, USDT, WBNB} from "../config";
import {getContractToken, useAllCommonPairs} from "../helper";
import isZero from "../utils/int";
import {logger} from "../utils/logger";
import {tryParseAmount} from "../utils/wrappedCurrency";
import {activateAccount, wallet, web3} from '../wallet';
const debug = require('debug')('robot:utils:pancakeswap');

const JSBI = require('jsbi')

const BIPS_BASE = JSBI.BigInt(10000)

const ROUTER_ADDRESS = config.ROUTE_ADDRESS

// @ts-ignore
const routerContract = new web3.eth.Contract(IUniswapV2Router02ABI, ROUTER_ADDRESS); //路由合约


export class PancakeSwap {
  private outputToken: any;

  private inputToken: Token = WBNB;
  private readonly outputTokenAddress: string;
  private accountContract: Contract;
  private accountSwapContract: Contract;
  private outputTokenContract: Contract;

  private tradeOptions = {
    maxHops: 3,
    maxNumResults: 1,
  };

  private swapOptions = {
    feeOnTransfer: false,
    allowedSlippage: new Percent(JSBI.BigInt(Math.floor(50)), BIPS_BASE), //滑动万分之..
    recipient: activateAccount.address, //account address
    ttl: 60 * 2, //2min,
  }

  constructor(outAddress: string) {
    this.outputTokenAddress = outAddress
    this.accountContract = new ethers.Contract(this.inputToken.address, ERC20, provider)
    this.accountContract = this.accountContract.connect(wallet)
    this.accountSwapContract = new ethers.Contract(ROUTER_ADDRESS, IUniswapV2Router02ABI, provider).connect(wallet)
  }

  async init() {
    //init contract
    const {tokenOutput} = await getContractToken(this.outputTokenAddress)
    this.outputToken = tokenOutput
    logger.info(`OutputToken loaded:${this.outputTokenAddress} / ${this.outputToken.symbol} / ${this.outputToken.decimals}`)

    //1.授权output Token交易
    // await this.approve(this.inputToken.address, MaxUint256) //BNB
    // await this.approve(this.outputToken.address, MaxUint256) // Token


    // this.inputTokenContract = new ethers.Contract(WBNB, ERC20, provider)
    this.outputTokenContract = new ethers.Contract(this.outputToken.address, ERC20, provider).connect(wallet);
    await this.tokenApproveRoute(MaxUint256);
  }

  private async approve(spender: string, amount: any) {
    const add = await this.accountContract.allowance(wallet.address, spender)
    const apped = ethers.BigNumber.from(add)
    if (!apped.gt(0)) {
      await this.accountContract.approve(spender, amount) //授权BNB
      logger.warn(`approved: ${spender}`, apped.toString())
    }
  }

  private async tokenApproveRoute(amount: any) {
    const add = await this.outputTokenContract.allowance(wallet.address, ROUTER_ADDRESS)
    const apped = ethers.BigNumber.from(add)
    if (!apped.gt(0)) {
      await this.outputTokenContract.approve(ROUTER_ADDRESS, amount) //授权BNB
      logger.warn(`approved: ${ROUTER_ADDRESS}`, apped.toString())
    }
  }

  async getTokenPrice(tokenAddress: string) {
    const chainId = ChainId.MAINNET;
    const token = await Fetcher.fetchTokenData(chainId, tokenAddress, provider);
    const weth = WETH[chainId];
    const usdt = USDT;
    const pairTokenWETH = await Fetcher.fetchPairData(token, weth, provider);
    const pairUSDTWETH = await Fetcher.fetchPairData(usdt, weth, provider);

    const price = pairTokenWETH.priceOf(token).multiply(pairUSDTWETH.priceOf(weth)).toSignificant(6);
    return price;
  }

  //获取交易pairs列表
  async getPairs(): Promise<any> {
    return useAllCommonPairs(this.inputToken, this.outputToken)
  }

  //获取账户的现金余额
  async getBalances(): Promise<any> {
    const walletAddress = await wallet.getAddress()
    const outputBalance = await this.outputTokenContract.balanceOf(walletAddress) ///输出token的金额
    const valB = ethers.utils.formatUnits(outputBalance, this.outputToken.decimals).toString() //余额1
    return {output: outputBalance, outputAmount: valB}
  }

  async getBuyTrade(amount: any) {
    const pairsList = await useAllCommonPairs(this.inputToken, this.outputToken)
    const curr = tryParseAmount(amount, ETHER) //parse amount 使用默认 ETHER 才会调用 swapExactETHForTokens
    if (!curr) {
      return false;
    }
    return Trade.bestTradeExactIn(pairsList, curr, this.outputToken, this.tradeOptions)[0] ?? null
  }

  async getSellTrade(amount: any) {
    const pairsList = await this.getPairs()
    const ip = this.outputToken
    // const op = this.inputToken //将什么给换出来
    const op = ETHER //BNB换出来
    const curr = tryParseAmount(amount, ip) //换出来
    if (!curr) {
      return false;
    }
    return Trade.bestTradeExactIn(pairsList, curr, op, this.tradeOptions)[0] ?? null
  }

  tradeInfo(trade: Trade) {
    const executionPrice = trade.executionPrice.invert().toSignificant(6);
    const nextMidPrice = trade.nextMidPrice.invert().toSignificant(6);
    const outputAmount = trade.outputAmount.toSignificant(6);
    const inputAmount = trade.inputAmount.toSignificant(6);
    const priceImpact = trade.priceImpact.toSignificant(6);
    return {executionPrice, nextMidPrice, outputAmount, inputAmount, priceImpact}
  }

  private async gas(parameters: any, options: any): Promise<any> {
    return this.accountSwapContract.estimateGas[parameters.methodName](...parameters.args, options);
  }

  async execSwap(amount: string, trade: any) {
    try {
      const info = this.tradeInfo(trade) //交易信息
      debug("execSwap info is %o", info);
      const startTime = Date.now()
      const parameters = Router.swapCallParameters(trade, this.swapOptions)
      const encodedTx = routerContract.methods[parameters.methodName](...parameters.args).encodeABI();
      amount = ethers.utils.formatEther(parameters.value)
      const value = parseUnits(amount, trade.inputAmount.decimals)
      const transactionObject: any = {
        gasLimit: 2062883, //gas费用
        // value: value,//转账金额
        data: encodedTx,
        from: activateAccount.address,
        to: ROUTER_ADDRESS,
        value: value,
      };
      const buyedPrice = info.executionPrice;
      const routeTag = `Swap:[${trade.inputAmount.currency.symbol}->${trade.outputAmount.currency.symbol}][price=${buyedPrice}]`
      let gas: any = "";
      try {
        const value2 = parameters.value;
        const options = !value2 || isZero(value2) ? {} : {value: value2}
        gas = await this.gas(parameters, options)
      } catch (e) {
        logger.error("gas.error:", e.reason)
      }
      if (gas) {
        // transactionObject.gasLimit = gas.toNumber() * 3 //使用3倍gas费
      }
      const wasteGas = Date.now() - startTime
      logger.trace(`Start.swap: ${routeTag} | ${parameters.methodName}, gasLimit:${gas.toString()} / Time:${wasteGas}ms,value: ${ethers.utils.formatUnits(value, trade.inputAmount.decimals).toString()}`)
      const res = await wallet.sendTransaction(transactionObject);
      const receipt = await res.wait();//等待区块确认
      const transTime = Date.now() - startTime
      if (receipt.status) {
        logger.info(`Transaction.success: ${routeTag} gasUsed:${receipt.gasUsed.toString()},time:${transTime}ms,confirmations:${receipt.confirmations}`);
        return true;//已经买入成功
      } else {
        logger.error("Swap.error:", receipt)
      }
    } catch (e) {
      logger.error("execSwapSell:", e.reason)
    }
    return false;
  }
}
