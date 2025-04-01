"use strict";

const BigNumber = require('bignumber.js');
const ethers = require('ethers');
const {web3} = require("./setup");

function UInt256Max() {
    return ethers.MaxUint256.toString();
}

function address(n) {
    return `0x${n.toString(16).padStart(40, '0')}`;
}

function encodeParameters(types, values) {
    if (types.length !== values.length)
        return;

    const abi = new ethers.AbiCoder();

    for (let i = 0; i < types.length; i++) {
        if (types[i] === 'bool') {
            values[i] = JSON.parse(values[i]);
        }
    }

    return abi.encode(types, values);
}

async function etherBalance(addr) {
    return (await web3.eth.getBalance(addr)).toString();
}

async function calculateGasPrice() {
    const gasPrice = toNumber(await web3.eth.getGasPrice());
    // add 5% on the current gasPrice
    return gasPrice + Math.round(gasPrice * 50 / 100);
}

function toNumber(bNum) {
    return Number(bNum);
}

async function txCost(txHash) {
    const txReceipt = await web3.eth.getTransactionReceipt(txHash);
    const gasUsed = txReceipt.gasUsed;
    const gasPrice = txReceipt.effectiveGasPrice;
    return (gasUsed * gasPrice).toString();
}

function etherExp(num) { return etherMantissa(num, 1e18) }
function etherDouble(num) { return etherMantissa(num, 1e36) }
function etherMantissa(num, scale = 1e18) {
    if (num < 0)
        return new BigNumber(2).pow(256).plus(num);
    return new BigNumber(num).times(scale);
}

function etherUnsigned(num) {
    return new BigNumber(num);
}

function mergeInterface(into, from) {
    const key = (item) => item.inputs ? `${item.name}/${item.inputs.length}` : item.name;
    const existing = into.options.jsonInterface.reduce((acc, item) => {
        acc[key(item)] = true;
        return acc;
    }, {});
    const extended = from.options.jsonInterface.reduce((acc, item) => {
        if (!(key(item) in existing))
            acc.push(item)
        return acc;
    }, into.options.jsonInterface.slice());
    into.options.jsonInterface = into.options.jsonInterface.concat(from.options.jsonInterface);
    return into;
}

function getContractDefaults() {
    return { gas: 20000000, gasPrice: 20000 };
}

function keccak256(values) {
    return ethers.keccak256(values);
}

function unlockedAccounts() {
    let provider = web3.currentProvider;
    if (provider._providers)
        provider = provider._providers.find(p => p._ganacheProvider)._ganacheProvider;
    return provider.manager.state.unlocked_accounts;
}

function unlockedAccount(a) {
    return unlockedAccounts()[a.toLowerCase()];
}

async function mineBlockNumber(blockNumber) {
    return rpc({method: 'evm_mineBlockNumber', params: [blockNumber]});
}

async function mineBlock() {
    return rpc({ method: 'evm_mine' });
}

async function increaseTime(seconds) {
    await rpc({ method: 'evm_increaseTime', params: [seconds] });
    return rpc({ method: 'evm_mine' });
}

async function setTime(seconds) {
    await rpc({ method: 'evm_setTime', params: [new Date(seconds * 1000)] });
}

async function freezeTime(seconds) {
    await rpc({ method: 'evm_freezeTime', params: [seconds] });
    return rpc({ method: 'evm_mine' });
}

async function advanceBlocks(blocks) {
    let { result: num } = await rpc({ method: 'eth_blockNumber' });
    await rpc({ method: 'evm_mineBlockNumber', params: [blocks + parseInt(num)] });
}

async function blockNumber() {
    let { result: num } = await rpc({ method: 'eth_blockNumber' });
    return parseInt(num);
}

async function minerStart() {
    return rpc({ method: 'miner_start' });
}

async function minerStop() {
    return rpc({ method: 'miner_stop' });
}

async function rpc(request) {
    return new Promise((okay, fail) => web3.currentProvider.send(request, (err, res) => err ? fail(err) : okay(res)));
}

async function both(contract, method, args = [], opts = {}) {
    const reply = await call(contract, method, args, opts);
    const receipt = await send(contract, method, args, opts);
    return { reply, receipt };
}

async function sendFallback(contract, opts = {}) {
    const receipt = await web3.eth.sendTransaction({ to: contract._address, ...Object.assign(getContractDefaults(), opts) });
    return Object.assign(receipt, { events: receipt.logs });
}

module.exports = {
    address,
    encodeParameters,
    etherBalance,
    txCost,
    etherExp,
    etherDouble,
    etherMantissa,
    etherUnsigned,
    mergeInterface,
    keccak256,
    unlockedAccounts,
    unlockedAccount,
    advanceBlocks,
    blockNumber,
    freezeTime,
    increaseTime,
    mineBlock,
    mineBlockNumber,
    minerStart,
    minerStop,
    rpc,
    setTime,
    calculateGasPrice,
    both,
    sendFallback,
    UInt256Max
};