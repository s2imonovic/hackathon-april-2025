// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {RevertContext, RevertOptions} from "@zetachain/protocol-contracts/contracts/Revert.sol";
import "@zetachain/protocol-contracts/contracts/evm/GatewayEVM.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CallbackConnector is Ownable {
    GatewayEVM public immutable gateway;
    address public universalContract;

    // Events
    event CallbackReceived(uint256 indexed orderId);
    event CallbackSent(uint256 indexed orderId);
    event RevertEvent(string, RevertContext);
    event HelloEvent(string, string);

    error Unauthorized();

    modifier onlyGateway() {
        if (msg.sender != address(gateway)) revert Unauthorized();
        _;
    }

    constructor(address payable gatewayAddress, address _universalContract) Ownable(msg.sender) {
        gateway = GatewayEVM(gatewayAddress);
        universalContract = _universalContract;
    }

    // Set the universal contract address
    function setUniversalContract(address _universalContract) external onlyOwner {
        universalContract = _universalContract;
    }

    // simply call back to ZetaOrderBook contract
    function priceCheckCallback(uint256 orderId) internal onlyGateway {
        emit CallbackReceived(orderId);

        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: address(0),
            callOnRevert: false,
            abortAddress: address(0),
            revertMessage: "",
            onRevertGasLimit: 300000
        });

        // Create message for callback
        bytes memory message = abi.encodeWithSignature(
            "checkAndExecuteOrder(uint256)",
            orderId
        );

        // Immediately call back to ZetaChain
        gateway.call(
            universalContract,
            message,
            revertOptions
        );

        emit CallbackSent(orderId);
    }

    // Required gateway interface methods
    function onCall(
        MessageContext calldata context,
        bytes calldata message
    ) external payable onlyGateway returns (bytes4) {
        uint256 orderId = abi.decode(message[4:], (uint256));
        priceCheckCallback(orderId);
        return "";
    }

    function onRevert(
        RevertContext calldata revertContext
    ) external onlyGateway {
        emit RevertEvent("Revert from ZetaChain", revertContext);
    }

    // Fallback function
    fallback() external payable {}
}
