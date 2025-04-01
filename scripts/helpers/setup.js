const bre = require('hardhat')
const { ethers, web3, upgrades } = bre
const BN = require('bn.js')

function encodeData(types, values){
    let signature = "initialize("

    for(let i = 0; i < types.length; i++){
        signature += types[i];
        if(i !== types.length - 1) {signature += ","} else {signature += ")"}
    }

    const methodId = (ethers.keccak256(ethers.toUtf8Bytes(signature))).substring(0,10);
    const abi = new ethers.AbiCoder(); // Get abi coder instance
    let data = methodId + abi.encode(types, values).substring(2); // Generate calldata

    return data;
}

async function isEthException(promise) {
    let msg = 'No Exception'
    try {
        let x = await promise
        // if (!!x.wait) {
        //     await x.wait()
        // }
    } catch (e) {
        msg = e.message
    }
    return (
        msg.includes('Transaction reverted') ||
        msg.includes('VM Exception while processing transaction: revert') ||
        msg.includes('invalid opcode') ||
        msg.includes('exited with an error (status 0)')
    )
}

async function awaitTx(tx) {
    return await (await tx).wait()
}

async function waitForSomeTime(provider, seconds) {
    await provider.send('evm_increaseTime', [seconds])
    await provider.send('evm_mine')
}

async function currentTime(provider) {
    const block = await provider.send('eth_getBlockByNumber', ['latest', false])
    return parseInt(block.timestamp, 16)
}

function hexify(names) {
    let resp = [];

    for(const name of names) {
        let hexed = web3.utils.toHex(name);
        let prefix = '0x';
        let hexValue = hexed.slice(2);

        while(hexValue.length < 64) {
            hexValue = '0' + hexValue
        }

        resp.push(prefix + hexValue);
    }

    return resp;
}

const decimals = "1000000000000000000"

function toWeiDenomination (x) {
    return (x * decimals).toString();
}

module.exports = {
    ethers,
    web3,
    upgrades,
    isEthException,
    awaitTx,
    waitForSomeTime,
    currentTime,
    encodeData,
    toWeiDenomination,
    hexify
}