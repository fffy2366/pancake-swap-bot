/* eslint-disable @typescript-eslint/no-explicit-any */
import {FunctionFragment, Interface} from "@ethersproject/abi";
import {BytesLike} from '@ethersproject/bytes';
import {Currency, Pair, TokenAmount} from "@godtoy/pancakeswap-sdk-v2";
import {abi as IUniswapV2PairABI} from '@uniswap/v2-core/build/IUniswapV2Pair.json';
import {config} from "../config";
import {callContractMethod, useMulticallContract} from "../contracts";
import {wrappedCurrency} from '../utils/wrappedCurrency';

const PAIR_INTERFACE = new Interface(IUniswapV2PairABI)

export enum PairState {
    LOADING,
    NOT_EXISTS,
    EXISTS,
    INVALID
}

const multicallContract = useMulticallContract()

function decodeMultipleContractSData(data: BytesLike, contractInterface: Interface | undefined, fragment: FunctionFragment | undefined, latestBlockNumber: number | undefined) {
    const res: any = {
        success: false,
    };
    try {
        res.success = true;
        if (!contractInterface || !fragment) {
            return res;
        }
        res.result = contractInterface.decodeFunctionResult(fragment, data)
    } catch (e) {
        return res;
    }
    return res
}

async function useMultipleContractSingleData(addresses: string[], contractInterface: Interface, methodName: string, callInputs?: any) {
    const fragment = PAIR_INTERFACE.getFunction(methodName)
    if (fragment === null) return [];
    const callData = contractInterface.encodeFunctionData(fragment, callInputs)
    const callers = addresses.map((address) => {
        return address && callData ? {address, callData, } : undefined
    })
    // return results
    try {
        const inputs = callers.filter((obj) => obj).map((obj) => {
            return [obj?.address, obj?.callData]
        });
        const res = await callContractMethod(multicallContract, "aggregate", inputs, {
            n: Infinity,
            minWait: 2500,
            maxWait: 3500,
        });
        const {blockNumber} = res;

        //demo results
        const data = res.returnData.map((_data: any) => {
            return decodeMultipleContractSData(_data, contractInterface, fragment, blockNumber)
        })
        return data;
    } catch (error) {
        console.info('Failed to fetch chunk inside retry', error)
        throw error
    }
}

export async function usePairs(currencies: any): Promise<[PairState, Pair | null][]> {
    const chainId = config.chainId;
    const tokens = currencies.map(([currencyA, currencyB]) => [
        wrappedCurrency(currencyA, chainId),
        wrappedCurrency(currencyB, chainId)
    ]);
    const pairAddresses = tokens.map(([tokenA, tokenB]) => {
        return tokenA && tokenB && !tokenA.equals(tokenB) ? Pair.getAddress(tokenA, tokenB) : undefined
    });
    const results = await useMultipleContractSingleData(pairAddresses, PAIR_INTERFACE, 'getReserves')
    return results.map((result: {result: any; success: any;}, i: string | number) => {
        const {result: reserves, success} = result
        const tokenA = tokens[i][0]
        const tokenB = tokens[i][1]
        if (!success) return [PairState.LOADING, null]
        if (!tokenA || !tokenB || tokenA.equals(tokenB)) return [PairState.INVALID, null]
        if (!reserves) return [PairState.NOT_EXISTS, null]
        const {reserve0, reserve1} = reserves
        const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]
        return [
            PairState.EXISTS,
            new Pair(
                new TokenAmount(token0, reserve0.toString()),
                new TokenAmount(token1, reserve1.toString()),
            )
        ]
    })
}

export function usePair(tokenA?: Currency, tokenB?: Currency): [PairState, Pair | null] {
    return usePairs([[tokenA, tokenB]])[0]
}
