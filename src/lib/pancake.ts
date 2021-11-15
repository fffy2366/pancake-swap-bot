// bsc mainnet
// export const USDT_ADDRESS = "0x55d398326f99059ff775485246999027b3197955"; // bsc mainnet
// export const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // bsc mainnet
// export const WETH = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"; // bsc mainnet bnb
// export const META_ADDRESS = "0x04073D16C6a08C27e8BbEbe262Ea4D1C6fa4C772"; // BSC mainnet META token

import Web3 from 'web3';
import {AbiItem} from 'web3-utils';
import {web3} from '.';
import * as PANCAKE_ROUTER_ABI from '../config/pancake.router.abi.json';


// bsc test
export const USDT_ADDRESS = "0xcFDE30EA6F0E922BD60C964cC15A780262F1c7Ba"; // testnet
export const PANCAKE_ROUTER = "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3"; // testnet
export const WETH = "0xae13d989dac2f0debff460ac112a837c89baa7cd"; // bsc testnet bnb
export const META_ADDRESS = "0x05aF8098718f82350bBA31Ef19C8b2AeEAcd36c1"; // testnet


export class Pancake {
  public web3: Web3;

  constructor() {
    this.setWeb3();
  }

  getWeb3() {
    return this.web3;
  }

  setWeb3() {
    this.web3 = web3.getInstance();
  }

  async swapTokenToBNB(_path: string[], _amountToken: string) {

    const router = new this.web3.eth.Contract(PANCAKE_ROUTER_ABI as AbiItem[], PANCAKE_ROUTER);
    const [signer] = await hre.ethers.getSigners();
    await router
      .connect(signer)
      .swapExactTokensForETHSupportingFeeOnTransferTokens(_amountToken, 0, _path, signer.address, Date.now() + 900000);
  }

// BNB 换 token
async function swapBNBToToken(hre: HRE, _path: string[], _amountBNB: string) {
  const router = await hre.ethers.getContractAt(
    "IPancakeRouter02",
    PANCAKE_ROUTER
  );
  const [signer] = await hre.ethers.getSigners();
  await router
    .connect(signer)
    .swapExactETHForTokensSupportingFeeOnTransferTokens(0, _path, signer.address, Date.now() + 900000, {
      value: _amountBNB,
      //   from: _farmer,
    });
}

// token 换 token
async function swapTokenToToken(hre: HRE, _path: string[], _amountToken: string) {
  const router = await hre.ethers.getContractAt(
    "IPancakeRouter02",
    PANCAKE_ROUTER
  );
  const [signer] = await hre.ethers.getSigners();
  await router
    .connect(signer)
    .swapExactTokensForTokensSupportingFeeOnTransferTokens(_amountToken, 0, _path, signer.address, Date.now() + 900000);
}

async function addLiquidity(
  hre: HRE,
  _token0: Contract,
  _token1: Contract,
  _amount0: string,
  _amount1: string
) {
  const [signer] = await hre.ethers.getSigners();
  const router = await hre.ethers.getContractAt(
    "IPancakeRouter02",
    PANCAKE_ROUTER
  );

  await _token0.connect(signer).approve(router.address, _amount0);
  await _token1.connect(signer).approve(router.address, _amount1);
  const ret = await router
    .connect(signer)
    .addLiquidity(
      _token0.address,
      _token1.address,
      _amount0,
      _amount1,
      0,
      0,
      signer.address,
      Date.now() + 900000
    );
  return ret;
}

async function addLiquidityETH(
  hre: HRE,
  _token: Contract,
  _amount: string,
  _value: string
) {
  const [signer] = await hre.ethers.getSigners();
  const router = await hre.ethers.getContractAt(
    "IPancakeRouter02",
    PANCAKE_ROUTER
  );
  const overrides = {
    value: _value
  };
  await _token.connect(signer).approve(router.address, _amount);
  const ret = await router
    .connect(signer)
    .addLiquidityETH(
      _token.address,
      _amount,
      0,
      0,
      signer.address,
      Date.now() + 900000,
      overrides
    );
  return ret;
}

}
