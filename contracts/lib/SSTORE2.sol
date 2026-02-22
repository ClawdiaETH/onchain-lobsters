// SPDX-License-Identifier: MIT
// Adapted from solmate SSTORE2
pragma solidity ^0.8.20;

library SSTORE2 {
    error InvalidPointer();

    // Prefix: STOP opcode prevents execution if called directly
    bytes internal constant CREATION_CODE_PREFIX = hex"00";

    function write(bytes memory data) internal returns (address pointer) {
        bytes memory creationCode = abi.encodePacked(
            hex"600B5981380380925939F3", // deploy bytecode
            CREATION_CODE_PREFIX,
            data
        );
        assembly {
            pointer := create(0, add(creationCode, 32), mload(creationCode))
        }
        if (pointer == address(0)) revert InvalidPointer();
    }

    function read(address pointer) internal view returns (bytes memory data) {
        assembly {
            let size := extcodesize(pointer)
            if iszero(size) { revert(0, 0) }
            // Skip the 1-byte STOP prefix
            size := sub(size, 1)
            data := mload(0x40)
            mstore(0x40, add(data, add(size, 0x20)))
            mstore(data, size)
            extcodecopy(pointer, add(data, 0x20), 1, size)
        }
    }

    function read(address pointer, uint256 start, uint256 end) internal view returns (bytes memory data) {
        uint256 ptrSize;
        assembly { ptrSize := extcodesize(pointer) }
        uint256 size = ptrSize - 1;
        if (end > size) end = size;
        uint256 len = end - start;
        assembly {
            data := mload(0x40)
            mstore(0x40, add(data, add(len, 0x20)))
            mstore(data, len)
            extcodecopy(pointer, add(data, 0x20), add(start, 1), len)
        }
    }
}
