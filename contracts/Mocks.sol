// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Contratos MOCK para testing en Base Sepolia. NO usar en produccion.
// Sirven para validar el patron approve + deposit (como meteriais EURC/USDC
// en un vault de Morpho), sin dependencias externas.

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

// ERC-20 minimo con mint publico y 6 decimales (como USDC).
contract MockUSDC {
    string public name = "Mock USDC";
    string public symbol = "mUSDC";
    uint8 public constant decimals = 6;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // Cualquiera puede mintear (es un mock de testnet).
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        require(a >= amount, "allowance");
        if (a != type(uint256).max) allowance[from][msg.sender] = a - amount;
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}

// Vault estilo ERC-4626 minimo: deposit(assets, receiver) tira del asset via
// transferFrom y mintea shares 1:1. Suficiente para validar el batch.
contract MockVault {
    address public immutable asset;
    string public name = "Mock Vault Shares";
    string public symbol = "mVLT";
    uint8 public constant decimals = 6;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares);

    constructor(address _asset) {
        asset = _asset;
    }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        require(IERC20(asset).transferFrom(msg.sender, address(this), assets), "transferFrom");
        shares = assets; // 1:1 para el mock
        balanceOf[receiver] += shares;
        totalSupply += shares;
        emit Transfer(address(0), receiver, shares);
        emit Deposit(msg.sender, receiver, assets, shares);
    }
}
