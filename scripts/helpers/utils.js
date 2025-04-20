const fs = require('fs')
const path = require('path')

function getSavedContractAddresses() {
    let json
    try {
        json = fs.readFileSync(path.join(__dirname, `../../deployments/addresses/contract-addresses.json`))
    } catch (err) {
        json = '{}'
    }
    return JSON.parse(json)
}

function saveContractAddress(network, contract, address) {
    const addrs = getSavedContractAddresses()
    addrs[network] = addrs[network] || {}
    addrs[network][contract] = address
    fs.writeFileSync(path.join(__dirname, `../../deployments/addresses/contract-addresses.json`), JSON.stringify(addrs, null, '    '))
}

function getSavedContractProxies() {
    let json
    try {
        json = fs.readFileSync(path.join(__dirname, `../../deployments/addresses/contract-proxies.json`))
    } catch (err) {
        json = '{}'
    }
    return JSON.parse(json)
}

function getSavedContractProxy(network, contract) {
    const addrs = getSavedContractProxies()
    return addrs[network] && addrs[network][contract] ? addrs[network][contract] : null
}

function saveContractProxies(network, contract, address) {
    const addrs = getSavedContractProxies()
    addrs[network] = addrs[network] || {}
    addrs[network][contract] = address
    fs.writeFileSync(path.join(__dirname, `../../deployments/addresses/contract-proxies.json`), JSON.stringify(addrs, null, '    '))
}

function getSavedContractABI(network) {
    let json
    try {
        json = fs.readFileSync(path.join(__dirname, `../../deployments/abis/contract-abis-${network}.json`))
    } catch (err) {
        json = '{}'
    }
    return JSON.parse(json)
}

function saveContractAbi(network, contract, abi) {
    const abis = getSavedContractABI(network)
    abis[network] = abis[network] || {}
    abis[network][contract] = abi
    fs.writeFileSync(path.join(__dirname, `../../deployments/abis/contract-abis-${network}.json`), JSON.stringify(abis, null, '    '))
}

function saveContractAbiTest(network, contract, abi) {
    const abis = {}
    abis[network] = {}
    abis[network][contract] = abi
    fs.writeFileSync(path.join(__dirname, `../../deployments/abis/contract-abis-test.json`), JSON.stringify(abis, null, '    '))
}


function getDeploymentBlockchain() {
    let json
    try {
        json = fs.readFileSync(path.join(__dirname,'../tenderly/deployNetwork.json'))
    } catch (err) {
        json = '{}'
    }
    return JSON.parse(json);
}

function saveDeploymentBlockchain(blockchain) {
    let current = getDeploymentBlockchain();
    current['network'] = blockchain;
    fs.writeFileSync(path.join(__dirname, `../tenderly/deployNetwork.json`), JSON.stringify(current, null, '    '))
}

function getSavedContractProxyAbis() {
    let json
    try {
        json = fs.readFileSync(path.join(__dirname, `../deployments/abis/contract-proxy-abis.json`))
    } catch (err) {
        json = '{}'
    }
    return JSON.parse(json)
}

// New functions for implementation addresses and constructor arguments
function getSavedImplementationAddresses() {
    let json
    try {
        json = fs.readFileSync(path.join(__dirname, `../../deployments/addresses/implementation-addresses.json`))
    } catch (err) {
        json = '{}'
    }
    return JSON.parse(json)
}

function getSavedImplementationAddress(network, contract) {
    const addrs = getSavedImplementationAddresses()
    return addrs[network] && addrs[network][contract] ? addrs[network][contract] : null
}

function saveImplementationAddress(network, contract, address) {
    const addrs = getSavedImplementationAddresses()
    addrs[network] = addrs[network] || {}
    addrs[network][contract] = address
    fs.writeFileSync(path.join(__dirname, `../../deployments/addresses/implementation-addresses.json`), JSON.stringify(addrs, null, '    '))
}

function getSavedConstructorArguments() {
    let json
    try {
        json = fs.readFileSync(path.join(__dirname, `../../deployments/addresses/constructor-arguments.json`))
    } catch (err) {
        json = '{}'
    }
    return JSON.parse(json)
}

function saveConstructorArguments(network, contract, args) {
    const argsData = getSavedConstructorArguments()
    argsData[network] = argsData[network] || {}
    argsData[network][contract] = args
    fs.writeFileSync(path.join(__dirname, `../../deployments/addresses/constructor-arguments.json`), JSON.stringify(argsData, null, '    '))
}

module.exports = {
    getSavedContractAddresses,
    saveContractAddress,
    getDeploymentBlockchain,
    saveDeploymentBlockchain,
    getSavedContractProxies,
    getSavedContractProxy,
    saveContractProxies,
    getSavedContractABI,
    saveContractAbi,
    saveContractAbiTest,
    getSavedContractProxyAbis,
    getSavedImplementationAddresses,
    getSavedImplementationAddress,
    saveImplementationAddress,
    getSavedConstructorArguments,
    saveConstructorArguments
}