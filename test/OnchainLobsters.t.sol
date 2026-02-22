// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {OnchainLobsters} from "../contracts/OnchainLobsters.sol";
import {TraitDecode} from "../contracts/TraitDecode.sol";
import {PixelRenderer} from "../contracts/PixelRenderer.sol";
import {PixelRendererOverlay} from "../contracts/PixelRendererOverlay.sol";

// Minimal ERC20 mock for tests
contract MockCLAWDIA {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    function mint(address to, uint256 amount) external { balanceOf[to] += amount; }
    function approve(address s, uint256 a) external returns (bool) { allowance[msg.sender][s] = a; return true; }
    function transferFrom(address f, address t, uint256 a) external returns (bool) {
        require(allowance[f][msg.sender] >= a, "allowance");
        allowance[f][msg.sender] -= a;
        balanceOf[f] -= a;
        balanceOf[t] += a;
        return true;
    }
}

contract OnchainLobstersTest is Test {
    OnchainLobsters       public nft;
    PixelRenderer         public renderer;
    PixelRendererOverlay  public overlay;
    MockCLAWDIA           public clawdia;
    address public user = address(0xBEEF);
    address public treasury = address(0xFEED);
    uint256 public constant MINT_PRICE = 0.005 ether;

    function setUp() public {
        clawdia  = new MockCLAWDIA();
        overlay  = new PixelRendererOverlay();
        renderer = new PixelRenderer(address(overlay));
        nft = new OnchainLobsters(address(clawdia), MINT_PRICE, treasury, address(renderer));
        vm.deal(user, 10 ether);
    }

    // ─── Commit / Reveal ─────────────────────────────────────────────────────

    function _commit(bytes32 salt) internal returns (bytes32 commitment) {
        commitment = keccak256(abi.encodePacked(salt, user));
        vm.prank(user);
        nft.commit{value: MINT_PRICE}(commitment);
    }

    function testCommitRevealHappyPath() public {
        bytes32 salt = keccak256("test-salt-1");
        _commit(salt);

        vm.roll(block.number + 2);
        vm.prank(user);
        nft.reveal(salt, user);

        assertEq(nft.totalMinted(), 1);
        assertEq(nft.ownerOf(1), user);
    }

    function testCommitStoresPendingState() public {
        bytes32 salt = keccak256("test-salt-2");
        bytes32 commitment = _commit(salt);
        (bytes32 stored, uint256 bn) = nft.commits(user);
        assertEq(stored, commitment);
        assertEq(bn, block.number);
    }

    function testCannotDoubleCommit() public {
        bytes32 salt = keccak256("test-salt-3");
        _commit(salt);
        vm.prank(user);
        vm.expectRevert("pending commit");
        nft.commit{value: MINT_PRICE}(keccak256(abi.encodePacked(keccak256("other"), user)));
    }

    function testRevealSameBlockReverts() public {
        bytes32 salt = keccak256("test-salt-4");
        _commit(salt);
        vm.prank(user);
        vm.expectRevert("same block");
        nft.reveal(salt, user);
    }

    function testRevealExpiredReverts() public {
        bytes32 salt = keccak256("test-salt-5");
        _commit(salt);
        vm.roll(block.number + 101); // past 100 block window
        vm.prank(user);
        vm.expectRevert("expired");
        nft.reveal(salt, user);
    }

    function testBadSaltReverts() public {
        bytes32 salt = keccak256("test-salt-6");
        _commit(salt);
        vm.roll(block.number + 2);
        vm.prank(user);
        vm.expectRevert("bad salt");
        nft.reveal(keccak256("wrong-salt"), user);
    }

    function testNoCommitReverts() public {
        vm.prank(user);
        vm.expectRevert("no commit");
        nft.reveal(keccak256("any"), user);
    }

    function testInsufficientETHReverts() public {
        vm.prank(user);
        vm.expectRevert("insufficient ETH");
        nft.commit{value: MINT_PRICE - 1}(keccak256("x"));
    }

    function testOverpaymentRefunded() public {
        uint256 before = user.balance;
        bytes32 commitment = keccak256(abi.encodePacked(keccak256("s"), user));
        vm.prank(user);
        nft.commit{value: MINT_PRICE + 0.1 ether}(commitment);
        assertApproxEqAbs(user.balance, before - MINT_PRICE, 1e6); // allow small gas cost
    }

    // ─── Trait Decode ────────────────────────────────────────────────────────

    function testDecodeAllMutations() public pure {
        for (uint8 m = 0; m < 8; m++) {
            // Construct a seed that forces mutation m
            // Mutation uses bits 0-7, weight thresholds: 102,127,148,163,176,207,217,255
            uint256 seed = uint256(m) * 30; // rough approximation — just test no-revert
            TraitDecode.Traits memory t = TraitDecode.decode(seed);
            // Should not revert and return valid range
            assert(t.mutation < 8);
        }
    }

    function testDecodeSpecialGhost() public pure {
        // bits 57-63 < 10 → Ghost (mutation=3, eyes=4, scene=7)
        // Construct seed with sp=5 (bits 57-64 = 5)
        uint256 seed = uint256(5) << 57;
        TraitDecode.Traits memory t = TraitDecode.decode(seed);
        assertEq(t.special, 1); // Ghost
        assertEq(t.mutation, 3);
        assertEq(t.eyes, 4);
        assertEq(t.scene, 7);
    }

    function testDecodeSpecialInfernal() public pure {
        uint256 seed = uint256(15) << 57;
        TraitDecode.Traits memory t = TraitDecode.decode(seed);
        assertEq(t.special, 2); // Infernal
    }

    function testDecodeSpecialCelestial() public pure {
        uint256 seed = uint256(20) << 57;
        TraitDecode.Traits memory t = TraitDecode.decode(seed);
        assertEq(t.special, 3); // Celestial
    }

    function testDecodeSpecialNounish() public pure {
        uint256 seed = uint256(23) << 57;
        TraitDecode.Traits memory t = TraitDecode.decode(seed);
        assertEq(t.special, 4); // Nounish
    }

    function testDecodeSpecialDoodled() public pure {
        uint256 seed = uint256(30) << 57;
        TraitDecode.Traits memory t = TraitDecode.decode(seed);
        assertEq(t.special, 5); // Doodled
    }

    // ─── Renderer ────────────────────────────────────────────────────────────

    function testRenderNoRevert() public view {
        TraitDecode.Traits memory t = TraitDecode.Traits({
            mutation: 0, scene: 0, marking: 0, claws: 0, eyes: 0,
            accessory: 0, tailVariant: 0, brokenAntenna: false, special: 0
        });
        string memory svg = renderer.render(t);
        assertTrue(bytes(svg).length > 0);
        // Must start with SVG tag
        bytes memory b = bytes(svg);
        assertEq(b[0], '<');
        assertEq(b[1], 's');
        assertEq(b[2], 'v');
        assertEq(b[3], 'g');
    }

    // ─── Individual mutation renders (avoid MemoryOOG from looping) ──────────

    function _renderTrait(TraitDecode.Traits memory t) internal view {
        string memory svg = renderer.render(t);
        assertTrue(bytes(svg).length > 100, "SVG too short");
    }
    function _baseTraits() internal pure returns (TraitDecode.Traits memory) {
        return TraitDecode.Traits({mutation:0, scene:0, marking:0, claws:0, eyes:0,
            accessory:0, tailVariant:0, brokenAntenna:false, special:0});
    }

    // Mutations
    function testRenderMutation0() public view { TraitDecode.Traits memory t = _baseTraits(); t.mutation = 0; _renderTrait(t); }
    function testRenderMutation1() public view { TraitDecode.Traits memory t = _baseTraits(); t.mutation = 1; _renderTrait(t); }
    function testRenderMutation2() public view { TraitDecode.Traits memory t = _baseTraits(); t.mutation = 2; _renderTrait(t); }
    function testRenderMutation3() public view { TraitDecode.Traits memory t = _baseTraits(); t.mutation = 3; _renderTrait(t); }
    function testRenderMutation4() public view { TraitDecode.Traits memory t = _baseTraits(); t.mutation = 4; _renderTrait(t); }
    function testRenderMutation5() public view { TraitDecode.Traits memory t = _baseTraits(); t.mutation = 5; _renderTrait(t); }
    function testRenderMutation6() public view { TraitDecode.Traits memory t = _baseTraits(); t.mutation = 6; _renderTrait(t); }
    function testRenderMutation7() public view { TraitDecode.Traits memory t = _baseTraits(); t.mutation = 7; _renderTrait(t); }

    // Scenes
    function testRenderScene0() public view { TraitDecode.Traits memory t = _baseTraits(); t.scene = 0; _renderTrait(t); }
    function testRenderScene1() public view { TraitDecode.Traits memory t = _baseTraits(); t.scene = 1; _renderTrait(t); }
    function testRenderScene2() public view { TraitDecode.Traits memory t = _baseTraits(); t.scene = 2; _renderTrait(t); }
    function testRenderScene3() public view { TraitDecode.Traits memory t = _baseTraits(); t.scene = 3; _renderTrait(t); }
    function testRenderScene4() public view { TraitDecode.Traits memory t = _baseTraits(); t.scene = 4; _renderTrait(t); }
    function testRenderScene5() public view { TraitDecode.Traits memory t = _baseTraits(); t.scene = 5; _renderTrait(t); }
    function testRenderScene6() public view { TraitDecode.Traits memory t = _baseTraits(); t.scene = 6; _renderTrait(t); }
    function testRenderScene7() public view { TraitDecode.Traits memory t = _baseTraits(); t.scene = 7; _renderTrait(t); }

    // Eyes
    function testRenderEyes0() public view { TraitDecode.Traits memory t = _baseTraits(); t.eyes = 0; _renderTrait(t); }
    function testRenderEyes1() public view { TraitDecode.Traits memory t = _baseTraits(); t.eyes = 1; _renderTrait(t); }
    function testRenderEyes2() public view { TraitDecode.Traits memory t = _baseTraits(); t.eyes = 2; _renderTrait(t); }
    function testRenderEyes3() public view { TraitDecode.Traits memory t = _baseTraits(); t.eyes = 3; _renderTrait(t); }
    function testRenderEyes4() public view { TraitDecode.Traits memory t = _baseTraits(); t.eyes = 4; _renderTrait(t); }
    function testRenderEyes5() public view { TraitDecode.Traits memory t = _baseTraits(); t.eyes = 5; _renderTrait(t); }
    function testRenderEyes6() public view { TraitDecode.Traits memory t = _baseTraits(); t.eyes = 6; _renderTrait(t); }

    // Accessories
    function testRenderAcc0()  public view { TraitDecode.Traits memory t = _baseTraits(); t.accessory = 0;  _renderTrait(t); }
    function testRenderAcc1()  public view { TraitDecode.Traits memory t = _baseTraits(); t.accessory = 1;  _renderTrait(t); }
    function testRenderAcc2()  public view { TraitDecode.Traits memory t = _baseTraits(); t.accessory = 2;  _renderTrait(t); }
    function testRenderAcc3()  public view { TraitDecode.Traits memory t = _baseTraits(); t.accessory = 3;  _renderTrait(t); }
    function testRenderAcc4()  public view { TraitDecode.Traits memory t = _baseTraits(); t.accessory = 4;  _renderTrait(t); }
    function testRenderAcc5()  public view { TraitDecode.Traits memory t = _baseTraits(); t.accessory = 5;  _renderTrait(t); }
    function testRenderAcc6()  public view { TraitDecode.Traits memory t = _baseTraits(); t.accessory = 6;  _renderTrait(t); }
    function testRenderAcc7()  public view { TraitDecode.Traits memory t = _baseTraits(); t.accessory = 7;  _renderTrait(t); }
    function testRenderAcc8()  public view { TraitDecode.Traits memory t = _baseTraits(); t.accessory = 8;  _renderTrait(t); }
    function testRenderAcc9()  public view { TraitDecode.Traits memory t = _baseTraits(); t.accessory = 9;  _renderTrait(t); }
    function testRenderAcc10() public view { TraitDecode.Traits memory t = _baseTraits(); t.accessory = 10; _renderTrait(t); }

    function testRenderCalico() public view {
        // Calico mutation (5) — left x<20 uses red (C84820), right x>=20 uses blue (1A4E8C)
        TraitDecode.Traits memory t = TraitDecode.Traits({
            mutation: 5, scene: 0, marking: 0, claws: 0, eyes: 0,
            accessory: 0, tailVariant: 0, brokenAntenna: false, special: 0
        });
        string memory svg = renderer.render(t);
        assertTrue(bytes(svg).length > 100);
        // Search entire SVG for both base colors
        bytes memory b = bytes(svg);
        bool hasRed = false; bool hasBlue = false;
        uint256 len = b.length;
        for (uint256 i = 0; i + 2 < len; i++) {
            if (b[i] == 'C' && b[i+1] == '8' && b[i+2] == '4') hasRed = true;
            if (b[i] == '1' && b[i+1] == 'A' && b[i+2] == '4') hasBlue = true;
            if (hasRed && hasBlue) break;
        }
        assertTrue(hasRed,  "Calico missing red  (C84...)");
        assertTrue(hasBlue, "Calico missing blue (1A4...)");
    }

    function testTokenURIReturnsValidBase64() public {
        bytes32 salt = keccak256("uri-test");
        _commit(salt);
        vm.roll(block.number + 2);
        vm.prank(user);
        nft.reveal(salt, user);

        string memory uri = nft.tokenURI(1);
        bytes memory b = bytes(uri);
        assertTrue(b.length > 200, "tokenURI too short");

        // "data:application/json,{"  (raw JSON — no outer base64 to save gas for OpenSea)
        //  d(0)a(1)t(2)a(3):(4)...j(17)s(18)o(19)n(20),(21)
        assertEq(b[0],  'd'); // d
        assertEq(b[1],  'a'); // a
        assertEq(b[2],  't'); // t
        assertEq(b[3],  'a'); // a
        assertEq(b[4],  ':'); // :
        assertEq(b[17], 'j'); // json
        assertEq(b[21], ','); // comma after "data:application/json"
        assertEq(b[22], '{'); // opening brace of raw JSON
    }

    function testTokenURINonexistentReverts() public {
        vm.expectRevert();
        nft.tokenURI(999);
    }

    // ─── Fee Routing ──────────────────────────────────────────────────────────

    /// @notice After commit+reveal, 100% of mintPriceETH reaches the treasury.
    ///         In the test environment the PoolManager has no code, so _swapAndBurn
    ///         falls back via _sendToTreasury, meaning BOTH halves land at treasury.
    function test_fee_routing() public {
        uint256 before = treasury.balance;

        bytes32 salt = keccak256("fee-routing-test");
        bytes32 commitment = keccak256(abi.encodePacked(salt, user));
        vm.prank(user);
        nft.commit{value: MINT_PRICE}(commitment);

        vm.roll(block.number + 2);
        vm.prank(user);
        nft.reveal(salt, user);

        // In test env (no PoolManager): burnHalf goes to treasury via fallback + protocolHalf
        // goes directly — total = mintPriceETH
        assertEq(treasury.balance - before, MINT_PRICE, "treasury did not receive full mint price");
    }

    /// @notice Confirm treasury address is set correctly and ETH routing uses it.
    function test_fee_routing_treasury_address() public {
        assertEq(nft.treasury(), address(0xFEED), "treasury mismatch");
    }

    // ─── Direct Mint (bankrbot) ───────────────────────────────────────────────

    function test_mintDirect_disabledByDefault() public {
        vm.prank(user);
        vm.expectRevert("direct mint disabled");
        nft.mintDirect{value: MINT_PRICE}(user);
    }

    function test_mintDirect_happyPath() public {
        nft.setBankrbotEnabled(true);

        uint256 treasuryBefore = treasury.balance;
        vm.prank(user);
        nft.mintDirect{value: MINT_PRICE}(user);

        assertEq(nft.totalMinted(), 1, "totalMinted should be 1");
        assertEq(nft.ownerOf(1), user, "user should own token 1");
        // In test env: both halves go to treasury
        assertEq(treasury.balance - treasuryBefore, MINT_PRICE, "treasury did not receive full mint price");
    }

    function test_mintDirect_feeRouting() public {
        nft.setBankrbotEnabled(true);
        uint256 before = treasury.balance;

        vm.prank(user);
        nft.mintDirect{value: MINT_PRICE}(user);

        assertEq(treasury.balance - before, MINT_PRICE, "mintDirect: treasury did not receive full mint price");
    }

    function test_mintDirect_overpayRefunded() public {
        nft.setBankrbotEnabled(true);
        uint256 before = user.balance;

        vm.prank(user);
        nft.mintDirect{value: MINT_PRICE + 0.1 ether}(user);

        assertApproxEqAbs(user.balance, before - MINT_PRICE, 1e6, "excess not refunded");
    }

    function test_mintDirect_insufficientETH() public {
        nft.setBankrbotEnabled(true);
        vm.prank(user);
        vm.expectRevert("insufficient ETH");
        nft.mintDirect{value: MINT_PRICE - 1}(user);
    }

    // ─── OpenSea / ERC-165 ────────────────────────────────────────────────────

    function test_supportsInterface_ERC721() public view {
        // ERC-721 interface ID
        assertTrue(nft.supportsInterface(0x80ac58cd), "should support ERC721");
    }

    function test_supportsInterface_ERC721Metadata() public view {
        // ERC-721Metadata interface ID
        assertTrue(nft.supportsInterface(0x5b5e139f), "should support ERC721Metadata");
    }

    function test_contractURI_returnsBase64JSON() public view {
        string memory uri = nft.contractURI();
        bytes memory b = bytes(uri);
        // "data:application/json,{"  (raw JSON — no outer base64)
        assertEq(b[0],  'd');
        assertEq(b[4],  ':');
        assertEq(b[17], 'j'); // "json"
        assertEq(b[21], ','); // comma after "data:application/json"
        assertEq(b[22], '{'); // opening brace of raw JSON
        assertTrue(b.length > 200, "contractURI too short");
    }

    function test_transferEvent_fromZero() public {
        bytes32 salt = keccak256("transfer-event-test");
        bytes32 commitment = keccak256(abi.encodePacked(salt, user));
        vm.prank(user);
        nft.commit{value: MINT_PRICE}(commitment);
        vm.roll(block.number + 2);

        // ERC-721 Transfer event: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
        vm.expectEmit(true, true, true, false);
        emit Transfer(address(0), user, 1);

        vm.prank(user);
        nft.reveal(salt, user);
    }

    // Declare Transfer event to use with expectEmit
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
}
