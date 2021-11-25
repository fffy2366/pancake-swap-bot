/* eslint-disable @typescript-eslint/no-explicit-any */
import {Contract} from 'ethers';

export async function callMethod(contract: Contract, methodName: string, inputs: any) {
    return new Promise((resolve, reject) => {
        contract.methods[methodName]().call(inputs, (err: any, result: any) => {
            if (err) {
                return reject(err)
            }
            return resolve(result)
        });
    })
}

export async function callContractMethod(contract: Contract, methodName: string, inputs?: any, options?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        contract.methods[methodName](inputs).call(options, (err: any, result: any) => {
            if (err) {
                return reject(err)
            }
            return resolve(result)
        });
    })
}
