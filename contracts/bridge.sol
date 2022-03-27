// SPDX-License-Identifier: MIT

pragma solidity ^0.8.1;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./IERC20Token.sol";

contract Bridge is AccessControl {

enum SwapState {
    EMPTY,
    SWAPPED,
    REDEEMED
}

struct Swap {
    uint256 nonce;
    SwapState state;
}

struct TokenInfo {
    address tokenAddress;
    string symbol;
}
address validator;
mapping(bytes32 => Swap) public swapByHash;
bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
string[] public tokenSymbols;
mapping(string => TokenInfo) public tokenBySymbol;
mapping(uint256 => bool) public isChainActiveById;
event SwapRedeemed(address indexed initiator, address recipient, uint256 initTimestamp);
event SwapInitialized(address indexed initiator, address recipient, uint256 initTimestamp, uint256 amount, uint256 chainFrom, uint256 chainTo, uint256 nonce, string symbol);

//-----------------------------------------------------------------------------------------------------------------

constructor() {
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _setupRole(ADMIN_ROLE, msg.sender);
    _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
}

//-----------------------------------------------------------------------------------------------------------------

function getChainID() public view returns (uint256 id) {
    assembly {
        id := chainid()
    }
}
//-----------------------------------------------------------------------------------------------------------------

function includeToken(string memory _symbol, address _tokenAddress) external /////onlyRole(ADMIN_ROLE)
{
    tokenBySymbol[_symbol] = TokenInfo({tokenAddress: _tokenAddress, symbol: _symbol});
    tokenSymbols.push(_symbol);
}
//-----------------------------------------------------------------------------------------------------------------

function excludeToken(string memory _symbol) external ///onlyRole(ADMIN_ROLE) 
{ 
    delete tokenBySymbol[_symbol];
    bytes32 symbol = keccak256(abi.encodePacked(_symbol));
    for (uint256 i; i < tokenSymbols.length; i++) {
        if (keccak256(abi.encodePacked(tokenSymbols[i])) == symbol) {
            tokenSymbols[i] = tokenSymbols[tokenSymbols.length - 1];
            tokenSymbols.pop();
        }
    }
}
//-----------------------------------------------------------------------------------------------------------------

function updateChainById(uint256 _chainId, bool _isActive) external ///onlyRole(ADMIN_ROLE)
{
    isChainActiveById[_chainId] = _isActive;
}
//-----------------------------------------------------------------------------------------------------------------

function swap(address _recipient, uint256 _amount, uint256 _chainTo, uint256 _nonce, string memory _symbol) external {
    require(_recipient != address(0), "Bridge: Recipient shouldn't be null address");
    require(_amount > 0, "Bridge: Amount should begreater than null");
    uint256 chainFrom_ = getChainID();
    require(_chainTo != chainFrom_, "Bridge: Invalid chainTo is same with current bridge chain");
    require(isChainActiveById[_chainTo], "Bridge: Destination chain is not active");
    bytes32 hash_ = keccak256(abi.encodePacked( _recipient, _amount, chainFrom_, _chainTo, _nonce, _symbol));
    TokenInfo memory token = tokenBySymbol[_symbol];
    require(token.tokenAddress != address(0), "Bridge: Token does not exist");
    ITokenERC20(token.tokenAddress).burn(msg.sender, _amount);
    swapByHash[hash_] = Swap({nonce: _nonce, state: SwapState.SWAPPED});
    emit SwapInitialized(msg.sender, _recipient, block.timestamp, _amount, chainFrom_, _chainTo, _nonce, _symbol);
}
//-----------------------------------------------------------------------------------------------------------------
function splitSignature(bytes memory sig) public  returns (uint8, bytes32, bytes32)
{
    require(sig.length == 65);

    bytes32 r;
    bytes32 s;
    uint8 v;

    assembly {
        r := mload(add(sig, 32))
        s := mload(add(sig, 64))
        v := byte(0, mload(add(sig, 96)))
    }

    return (v, r, s);
}
//-----------------------------------------------------------------------------------------------------------------

function hashMessage(bytes memory message) pure internal returns (bytes32) {
  bytes memory prefix =  "\x19Ethereum Signed Message:\n32";
  keccak256(abi.encodePacked(prefix, message));
}
//-----------------------------------------------------------------------------------------------------------------

function redeem(address _recipient, uint256 _amount, uint256 _chainFrom, uint256 _nonce, string memory _symbol, bytes calldata _signature) public 
{
    require(_recipient != address(0), "Bridge: Recipient shouldn't be null address");
    require(_amount > 0, "Bridge: Amount should begreater than null");
    uint256 chainTo_ = getChainID();
    require(isChainActiveById[_chainFrom], "Bridge: Initial chain is not active");
    bytes32 hash_ = keccak256(abi.encodePacked( _recipient, _amount, _chainFrom, chainTo_, _nonce, _symbol));
    require(swapByHash[hash_].state == SwapState.EMPTY, "Bridge: Redeem with given params already exists");
    (uint8 v, bytes32 s, bytes32 r) =  splitSignature(_signature);
    address validatorAddress_ = ecrecover(hash_, v, s, r);
    require(validatorAddress_ != _recipient, "Bridge: This address does equal recipient");
    TokenInfo memory token = tokenBySymbol[_symbol];
    require(token.tokenAddress != address(0), "Bridge: Token does not exist");
    ITokenERC20(token.tokenAddress).mint(_recipient, _amount);
    swapByHash[hash_] = Swap({nonce: _nonce, state: SwapState.REDEEMED});
    emit SwapRedeemed(msg.sender, _recipient, block.timestamp);
}
//-----------------------------------------------------------------------------------------------------------------


}