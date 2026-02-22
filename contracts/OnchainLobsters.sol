// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Base64} from "./lib/Base64.sol";
import {TraitDecode} from "./TraitDecode.sol";

interface IPixelRenderer {
    function render(TraitDecode.Traits memory t) external view returns (string memory);
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IERC20Burnable is IERC20 {
    function burn(uint256 amount) external;
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

// ── Uniswap V4 ────────────────────────────────────────────────────────────────

/// @dev BalanceDelta is int256 with amount0 in upper 128 bits, amount1 in lower 128 bits.
///      Positive = PoolManager owes caller; Negative = caller owes PoolManager.

interface IPoolManager {
    struct PoolKey {
        address currency0;   // lower address (WETH = 0x4200...0006)
        address currency1;   // higher address (CLAWDIA)
        uint24  fee;         // 10000 = 1%
        int24   tickSpacing;
        address hooks;
    }
    struct SwapParams {
        bool    zeroForOne;
        int256  amountSpecified;   // negative = exact input
        uint160 sqrtPriceLimitX96;
    }
    function unlock(bytes calldata data) external returns (bytes memory);
    function swap(PoolKey calldata key, SwapParams calldata params, bytes calldata hookData)
        external returns (int256 delta);                    // BalanceDelta as int256
    function settle() external payable returns (uint256);
    function take(address currency, address to, uint256 amount) external;
}

interface IUnlockCallback {
    function unlockCallback(bytes calldata data) external returns (bytes memory);
}

/// @title  Onchain Lobsters
/// @notice Fully onchain generative pixel NFT. Minted via commit-reveal.
///         User pays ETH → half swaps to $CLAWDIA via Uniswap V4 → burned → NFT minted.
contract OnchainLobsters is ERC721, Ownable, IUnlockCallback {
    using TraitDecode for uint256;

    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant MAX_SUPPLY    = 8004;
    uint256 public constant COMMIT_WINDOW = 100; // blocks

    // Base mainnet addresses
    address public constant WETH         = 0x4200000000000000000000000000000000000006;
    address public constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b; // Uniswap V4

    /// @dev TickMath.MIN_SQRT_PRICE + 1 — safe lower bound for zeroForOne swaps
    uint160 internal constant MIN_SQRT_PRICE_PLUS_ONE = 4295128740;

    // ── Immutables ────────────────────────────────────────────────────────────
    address public immutable CLAWDIA;
    address public immutable RENDERER;

    // ── State ─────────────────────────────────────────────────────────────────
    uint256 public mintPriceETH;
    uint256 public totalMinted;
    address public treasury;

    /// @notice Uniswap V4 pool key for WETH/CLAWDIA swap.
    ///         Owner can update if pool migrates or hook changes.
    IPoolManager.PoolKey public clawdiaPoolKey;

    struct Commit {
        bytes32 commitment;
        uint256 blockNumber;
    }
    mapping(address => Commit)  public commits;
    mapping(uint256 => uint256) public tokenSeed;

    // ── Events ────────────────────────────────────────────────────────────────
    event Committed(address indexed minter, uint256 blockNumber);
    event Revealed(address indexed minter, uint256 indexed tokenId, uint256 seed);
    event ClawdiaBurned(uint256 indexed tokenId, uint256 clawdiaAmount);
    event MintPriceUpdated(uint256 newPrice);
    event PoolKeyUpdated(uint24 fee, int24 tickSpacing, address hooks);

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(
        address _clawdia,
        uint256 _mintPriceETH,
        address _treasury,
        address _renderer
    ) ERC721("Onchain Lobsters", "LOBSTER") Ownable(msg.sender) {
        CLAWDIA      = _clawdia;
        mintPriceETH = _mintPriceETH;
        treasury     = _treasury;
        RENDERER     = _renderer;

        // Default pool key: WETH/CLAWDIA, 1% static fee, tickSpacing=200
        // Clanker feeStaticHook on Base — update if wrong via setPoolKey()
        clawdiaPoolKey = IPoolManager.PoolKey({
            currency0:   WETH,
            currency1:   _clawdia,
            fee:         0x800000, // dynamic fee flag — actual fee set by Clanker feeStaticHookV2
            tickSpacing: 200,
            hooks:       0xb429d62f8f3bFFb98CdB9569533eA23bF0Ba28CC // Clanker feeStaticHookV2 on Base
        });
    }

    // ── Minting ───────────────────────────────────────────────────────────────

    /// @notice Step 1: Commit. Pay ETH now. Held until reveal.
    function commit(bytes32 commitment) external payable {
        require(msg.value >= mintPriceETH,           "insufficient ETH");
        require(commits[msg.sender].blockNumber == 0, "pending commit");
        require(totalMinted < MAX_SUPPLY,             "sold out");

        commits[msg.sender] = Commit({commitment: commitment, blockNumber: block.number});
        emit Committed(msg.sender, block.number);

        if (msg.value > mintPriceETH) {
            (bool ok,) = msg.sender.call{value: msg.value - mintPriceETH}("");
            require(ok, "refund failed");
        }
    }

    /// @notice Step 2: Reveal within 100 blocks. Swaps half ETH to $CLAWDIA and burns it.
    function reveal(bytes32 salt, address recipient) external {
        Commit memory c = commits[msg.sender];
        require(c.blockNumber != 0,                          "no commit");
        require(block.number > c.blockNumber,                "same block");
        require(block.number <= c.blockNumber + COMMIT_WINDOW, "expired");
        require(
            keccak256(abi.encodePacked(salt, msg.sender)) == c.commitment,
            "bad salt"
        );

        delete commits[msg.sender];

        uint256 seed = uint256(keccak256(abi.encodePacked(
            blockhash(c.blockNumber),
            salt,
            recipient,
            totalMinted
        )));

        uint256 burnHalf     = mintPriceETH / 2;
        uint256 protocolHalf = mintPriceETH - burnHalf;

        uint256 tokenId = ++totalMinted;

        // Swap half ETH → $CLAWDIA → burn
        uint256 burned = _swapAndBurn(burnHalf);
        if (burned > 0) emit ClawdiaBurned(tokenId, burned);

        // Protocol half → treasury
        if (protocolHalf > 0 && treasury != address(0)) {
            (bool ok,) = treasury.call{value: protocolHalf}("");
            require(ok, "treasury transfer failed");
        }

        tokenSeed[tokenId] = seed;
        _mint(recipient, tokenId);

        emit Revealed(msg.sender, tokenId, seed);
    }

    // ── Swap & Burn ───────────────────────────────────────────────────────────

    /// @dev Wraps ETH → WETH, swaps WETH→CLAWDIA via V4, burns CLAWDIA.
    ///      Falls back to treasury if PoolManager is not deployed (test env) or swap fails.
    function _swapAndBurn(uint256 ethAmount) internal returns (uint256 burned) {
        if (ethAmount == 0 || CLAWDIA == address(0)) return 0;

        // Skip swap in test environments where PoolManager is not deployed
        uint256 pmSize;
        assembly { pmSize := extcodesize(0x498581fF718922c3f8e6A244956aF099B2652b2b) }
        if (pmSize == 0) {
            _sendToTreasury(ethAmount);
            return 0;
        }

        // Wrap ETH → WETH (no approval needed; we push WETH to PoolManager via transfer)
        IWETH(WETH).deposit{value: ethAmount}();

        try IPoolManager(POOL_MANAGER).unlock(abi.encode(ethAmount)) returns (bytes memory result) {
            if (result.length == 32) {
                burned = abi.decode(result, (uint256));
                if (burned > 0) {
                    IERC20Burnable(CLAWDIA).burn(burned);
                }
            }
        } catch {
            // Swap failed: unwrap WETH back to ETH and send to treasury
            uint256 wethBal = _wethBalance();
            if (wethBal > 0) IWETH(WETH).withdraw(wethBal);
            _sendToTreasury(address(this).balance > ethAmount ? ethAmount : address(this).balance);
        }
    }

    /// @inheritdoc IUnlockCallback
    /// @dev Called by PoolManager during unlock(). Executes the WETH→CLAWDIA swap.
    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        require(msg.sender == POOL_MANAGER, "not pool manager");

        uint256 wethIn = abi.decode(data, (uint256));

        // Execute swap: WETH (currency0) → CLAWDIA (currency1), exact input
        int256 delta = IPoolManager(POOL_MANAGER).swap(
            clawdiaPoolKey,
            IPoolManager.SwapParams({
                zeroForOne:        true,
                amountSpecified:   -int256(wethIn),  // negative = exact input
                sqrtPriceLimitX96: MIN_SQRT_PRICE_PLUS_ONE
            }),
            ""
        );

        // BalanceDelta packing: upper 128 bits = amount0 (WETH), lower 128 bits = amount1 (CLAWDIA)
        // Negative = caller owes pool; Positive = pool owes caller
        int128 amount0;
        int128 amount1;
        assembly {
            amount0 := sar(128, delta)   // arithmetic right-shift: extracts upper int128
            amount1 := signextend(15, delta) // sign-extend lower 128 bits
        }

        // Settle WETH debt: transfer WETH to PoolManager, then call settle()
        if (amount0 < 0) {
            uint256 wethOwed = uint256(uint128(-amount0));
            bool ok = IERC20(WETH).transfer(POOL_MANAGER, wethOwed);
            require(ok, "WETH transfer failed");
            IPoolManager(POOL_MANAGER).settle();
        }

        // Take CLAWDIA from PoolManager
        uint256 clawdiaOut = 0;
        if (amount1 > 0) {
            clawdiaOut = uint256(uint128(amount1));
            IPoolManager(POOL_MANAGER).take(CLAWDIA, address(this), clawdiaOut);
        }

        return abi.encode(clawdiaOut);
    }

    // ── Metadata ──────────────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        TraitDecode.Traits memory t = TraitDecode.decode(tokenSeed[tokenId]);
        string memory svg   = IPixelRenderer(RENDERER).render(t);
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

    // ── Admin ─────────────────────────────────────────────────────────────────

    /// @notice Update the Uniswap V4 pool key used for CLAWDIA swaps.
    ///         Call this after deployment if the default hook address is wrong.
    function setPoolKey(uint24 fee, int24 tickSpacing, address hooks) external onlyOwner {
        clawdiaPoolKey.fee         = fee;
        clawdiaPoolKey.tickSpacing = tickSpacing;
        clawdiaPoolKey.hooks       = hooks;
        emit PoolKeyUpdated(fee, tickSpacing, hooks);
    }

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
            IERC20(token).transfer(owner(), amount);
        }
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _sendToTreasury(uint256 amount) internal {
        if (amount > 0 && treasury != address(0)) {
            (bool ok,) = treasury.call{value: amount}("");
            if (!ok) {} // absorb; ETH stays in contract
        }
    }

    function _wethBalance() internal view returns (uint256) {
        (bool ok, bytes memory data) = WETH.staticcall(
            abi.encodeWithSignature("balanceOf(address)", address(this))
        );
        if (!ok || data.length < 32) return 0;
        return abi.decode(data, (uint256));
    }

    function _str(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 tmp = v;
        uint256 len;
        while (tmp > 0) { tmp /= 10; len++; }
        bytes memory b = new bytes(len);
        tmp = v;
        for (uint256 i = len; i > 0; i--) { b[i-1] = bytes1(uint8(48 + tmp % 10)); tmp /= 10; }
        return string(b);
    }

    receive() external payable {}
}
