/* eslint-disable @typescript-eslint/no-explicit-any */
import {ethers} from 'ethers';
import Web3 from 'web3';
import {config, provider} from "./config";


export const web3 = new Web3(config.provider);
export const activateAccount: any = web3.eth.accounts.privateKeyToAccount(config.walletPvKey);

export const wallet = new ethers.Wallet(config.walletPvKey, provider)
