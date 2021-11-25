/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {config} from "../config";
import {web3} from "../wallet";
import {MULTICALL_ABI, MULTICALL_NETWORKS} from "./multicall";

//https://docs.binance.org/smart-chain/developer/rpc.html

export function useMulticallContract(): any {
    const chainId = config.chainId as 56 | 97;
    const address = chainId && MULTICALL_NETWORKS[chainId]
    // @ts-ignore
    return new web3.eth.Contract(MULTICALL_ABI, address)
}

