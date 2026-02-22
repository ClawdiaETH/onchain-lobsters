// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Base64} from "./lib/Base64.sol";
import {PixelRenderer} from "./PixelRenderer.sol";
import {TraitDecode} from "./TraitDecode.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24  fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params)
        external payable returns (uint256 amountOut);
}

interface IWETH {
    function deposit() external payable;
    function approve(address spender, uint256 amount) external returns (bool);
}

/// @title  Onchain Lobsters
/// @notice Fully onchain generative pixel NFT. Minted via commit-reveal.
///         User pays ETH → half swaps to $CLAWDIA → burned → NFT minted.
contract OnchainLobsters is ERC721, Ownable {
    using TraitDecode for uint256;

    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant MAX_SUPPLY        = 8004;
    uint256 public constant COMMIT_WINDOW     = 100;   // blocks
    uint256 public constant PROTOCOL_BPS      = 5000;  // 50% of ETH to protocol
    address public constant DEAD              = 0x000000000000000000000000000000000000dEaD;

    // Base mainnet addresses
    address public constant WETH   = 0x4200000000000000000000000000000000000006;
    address public constant ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481; // Uniswap V3 on Base

    // ── State ────────────────────────────────────────────────────────────────
    address public immutable CLAWDIA;
    uint256 public mintPriceETH;         // in wei, configurable by owner
    uint256 public totalMinted;
    address public treasury;

    struct Commit {
        bytes32 commitment;
        uint256 blockNumber;
    }
    mapping(address => Commit)  public commits;
    mapping(uint256 => uint256) public tokenSeed;

    // ── Events ───────────────────────────────────────────────────────────────
    event Committed(address indexed minter, uint256 blockNumber);
    event Revealed(address indexed minter, uint256 indexed tokenId, uint256 seed);
    event MintPriceUpdated(uint256 newPrice);

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor(
        address _clawdia,
        uint256 _mintPriceETH,
        address _treasury
    ) ERC721("Onchain Lobsters", "LOBSTER") Ownable(msg.sender) {
        CLAWDIA      = _clawdia;
        mintPriceETH = _mintPriceETH;
        treasury     = _treasury;
    }

    // ── Mining ───────────────────────────────────────────────────────────────

    /// @notice Step 1: Commit. Pay ETH now. ETH held until reveal.
    function commit(bytes32 commitment) external payable {
        require(msg.value >= mintPriceETH,        "insufficient ETH");
        require(commits[msg.sender].blockNumber == 0, "pending commit");
        require(totalMinted < MAX_SUPPLY,         "sold out");

        commits[msg.sender] = Commit({ commitment: commitment, blockNumber: block.number });
        emit Committed(msg.sender, block.number);

        // Refund overpayment
        if (msg.value > mintPriceETH) {
            (bool ok,) = msg.sender.call{value: msg.value - mintPriceETH}("");
            require(ok, "refund failed");
        }
    }

    /// @notice Step 2: Reveal within 100 blocks. Swaps half ETH to $CLAWDIA, burns it.
    function reveal(bytes32 salt, address recipient) external {
        Commit memory c = commits[msg.sender];
        require(c.blockNumber != 0,                        "no commit");
        require(block.number > c.blockNumber,              "same block");
        require(block.number <= c.blockNumber + COMMIT_WINDOW, "expired");
        require(
            keccak256(abi.encodePacked(salt, msg.sender)) == c.commitment,
            "bad salt"
        );

        delete commits[msg.sender];

        // Derive seed from blockhash + salt + recipient + supply
        uint256 seed = uint256(keccak256(abi.encodePacked(
            blockhash(c.blockNumber),
            salt,
            recipient,
            totalMinted
        )));

        // Split ETH: 50% swap+burn $CLAWDIA, 50% → treasury
        uint256 burnHalf     = mintPriceETH / 2;
        uint256 protocolHalf = mintPriceETH - burnHalf;

        // Swap half ETH → $CLAWDIA → burn
        _swapAndBurn(burnHalf);

        // Protocol fee → treasury
        if (protocolHalf > 0 && treasury != address(0)) {
            (bool ok,) = treasury.call{value: protocolHalf}("");
            require(ok, "treasury transfer failed");
        }

        uint256 tokenId = ++totalMinted;
        tokenSeed[tokenId] = seed;
        _mint(recipient, tokenId);

        emit Revealed(msg.sender, tokenId, seed);
    }

    function _swapAndBurn(uint256 ethAmount) internal {
        if (ethAmount == 0 || CLAWDIA == address(0)) return;

        // Guard: skip swap if WETH is not deployed (e.g. local test env)
        uint256 wethSize;
        assembly { wethSize := extcodesize(0x4200000000000000000000000000000000000006) }
        if (wethSize == 0) {
            // No WETH available — fall back to treasury
            if (treasury != address(0)) {
                (bool ok,) = treasury.call{value: ethAmount}("");
                if (!ok) {} // absorb; funds stay in contract
            }
            return;
        }

        // Wrap ETH
        IWETH(WETH).deposit{value: ethAmount}();
        IWETH(WETH).approve(ROUTER, ethAmount);
        // Swap WETH → $CLAWDIA, send directly to DEAD
        try ISwapRouter(ROUTER).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn:            WETH,
                tokenOut:           CLAWDIA,
                fee:                10000, // 1% pool
                recipient:          DEAD,
                amountIn:           ethAmount,
                amountOutMinimum:   0,
                sqrtPriceLimitX96:  0
            })
        ) {} catch {
            // If swap fails, send ETH to treasury instead (graceful degradation)
            IWETH(WETH).approve(ROUTER, 0);
            if (treasury != address(0)) {
                (bool ok,) = treasury.call{value: ethAmount}("");
                if (!ok) {} // absorb
            }
        }
    }

    // ── Metadata ─────────────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        TraitDecode.Traits memory t = TraitDecode.decode(tokenSeed[tokenId]);
        string memory svg = PixelRenderer.render(t);
        string memory attrs = TraitDecode.attributes(t);
        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(string(abi.encodePacked(
                '{"name":"Onchain Lobster #', _str(tokenId),
                '","description":"Fully onchain pixel lobster. Mined with $CLAWDIA on Base.",',
                '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '",',
                '"attributes":', attrs,
                '}'
            ))))
        ));
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    function setMintPrice(uint256 _price) external onlyOwner {
        mintPriceETH = _price;
        emit MintPriceUpdated(_price);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function withdrawStuck(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            (bool ok,) = owner().call{value: amount}("");
            require(ok, "withdraw failed");
        } else {
            IERC20(token).transferFrom(address(this), owner(), amount);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    function _str(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 tmp = v; uint256 len;
        while (tmp > 0) { tmp /= 10; len++; }
        bytes memory b = new bytes(len);
        tmp = v;
        for (uint256 i = len; i > 0; i--) { b[i-1] = bytes1(uint8(48 + tmp % 10)); tmp /= 10; }
        return string(b);
    }

    receive() external payable {}
}
